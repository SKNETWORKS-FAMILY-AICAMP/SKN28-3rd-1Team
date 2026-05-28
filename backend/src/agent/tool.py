from __future__ import annotations

from langchain_core.tools import BaseTool, tool


# RAG MCP 연결 전까지 agent에 붙일 임시 검색 tool
@tool
def rag_search_tool(query: str) -> str:
    """사용자 질문과 관련된 정보를 찾기 위해 외부 RAG 문서를 검색합니다."""
    return "RAG 검색 도구는 아직 연결되지 않았습니다."


# 현재 agent가 사용할 LangChain tool 목록 반환
def get_tools() -> list[BaseTool]:
    return [rag_search_tool]
