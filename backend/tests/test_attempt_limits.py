from app.utils.attempt_limits import (
    UNLIMITED_ATTEMPT_LIMIT,
    UNLIMITED_ATTEMPTS_LEFT,
    calculate_attempts_left,
    has_attempts_remaining,
    normalize_attempt_limit,
)


def test_normalize_attempt_limit_accepts_unlimited_and_positive_values() -> None:
    assert normalize_attempt_limit(UNLIMITED_ATTEMPT_LIMIT) == UNLIMITED_ATTEMPT_LIMIT
    assert normalize_attempt_limit(1) == 1
    assert normalize_attempt_limit(50) == 50


def test_normalize_attempt_limit_uses_default_for_invalid_values() -> None:
    assert normalize_attempt_limit(None) == 1
    assert normalize_attempt_limit(-3) == 1
    assert normalize_attempt_limit("bad") == 1


def test_calculate_attempts_left_returns_unlimited_marker() -> None:
    assert calculate_attempts_left(UNLIMITED_ATTEMPT_LIMIT, 999) == UNLIMITED_ATTEMPTS_LEFT


def test_calculate_attempts_left_for_limited_attempts() -> None:
    assert calculate_attempts_left(5, 2) == 3
    assert calculate_attempts_left(5, 8) == 0


def test_has_attempts_remaining_handles_unlimited_and_limited_cases() -> None:
    assert has_attempts_remaining(UNLIMITED_ATTEMPT_LIMIT, 1000) is True
    assert has_attempts_remaining(3, 2) is True
    assert has_attempts_remaining(3, 3) is False
