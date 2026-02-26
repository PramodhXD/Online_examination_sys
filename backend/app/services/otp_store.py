from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from pathlib import Path

from app.utils.security import hash_password, verify_password

OTP_EXPIRY_MINUTES = 10
OTP_REQUEST_WINDOW_MINUTES = 60
OTP_MAX_REQUESTS_PER_WINDOW = 5
OTP_MIN_SECONDS_BETWEEN_REQUESTS = 30
OTP_MAX_VERIFY_ATTEMPTS = 5
OTP_BLOCK_MINUTES = 15

OTP_STORE_FILE = Path(os.getenv("OTP_STORE_FILE", "app/logs/otp_store.json"))


class OtpRateLimitError(Exception):
    pass


def _utcnow() -> datetime:
    return datetime.utcnow()


def _to_iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _from_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _ensure_store_file() -> None:
    OTP_STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not OTP_STORE_FILE.exists():
        OTP_STORE_FILE.write_text("{}", encoding="utf-8")


def _load_store() -> dict:
    _ensure_store_file()
    try:
        return json.loads(OTP_STORE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_store(store: dict) -> None:
    _ensure_store_file()
    OTP_STORE_FILE.write_text(json.dumps(store), encoding="utf-8")


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def save_otp(email: str, otp: str) -> None:
    key = _normalize_email(email)
    now = _utcnow()
    store = _load_store()
    record = store.get(key, {})

    blocked_until = _from_iso(record.get("blocked_until"))
    if blocked_until and now < blocked_until:
        raise OtpRateLimitError("Too many OTP requests. Please try again later.")

    last_requested_at = _from_iso(record.get("last_requested_at"))
    if last_requested_at and (now - last_requested_at).total_seconds() < OTP_MIN_SECONDS_BETWEEN_REQUESTS:
        raise OtpRateLimitError("Please wait before requesting another OTP.")

    window_started_at = _from_iso(record.get("window_started_at"))
    request_count = int(record.get("request_count", 0))

    if not window_started_at or (now - window_started_at) > timedelta(minutes=OTP_REQUEST_WINDOW_MINUTES):
        window_started_at = now
        request_count = 0

    request_count += 1
    if request_count > OTP_MAX_REQUESTS_PER_WINDOW:
        record["blocked_until"] = _to_iso(now + timedelta(minutes=OTP_BLOCK_MINUTES))
        store[key] = record
        _save_store(store)
        raise OtpRateLimitError("Too many OTP requests. Please try again in 15 minutes.")

    record.update(
        {
            "otp_hash": hash_password(otp),
            "expires_at": _to_iso(now + timedelta(minutes=OTP_EXPIRY_MINUTES)),
            "attempts": 0,
            "last_requested_at": _to_iso(now),
            "window_started_at": _to_iso(window_started_at),
            "request_count": request_count,
            "blocked_until": None,
        }
    )

    store[key] = record
    _save_store(store)


def verify_otp(email: str, otp: str) -> bool:
    key = _normalize_email(email)
    now = _utcnow()
    store = _load_store()
    record = store.get(key)

    if not record:
        return False

    blocked_until = _from_iso(record.get("blocked_until"))
    if blocked_until and now < blocked_until:
        return False

    expires_at = _from_iso(record.get("expires_at"))
    if not expires_at or now > expires_at:
        store.pop(key, None)
        _save_store(store)
        return False

    attempts = int(record.get("attempts", 0))
    if attempts >= OTP_MAX_VERIFY_ATTEMPTS:
        record["blocked_until"] = _to_iso(now + timedelta(minutes=OTP_BLOCK_MINUTES))
        store[key] = record
        _save_store(store)
        return False

    otp_hash = record.get("otp_hash")
    if not otp_hash or not verify_password(otp, otp_hash):
        record["attempts"] = attempts + 1
        if record["attempts"] >= OTP_MAX_VERIFY_ATTEMPTS:
            record["blocked_until"] = _to_iso(now + timedelta(minutes=OTP_BLOCK_MINUTES))
        store[key] = record
        _save_store(store)
        return False

    return True


def clear_otp(email: str) -> None:
    key = _normalize_email(email)
    store = _load_store()
    if key in store:
        store.pop(key, None)
        _save_store(store)
