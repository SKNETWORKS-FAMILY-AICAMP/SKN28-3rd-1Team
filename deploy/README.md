# Deploy

통합 실행 Makefile, Docker Compose 설정, AWS 배포 준비 파일을 관리합니다. 현재 기본 개발 흐름은 frontend와 backend를 로컬에서 빠르게 띄우는 것이며, Docker Compose 전체 stack은 명시적으로 필요할 때 사용하는 보조 흐름입니다.

## Layout

```text
deploy/
├── aws/         # ECR, CodeBuild, CodePipeline, ECS 배포 준비 파일
├── docker/      # docker-compose.yml, deploy 전용 .env.schema, local .env*
└── makefile/    # 통합 실행 Makefile
```

## AWS Deploy

`deploy/aws/`는 GitHub repository source를 AWS CodePipeline에 연결하고, CodeBuild가 세 개 서비스 이미지를 Amazon ECR에 push한 뒤 ECS Fargate service를 갱신하는 배포 흐름을 준비합니다.

현재 대상 이미지는 다음과 같습니다.

| source | ECR repository |
| --- | --- |
| `frontend_migration/` | `skn28/frontend-migration` |
| `backend/` | `skn28/backend` |
| `external_mcp/` | `skn28/external-mcp` |

ECR repository 생성은 아래 스크립트를 사용합니다.

```bash
AWS_PROFILE=sknetworksTeam3 AWS_REGION=us-east-1 ./deploy/aws/scripts/create-ecr-repositories.sh
```

CodeBuild buildspec은 `deploy/aws/buildspec.yml`입니다. Docker build는 로컬 macOS가 아니라 AWS CodeBuild의 privileged Linux 환경에서 실행합니다.

## Compose Services

`deploy/docker/docker-compose.yml`은 compose 실행 시 아래 서비스를 같은 Docker network인 `deploy_default`에 올립니다.

- `frontend`: Next.js 최종 프론트엔드
- `backend`: Main Agent Django Channels service
- `rag-be`: RAG Backend + FastMCP Streamable HTTP endpoint
- `rag-fe`: RAG 운영 UI
- `memgraph`: GraphRAG DB
- `lab`: Memgraph Lab
- `redis`: RAG job observability stream

`rag/related/rag-red-team`은 이 통합 stack에 포함하지 않습니다.
`streamlit` 서비스는 `streamlit_3rd/` 기반 legacy profile입니다. 현재 scope가 아니므로 명시적으로 필요할 때만 `make up-legacy`로 실행합니다.

## Make

Make가 설치되어 있으면 raw `bun`, `uv`, `docker compose` 명령보다 Makefile target을 우선 사용합니다. 통합 Makefile의 기본 help는 local dev target을 먼저 보여줍니다.

```bash
cd deploy/makefile
make dev              # frontend + backend local dev 동시 실행
make fe               # frontend local dev만 실행
make be               # backend local dev만 실행

make compose-up       # Docker Compose 전체 현재 scope 서비스 시작
make compose-up-legacy  # legacy streamlit_3rd까지 포함해 시작
make compose-ps       # 컨테이너 상태 확인
make compose-logs     # 로그 확인
make compose-down     # 중지
make compose-clean    # 중지 + volume 제거
```

이 로컬 환경에서는 `GNU Make 3.81`이 확인되었습니다. Make가 없는 macOS 환경에서는 Xcode Command Line Tools(`xcode-select --install`) 또는 Homebrew(`brew install make`)로 설치합니다. Linux는 배포판 패키지 매니저(`sudo apt install make`, `sudo dnf install make` 등)를 사용합니다.

## Local Dev

통합 local dev target은 서비스별 Makefile을 호출합니다. RAG, Memgraph, Redis, legacy `_3rd` 서비스는 자동으로 띄우지 않습니다. Backend secret 주입과 env 검증은 `backend/Makefile`의 Infisical + Varlock target을 그대로 사용합니다.

```bash
cd deploy/makefile
make fe   # frontend/Makefile dev
make be   # backend/Makefile dev
make dev  # fe + be 병렬 실행
```

기본 local dev 접속 정보:

| service | URL |
| --- | --- |
| Frontend | `http://127.0.0.1:3000` |
| Backend | `http://127.0.0.1:8000` |

포트를 바꿔야 하면 통합 Makefile 변수로 지정합니다.

```bash
make fe FRONTEND_PORT=3001
make be BACKEND_PORT=8100
make dev FRONTEND_PORT=3001 BACKEND_PORT=8100
```

`make dev`는 먼저 `backend/Makefile`의 `env-check`를 호출해 Infisical/Varlock 접근을 확인한 뒤 frontend와 backend를 병렬로 실행합니다. 두 서비스 로그가 같은 터미널에 함께 출력되므로, 로그를 분리해서 보고 싶으면 `make fe`와 `make be`를 터미널 두 개에서 각각 실행합니다.

## Compose Env Files

`deploy/docker/.env.schema`가 통합 deploy env field의 기준입니다. 실제 환경 변수 파일은 `deploy/docker/` 아래에 생성되며 `.gitignore` 대상입니다. 이 env 준비 흐름은 Docker Compose stack을 실행할 때 필요합니다.

```bash
cd deploy/makefile
make env-check
make env
```

`make env`는 아래 파일을 준비합니다.

| 파일 | 역할 |
| --- | --- |
| `deploy/docker/.env` | Compose project의 host bind/port와 public build args. `deploy/docker/.env.schema`에서 생성 |
| `deploy/docker/.env_backend` | backend container env file. Infisical/provider export 또는 ignored local env로 생성 |
| `deploy/docker/.env_rag_be` | RAG backend container env file. Infisical/provider export 또는 ignored local env로 생성 |
| `deploy/docker/.env_streamlit` | legacy profile 전용. `make up-legacy` 때만 필요 |

`make env`는 `deploy/docker/.env`만 schema에서 생성합니다. `deploy/docker/.env_backend`와 `deploy/docker/.env_rag_be`가 없으면 기존 ignored local env 파일을 복사하거나, 없을 때는 명시적으로 실패합니다. 삭제된 `.env.example`을 fallback으로 만들지 않습니다.

Varlock은 `deploy/docker/.env.schema`, `backend/.env.schema`, `rag/be/.env.schema`, `rag/fe/.env.schema`를 schema별로 검증합니다. local `.env` 값을 직접 열어보지 말고 `make env-check` 또는 `varlock load --agent`를 사용합니다.

통합 Docker 실행은 host의 `backend/.venv` 또는 `rag/be/.venv`를 사용하지 않습니다. 각 Python image는 Docker build 중 lock file 기준으로 컨테이너 내부 `/app/.venv`를 만들며, host `.venv/`는 `.dockerignore` 대상입니다.

## Compose Run

```bash
cd deploy/makefile
make compose-up
```

기본 host 포트:

| service | URL |
| --- | --- |
| Frontend | `http://127.0.0.1:3000` |
| Backend | `http://127.0.0.1:8100` |
| RAG Backend | `http://127.0.0.1:8110` |
| RAG Frontend | `http://127.0.0.1:5174` |
| Memgraph Lab | `http://127.0.0.1:3001` |
| Memgraph Bolt | `bolt://127.0.0.1:7687` |
| Redis | `redis://127.0.0.1:6379/0` |

통합 deploy의 기본값은 Frontend가 `3000`, Memgraph Lab이 `3001`을 사용합니다. 기존 `deploy/docker/.env`가 남아 있다면 `MEMGRAPH_LAB_PORT=3001`인지 확인합니다.

Docker network 내부 연결:

```text
frontend -> backend host publish URL 또는 browser에서 Backend API 호출
backend -> http://rag-be:8010/mcp
rag-be -> bolt://memgraph:7687
rag-be -> redis://redis:6379/0
```

Legacy profile을 켠 경우에만 `streamlit -> http://backend:8000` 연결이 추가됩니다. 기존 호환용으로 `make up`, `make down`, `make ps`, `make logs` 같은 alias가 남아 있지만 새 문서와 기본 help에서는 명시적인 `compose-*` target을 사용합니다.

## Check

Local dev 상태 확인:

```bash
curl -s http://127.0.0.1:3000/ | head
curl -s http://127.0.0.1:8000/health
```

Compose stack 상태 확인:

```bash
cd deploy/makefile
make compose-ps
curl -s http://127.0.0.1:8100/health
curl -s http://127.0.0.1:8110/health
curl -s http://127.0.0.1:5174/ | head
```

Legacy Streamlit profile을 켠 경우 `curl -s http://127.0.0.1:8501/_stcore/health`도 확인합니다.

Docker network 내부에서 MCP tool 목록을 확인합니다.

```bash
docker compose --env-file ../docker/.env -f ../docker/docker-compose.yml exec -T backend python - <<'PY'
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient

async def main():
    client = MultiServerMCPClient({
        "rag": {"transport": "http", "url": "http://rag-be:8010/mcp"}
    })
    tools = await client.get_tools(server_name="rag")
    print([tool.name for tool in tools])

asyncio.run(main())
PY
```

`/chat`은 실제 LLM 호출이므로 `deploy/docker/.env_backend`의 선택 provider용 `LLM_PROVIDER_*_API_KEY`가 유효해야 합니다. API key가 없거나 만료되면 backend는 MCP tools를 로드한 뒤 provider 호출에서 인증 오류를 반환합니다.
