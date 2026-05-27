from __future__ import annotations

import ast
import csv
import json
import re
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from settings import settings


# RAG 검색 요청 payload 모델입니다.
class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


# RAG 검색 결과 item 응답 모델입니다.
class SearchResult(BaseModel):
    content: str
    source_title: str
    file_name: str
    file_type: str
    location: str | None = None
    url: str | None = None
    score: float


# RAG 검색 응답 전체 모델입니다.
class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


# RAG 입력 파일에서 로드한 내부 문서 모델입니다.
class RagDocument(BaseModel):
    content: str
    source_title: str
    file_name: str
    file_type: str
    location: str | None = None
    url: str | None = None


app = FastAPI(title="SKN28 RAG Service", version="0.1.0")


# RAG 서비스의 런타임 의존성 정보를 반환합니다.
def dependency_summary() -> dict[str, object]:
    return {
        "runtime": "File Search RAG",
        "settings": "pydantic-settings",
        "input_dir": str(settings.input_dir),
        "supported_files": [".csv", ".json", ".py"],
    }


# CSV row를 검색 가능한 문자열로 변환합니다.
def _row_to_content(row: dict[str, str]) -> str:
    return "\n".join(f"{key}: {value}" for key, value in row.items() if value)


# 여러 후보 key 중 처음 존재하는 값을 반환합니다.
def _first_present(data: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = data.get(key)
        if value:
            return str(value)
    return None


# 문서 데이터에서 출처 제목을 추출합니다.
def _source_title_from_data(data: dict[str, Any], fallback: str) -> str:
    return (
        _first_present(
            data,
            ("출처명", "source_title", "source", "title", "정책명", "주요복지정책", "name"),
        )
        or fallback
    )


# 문서 데이터에서 출처 URL을 추출합니다.
def _url_from_data(data: dict[str, Any]) -> str | None:
    return _first_present(data, ("출처URL", "url", "source_url", "link"))


# CSV 파일을 RAG 검색 문서 목록으로 로드합니다.
def _load_csv_documents(path: Path) -> list[RagDocument]:
    text = path.read_text(encoding="utf-8-sig")
    reader = csv.DictReader(text.splitlines())

    documents: list[RagDocument] = []

    for row_number, row in enumerate(reader, start=2):
        row_data = dict(row)
        content = _row_to_content(row_data)

        if not content.strip():
            continue

        documents.append(
            RagDocument(
                content=content,
                source_title=_source_title_from_data(row_data, path.stem),
                file_name=path.name,
                file_type="csv",
                location=f"row {row_number}",
                url=_url_from_data(row_data),
            )
        )

    return documents


# JSON 값을 검색 가능한 문자열로 변환합니다.
def _json_to_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


# JSON 파일을 RAG 검색 문서 목록으로 로드합니다.
def _load_json_documents(path: Path) -> list[RagDocument]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))

    documents: list[RagDocument] = []

    if isinstance(data, list):
        for index, item in enumerate(data, start=1):
            documents.append(
                RagDocument(
                    content=_json_to_text(item),
                    source_title=_source_title_from_data(item, path.stem)
                    if isinstance(item, dict)
                    else path.stem,
                    file_name=path.name,
                    file_type="json",
                    location=f"item {index}",
                    url=_url_from_data(item) if isinstance(item, dict) else None,
                )
            )
        return documents

    if isinstance(data, dict):
        for key, value in data.items():
            documents.append(
                RagDocument(
                    content=_json_to_text(value),
                    source_title=_source_title_from_data(value, str(key))
                    if isinstance(value, dict)
                    else str(key),
                    file_name=path.name,
                    file_type="json",
                    location=f"key {key}",
                    url=_url_from_data(value) if isinstance(value, dict) else None,
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


# Python 파일을 함수/클래스 단위 RAG 검색 문서로 로드합니다.
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


# input 디렉토리의 지원 파일들을 모두 RAG 문서로 로드합니다.
def _load_documents() -> list[RagDocument]:
    documents: list[RagDocument] = []

    if not settings.input_dir.exists():
        return documents

    for path in sorted(settings.input_dir.iterdir()):
        if not path.is_file():
            continue

        suffix = path.suffix.lower()

        if suffix == ".csv":
            documents.extend(_load_csv_documents(path))
        elif suffix == ".json":
            documents.extend(_load_json_documents(path))
        elif suffix == ".py":
            documents.extend(_load_py_documents(path))

    return documents


# 검색어와 문서를 비교하기 위한 토큰 목록을 만듭니다.
def _tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[0-9a-zA-Z가-힣]+", text.lower())
    return [token for token in (_normalize_token(token) for token in tokens) if len(token) > 1]


# 간단한 한국어 조사를 제거해 검색 토큰을 정규화합니다.
def _normalize_token(token: str) -> str:
    suffixes = (
        "에게서",
        "으로",
        "에서",
        "에게",
        "부터",
        "까지",
        "이다",
        "입니다",
        "과",
        "와",
        "은",
        "는",
        "이",
        "가",
        "을",
        "를",
        "도",
        "만",
    )
    for suffix in suffixes:
        if token.endswith(suffix) and len(token) > len(suffix) + 1:
            return token[: -len(suffix)]
    return token


# 쿼리 토큰이 문서에 얼마나 들어있는지 점수화합니다.
def _score(query: str, text: str) -> float:
    terms = list(dict.fromkeys(_tokenize(query)))
    if not terms:
        return 0.0

    lowered = text.lower()
    primary_line = next((line.strip() for line in query.splitlines() if line.strip()), query)
    primary_terms = list(dict.fromkeys(_tokenize(primary_line)))
    primary_matched = sum(1 for term in primary_terms if term in lowered)
    if len(primary_terms) >= 3:
        if primary_matched < 2:
            return 0.0

    matched = sum(1 for term in terms if term in lowered)
    if len(terms) >= 3 and matched < 2:
        return 0.0

    return matched / len(terms)


# 로드한 문서에서 쿼리와 맞는 상위 검색 결과를 고릅니다.
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


# RAG 서비스 상태 확인 응답을 반환합니다.
@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "rag",
    }


# RAG 서비스 의존성 정보를 반환합니다.
@app.get("/api/system/dependencies")
def dependencies() -> dict[str, object]:
    return dependency_summary()


# RAG 검색 API 요청을 처리합니다.
@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest) -> SearchResponse:
    return SearchResponse(
        query=request.query,
        results=_search_documents(request.query, request.top_k),
    )


# uvicorn으로 RAG 서버를 실행합니다.
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
