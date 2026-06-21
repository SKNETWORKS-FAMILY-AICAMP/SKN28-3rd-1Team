# 음성 답변 지연 시간 개선 기록

## 한 줄 결론

음성 답변 지연의 핵심 원인은 "텍스트 답변"과 "음성 생성"을 같은 스트림에서 끝까지 기다렸기 때문입니다.

1. 텍스트 답변을 먼저 끝내고, 음성은 별도 요청으로 뒤따라 만들도록 분리
2. 짧고 단순한 답변은 Speech Text LLM을 호출하지 않고, 로컬 sanitizer만 사용하도록 수정

## 원하는 구조와 현재 구현

사용자가 원한 구조는 아래와 같습니다.

```text
Main Agent가 답변 생성
  -> Speech Text Agent가 그 답변을 음성으로 읽기 좋은 문장으로 변환
  -> ElevenLabs가 실제 음성 생성
  -> Frontend 재생바에서 재생
```

현재 구현도 이 방향이 맞습니다.
다만 지연 시간을 줄이기 위해 짧고 단순한 답변에서는 Speech Text LLM을 매번 호출하지 않고, 로컬 sanitizer가 먼저 음성용 문장을 준비합니다.

| 질문 | 답 |
|---|---|
| Main Agent가 먼저 답변하나? | ✅ Main Agent가 최종 텍스트 답변을 먼저 만듭니다. |
| Speech Text Agent가 Main Agent 답변을 받나? | ✅ 최종 답변을 받아 음성용 텍스트를 만듭니다. |
| ElevenLabs는 무엇을 읽나? | ✅ Speech Text Agent 결과 또는 로컬 sanitizer 결과를 읽습니다. |
| 짧은 답변도 Speech Text LLM을 꼭 호출하나? | ❌ 지연을 줄이기 위해 단순 답변은 LLM을 건너뜁니다. |
| 그래도 음성 설명 구조가 맞나? | ✅ 최종 답변을 음성용 문장으로 바꿔 읽는 구조입니다. |

## 화면 답변과 음성용 텍스트 분리

중요한 점은 화면에 보이는 답변과 음성으로 읽는 텍스트가 서로 다른 용도로 쓰인다는 것입니다.

| 구분 | 사용하는 값 | 처리 방식 | 사용자에게 보이는가 |
|---|---|---|---|
| 화면 답변 | Main Agent 최종 답변 원문 | Frontend에서 Markdown으로 렌더링| ✅ |
| 음성 답변 | Main Agent 최종 답변을 음성용으로 변환한 값 | 로컬 sanitizer 또는 Speech Text LLM 처리 후 TTS 전달 | ❌ 소리로만 들림 |

따라서 로컬 sanitizer가 Markdown 기호를 지우더라도, 화면에 표시되는 답변 Markdown은 지워지지 않아야 합니다.

```text
화면 표시용: ## 신청 방법, 목록, 링크 등 Markdown 구조 유지
음성 읽기용: 신청 방법 주민센터에 방문하세요. 복지로에서도 확인할 수 있습니다.
```


## 개선 전/후 비교

| 비교 항목 | 개선 전 | 개선 후 |
|---|---|---|
| 채팅 스트림 책임 | 텍스트 답변 + 음성 생성 모두 처리 | 텍스트 답변까지만 먼저 처리 |
| 음성 생성 시점 | 텍스트 답변 뒤 같은 스트림에서 계속 진행 | 최종 답변 후 별도 audioRequest 진행 |
| Speech Text LLM 호출 | 음성 ON이면 기본적으로 호출 | 길거나 복잡한 답변일 때만 호출 |
| 짧은 답변 처리 | LLM 호출로 추가 대기 가능 | 로컬 sanitizer로 즉시 처리 |
| 프론트 완료 시점 | 오디오 chunk와 `audio_done`까지 기다림 | 텍스트 답변이 끝나면 채팅 요청 완료 |
| 사용자 체감 | 답변은 보이지만 계속 대기하는 느낌 | 답변을 먼저 보고 음성은 준비되면 재생 |
| 로그 | 병목 구간을 코드 내부에서 보기 어려움 | `chat_timing`으로 구간별 시간 확인 |

## 구조 흐름 비교

| 순서 | 개선 전 흐름 | 개선 후 흐름 |
|---:|---|---|
| 1 | 사용자 질문 | 사용자 질문 |
| 2 | Main Agent + RAG 실행 | Main Agent + RAG 실행 |
| 3 | 텍스트 답변 생성 | 텍스트 답변 생성 |
| 4 | Speech Text Agent LLM 실행 | <span style="color:#1d4ed8">텍스트 채팅 스트림 완료</span> |
| 5 | ElevenLabs TTS 실행 | <span style="color:#1d4ed8">프론트가 `data-audioRequest` 수신</span> |
| 6 | 오디오 chunk를 같은 스트림으로 전송 | <span style="color:#1d4ed8">별도 `/api/chat/audio` 요청 시작</span> |
| 7 | 오디오 완료 후 전체 요청 완료 | <span style="color:#1d4ed8">로컬 sanitizer 먼저 적용</span> |
| 8 | 사용자가 다음 입력 가능 | <span style="color:#1d4ed8">필요할 때만 Speech Text LLM 실행</span> |
| 9 | - | <span style="color:#1d4ed8">ElevenLabs TTS 실행</span> |
| 10 | - | <span style="color:#1d4ed8">재생바에 음성 연결</span> |



## 수정 파일

### Backend

| 파일 | 변경 내용 |
|---|---|
| `backend/src/api/audio.py` | 음성 생성 전용 API 로직 추가 |
| `backend/src/django_backend/urls.py` | `/chat/audio/stream` endpoint 추가 |
| `backend/src/agents/speech_text_agent/agent.py` | 로컬 sanitizer, 조건부 Speech Text LLM 호출, 결과 metadata 추가 |
| `backend/src/agents/speech_text_agent/__init__.py` | 새 speech text helper export |
| `backend/src/graph/runner.py` | 채팅 스트림 구간별 timing log 추가 |
| `backend/src/graph/timing.py` | `chat_timing` 공통 로그 helper 추가 |
| `backend/src/graph/graph.py` | speech text 결과에 `source`, `llm_used` 포함 |
| `backend/tests/test_chat_api.py` | sanitizer와 LLM skip 동작 테스트 추가 |

### Frontend

| 파일 | 변경 내용 |
|---|---|
| `frontend/app/api/chat/audio/route.ts` | 프론트에서 백엔드 음성 API로 연결하는 proxy route 추가 |
| `frontend/features/chat/services/chat-stream.ts` | 최종 답변 이후 `data-audioRequest`만 보내고 텍스트 스트림 종료 |
| `frontend/features/chat/hooks/use-chat-session.ts` | 별도 오디오 SSE 수신, 토글 OFF 시 음성 요청 중단, 재생 상태 관리 |
| `frontend/features/chat/components/chat-message-bubble.tsx` | 화면 답변은 Markdown 렌더링 스타일 유지, 음성 sanitizer 결과와 분리 |
| `frontend/features/chat/components/chat-audio-player.tsx` | 실제 음성 chunk가 있을 때만 재생 컨트롤 활성화 |
| `frontend/features/chat/types.ts` | `audioRequest` data type 추가 |
| `frontend/app/globals.css` | Streamdown Markdown 렌더링 스타일 source 추가 |

## 로컬 sanitizer가 하는 일

Speech Text LLM을 매번 부르면 느리기에, 먼저 로컬 코드로 음성에 불필요한 표시 삭제

이 결과는 TTS에만 전달되는 음성용 텍스트입니다.
프론트 화면에 표시되는 답변은 Main Agent의 원본 Markdown 답변을 유지합니다.

예시 입력:

```markdown
## 신청 방법
- **주민센터**에 방문하세요.
- [복지로](https://www.bokjiro.go.kr)에서도 확인할 수 있습니다.
```

음성용 출력, TTS 전달용:

```text
신청 방법 주민센터에 방문하세요. 복지로에서도 확인할 수 있습니다.
```

로컬 sanitizer가 제거하는 것:

| 제거 대상 | 이유 |
|---|---|
| `##`, `-`, `1.` 같은 Markdown 기호 | 음성으로 읽으면 어색함 |
| 링크 URL | 긴 URL을 읽으면 듣기 불편함 |
| 코드 블록 | 일반 답변 음성에는 대부분 불필요함 |
| 표 구분선 | 음성으로 읽을 수 없는 형식 |
| 출처 번호 | 화면에서는 필요하지만 음성에는 방해됨 |

## 언제 Speech Text LLM을 호출하는가?

아래 조건에 해당하면 로컬 sanitizer만으로는 자연스럽지 않을 수 있어서 Speech Text LLM을 호출합니다.

| 조건 | 이유 |
|---|---|
| 음성용 텍스트가 너무 긴 경우 | 짧고 자연스러운 설명으로 줄여야 함 |
| 목록이 많은 경우 | 그냥 읽으면 끊김이 많아짐 |
| 표가 포함된 경우 | 문장으로 풀어 읽어야 함 |
| 링크가 많은 경우 | 화면용 정보와 음성용 정보를 분리해야 함 |
| 코드 블록이 있는 경우 | 코드 설명은 음성 문장으로 재구성해야 함 |

짧고 단순한 답변은 아래처럼 처리됩니다.

```text
최종 답변
  -> 로컬 sanitizer
  -> Speech Text LLM 스킵
  -> ElevenLabs TTS
```

## 측정 결과

### 개선 전 기준

기존 분석에서 측정한 평균값입니다.

| 사용자 체감 구간 | 음성 OFF | 음성 ON |
|---|---:|---:|
| 첫 답변 텍스트 표시 | 5.67s | 5.25s |
| 텍스트/요청 완료 | 8.78s | 11.42s |
| Speech Text 완료 | 없음 | 10.09s |
| 첫 오디오 도착 | 없음 | 10.35s |
| 오디오 완료 | 없음 | 11.42s |

음성 ON일 때는 텍스트 답변 이후에도 Speech Text LLM과 TTS를 기다려야 했습니다.

### 개선 후 smoke test

통합 Docker 실행 후 아래 기준으로 확인했습니다.

| 항목 | 결과 |
|---|---:|
| `/api/chat` TTFB | 2.40s |
| `/api/chat` Total | 2.94s |
| `/api/chat` `data-audioRequest` | 1개 |
| `/api/chat` `data-audio` | 0개 |
| `/api/chat/audio` TTFB | 0.013s |
| `/api/chat/audio` Total | 0.58s |
| `/api/chat/audio` audio chunks | 40개 |
| 짧은 답변 Speech Text LLM | `llm_used: false` |

핵심 확인 내용:

- 텍스트 채팅 응답 안에는 오디오 chunk가 더 이상 포함되지 않습니다.
- 텍스트 답변이 끝나면 별도 `audioRequest`가 내려갑니다.
- 음성은 `/api/chat/audio`에서 따로 생성됩니다.
- 짧은 답변은 Speech Text LLM을 건너뜁니다.

## 구간별 로그 확인 방법

통합 Docker 실행 중에는 아래 명령으로 확인할 수 있습니다.

```bash
docker logs skn28-backend --since 5m | rg 'chat_timing'
```

예시 로그:

```json
{"event":"chat_timing","phase":"main_agent_start","elapsed_ms":0,"audio_enabled":false}
{"event":"chat_timing","phase":"first_delta","elapsed_ms":1814,"audio_enabled":false}
{"event":"chat_timing","phase":"final","elapsed_ms":2354,"audio_enabled":false}
{"event":"chat_timing","phase":"audio_request_start","elapsed_ms":0,"audio_enabled":true}
{"event":"chat_timing","phase":"speech_text_done","elapsed_ms":1,"script_source":"local","llm_used":false}
{"event":"chat_timing","phase":"first_audio","elapsed_ms":494,"audio_enabled":true}
{"event":"chat_timing","phase":"audio_done","elapsed_ms":572,"audio_enabled":true}
```

주요 phase:

| phase | 의미 |
|---|---|
| `main_agent_start` | 메인 에이전트 답변 생성 시작 |
| `first_delta` | 첫 텍스트 조각이 나온 시점 |
| `final` | 최종 텍스트 답변이 완성된 시점 |
| `audio_request_start` | 별도 음성 생성 요청 시작 |
| `speech_text_done` | 음성용 텍스트 준비 완료 |
| `first_audio` | 첫 오디오 chunk 도착 |
| `audio_done` | 음성 생성 완료 |

병목 확인 기준:

| 느린 구간 | 확인할 로그 차이 | 의심 병목 |
|---|---|---|
| 질문 후 첫 글자가 늦음 | `main_agent_start` -> `first_delta` | Main Agent, RAG, tool 호출 |
| 최종 답변 완성이 늦음 | `first_delta` -> `final` | 답변 생성 토큰 수, 모델 응답 속도 |
| 음성용 문장 준비가 늦음 | `audio_request_start` -> `speech_text_done` | Speech Text LLM 호출, sanitizer 조건 |
| 첫 소리가 늦음 | `speech_text_done` -> `first_audio` | ElevenLabs TTS 시작 지연 |
| 소리 전체 완료가 늦음 | `first_audio` -> `audio_done` | TTS 길이, 오디오 chunk 전송량 |

로그가 찍히는 코드 위치:

| 파일 | 로그 역할 |
|---|---|
| `backend/src/graph/timing.py` | `chat_timing` 공통 로그 생성 |
| `backend/src/graph/runner.py` | 메인 채팅 스트림의 `main_agent_start`, `first_delta`, `final` 기록 |
| `backend/src/api/audio.py` | 별도 음성 스트림의 `audio_request_start`, `speech_text_done`, `first_audio`, `audio_done` 기록 |

## 왜 빨라졌는가

비유하면, 예전에는 선생님이 칠판에 답을 다 쓰고, 그 답을 녹음까지 끝낸 다음에야 "끝났어"라고 말하는 방식이었습니다.

지금은 칠판에 답을 먼저 보여주고, 녹음은 뒤에서 따로 만드는 방식입니다.

그래서 사용자는 답을 더 빨리 볼 수 있고, 음성은 준비되는 대로 재생바에서 들을 수 있습니다.


## 검증 명령

이번 변경 검증에 사용한 명령입니다.

```bash
cd backend && make check
cd backend && make test
cd frontend && make lint
cd frontend && make build
cd deploy/makefile && make up
```

Health check:

```bash
curl -fsS http://127.0.0.1:8100/health
curl -fsS http://127.0.0.1:8110/health
curl -fsS -o /tmp/skn28_chat_page.html -w 'chat HTTP %{http_code}\n' http://127.0.0.1:3000/chat
```

Smoke test 핵심:

```bash
curl -sS --max-time 90 \
  -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:3000/api/chat \
  -d '{"id":"split-smoke","audio_enabled":true,"messages":[{"id":"user-1","role":"user","parts":[{"type":"text","text":"안녕하세요. 한 문장으로 짧게 답해주세요."}]}]}'
```

기대 결과:

| 확인 | 기대값 |
|---|---|
| `data-audioRequest` | 있음 |
| `data-audio` | 없음 |
| `finishReason` | `stop` |

별도 음성 API:

```bash
curl -sS --max-time 120 \
  -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:3000/api/chat/audio \
  -d '{"session_id":"split-smoke","turn_id":"manual-audio-smoke","text":"안녕하세요. 무엇을 도와드릴까요?"}'
```

기대 결과:

| 확인 | 기대값 |
|---|---|
| `event: speech_text` | 있음 |
| `event: audio` | 있음 |
| `event: audio_done` | 있음 |
| `llm_used` | 짧은 답변이면 `false` |
