from langchain.tools import tool

# from mcp import ClientSession, StdioServerParameters
# from mcp.client.stdio import http_client 

# RAG MCP 연결 전까지 agenn에 붙일 임시 검색 tool
@tool
def rag_search_tool(query: str) -> str:
    """Search external RAG documents for information relevant to the user question"""
    return "RAG 검색 도구는 아직 연결되지 않았습니다."


# 현재 agent가 사용할 LangChain tool 목록 반환
def get_tools():
    return [rag_search_tool]