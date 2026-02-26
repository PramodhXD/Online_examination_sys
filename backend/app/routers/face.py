from __future__ import annotations

import base64
import binascii
import json
import os
from pathlib import Path
from uuid import uuid4

import numpy as np
from deepface import DeepFace
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
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

# Security limits.
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_UPLOAD_IMAGES = 10
EMBEDDING_MODEL = "Facenet"
DETECTOR_BACKENDS = ("opencv", "mediapipe")
MONITOR_FACE_ERRORS = {"multiple_faces", "face_not_detected"}
SECOND_FACE_AREA_RATIO_THRESHOLD = 0.45


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

    for backend in DETECTOR_BACKENDS:
        try:
            reps = DeepFace.represent(
                img_path=str(img_path),
                model_name=EMBEDDING_MODEL,
                detector_backend=backend,
                enforce_detection=True,
            )

            if len(reps) > 1:
                # Some detectors can output tiny false-positive "faces" on edges/background.
                # If the second face is much smaller than the primary, treat it as noise.
                def _face_area(rep: dict) -> int:
                    area = rep.get("facial_area") or {}
                    w = int(area.get("w") or 0)
                    h = int(area.get("h") or 0)
                    return max(0, w * h)

                areas = sorted((_face_area(rep) for rep in reps), reverse=True)
                if len(areas) >= 2 and areas[0] > 0:
                    ratio = areas[1] / areas[0]
                    if ratio >= SECOND_FACE_AREA_RATIO_THRESHOLD:
                        saw_multiple_faces = True
                        continue

                # Keep only the largest detected face when extras look like noise.
                reps = [max(reps, key=_face_area)]

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
        for old_file in user_folder.glob("img_*.jpg"):
            if old_file.is_file():
                old_file.unlink()

        template_path = user_folder / "template.json"
        if template_path.exists() and template_path.is_file():
            template_path.unlink()

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

    return {
        "verified": similarity >= VERIFY_THRESHOLD,
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
    try:
        result = await verify_face(data, current_user, db)
    except HTTPException as exc:
        detail = str(exc.detail)
        if exc.status_code == 400 and detail in MONITOR_FACE_ERRORS:
            return {
                "verified": False,
                "similarity": 0.0,
                "error": detail,
            }
        raise

    return {
        "verified": result["similarity"] >= MONITOR_THRESHOLD,
        "similarity": result["similarity"],
    }

