# AGENTS.md

## Repo Scope

This repository is a monorepo for the bootcamp project. The current active scope is:

```txt
bootcamp-project/
├── frontend/      # 실제 프론트엔드
├── backend/       # 메인 백엔드 서비스
├── rag/           # RAG / 문서 파싱 / MCP 관련 작업
│   └── related/   # 이전 RAG 관련 자료와 보조 프로젝트
├── presentation/  # 발표 자료와 산출물
├── deploy/        # 통합 배포 실행 관리
│   ├── docker/    # Docker Compose와 deploy env 파일
│   └── makefile/  # 통합 실행 Makefile
├── docs/          # 프로젝트 문서
└── README.md      # 전체 프로젝트 설명
```

Directories with the `_3rd` postfix, such as `streamlit_3rd/`, are legacy/non-current scope. Do not treat them as active project scope, and do not modify, run, or use them unless the user explicitly asks.

`.env.schema` files are the version-controlled contract for environment variables. `.env.example` files may remain as legacy/reference examples inside service directories, but new env field changes should update the relevant `.env.schema` first. Do not add a root-level `.env.example` unless the team explicitly changes this policy.


## Shared Rules

- Read the relevant code, README, docs, and skill files before changing behavior.
- Prefer the smallest correct change.
- Keep unrelated changes in separate branches and separate pull requests.
- Do not edit generated build output unless explicitly requested.
- Maintain README files as Markdown documents.
- Update the root `README.md` and the relevant directory README when structure, setup, or run commands change.
- Prefer Makefile targets for setup, run, check, and deploy workflows when a Makefile exists. Use raw `uv`, `bun`, or `docker compose` commands only when debugging the Makefile itself or when no target exists.
- Do not commit secrets. Real `.env`, `.env.local`, and generated deploy env files stay local only.
- Use Varlock for env schema validation and command env injection when a Makefile target provides it. Do not read local `.env` files directly; use `varlock load --agent` when env inspection is needed.
- If existing uncommitted changes appear to belong to someone else, do not overwrite them. Ask first.

## Project Skills

Project-scoped skills are committed under `.agents/skills/` and are the canonical shared skill source for this repo.
Keep skills for reusable agent workflows. Static repo structure rules live in this file, and README/documentation rules live in shared rules and the relevant docs.

Use these skills when relevant:

- `fastapi`: FastAPI API and Pydantic model best practices.
- `gh-cli`: GitHub CLI operations for repositories, issues, pull requests, Actions, and related workflows.
- `git-commit`: diff analysis, staging guidance, and commit message generation.
- `git-workflow`: branch, commit, and pull request decisions.
- `github-issues`: GitHub issue creation, updates, labels, metadata, dependencies, and workflows.
- `prd`: product requirements document creation and refinement.
- `shadcn`: shadcn/ui component usage, styling, customization, and project guidance.
- `uv-python`: repo-specific Python setup and dependency management with uv.
- `varlock`: secure env schema, validation, secret masking, and command injection workflows.
- `web-design-guidelines`: Vercel-sourced UI, UX, and accessibility review guidance.

Skill adapter directories for specific tools or agents are local-only unless the team explicitly approves committing them. Generated or personal directories such as `.claude/`, `.codex/`, `.gemini/`, `.factory/`, and `.opencode/` must not be committed.

## Figma Workflow

- For Figma-related design, UI, screen, component, or design-system work, use the team [`main`](https://www.figma.com/design/q4QlpCGwPqi0eTSRXGs54E/main) file as the default source of truth unless the user explicitly provides a different Figma file.
- The default Figma file key is `q4QlpCGwPqi0eTSRXGs54E`.

## Git Workflow

This repo uses GitHub Flow.

- Do not work directly on `main` after the initial repository bootstrap unless the user explicitly requests it.
- Before starting work, check that the current branch matches the requested scope.
- Branch from the latest `main` for new work.
- Use short kebab-case branch names with a clear prefix:
  - `feature/<topic>`
  - `fix/<topic>`
  - `docs/<topic>`
  - `chore/<topic>`
  - `refactor/<topic>`
- If the task is unrelated to the current branch, move the work to a separate branch before implementation.
- If the user appears to be branching off while having uncommitted or unpushed work for a different feature, ask:

> 구현하려는 기능이 달라 보이는데, 혹시 push 한 다음에 진행하시는 건가요? 아니면 같은 기능 개발하시는건가요? 같은 기능이라면 동일한 branch 에서 진행해 주세요.

### Commit Rules

- Commit only after a logical unit of work is complete.
- Run the relevant basic checks before committing when they exist.
- Do not mix unrelated frontend, backend, RAG, Streamlit, deploy, or docs changes in one commit.
- Avoid WIP commits unless the user asks for a checkpoint or handoff commit.
- Commit messages must be written in Korean.

### Atomic Commit Rules

- One commit should have one clear reason to exist.
- Split unrelated changes by service, domain, or workflow even when they are edited in the same session.
- Keep code, config, docs, and binary assets in separate commits unless the docs/assets directly explain the same change.
- Stage files intentionally. Review `git diff --staged` before committing.
- Do not sweep ignored files, local notes, generated output, or personal adapter config into a commit.
- If a task grows beyond the current branch scope, create or update a GitHub issue and move the extra work to a separate branch.

### Pull Request Rules

- Open PRs from a feature/fix/docs/chore/refactor branch into `main`.
- Keep PRs small enough to review.
- PR descriptions should include:
  - summary of changes
  - test/check results
  - affected directories
  - environment-variable or migration notes, if any
  - screenshots or screen recordings for UI changes, if useful
- Request review before merge. Do not self-merge unless the team explicitly allows it.

## Python Toolchain

Python projects in this repo must use `uv`.

- Use `uv init`, `uv add`, `uv sync`, `uv lock`, and `uv run`.
- Do not use `pip`, `pip3`, Poetry, or root-level `requirements.txt` for project dependency management.
- Current Python services are `backend/` and `rag/be/`; each manages its own `pyproject.toml`, `uv.lock`, `.python-version`, and `.venv/`.
- Keep virtual environments local. Do not commit `.venv/`.
- Do not run Python commands with the repository-root Python interpreter.
- Prefer service Makefile targets when they exist; those targets run `uv sync` before Python commands:
  - `cd backend && make start`
  - `cd rag && make be-start`
- When a raw uv command is needed, first move into the target Python service directory:
  - `cd backend && uv sync && uv run <command>`
  - `cd rag/be && uv sync && uv run <command>`
- AI agents must choose the Python environment based on the file they are editing. A file under `backend/` uses `backend/.venv/bin/python`, and a Python file under `rag/be/` uses `rag/be/.venv/bin/python`.
- Directories ending in `_3rd` are not current Python scope. Do not run `uv sync`, tests, or language-server setup there unless explicitly requested.
- If a service `.venv/` does not exist, run `uv sync` inside that service directory before running Python, tests, or language-server-dependent commands.

## VS Code Workspace

- Open `SKN28-3rd-1Team.code-workspace` from the repository root when using VS Code.
- The active Python workspace scope is `backend/` and `rag/`; `rag/.vscode/settings.json` points Python tooling to `rag/be/.venv/bin/python`.
- When opening Python files, prefer the service folder entry in the workspace explorer, such as `backend/src/...` or `rag/be/src/...`, instead of the duplicated `repo-root/...` path.
- Service-local VS Code settings for current Python services live in `backend/.vscode/settings.json` and `rag/.vscode/settings.json`.
- `streamlit_3rd/` may contain legacy VS Code settings, but it is outside the current workspace scope.

## Tool And MCP Configuration

- Do not proactively inspect or modify global tool, MCP, or coding-agent configuration just because a matching tool might be useful.
- Check project configuration first.
- Only inspect or modify user-global configuration after the user explicitly asks for that setup.
- If a required tool or MCP server is missing, explain what needs to be installed or configured before changing global state.

# additional notes:
for user specific rules, read instructions.md in project root


# Additionals
for more additional guides, read agent_guidelines/ directory
