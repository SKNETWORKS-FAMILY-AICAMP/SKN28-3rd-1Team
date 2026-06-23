#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from tqdm import tqdm


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_INPUT = SCRIPT_DIR / "vid_source.mp4"
DEFAULT_PROVIDER_MODELS = {
    "elevenlabs": "scribe_v2",
    "openrouter": "openai/whisper-large-v3",
}


@dataclass(frozen=True)
class Chunk:
    index: int
    start: float
    duration: float

    @property
    def end(self) -> float:
        return self.start + self.duration

    @property
    def stem(self) -> str:
        return f"chunk_{self.index:04d}_{int(self.start):06d}_{int(self.end):06d}"


def env_str(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def env_bool(name: str, default: bool) -> bool:
    raw = env_str(name)
    if not raw:
        return default
    return raw.lower() in {"1", "true", "yes", "y", "on"}


def env_float(name: str, default: float | None = None) -> float | None:
    raw = env_str(name)
    if not raw:
        return default
    return float(raw)


def positive_float(value: str) -> float:
    parsed = float(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be greater than 0")
    return parsed


def non_negative_float(value: str) -> float:
    parsed = float(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("value must be 0 or greater")
    return parsed


def resolve_path(path_value: str | Path) -> Path:
    path = Path(path_value).expanduser()
    if path.is_absolute():
        return path
    return SCRIPT_DIR / path


def require_executable(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"Required executable not found: {name}")
    return path


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, capture_output=True, text=True)


def ffprobe_duration(input_path: Path) -> float:
    ffprobe = require_executable("ffprobe")
    result = run_command(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(input_path),
        ]
    )
    return float(result.stdout.strip())


def export_chunk(
    input_path: Path,
    chunk_path: Path,
    chunk: Chunk,
    sample_rate: int,
    reuse_existing: bool,
) -> None:
    if reuse_existing and chunk_path.exists() and chunk_path.stat().st_size > 44:
        return
    ffmpeg = require_executable("ffmpeg")
    chunk_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        f"{chunk.start:.3f}",
        "-t",
        f"{chunk.duration:.3f}",
        "-i",
        str(input_path),
        "-map",
        "0:a:0",
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(sample_rate),
        "-c:a",
        "pcm_s16le",
        str(chunk_path),
    ]
    try:
        run_command(command)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(exc.stderr.strip() or f"ffmpeg failed for {chunk_path}") from exc


def build_chunks(
    source_duration: float,
    start_seconds: float,
    max_duration_seconds: float | None,
    chunk_seconds: float,
) -> list[Chunk]:
    if start_seconds >= source_duration:
        return []
    end_seconds = source_duration
    if max_duration_seconds is not None:
        end_seconds = min(source_duration, start_seconds + max_duration_seconds)
    chunks: list[Chunk] = []
    current = start_seconds
    while current < end_seconds:
        duration = min(chunk_seconds, end_seconds - current)
        if duration <= 0:
            break
        chunks.append(Chunk(index=len(chunks), start=current, duration=duration))
        current += duration
    return chunks


def to_jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_jsonable(item) for item in value]
    if hasattr(value, "model_dump"):
        try:
            return to_jsonable(value.model_dump(mode="json", by_alias=True))
        except TypeError:
            return to_jsonable(value.model_dump())
    if hasattr(value, "dict"):
        return to_jsonable(value.dict())
    if hasattr(value, "__dict__"):
        public_items = {
            key: item for key, item in vars(value).items() if not key.startswith("_")
        }
        if public_items:
            return to_jsonable(public_items)
    return str(value)


def extract_text(value: Any) -> str:
    data = to_jsonable(value)
    if isinstance(data, str):
        return data.strip()
    if isinstance(data, dict):
        for key in ("text", "transcription"):
            item = data.get(key)
            if isinstance(item, str) and item.strip():
                return item.strip()
        for key in ("transcripts", "chunks"):
            item = data.get(key)
            if isinstance(item, list):
                joined = " ".join(part for part in (extract_text(row) for row in item) if part)
                if joined.strip():
                    return joined.strip()
    if isinstance(data, list):
        return " ".join(part for part in (extract_text(row) for row in data) if part).strip()
    return ""


def extract_words(value: Any) -> list[dict[str, Any]]:
    data = to_jsonable(value)
    if isinstance(data, dict):
        words = data.get("words")
        if isinstance(words, list):
            return [word for word in words if isinstance(word, dict)]
        for key in ("transcripts", "chunks"):
            rows = data.get(key)
            if isinstance(rows, list):
                found: list[dict[str, Any]] = []
                for row in rows:
                    found.extend(extract_words(row))
                if found:
                    return found
    return []


def as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def word_text(word: dict[str, Any]) -> str:
    for key in ("text", "word", "characters"):
        value = word.get(key)
        if isinstance(value, str):
            return value
    return ""


def word_speaker(word: dict[str, Any]) -> str | None:
    for key in ("speaker_id", "speaker", "speaker_label"):
        value = word.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def append_token(current: str, token: str) -> str:
    token = token.strip()
    if not token:
        return current
    if not current:
        return token
    if token in {".", ",", "?", "!", ":", ";", "%", ")", "]", "}"}:
        return current + token
    if current.endswith(("(", "[", "{", " ", "\n")):
        return current + token
    return current + " " + token


def format_hms(seconds: float) -> str:
    whole = int(seconds)
    hours = whole // 3600
    minutes = (whole % 3600) // 60
    secs = whole % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def format_chunk_display(chunk: Chunk, result: Any, fallback_text: str) -> str:
    words = extract_words(result)
    if not words or not any(word_speaker(word) for word in words):
        return f"[{format_hms(chunk.start)} - {format_hms(chunk.end)}] {fallback_text}".strip()

    lines: list[str] = []
    current_speaker: str | None = None
    current_text = ""
    current_start: float | None = None
    current_end: float | None = None

    def flush() -> None:
        nonlocal current_text, current_speaker, current_start, current_end
        if current_text.strip():
            start = chunk.start + (current_start or 0)
            end = chunk.start + (current_end if current_end is not None else chunk.duration)
            speaker = current_speaker or "speaker"
            lines.append(f"[{format_hms(start)} - {format_hms(end)}] {speaker}: {current_text.strip()}")
        current_text = ""
        current_speaker = None
        current_start = None
        current_end = None

    for word in words:
        token = word_text(word)
        if not token.strip():
            continue
        speaker = word_speaker(word) or "speaker"
        start = as_float(word.get("start") or word.get("start_time"))
        end = as_float(word.get("end") or word.get("end_time"))
        if current_speaker is not None and speaker != current_speaker:
            flush()
        current_speaker = speaker
        if current_start is None:
            current_start = start
        if end is not None:
            current_end = end
        current_text = append_token(current_text, token)
    flush()

    if not lines:
        return f"[{format_hms(chunk.start)} - {format_hms(chunk.end)}] {fallback_text}".strip()
    return "\n".join(lines)


class ElevenLabsTranscriber:
    def __init__(
        self,
        api_key: str,
        model: str,
        language: str,
        diarize: bool,
        timestamps_granularity: str | None,
        num_speakers: int | None,
    ) -> None:
        from elevenlabs.client import ElevenLabs

        self.client = ElevenLabs(api_key=api_key)
        self.model = model
        self.language = language
        self.diarize = diarize
        self.timestamps_granularity = timestamps_granularity
        self.num_speakers = num_speakers

    def transcribe(self, audio_path: Path) -> Any:
        kwargs: dict[str, Any] = {
            "model_id": self.model,
            "diarize": self.diarize,
        }
        if self.language:
            kwargs["language_code"] = self.language
        if self.timestamps_granularity:
            kwargs["timestamps_granularity"] = self.timestamps_granularity
        if self.num_speakers is not None:
            kwargs["num_speakers"] = self.num_speakers

        with audio_path.open("rb") as audio_file:
            return self.client.speech_to_text.convert(file=audio_file, **kwargs)


class OpenRouterTranscriber:
    def __init__(self, api_key: str, model: str, language: str) -> None:
        from openrouter import OpenRouter

        client_kwargs: dict[str, str] = {"api_key": api_key}
        app_url = env_str("LLM_PROVIDER_OPENROUTER_APP_URL")
        app_title = env_str("LLM_PROVIDER_OPENROUTER_APP_TITLE")
        if app_url:
            client_kwargs["http_referer"] = app_url
        if app_title:
            client_kwargs["x_open_router_title"] = app_title
        self.client = OpenRouter(**client_kwargs)
        self.model = model
        self.language = language

    def transcribe(self, audio_path: Path) -> Any:
        audio_data = base64.b64encode(audio_path.read_bytes()).decode("utf-8")
        kwargs: dict[str, Any] = {
            "model": self.model,
            "input_audio": {
                "data": audio_data,
                "format_": "wav",
            },
        }
        if self.language:
            kwargs["language"] = self.language
        return self.client.stt.create_transcription(**kwargs)

    def close(self) -> None:
        close = getattr(self.client, "close", None)
        if callable(close):
            close()


def build_transcriber(args: argparse.Namespace) -> Any:
    if args.provider == "elevenlabs":
        api_key = env_str("ELEVENLABS_API_KEY")
        if not api_key:
            raise RuntimeError("ELEVENLABS_API_KEY is required for --provider elevenlabs")
        return ElevenLabsTranscriber(
            api_key=api_key,
            model=args.model,
            language=args.language,
            diarize=args.diarize,
            timestamps_granularity=args.timestamps_granularity,
            num_speakers=args.num_speakers,
        )

    api_key = env_str("LLM_PROVIDER_OPENROUTER_API_KEY") or env_str("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("LLM_PROVIDER_OPENROUTER_API_KEY is required for --provider openrouter")
    return OpenRouterTranscriber(api_key=api_key, model=args.model, language=args.language)


def parse_args() -> argparse.Namespace:
    load_dotenv(SCRIPT_DIR / ".env")
    default_provider = env_str("VOICE_TRANSCRIPTION_PROVIDER", "elevenlabs").lower()
    parser = argparse.ArgumentParser(
        description="Extract dialogue from vid_source.mp4 with chunked speech-to-text.",
    )
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Input video/audio file.")
    parser.add_argument(
        "--provider",
        choices=("elevenlabs", "openrouter"),
        default=default_provider,
        help="Speech-to-text provider.",
    )
    parser.add_argument(
        "--model",
        default=env_str("VOICE_TRANSCRIPTION_MODEL"),
        help="Provider model id. Empty uses provider default.",
    )
    parser.add_argument(
        "--language",
        default=env_str("VOICE_TRANSCRIPTION_LANGUAGE"),
        help="Optional ISO-639 language code.",
    )
    parser.add_argument(
        "--chunk-seconds",
        type=positive_float,
        default=env_float("VOICE_TRANSCRIPTION_CHUNK_SECONDS", 60),
        help="Seconds per API chunk.",
    )
    parser.add_argument(
        "--start-seconds",
        type=non_negative_float,
        default=env_float("VOICE_TRANSCRIPTION_START_SECONDS", 0) or 0,
        help="Start offset in seconds.",
    )
    parser.add_argument(
        "--max-duration-seconds",
        type=positive_float,
        default=env_float("VOICE_TRANSCRIPTION_MAX_DURATION_SECONDS"),
        help="Limit duration for tests. Omit for full input.",
    )
    parser.add_argument(
        "--output-dir",
        default=env_str("VOICE_TRANSCRIPTION_OUTPUT_DIR", "outputs"),
        help="Directory for transcript outputs.",
    )
    parser.add_argument(
        "--work-dir",
        default=env_str("VOICE_TRANSCRIPTION_WORK_DIR", "work/audio_chunks"),
        help="Directory for extracted audio chunks.",
    )
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=16000,
        help="WAV sample rate for extracted audio chunks.",
    )
    parser.add_argument(
        "--diarize",
        action=argparse.BooleanOptionalAction,
        default=env_bool("VOICE_TRANSCRIPTION_DIARIZE", True),
        help="Enable speaker diarization where supported.",
    )
    parser.add_argument(
        "--timestamps-granularity",
        choices=("word", "character", "none"),
        default=env_str("VOICE_TRANSCRIPTION_TIMESTAMPS_GRANULARITY", "word"),
        help="Timestamp detail for ElevenLabs.",
    )
    parser.add_argument("--num-speakers", type=int, default=None)
    parser.add_argument(
        "--resume",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Reuse per-chunk JSON responses when present.",
    )
    parser.add_argument(
        "--reuse-chunks",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Reuse existing WAV chunks when present.",
    )
    parser.add_argument(
        "--keep-chunks",
        action=argparse.BooleanOptionalAction,
        default=env_bool("VOICE_TRANSCRIPTION_KEEP_CHUNKS", False),
        help="Keep WAV chunks after successful transcription.",
    )
    parser.add_argument(
        "--prepare-only",
        "--dry-run",
        action="store_true",
        help="Export audio chunks and stop before provider API calls.",
    )
    args = parser.parse_args()
    if not args.model:
        args.model = DEFAULT_PROVIDER_MODELS[args.provider]
    if args.timestamps_granularity == "none":
        args.timestamps_granularity = None
    return args


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(to_jsonable(payload), ensure_ascii=False, indent=2) + "\n")


def main() -> int:
    args = parse_args()
    input_path = resolve_path(args.input)
    output_dir = resolve_path(args.output_dir)
    work_dir = resolve_path(args.work_dir)

    if not input_path.exists():
        raise RuntimeError(f"Input file does not exist: {input_path}")

    source_duration = ffprobe_duration(input_path)
    chunks = build_chunks(
        source_duration=source_duration,
        start_seconds=args.start_seconds,
        max_duration_seconds=args.max_duration_seconds,
        chunk_seconds=args.chunk_seconds,
    )
    if not chunks:
        raise RuntimeError("No chunks to process. Check --start-seconds and --max-duration-seconds.")

    planned_seconds = sum(chunk.duration for chunk in chunks)
    print(
        f"Input duration: {format_hms(source_duration)} | "
        f"planned: {format_hms(planned_seconds)} | chunks: {len(chunks)}",
        flush=True,
    )
    print(f"Provider: {args.provider} | model: {args.model}", flush=True)

    transcriber = None
    if not args.prepare_only:
        transcriber = build_transcriber(args)

    chunk_paths = {chunk.index: work_dir / f"{chunk.stem}.wav" for chunk in chunks}
    for chunk in tqdm(chunks, desc="Preparing chunks", unit="chunk"):
        export_chunk(
            input_path=input_path,
            chunk_path=chunk_paths[chunk.index],
            chunk=chunk,
            sample_rate=args.sample_rate,
            reuse_existing=args.reuse_chunks,
        )

    if args.prepare_only:
        print(f"Prepared {len(chunks)} chunk(s) in {work_dir}", flush=True)
        return 0

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    session_dir = output_dir / f"{run_id}_{args.provider}"
    chunk_result_dir = session_dir / "chunks"
    chunk_result_dir.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, Any]] = []
    combined_lines: list[str] = []

    try:
        if transcriber is None:
            raise RuntimeError("Transcriber was not initialized")
        for chunk in tqdm(chunks, desc="Transcribing", unit="chunk"):
            chunk_json = chunk_result_dir / f"{chunk.stem}.json"
            if args.resume and chunk_json.exists():
                raw_result = json.loads(chunk_json.read_text())
            else:
                raw_result = transcriber.transcribe(chunk_paths[chunk.index])
                write_json(chunk_json, raw_result)

            text = extract_text(raw_result)
            display_text = format_chunk_display(chunk, raw_result, text)
            record = {
                "index": chunk.index,
                "start_seconds": chunk.start,
                "end_seconds": chunk.end,
                "duration_seconds": chunk.duration,
                "text": text,
                "display_text": display_text,
                "result_path": str(chunk_json),
            }
            records.append(record)
            combined_lines.append(display_text)

            if not args.keep_chunks:
                chunk_paths[chunk.index].unlink(missing_ok=True)
    finally:
        close = getattr(transcriber, "close", None)
        if callable(close):
            close()

    transcript_text = "\n\n".join(line for line in combined_lines if line.strip()).strip()
    payload = {
        "created_at": run_id,
        "input_path": str(input_path),
        "source_duration_seconds": source_duration,
        "provider": args.provider,
        "model": args.model,
        "language": args.language,
        "chunk_seconds": args.chunk_seconds,
        "start_seconds": args.start_seconds,
        "max_duration_seconds": args.max_duration_seconds,
        "text": transcript_text,
        "chunks": records,
    }

    transcript_json = session_dir / "transcript.json"
    transcript_txt = session_dir / "transcript.txt"
    write_json(transcript_json, payload)
    transcript_txt.write_text(transcript_text + "\n", encoding="utf-8")
    shutil.copyfile(transcript_json, output_dir / "latest_transcript.json")
    shutil.copyfile(transcript_txt, output_dir / "latest_transcript.txt")

    print(f"Wrote {transcript_txt}", flush=True)
    print(f"Wrote {transcript_json}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
