from fastapi import APIRouter, HTTPException

from schemas.chat import ChatRequest, ChatResponse
from agent.graph import(
    answer_with_custom_intent,
    answer_with_selected_option,
    create_clarification_response,
)

router = APIRouter(prefix="/api", tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    if request.custom_intent and request.selected_option:
        raise HTTPException(
            status_code=400,
            detail="selected_option과 custom_intent는 동시에 보낼 수 없습니다.",
        )

    if request.custom_intent:
        return answer_with_custom_intent(request)

    if request.selected_option:
        return answer_with_selected_option(request)
    
    return create_clarification_response(request)


__all__ = ["router"]
