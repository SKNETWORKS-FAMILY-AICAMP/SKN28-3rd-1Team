from __future__ import annotations


def split_text(text: str, *, max_chars: int = 3000) -> list[str]:
    normalized = text.strip()
    if not normalized:
        return []
    return [
        normalized[index : index + max_chars]
        for index in range(0, len(normalized), max_chars)
    ]
