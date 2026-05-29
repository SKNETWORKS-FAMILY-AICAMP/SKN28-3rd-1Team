from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from ingest.parser import SUPPORTED_INPUT_SUFFIXES
from ingest.schemas import (
    CreateDocumentIngestJobRequest,
    FileIngestStatusResponse,
    IngestStage,
    IngestStageResult,
    RagIngestRequest,
    StageStatus,
)


class IngestJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, FileIngestStatusResponse] = {}

    def save(self, response: FileIngestStatusResponse) -> FileIngestStatusResponse:
        self._jobs[response.job_id] = response
        return response

    def get(self, job_id: str) -> FileIngestStatusResponse | None:
        return self._jobs.get(job_id)


def create_missing_job_response(job_id: str) -> FileIngestStatusResponse:
    return FileIngestStatusResponse(
        job_id=job_id,
        file_name="unknown",
        current_stage=IngestStage.FAILED,
        completed=False,
        stages=[
            IngestStageResult(
                stage=IngestStage.FAILED,
                status=StageStatus.FAILED,
                message="No ingest status was found for this job_id.",
            )
        ],
        warning="No ingest status was found for this job_id.",
    )


def ingest_backend_file(
    request: RagIngestRequest,
    input_dir: Path,
    store: IngestJobStore,
) -> FileIngestStatusResponse:
    source_path = Path(request.stored_path)
    stages = [
        IngestStageResult(
            stage=IngestStage.UPLOADED,
            status=StageStatus.SUCCESS,
            message="Received backend upload file path.",
            path=str(source_path),
        )
    ]

    if not source_path.exists() or not source_path.is_file():
        return store.save(
            _failed_ingest_response(
                request.job_id,
                request.file_name,
                stages,
                "Backend upload file path does not exist.",
            )
        )

    suffix = source_path.suffix.lower()
    if suffix not in SUPPORTED_INPUT_SUFFIXES:
        return store.save(
            _failed_ingest_response(
                request.job_id,
                request.file_name,
                stages,
                f"Unsupported input suffix: {suffix or 'none'}",
            )
        )

    stages.extend(
        [
            IngestStageResult(
                stage=IngestStage.PARSED,
                status=StageStatus.SUCCESS,
                message="File path and suffix validation completed.",
            ),
            IngestStageResult(
                stage=IngestStage.CONVERTED,
                status=StageStatus.SUCCESS,
                message="Input is already a supported text source.",
            ),
        ]
    )

    input_dir.mkdir(parents=True, exist_ok=True)
    target_path = input_dir / _safe_input_file_name(request.job_id, request.file_name)
    shutil.copy2(source_path, target_path)

    stages.append(
        IngestStageResult(
            stage=IngestStage.STORED,
            status=StageStatus.SUCCESS,
            message="Stored file in the RAG input directory.",
            path=str(target_path),
        )
    )

    return store.save(
        FileIngestStatusResponse(
            job_id=request.job_id,
            file_name=request.file_name,
            current_stage=IngestStage.STORED,
            completed=False,
            stages=stages,
        )
    )


def create_text_job(
    request: CreateDocumentIngestJobRequest,
    input_dir: Path,
    store: IngestJobStore,
) -> FileIngestStatusResponse:
    job_id = str(uuid4())
    suffix = Path(request.file_name).suffix.lower() or ".txt"
    if suffix not in SUPPORTED_INPUT_SUFFIXES:
        return store.save(
            _failed_ingest_response(
                job_id,
                request.file_name,
                [],
                f"Unsupported input suffix: {suffix}",
            )
        )

    input_dir.mkdir(parents=True, exist_ok=True)
    target_path = input_dir / _safe_input_file_name(job_id, request.file_name)
    target_path.write_text(request.content, encoding="utf-8")

    return store.save(
        FileIngestStatusResponse(
            job_id=job_id,
            file_name=request.file_name,
            current_stage=IngestStage.STORED,
            completed=False,
            stages=[
                IngestStageResult(
                    stage=IngestStage.UPLOADED,
                    status=StageStatus.SUCCESS,
                    message="Received text document payload.",
                ),
                IngestStageResult(
                    stage=IngestStage.STORED,
                    status=StageStatus.SUCCESS,
                    message="Stored document in the RAG input directory.",
                    path=str(target_path),
                ),
            ],
        )
    )


def mark_graph_add_started(
    job: FileIngestStatusResponse,
    store: IngestJobStore,
) -> FileIngestStatusResponse:
    stages = list(job.stages)
    stages.extend(
        [
            IngestStageResult(
                stage=IngestStage.GRAPH_ADD_STARTED,
                status=StageStatus.SUCCESS,
                message="Graph add pipeline was requested.",
            ),
            IngestStageResult(
                stage=IngestStage.INDEXED,
                status=StageStatus.SUCCESS,
                message="Document is available to the current text loader.",
            ),
        ]
    )
    return store.save(
        FileIngestStatusResponse(
            job_id=job.job_id,
            file_name=job.file_name,
            current_stage=IngestStage.INDEXED,
            completed=True,
            stages=stages,
            warning=(
                "LLM graph extraction is not executed in this backbone yet; "
                "the document is staged for the graph ingest agent."
            ),
        )
    )


def _safe_input_file_name(job_id: str, file_name: str) -> str:
    safe_name = Path(file_name or "uploaded_file").name or "uploaded_file"
    return f"{job_id}_{safe_name}"


def _failed_ingest_response(
    job_id: str,
    file_name: str,
    stages: list[IngestStageResult],
    message: str,
) -> FileIngestStatusResponse:
    stages.append(
        IngestStageResult(
            stage=IngestStage.FAILED,
            status=StageStatus.FAILED,
            message=message,
        )
    )
    return FileIngestStatusResponse(
        job_id=job_id,
        file_name=file_name,
        current_stage=IngestStage.FAILED,
        completed=False,
        stages=stages,
        warning=message,
    )

