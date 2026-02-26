from pathlib import Path
import shutil


def _safe_segment(value: str | None) -> str:
    segment = str(value or "").strip()
    if (
        not segment
        or "/" in segment
        or "\\" in segment
        or segment in {".", ".."}
        or ".." in segment
        or ":" in segment
    ):
        return ""
    return segment


def _safe_path(root: Path, segment: str) -> Path | None:
    candidate = (root / segment).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        return None
    return candidate


def delete_user_face_data(*, roll_number: str | None, email: str | None) -> None:
    """
    Best-effort cleanup for a deleted user's face artifacts.
    Removes:
    - faces/<roll_number> (current storage)
    - faces/<email> (legacy storage)
    - face_templates/<roll_number>.yml and face_templates/<email>.yml (legacy LBPH)
    """
    backend_root = Path(__file__).resolve().parents[2]
    faces_root = (backend_root / "faces").resolve()
    templates_root = (backend_root / "face_templates").resolve()

    roll_key = _safe_segment(roll_number)
    email_key = _safe_segment((email or "").lower())

    for key in [roll_key, email_key]:
        if not key:
            continue
        folder = _safe_path(faces_root, key)
        if folder and folder.exists() and folder.is_dir():
            shutil.rmtree(folder, ignore_errors=True)

    for key in [roll_key, email_key]:
        if not key:
            continue
        model_file = _safe_path(templates_root, f"{key}.yml")
        if model_file and model_file.exists() and model_file.is_file():
            try:
                model_file.unlink()
            except OSError:
                pass
