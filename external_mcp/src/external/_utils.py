from __future__ import annotations

from pydantic import SecretStr


def secret_value(value: SecretStr | None) -> str | None:
    if value is None:
        return None

    secret = value.get_secret_value().strip()
    return secret or None


def bounded_limit(
    limit: int | None,
    *,
    default_limit: int,
    max_limit: int,
) -> int:
    safe_default = min(default_limit, max_limit)

    if limit is None:
        return safe_default

    return min(max(int(limit), 1), max_limit)
