---
name: env-var-governance
description: Use when changing, reviewing, migrating, or documenting repository environment variables, `.env.schema` files, Infisical secrets/config, Varlock validation, Docker/deploy env wiring, or LLM provider/agent/model settings. This includes env var naming, deciding whether a value belongs in Infisical or schema defaults, comparing Infisical with `.env.schema`, and avoiding secret exposure.
---

# Env Var Governance

## Overview

Use this skill to keep env vars, Infisical, and Varlock schemas consistent across the active repo. Treat `.env.schema` as the version-controlled contract and Infisical as the secret manager for actual secrets and environment-specific runtime config.

## Workflow

1. Read `AGENTS.md`, the relevant service README, and the target `.env.schema`.
2. If LLM, agent, model, or provider settings are involved, read `docs/llm_env_naming_convention.md`.
3. Check whether `infisical` and `varlock` are installed before runtime injection, validation, migration, or secret-management commands.
4. Compare code usage, schema keys, and Infisical keys by name only. Do not print or summarize secret values.
5. Decide ownership before editing:
   - `.env.schema`: committed contract, public defaults, non-secret schema-only knobs, sensitive key declarations.
   - Infisical: actual secrets and environment-specific runtime config read by the active service.
   - deploy/docker env files: compose binding and deployment-only values, not active application secrets unless explicitly requested.
6. Make the smallest scoped change and update docs when names, setup, or run commands change.
7. Validate with the service Makefile target when available, or `varlock load --agent --path <service>` when only schema validation is needed.

## Secret Safety

- Do not read `.env`, `.env.local`, `.env.*.local`, generated deploy env files, or terminal output that may contain secret values.
- Safe files to read/edit include `.env.schema`, README files, and committed docs.
- Use `varlock load --agent` for redacted validation output.
- When using Infisical MCP, list keys or get metadata only when needed. Never paste secret values into chat, docs, commits, PRs, or logs.
- Before creating, renaming, updating, or deleting an Infisical secret, confirm the project, environment, secret path, and key name unless the user already provided all of them.

## Naming Rules

- Use `.env.schema` first for new env contracts. Do not add new `.env.example` files.
- Do not add root-level env examples unless the team explicitly changes policy.
- Use service ownership prefixes such as `RUNTIME_*`, `RAG_*`, `ELEVENLABS_*`, and `LLM_*`.
- For LLM settings, follow `docs/llm_env_naming_convention.md`:
  - agent model selection: `LLM_AGENT_<AGENT>_<FIELD>`;
  - provider configuration: `LLM_PROVIDER_<PROVIDER>_<FIELD>`;
  - shared request controls: `LLM_REQUEST_<FIELD>`;
  - shared generation caps: `LLM_RESPONSE_<FIELD>`.
- Do not mix deployment-only ports, host binds, image names, or container names into active service LLM namespaces.

## Infisical Rules

- Use project type `secret-manager` when listing Infisical projects.
- Current active secret-manager scopes are documented in `AGENTS.md`.
- Use Infisical CLI for runtime injection; do not use MCP as the injection mechanism for app processes, Docker containers, or deploy commands.
- Store sensitive API keys, access tokens, private credentials, JWT/session/webhook signing secrets, and credential-bearing DSNs as sensitive values.
- Non-secret runtime config may live in Infisical only when the active service reads it and environment-specific centralization is useful.
- Do not create or fill Infisical values for `deploy/docker` or compose-only binding values unless the user explicitly asks.

## Validation

Prefer Makefile targets:

```bash
cd backend && make env-check
cd rag && make env-check
cd rag/be && make env-check
```

When no target exists, validate with Varlock directly:

```bash
varlock load --agent --path backend
```
