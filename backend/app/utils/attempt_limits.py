UNLIMITED_ATTEMPT_LIMIT = 0
UNLIMITED_ATTEMPTS_LEFT = -1


def normalize_attempt_limit(value: int | None, *, default: int = 1) -> int:
    if value is None:
        return default
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    if parsed < UNLIMITED_ATTEMPT_LIMIT:
        return default
    return parsed


def calculate_attempts_left(attempt_limit: int | None, used_attempts: int | None) -> int:
    normalized_limit = normalize_attempt_limit(attempt_limit)
    normalized_used = max(0, int(used_attempts or 0))
    if normalized_limit == UNLIMITED_ATTEMPT_LIMIT:
        return UNLIMITED_ATTEMPTS_LEFT
    return max(0, normalized_limit - normalized_used)


def has_attempts_remaining(attempt_limit: int | None, used_attempts: int | None) -> bool:
    normalized_limit = normalize_attempt_limit(attempt_limit)
    if normalized_limit == UNLIMITED_ATTEMPT_LIMIT:
        return True
    normalized_used = max(0, int(used_attempts or 0))
    return normalized_used < normalized_limit
