# Voice Characteristic Extraction

This directory extracts dialogue from `vid_source.mp4` with speech-to-text models. It does not inspect video frames.

## Source

- `vid_source.mp4`: 54m 18s MP4 with an AAC audio stream.
- Generated chunks and transcripts are written under `work/` and `outputs/`; both are ignored by git.

## Setup

```bash
cd voice_characteristic_extracted
uv sync
cp .env.example .env
```

Fill one provider key in `.env`:

- ElevenLabs: `ELEVENLABS_API_KEY`
- OpenRouter: `LLM_PROVIDER_OPENROUTER_API_KEY`

The script loads `.env` automatically. `.env.schema` is the version-controlled env contract; `.env.example` is a local setup convenience for this standalone script.

## One Minute Test

ElevenLabs:

```bash
uv run python transcribe_vid_source.py --provider elevenlabs --max-duration-seconds 60
```

OpenRouter Whisper:

```bash
uv run python transcribe_vid_source.py --provider openrouter --model openai/whisper-large-v3 --max-duration-seconds 60
```

To verify chunking without calling an API:

```bash
uv run python transcribe_vid_source.py --prepare-only --max-duration-seconds 60
```

## Full Transcription

```bash
uv run python transcribe_vid_source.py --provider elevenlabs
```

Useful options:

- `--chunk-seconds 60`: chunk size sent to the STT provider.
- `--start-seconds 600`: begin from a later timestamp.
- `--max-duration-seconds 60`: limit runtime for API tests.
- `--resume` / `--no-resume`: reuse per-chunk JSON responses.
- `--keep-chunks`: keep intermediate WAV files after transcription.

## Provider Notes

- ElevenLabs official Python SDK: `client.speech_to_text.convert`, using `scribe_v2` by default.
- OpenRouter official Python SDK: `open_router.stt.create_transcription`, using `openai/whisper-large-v3` by default.

Both providers receive audio-only WAV chunks exported by ffmpeg.
