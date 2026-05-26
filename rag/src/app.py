from __future__ import annotations

import ast
import csv
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from settings import settings


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    content: str
    source_title: str
    file_name: str
    file_type: str
    location: str | None = None
    url: str | None = None
    score: float


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


class RagDocument(BaseModel):
    content: str
    source_title: str
    file_name: str
    file_type: str
    location: str | None = None
    url: str | None = None


app = FastAPI(title="SKN28 RAG Service", version="0.1.0")


def dependency_summary() -> dict[str, object]:
    return {
        "runtime": "File Search RAG",
        "settings": "pydantic-settings",
        "input_dir": str(settings.input_dir),
        "supported_files": [".csv", ".json", ".py"],
    }


def _row_to_content(row: dict[str, str]) -> str:
    return "\n".join(f"{key}: {value}" for key, value in row.items() if value)


def _load_csv_documents(path: Path) -> list[RagDocument]:
    text = path.read_text(encoding="utf-8-sig")
    reader = csv.DictReader(text.splitlines())

    documents: list[RagDocument] = []

    for row_number, row in enumerate(reader, start=2):
        row_data = dict(row)
        content = _row_to_content(row_data)

        if not content.strip():
            continue

        source_title = (
            row_data.get("출처명")
            or row_data.get("정책명")
            or row_data.get("주요복지정책")
            or path.stem
        )

        documents.append(
            RagDocument(
                content=content,
                source_title=source_title,
                file_name=path.name,
                file_type="csv",
                location=f"row {row_number}",
                url=row_data.get("출처URL") or None,
            )
        )

    return documents


def _json_to_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def _load_json_documents(path: Path) -> list[RagDocument]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))

    documents: list[RagDocument] = []

    if isinstance(data, list):
        for index, item in enumerate(data, start=1):
            documents.append(
                RagDocument(
                    content=_json_to_text(item),
                    source_title=path.stem,
                    file_name=path.name,
                    file_type="json",
                    location=f"item {index}",
                    url=item.get("url") if isinstance(item, dict) else None,
                )
            )
        return documents

    if isinstance(data, dict):
        for key, value in data.items():
            documents.append(
                RagDocument(
                    content=_json_to_text(value),
                    source_title=str(key),
                    file_name=path.name,
                    file_type="json",
                    location=f"key {key}",
                    url=value.get("url") if isinstance(value, dict) else None,
                )
            )
        return documents

    return [
        RagDocument(
            content=_json_to_text(data),
            source_title=path.stem,
            file_name=path.name,
            file_type="json",
            location="root",
        )
    ]


def _load_py_documents(path: Path) -> list[RagDocument]:
    text = path.read_text(encoding="utf-8")

    documents: list[RagDocument] = []

    try:
        tree = ast.parse(text)
    except SyntaxError:
        return [
            RagDocument(
                content=text,
                source_title=path.stem,
                file_name=path.name,
                file_type="py",
                location="file",
            )
        ]

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            start = node.lineno
            end = getattr(node, "end_lineno", node.lineno)
            lines = text.splitlines()
            snippet = "\n".join(lines[start - 1 : end])

            documents.append(
                RagDocument(
                    content=snippet,
                    source_title=node.name,
                    file_name=path.name,
                    file_type="py",
                    location=f"line {start}-{end}",
                )
            )

    if documents:
        return documents

    return [
        RagDocument(
            content=text,
            source_title=path.stem,
            file_name=path.name,
            file_type="py",
            location="file",
        )
    ]


def _load_documents() -> list[RagDocument]:
    documents: list[RagDocument] = []

    if not settings.input_dir.exists():
        return documents

    for path in sorted(settings.input_dir.iterdir()):
        if not path.is_file():
            continue

        if path.suffix == ".csv":
            documents.extend(_load_csv_documents(path))
        elif path.suffix == ".json":
            documents.extend(_load_json_documents(path))
        elif path.suffix == ".py":
            documents.extend(_load_py_documents(path))

    return documents


def _score(query: str, text: str) -> float:
    terms = [term for term in query.lower().split() if term]
    if not terms:
        return 0.0

    lowered = text.lower()
    matched = sum(1 for term in terms if term in lowered)

    return matched / len(terms)


def _search_documents(query: str, top_k: int) -> list[SearchResult]:
    results: list[SearchResult] = []

    for document in _load_documents():
        score = _score(query, document.content)
        if score <= 0:
            continue

        results.append(
            SearchResult(
                content=document.content,
                source_title=document.source_title,
                file_name=document.file_name,
                file_type=document.file_type,
                location=document.location,
                url=document.url,
                score=score,
            )
        )

    results.sort(key=lambda item: item.score, reverse=True)
    return results[:top_k]


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "rag",
    }


@app.get("/api/system/dependencies")
def dependencies() -> dict[str, object]:
    return dependency_summary()


@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest) -> SearchResponse:
    return SearchResponse(
        query=request.query,
        results=_search_documents(request.query, request.top_k),
    )


def main() -> None:
    import uvicorn

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8010,
        reload=True,
    )


if __name__ == "__main__":
    main()
