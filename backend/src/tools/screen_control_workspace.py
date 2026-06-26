from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from langchain_core.tools import BaseTool, StructuredTool
from langgraph.config import get_stream_writer
from pydantic import BaseModel, ConfigDict, Field

from logger import get_logger

logger = get_logger(__name__)


class WorkspaceToolModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class WorkspaceProfileField(WorkspaceToolModel):
    id: Literal["birthYear", "residence", "subject", "goal", "stage", "conditions"]
    kind: Literal["year", "text", "select", "textarea"]
    label: str
    value: str
    placeholder: str
    options: list[str] | None = None
    span: Literal["single", "wide", "full"] | None = None


class WorkspaceCoordinate(WorkspaceToolModel):
    lat: float
    lng: float


class WorkspaceMapLandmark(WorkspaceToolModel):
    id: str
    label: str
    x: float
    y: float
    coordinate: WorkspaceCoordinate | None = None


class WorkspaceMapLegendItem(WorkspaceToolModel):
    id: str
    label: str
    tier: Literal[0, 1, 2]


class WorkspaceMapSnapshot(WorkspaceToolModel):
    landmarks: list[WorkspaceMapLandmark]
    center: WorkspaceCoordinate | None = None
    legend: list[WorkspaceMapLegendItem] | None = None
    zoom: float | None = None


class WorkspaceInstitution(WorkspaceToolModel):
    id: str
    name: str
    x: float
    y: float
    tier: Literal[0, 1, 2]
    badges: list[str]
    phone: str
    address: str
    hours: str
    business: str
    apply: str
    docs: str
    distanceLabel: str
    coordinate: WorkspaceCoordinate | None = None


class WorkspaceEvidenceDocument(WorkspaceToolModel):
    id: str
    title: str
    source: str
    category: str
    page: str
    match: float
    tags: list[str]
    summary: str
    highlights: list[str]
    citation: str
    excerpt: str
    updated: str | None = None


class WorkspaceChecklistStep(WorkspaceToolModel):
    id: str
    title: str
    detail: str
    status: Literal["ready", "todo", "warning", "done"]


class WorkspaceChecklistItem(WorkspaceToolModel):
    id: str
    title: str
    detail: str
    expandedDetail: str | None = None
    status: Literal["ready", "todo", "warning", "done"]
    required: bool
    meta: str | None = None
    defaultExpanded: bool | None = None
    steps: list[WorkspaceChecklistStep] | None = None


class WorkspaceInstitutionResultsCopy(WorkspaceToolModel):
    headerBadge: str
    mapTitle: str
    mapDescription: str
    mapBadge: str
    listTitle: str
    listDescription: str
    countSuffix: str
    contactActionLabel: str
    directionsActionLabel: str


class WorkspaceEvidenceDocumentsCopy(WorkspaceToolModel):
    headerBadge: str
    bundleTitle: str
    bundleDescription: str
    summaryTitle: str
    citationTitle: str
    excerptTitle: str
    highlightsTitle: str
    relevanceLabel: str


class WorkspaceShowDefaultArgs(WorkspaceToolModel):
    title: str | None = Field(default=None, description="기본 화면 제목")
    description: str | None = Field(default=None, description="기본 화면 설명")
    statusLabel: str | None = Field(default=None, description="상태 배지 문구")


class WorkspaceShowProfileIntakeArgs(WorkspaceToolModel):
    title: str
    description: str
    fields: list[WorkspaceProfileField]
    suggestedQuestions: list[str]
    primaryActionLabel: str


class WorkspaceShowInstitutionResultsArgs(WorkspaceToolModel):
    title: str
    description: str
    copy_: WorkspaceInstitutionResultsCopy = Field(alias="copy")
    view: Literal["map", "list", "detail"]
    selectedInstitutionId: str
    map: WorkspaceMapSnapshot
    institutions: list[WorkspaceInstitution]


class WorkspaceShowEvidenceDocumentsArgs(WorkspaceToolModel):
    title: str
    description: str
    copy_: WorkspaceEvidenceDocumentsCopy = Field(alias="copy")
    view: Literal["list", "detail"]
    selectedDocumentId: str
    documents: list[WorkspaceEvidenceDocument]


class WorkspaceShowActionChecklistArgs(WorkspaceToolModel):
    title: str
    description: str
    items: list[WorkspaceChecklistItem]
    nextActionTitle: str
    nextActionDescription: str
    nextActionLabel: str
    nextActionPrompt: str | None = None


def get_screen_control_workspace_tools() -> list[BaseTool]:
    return [
        _create_default_tool(),
        _create_surface_tool(
            name="workspace_show_profile_intake",
            surface_type="profile-intake",
            args_schema=WorkspaceShowProfileIntakeArgs,
            description=(
                "상담자 정보 입력 surface로 전환합니다. "
                "사용자에게 확인받을 프로필 필드와 추천 질문을 full payload로 제공합니다."
            ),
        ),
        _create_surface_tool(
            name="workspace_show_institution_results",
            surface_type="institution-results",
            args_schema=WorkspaceShowInstitutionResultsArgs,
            description=(
                "기관 추천 결과 surface로 전환합니다. "
                "지도, 기관 목록, 선택 기관 id, 화면 copy를 full payload로 제공합니다."
            ),
        ),
        _create_surface_tool(
            name="workspace_show_evidence_documents",
            surface_type="evidence-documents",
            args_schema=WorkspaceShowEvidenceDocumentsArgs,
            description=(
                "근거 문서 surface로 전환합니다. "
                "문서 목록, 선택 문서 id, 요약/인용 copy를 full payload로 제공합니다."
            ),
        ),
        _create_surface_tool(
            name="workspace_show_action_checklist",
            surface_type="action-checklist",
            args_schema=WorkspaceShowActionChecklistArgs,
            description=(
                "실행 체크리스트 surface로 전환합니다. "
                "준비 항목, 단계, 다음 실행 안내를 full payload로 제공합니다."
            ),
        ),
    ]


def _create_default_tool() -> BaseTool:
    async def _run(**payload: Any) -> str:
        args = WorkspaceShowDefaultArgs.model_validate(payload)
        command = {
            "type": "workspace.showDefault",
            **args.model_dump(by_alias=True, exclude_none=True),
        }
        _emit_workspace_command(command)
        return _ack("workspace.showDefault")

    return StructuredTool.from_function(
        coroutine=_run,
        name="workspace_show_default",
        description=(
            "기본 workspace surface로 전환합니다. "
            "mascot 상태는 프론트엔드가 관리하므로 전달하지 않습니다."
        ),
        args_schema=WorkspaceShowDefaultArgs,
    )


def _create_surface_tool(
    *,
    name: str,
    surface_type: str,
    args_schema: type[BaseModel],
    description: str,
) -> BaseTool:
    async def _run(**payload: Any) -> str:
        args = args_schema.model_validate(payload)
        surface = {
            "type": surface_type,
            **args.model_dump(by_alias=True, exclude_none=True),
        }
        _emit_workspace_command({"type": "workspace.showSurface", "surface": surface})
        return _ack("workspace.showSurface", surface_type=surface_type)

    return StructuredTool.from_function(
        coroutine=_run,
        name=name,
        description=description,
        args_schema=args_schema,
    )


def _emit_workspace_command(command: dict[str, Any]) -> None:
    command_id = f"workspace-command-{uuid4().hex}"
    backend_event = {
        "type": "screen_control.command",
        "source_agent": "screen_control_agent",
        "node": "screen_control_agent",
        "id": command_id,
        "command": command,
    }
    writer, stream_writer_available = _writer()

    try:
        writer(backend_event)
    except Exception:
        logger.exception(
            "screen control workspace command emit failed",
            extra={
                "event": "screen_control.workspace_command.emit_failed",
                "agent": "screen_control_agent",
                "command_id": command_id,
                "stream_writer_available": stream_writer_available,
                "workspace_command": command,
                **_workspace_command_summary(command),
            },
        )
        raise

    logger.debug(
        "screen control workspace command emitted",
        extra={
            "event": "screen_control.workspace_command.emitted",
            "agent": "screen_control_agent",
            "command_id": command_id,
            "stream_writer_available": stream_writer_available,
            "workspace_command": command,
            **_workspace_command_summary(command),
        },
    )


def _ack(command_type: str, *, surface_type: str | None = None) -> str:
    if surface_type:
        return f"{command_type} emitted for {surface_type}."
    return f"{command_type} emitted."


def _writer() -> tuple[Any, bool]:
    try:
        return get_stream_writer(), True
    except RuntimeError:
        return (lambda _: None), False


def _workspace_command_summary(command: dict[str, Any]) -> dict[str, Any]:
    command_type = command.get("type")
    surface = command.get("surface")
    if not isinstance(surface, dict):
        return {
            "command_type": command_type,
            "surface_type": None,
            "title_chars": _text_len(command.get("title")),
            "description_chars": _text_len(command.get("description")),
        }

    return {
        "command_type": command_type,
        "surface_type": surface.get("type"),
        "surface_view": surface.get("view"),
        "selected_institution_id": surface.get("selectedInstitutionId"),
        "selected_document_id": surface.get("selectedDocumentId"),
        "institution_count": _list_len(surface.get("institutions")),
        "document_count": _list_len(surface.get("documents")),
        "checklist_item_count": _list_len(surface.get("items")),
        "field_count": _list_len(surface.get("fields")),
        "visit_note_count": _list_len(surface.get("visitNotes")),
        "map_landmark_count": _map_landmark_count(surface.get("map")),
        "title_chars": _text_len(surface.get("title")),
        "description_chars": _text_len(surface.get("description")),
    }


def _list_len(value: Any) -> int | None:
    return len(value) if isinstance(value, list) else None


def _text_len(value: Any) -> int | None:
    return len(value) if isinstance(value, str) else None


def _map_landmark_count(value: Any) -> int | None:
    if not isinstance(value, dict):
        return None
    return _list_len(value.get("landmarks"))
