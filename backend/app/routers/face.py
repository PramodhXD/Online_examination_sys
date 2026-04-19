from __future__ import annotations

import base64
import binascii
import json
import os
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np
from deepface import DeepFace
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.admin import AdminStudentMeta
from app.models.user import User
from app.utils.jwt import get_current_user

router = APIRouter()

BACKEND_ROOT = Path(__file__).resolve().parents[2]
FACE_ROOT = (BACKEND_ROOT / "faces").resolve()
FACE_ROOT.mkdir(parents=True, exist_ok=True)

# Similarity thresholds.
VERIFY_THRESHOLD = 0.70
MONITOR_THRESHOLD = 0.75
MIN_TEMPLATE_IMAGES = 2
MONITOR_MAX_DIMENSION = 640

# Security limits.
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_UPLOAD_IMAGES = 10
EMBEDDING_MODEL = "Facenet"
DETECTOR_BACKENDS = ("opencv", "mediapipe")
MONITOR_FACE_ERRORS = {"multiple_faces", "face_not_detected"}
SECOND_FACE_AREA_RATIO_THRESHOLD = 0.45
SECOND_FACE_MIN_IMAGE_AREA_RATIO = 0.06
FACE_EDGE_MARGIN_RATIO = 0.03
SAME_FACE_IOU_THRESHOLD = 0.18
FACE_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


# -----------------------------
# Utilities
# -----------------------------

def _normalize_segment(value: str, *, field_name: str) -> str:
    normalized = (value or "").strip()
    if (
        not normalized
        or "/" in normalized
        or "\\" in normalized
        or normalized in {".", ".."}
        or ".." in normalized
        or ":" in normalized
    ):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")
    return normalized


def _normalize_email(email: str) -> str:
    return _normalize_segment((email or "").lower(), field_name="email")


def _normalize_roll_key(roll_number: str) -> str:
    return _normalize_segment(roll_number, field_name="roll number")


def _user_folder_from_key(face_key: str) -> Path:
    candidate = (FACE_ROOT / face_key).resolve()
    try:
        candidate.relative_to(FACE_ROOT)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid face storage path")
    return candidate


def _safe_l2_normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm <= 0:
        raise HTTPException(status_code=400, detail="Invalid face embedding")
    return vec / norm


def _detect_image_mime_type(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if image_bytes.startswith(b"RIFF") and len(image_bytes) >= 12 and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _clear_existing_face_files(user_folder: Path) -> None:
    for existing_file in user_folder.iterdir():
        if not existing_file.is_file():
            continue

        file_name = existing_file.name
        if file_name.startswith("temp_"):
            continue
        if file_name == "template.json":
            existing_file.unlink()
            continue

        if existing_file.suffix.lower() in FACE_IMAGE_EXTENSIONS:
            existing_file.unlink()


# -----------------------------
# Authorization
# -----------------------------

async def _authorize_and_resolve_face_folder(
    current_user: dict,
    email: str,
    db: AsyncSession,
) -> Path:
    requested_email = _normalize_email(email)
    role = str(current_user.get("role") or "").lower()

    if role != "admin":
        current_email = _normalize_email(str(current_user.get("email") or ""))
        if requested_email != current_email:
            raise HTTPException(status_code=403, detail="Not authorized")

    target_user = (
        await db.execute(
            select(User).where(
                User.email == requested_email,
                User.is_deleted.is_(False),
            )
        )
    ).scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    roll_key = _normalize_roll_key(str(target_user.roll_number or ""))
    return _user_folder_from_key(roll_key)


async def _get_or_create_student_meta(db: AsyncSession, user_id: int) -> AdminStudentMeta:
    meta = (
        await db.execute(
            select(AdminStudentMeta).where(AdminStudentMeta.user_id == user_id)
        )
    ).scalar_one_or_none()
    if meta is not None:
        return meta

    meta = AdminStudentMeta(
        user_id=user_id,
        department="General",
        batch="2024-28",
        blocked=False,
        face_status="not_registered",
    )
    db.add(meta)
    await db.flush()
    return meta


# -----------------------------
# Models
# -----------------------------

class FaceUpload(BaseModel):
    email: EmailStr
    images: list[str] = Field(..., min_length=1, max_length=MAX_UPLOAD_IMAGES)


class FaceVerify(BaseModel):
    email: EmailStr
    image: str = Field(..., min_length=1)


# -----------------------------
# Face Embedding (Strict Single Face)
# -----------------------------

def _compute_embedding(img_path: Path) -> np.ndarray:
    saw_multiple_faces = False
    image = cv2.imread(str(img_path))
    image_height, image_width = (image.shape[:2] if image is not None else (0, 0))

    def _face_box(rep: dict) -> tuple[int, int, int, int]:
        area = rep.get("facial_area") or {}
        x = int(area.get("x") or 0)
        y = int(area.get("y") or 0)
        w = int(area.get("w") or 0)
        h = int(area.get("h") or 0)
        return x, y, max(0, w), max(0, h)

    def _face_area(rep: dict) -> int:
        _, _, w, h = _face_box(rep)
        return max(0, w * h)

    def _iou(box_a: tuple[int, int, int, int], box_b: tuple[int, int, int, int]) -> float:
        ax, ay, aw, ah = box_a
        bx, by, bw, bh = box_b
        if aw <= 0 or ah <= 0 or bw <= 0 or bh <= 0:
            return 0.0

        inter_left = max(ax, bx)
        inter_top = max(ay, by)
        inter_right = min(ax + aw, bx + bw)
        inter_bottom = min(ay + ah, by + bh)

        inter_w = max(0, inter_right - inter_left)
        inter_h = max(0, inter_bottom - inter_top)
        intersection = inter_w * inter_h
        if intersection <= 0:
            return 0.0

        union = aw * ah + bw * bh - intersection
        return intersection / union if union > 0 else 0.0

    def _touches_edge(box: tuple[int, int, int, int]) -> bool:
        if image_width <= 0 or image_height <= 0:
            return False

        x, y, w, h = box
        margin_x = image_width * FACE_EDGE_MARGIN_RATIO
        margin_y = image_height * FACE_EDGE_MARGIN_RATIO
        return (
            x <= margin_x
            or y <= margin_y
            or (x + w) >= (image_width - margin_x)
            or (y + h) >= (image_height - margin_y)
        )

    for backend in DETECTOR_BACKENDS:
        try:
            reps = DeepFace.represent(
                img_path=str(img_path),
                model_name=EMBEDDING_MODEL,
                detector_backend=backend,
                enforce_detection=True,
            )

            if len(reps) > 1:
                sorted_reps = sorted(reps, key=_face_area, reverse=True)
                primary = sorted_reps[0]
                primary_area = _face_area(primary)
                primary_box = _face_box(primary)
                image_area = image_width * image_height
                confirmed_second_face = False

                for candidate in sorted_reps[1:]:
                    candidate_area = _face_area(candidate)
                    candidate_box = _face_box(candidate)
                    if primary_area <= 0 or candidate_area <= 0:
                        continue

                    area_ratio = candidate_area / primary_area
                    image_area_ratio = (candidate_area / image_area) if image_area > 0 else 0.0
                    duplicate_detection = _iou(primary_box, candidate_box) >= SAME_FACE_IOU_THRESHOLD
                    near_frame_edge = _touches_edge(candidate_box)

                    if duplicate_detection:
                        continue
                    if near_frame_edge and image_area_ratio < SECOND_FACE_MIN_IMAGE_AREA_RATIO:
                        continue
                    if area_ratio >= SECOND_FACE_AREA_RATIO_THRESHOLD and image_area_ratio >= SECOND_FACE_MIN_IMAGE_AREA_RATIO:
                        confirmed_second_face = True
                        break

                if confirmed_second_face:
                    saw_multiple_faces = True
                    continue

                reps = [primary]

            if len(reps) != 1:
                continue

            embedding = np.array(reps[0]["embedding"], dtype=np.float32)
            if embedding.size == 0:
                continue
            return embedding

        except Exception:
            continue

    if saw_multiple_faces:
        raise HTTPException(status_code=400, detail="multiple_faces")
    raise HTTPException(status_code=400, detail="face_not_detected")


# -----------------------------
# Encode / Decode Base64 Safely
# -----------------------------

def _encode_base64_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image payload is empty")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large")
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Unsupported image format")

    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _decode_base64_image(image: str) -> bytes:
    image_data = (image or "").strip()
    if not image_data:
        raise HTTPException(status_code=400, detail="Image payload is empty")

    if "," in image_data:
        header, payload = image_data.split(",", 1)
        if not header.lower().startswith("data:image/"):
            raise HTTPException(status_code=400, detail="Unsupported image format")
        image_data = payload

    # Rough pre-check before decode to reduce memory abuse.
    if len(image_data) > ((MAX_IMAGE_BYTES * 4) // 3 + 8):
        raise HTTPException(status_code=400, detail="Image too large")

    try:
        decoded = base64.b64decode(image_data, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Invalid image payload")

    if not decoded:
        raise HTTPException(status_code=400, detail="Image payload is empty")
    if len(decoded) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large")
    return decoded


def _downscale_image_bytes(image_bytes: bytes, max_dimension: int) -> bytes:
    if not image_bytes or max_dimension <= 0:
        return image_bytes

    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        return image_bytes

    height, width = image.shape[:2]
    longest_side = max(width, height)
    if longest_side <= max_dimension:
        return image_bytes

    scale = max_dimension / float(longest_side)
    new_width = max(1, int(width * scale))
    new_height = max(1, int(height * scale))
    resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    success, encoded = cv2.imencode(".jpg", resized, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
    if not success:
        return image_bytes
    return encoded.tobytes()


# -----------------------------
# Get Stored Images
# -----------------------------

@router.get("/images")
async def get_face_images(
    email: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_folder = await _authorize_and_resolve_face_folder(
        current_user, email, db
    )

    if not user_folder.exists():
        raise HTTPException(status_code=404, detail="Images not found")

    files = sorted(user_folder.glob("img_*.jpg"))
    if not files:
        raise HTTPException(status_code=404, detail="Images not found")

    encoded_images: list[str] = []
    for file in files:
        if not file.is_file():
            continue
        try:
            image_bytes = file.read_bytes()
        except OSError:
            raise HTTPException(status_code=500, detail="Failed to read image")
        mime_type = _detect_image_mime_type(image_bytes)
        encoded_images.append(_encode_base64_image(image_bytes, mime_type))

    if not encoded_images:
        raise HTTPException(status_code=404, detail="Images not found")

    return {
        "count": len(encoded_images),
        "images": encoded_images,
    }


# -----------------------------
# Upload (Validates Face)
# -----------------------------

@router.post("/upload")
async def upload_face(
    data: FaceUpload,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_folder = await _authorize_and_resolve_face_folder(
        current_user, data.email, db
    )

    user_folder.mkdir(parents=True, exist_ok=True)

    temp_paths: list[Path] = []
    valid_temp_paths: list[Path] = []
    skipped_images = 0
    try:
        # Validate each image and keep only valid single-face captures.
        for img in data.images:
            decoded = _decode_base64_image(img)
            temp_path = user_folder / f"temp_{uuid4().hex}.jpg"
            with open(temp_path, "wb") as f:
                f.write(decoded)

            # Track temp file immediately so it is cleaned even if validation fails.
            temp_paths.append(temp_path)

            try:
                await run_in_threadpool(_compute_embedding, temp_path)
                valid_temp_paths.append(temp_path)
            except HTTPException:
                skipped_images += 1
                continue

        if len(valid_temp_paths) < MIN_TEMPLATE_IMAGES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Need at least {MIN_TEMPLATE_IMAGES} valid face images "
                    f"(got {len(valid_temp_paths)} of {len(data.images)})"
                ),
            )

        # Replace current training set only after enough valid images pass.
        _clear_existing_face_files(user_folder)
        template_path = user_folder / "template.json"

        for i, temp_path in enumerate(valid_temp_paths):
            final_path = user_folder / f"img_{i}.jpg"
            os.replace(temp_path, final_path)

        # Keep only remaining temp files for cleanup (skipped frames).
        moved = set(valid_temp_paths)
        temp_paths = [p for p in temp_paths if p not in moved]

        # Build template immediately to avoid a separate fragile step.
        files = sorted(user_folder.glob("img_*.jpg"))
        embeddings: list[np.ndarray] = []
        for file in files:
            try:
                embedding = await run_in_threadpool(_compute_embedding, file)
                embeddings.append(embedding)
            except HTTPException:
                continue

        if len(embeddings) < MIN_TEMPLATE_IMAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Need at least {MIN_TEMPLATE_IMAGES} valid face images",
            )

        avg_embedding = np.mean(np.array(embeddings, dtype=np.float32), axis=0)
        avg_embedding = _safe_l2_normalize(avg_embedding)
        with open(template_path, "w") as f:
            json.dump(avg_embedding.tolist(), f)
    finally:
        for temp_path in temp_paths:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    return {
        "uploaded": True,
        "template_created": True,
        "saved_images": len(valid_temp_paths),
        "skipped_images": skipped_images,
    }


# -----------------------------
# Create Template
# -----------------------------

@router.post("/create-template")
async def create_template(
    email: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_folder = await _authorize_and_resolve_face_folder(
        current_user, email, db
    )

    if not user_folder.exists():
        raise HTTPException(status_code=404, detail="Images not found")

    files = sorted(user_folder.glob("img_*.jpg"))
    embeddings: list[np.ndarray] = []

    for file in files:
        try:
            embedding = await run_in_threadpool(_compute_embedding, file)
            embeddings.append(embedding)
        except HTTPException:
            # Keep processing remaining images; template can be created from valid ones.
            continue

    if len(embeddings) < MIN_TEMPLATE_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {MIN_TEMPLATE_IMAGES} valid face images",
        )

    avg_embedding = np.mean(np.array(embeddings, dtype=np.float32), axis=0)
    avg_embedding = _safe_l2_normalize(avg_embedding)

    template_path = user_folder / "template.json"
    with open(template_path, "w") as f:
        json.dump(avg_embedding.tolist(), f)

    return {"template_created": True}


# -----------------------------
# Verify
# -----------------------------

@router.post("/verify")
async def verify_face(
    data: FaceVerify,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_folder = await _authorize_and_resolve_face_folder(
        current_user, data.email, db
    )

    template_path = user_folder / "template.json"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    decoded = _decode_base64_image(data.image)

    temp_path = user_folder / f"temp_{uuid4().hex}.jpg"
    with open(temp_path, "wb") as f:
        f.write(decoded)

    try:
        new_embedding = await run_in_threadpool(_compute_embedding, temp_path)
    finally:
        if temp_path.exists():
            os.remove(temp_path)

    try:
        with open(template_path, "r") as f:
            stored_embedding = np.array(json.load(f), dtype=np.float32)
    except (json.JSONDecodeError, ValueError, TypeError):
        raise HTTPException(status_code=500, detail="Invalid stored face template")

    if stored_embedding.ndim != 1 or stored_embedding.size == 0:
        raise HTTPException(status_code=500, detail="Invalid stored face template")

    stored_norm = _safe_l2_normalize(stored_embedding)
    new_norm = _safe_l2_normalize(new_embedding)
    similarity = float(np.dot(stored_norm, new_norm))
    verified = similarity >= VERIFY_THRESHOLD

    if verified:
        target_user = (
            await db.execute(
                select(User).where(
                    User.email == _normalize_email(str(data.email)),
                    User.is_deleted.is_(False),
                )
            )
        ).scalar_one_or_none()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        meta = await _get_or_create_student_meta(db, target_user.id)
        if str(meta.face_status or "").strip().lower() != "verified":
            meta.face_status = "verified"
            await db.commit()

    return {
        "verified": verified,
        "similarity": similarity,
    }


# -----------------------------
# Monitor Mode (Stricter)
# -----------------------------

@router.post("/verify-monitor")
async def verify_face_monitor(
    data: FaceVerify,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_folder = await _authorize_and_resolve_face_folder(
        current_user, data.email, db
    )

    template_path = user_folder / "template.json"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    decoded = _decode_base64_image(data.image)
    resized_bytes = _downscale_image_bytes(decoded, MONITOR_MAX_DIMENSION)

    temp_path = user_folder / f"temp_{uuid4().hex}.jpg"
    with open(temp_path, "wb") as f:
        f.write(resized_bytes)

    try:
        new_embedding = await run_in_threadpool(_compute_embedding, temp_path)
    except HTTPException as exc:
        detail = str(exc.detail)
        if exc.status_code == 400 and detail in MONITOR_FACE_ERRORS:
            return {
                "verified": False,
                "similarity": 0.0,
                "error": detail,
            }
        raise
    finally:
        if temp_path.exists():
            os.remove(temp_path)

    try:
        with open(template_path, "r") as f:
            stored_embedding = np.array(json.load(f), dtype=np.float32)
    except (json.JSONDecodeError, ValueError, TypeError):
        raise HTTPException(status_code=500, detail="Invalid stored face template")

    if stored_embedding.ndim != 1 or stored_embedding.size == 0:
        raise HTTPException(status_code=500, detail="Invalid stored face template")

    stored_norm = _safe_l2_normalize(stored_embedding)
    new_norm = _safe_l2_normalize(new_embedding)
    similarity = float(np.dot(stored_norm, new_norm))

    return {
        "verified": similarity >= MONITOR_THRESHOLD,
        "similarity": similarity,
    }

