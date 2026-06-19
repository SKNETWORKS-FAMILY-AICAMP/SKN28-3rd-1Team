# Ops Requirement List

Last reviewed: 2026-06-18

이 문서는 팀원이 서버 계정에서 Codex, MCP, secret/env workflow를 사용할 때 필요한 설치 항목과 확인해야 하는 reference를 정리한다. 로컬 개발 환경에도 대부분 동일하게 적용되지만, 기준은 서버의 각 Linux user 계정이다.

## Scope

- 서버 user별 CLI bootstrap
- Codex MCP client 설정 요구사항
- Figma MCP, Infisical Docs MCP, Infisical API MCP 연결 요구사항
- Varlock + Infisical 기반 env 주입 요구사항
- `.agents/skills/` 또는 `skills.sh` 기반 skill 설치 요구사항

실제 token, client secret, `.env`, `.env.local`, `~/.codex/config.toml`의 개인 secret 값은 이 repo에 기록하지 않는다.

## Required Installs

| Category | Tool | Required for | Server requirement |
| --- | --- | --- | --- |
| Base | `git` | repository clone, branch work | Required |
| Base | `make` | repo-standard start/check/deploy entrypoint | Required |
| Base | `curl`, `wget`, `unzip` | official installer scripts and Bun install | Required |
| Python | `uv` | `backend/`, `rag/be/` Python env, `.venv`, commands | Required |
| JavaScript | `node`, `npm`, `npx` | MCP stdio servers, skills installer, JS tools | Required |
| JavaScript | `bun` | `frontend/`, `rag/fe/` install/start/build | Required |
| Container | Docker Engine + Compose plugin | `deploy/docker`, `rag/infra` | Required when running Docker workflows |
| Env | `varlock` CLI | `.env.schema` validation and `varlock run` Makefile targets | Required |
| Secret provider | `infisical` CLI | provider-backed secret injection via `infisical run` | Required once Infisical is wired into Makefile flow |
| Agent | `codex` CLI/App | MCP client app and agent runtime | Required for server-side Codex work |
| Agent skill | `gh` with `gh skill` or `npx skills` | installing/updating agent skills | Required if `skills.sh` uses it |

## Fedora/RHEL-Like Install Notes

The server OS should be confirmed before writing an automated bootstrap script. If the server is Fedora/RHEL-like, use the following as the expected direction, not as a blindly executed script.

```bash
# base packages
sudo dnf install -y git make curl wget unzip
```

Node.js and npm should be installed with the server team's chosen version policy. For this repo, prefer a currently supported Node.js version and verify that `node`, `npm`, and `npx` are all available. If Varlock is installed as a JavaScript dependency instead of a standalone binary, Node.js 22 or higher is required by Varlock.

```bash
# uv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

```bash
# bun
curl -fsSL https://bun.com/install | bash
```

```bash
# Codex CLI
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

```bash
# Varlock standalone CLI
curl -sSfL https://varlock.dev/install.sh | sh -s
```

```bash
# Infisical CLI, RHEL-style official repository path
curl -1sLf 'https://artifacts-cli.infisical.com/setup.rpm.sh' | sudo -E bash
sudo yum install infisical
```

Docker should follow the official Fedora Docker Engine guide. The expected packages are:

```bash
sudo dnf config-manager addrepo --from-repofile https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

If team members should run Docker without `sudo`, the server admin must handle Docker group membership and the required re-login. Do not assume all accounts already have Docker socket access.

## Version And Access Checks

Each server account should pass these checks before project work:

```bash
git --version
make --version
uv --version
node --version
npm --version
npx --version
bun --version
docker --version
docker compose version
varlock --version
infisical --version
codex --version
```

Repo-level checks:

```bash
cd /path/to/SKN28-3rd-1Team
make --version
cd backend && make env-check
cd ../rag && make env-check
```

If a Makefile target exists, prefer `make` over raw `uv`, `bun`, `docker compose`, or `varlock` commands.

## Env And Secret Flow

Current repo state:

- `.env.schema` is the version-controlled env contract.
- Real `.env`, `.env.local`, generated deploy env files, tokens, and client secrets stay local only.
- Varlock validates schema and safely reports contract issues.
- Backend runtime is wired through Infisical CLI for shared secret/config injection.
- Other services should move to the same Infisical CLI pattern after their target project scope is identified.

Target flow for services that are wired to Infisical:

```bash
infisical run --env=<env> --path=<project-path> -- varlock load --agent --path <schema-path>
infisical run --env=<env> --path=<project-path> -- <service-command>
```

Order matters. Infisical should provide values first, then Varlock should validate according to `.env.schema`.

Server account auth options:

| Use case | Recommended auth |
| --- | --- |
| Human developer account | `infisical login`, or `infisical login -i` on headless/SSH environments |
| Shared server automation | Infisical Machine Identity Universal Auth |
| MCP access to Infisical APIs | Machine Identity Universal Auth preferred |

Do not write raw secret values into shell history, committed config, docs, screenshots, or issue comments.

## Codex MCP Requirements

Codex reads MCP server configuration from `~/.codex/config.toml` by default. Project-scoped `.codex/config.toml` can be used only for trusted projects, but server account setup should start with the user-level config because credentials and login state are per account.

### Figma MCP

Preferred setup:

1. Install Codex.
2. In Codex app Plugins, install Figma.
3. Complete Figma OAuth/authentication for the specific user account.

Server/headless fallback:

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
http_headers = { "X-Figma-Region" = "us-east-1" }
```

Credential requirement:

- `FIGMA_OAUTH_TOKEN` or Codex-managed OAuth login state.
- If OAuth callback is required on a remote server, define the accessible callback port/URL before onboarding users.

### Infisical Docs MCP

This MCP is for Infisical documentation lookup only and does not require authentication.

```toml
[mcp_servers.infisical_docs]
url = "https://infisical.com/docs/mcp"
```

### Infisical API MCP

This MCP can call Infisical APIs and requires authentication. Prefer forwarding env vars from the server account environment instead of writing secret values directly into Codex config.

```toml
[mcp_servers.infisical]
command = "npx"
args = ["-y", "@infisical/mcp"]
env_vars = [
  "INFISICAL_HOST_URL",
  "INFISICAL_AUTH_METHOD",
  "INFISICAL_UNIVERSAL_AUTH_CLIENT_ID",
  "INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET",
  "INFISICAL_TOKEN",
]
```

Universal Auth variables:

```txt
INFISICAL_HOST_URL
INFISICAL_UNIVERSAL_AUTH_CLIENT_ID
INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET
```

Access token variables:

```txt
INFISICAL_HOST_URL
INFISICAL_AUTH_METHOD=access-token
INFISICAL_TOKEN
```

`INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET` and `INFISICAL_TOKEN` are secrets. They must not be committed or pasted into shared chat.

## Skill Installation Requirements

Project-scoped skills are committed under `.agents/skills/` and should remain the canonical repo source.

The requested `skills.sh` flow should do one of the following:

- Copy approved skills into `.agents/skills/` from a controlled source.
- Or install user-level Codex skills with `gh skill install ... --agent codex` or `npx skills add ...`.

Minimum skill coverage for this ops flow:

| Skill | Purpose | Current state |
| --- | --- | --- |
| `varlock` | env schema, redaction, safe secret handling | Present in `.agents/skills/varlock/` |
| `figma-use` | Figma MCP write-to-canvas and Plugin API workflows | Present in `.agents/skills/figma-use/` |
| `infisical-setup` | Infisical CLI/MCP/provider setup conventions | Present in `.agents/skills/infisical-setup/` |
| `infisical-api` | Infisical REST API and machine identity auth guidance | Present in `.agents/skills/infisical-api/` |

Before installing third-party skills, inspect the skill content. Agent skills are executable instructions for agents and should be treated as supply-chain inputs.

Use `scripts/skills.sh` from the repository root to install the approved project-scoped skills for Codex. Set `FORCE=1` only when intentionally refreshing existing skill directories.

## Required Reference List

Read these before implementing the server bootstrap script or changing Makefile/env integration:

| Area | Reference |
| --- | --- |
| Codex CLI install | https://developers.openai.com/codex/cli |
| Codex MCP config | https://developers.openai.com/codex/mcp |
| Figma MCP for Codex | https://help.figma.com/hc/en-us/articles/39888629089175-Codex-and-Figma-Set-up-the-MCP-server |
| Infisical CLI install | https://infisical.com/docs/cli/overview |
| Infisical CLI quickstart | https://infisical.com/docs/cli/usage |
| Infisical Docs MCP | https://infisical.com/docs/ai/model-context-protocol |
| Infisical API MCP | https://github.com/Infisical/infisical-mcp-server |
| Varlock install | https://varlock.dev/getting-started/installation/ |
| uv install | https://docs.astral.sh/uv/getting-started/installation/ |
| Bun install | https://bun.com/docs/installation |
| Docker Engine on Fedora | https://docs.docker.com/engine/install/fedora/ |
| Node.js download | https://nodejs.org/en/download |
| npm install guidance | https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/ |
| GitHub `gh skill` preview | https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/ |

Repo-local references:

| Area | File |
| --- | --- |
| Agent rules | `AGENTS.md` |
| Agent workspace guide | `docs/agent_guidelines/agent_workspace_guidelines.md` |
| Env policy | `README.md`, section 12 |
| Project skills | `.agents/skills/README.md` |
| Varlock skill | `.agents/skills/varlock/SKILL.md` |

## Open Decisions Before Automation

- Confirm server OS and package manager. Current notes assume Fedora/RHEL-like Linux.
- Decide whether Infisical API MCP is needed for all users or only maintainers.
- Decide whether Figma MCP on server accounts should use Codex plugin OAuth, manual `FIGMA_OAUTH_TOKEN`, or a callback URL flow.
- Decide whether additional Figma skills such as `figma-generate-design` or `figma-code-connect` are needed beyond `figma-use`.
- Decide whether additional Infisical skills such as `infisical-agent` or `infisical-secret-syncs` are needed beyond `infisical-setup` and `infisical-api`.
- Decide whether Makefile provider integration should be added as `infisical run -- varlock run -- ...` in each service Makefile or as a wrapper target.

## Non-Goals

- Do not store real secrets in this repository.
- Do not commit user-level Codex config.
- Do not commit generated `.env` files.
- Do not modify server-global MCP, shell, or Docker permissions without explicit admin approval.
