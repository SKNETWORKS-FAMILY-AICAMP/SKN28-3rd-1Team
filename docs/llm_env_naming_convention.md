# LLM Environment Variable Naming Rules

This document defines reusable naming rules for LLM-related environment variables. Use it for any service, agent, harness, or tool that configures LLM providers, model selection, request limits, or provider credentials.

Keep service-specific transition notes in the implementation PR, issue, or service README instead of this naming rules document.

## Goals

- Separate which agent uses a model from how a provider is contacted.
- Keep provider credentials separate from agent model selection.
- Keep shared request limits separate from provider-specific settings.
- Avoid promoting provider constructor defaults into env vars unless the project owns that runtime contract.
- Keep `.env.schema` as the committed contract and Infisical as the source for secrets and environment-specific runtime values.

## Core Principles

1. Name by ownership and purpose, not by library class.
   Use `LLM_PROVIDER_OPENROUTER_*`, not `CHATOPENROUTER_*`.

2. Prefer service-local names inside service-local `.env.schema`.
   In a service-local schema, use `LLM_AGENT_MAIN_MODEL`. In a shared root/deploy scope where multiple services share one env namespace, add the service prefix first, such as `BACKEND_LLM_AGENT_MAIN_MODEL` or `RAG_LLM_AGENT_INGEST_MODEL`.

3. Keep deployment/network values out of `LLM_`.
   Use service namespaces such as `RUNTIME_*`, `RAG_*`, `FRONTEND_*`, or deploy schema keys for ports, host binds, image names, container names, and service URLs.

4. Do not add env vars for constructor defaults by habit.
   First check the current package docs/signature and decide whether the value must be operator-controlled.

5. Use examples as examples.
   Example keys in this document are patterns, not required keys for every service.

## Namespace Patterns

Use uppercase snake case. Use stable product/provider slugs and stable logical agent names.

| Scope | Pattern | Examples |
| --- | --- | --- |
| Agent model selection | `LLM_AGENT_<AGENT_ID>_<FIELD>` | `LLM_AGENT_MAIN_PROVIDER`, `LLM_AGENT_JUDGE_MODEL` |
| Provider configuration | `LLM_PROVIDER_<PROVIDER_ID>_<FIELD>` | `LLM_PROVIDER_OPENROUTER_API_KEY`, `LLM_PROVIDER_CEREBRAS_BASE_URL` |
| Shared LLM request controls | `LLM_REQUEST_<FIELD>` | `LLM_REQUEST_TIMEOUT_MS`, `LLM_REQUEST_MAX_RETRIES` |
| Shared LLM response controls | `LLM_RESPONSE_<FIELD>` | `LLM_RESPONSE_MAX_TOKENS` |
| Optional LLM feature flags | `LLM_FEATURE_<FIELD>` | `LLM_FEATURE_TRACE_USAGE` |

Avoid bare provider keys such as `OPENROUTER_API_KEY` or mixed keys such as `LLM_OPENROUTER_*`. New provider-specific values should sit under `LLM_PROVIDER_<PROVIDER_ID>_`.

## Agent Selection

Agent keys answer: "Which provider/model should this logical agent use?"

Required pattern:

```text
LLM_AGENT_<AGENT_ID>_PROVIDER
LLM_AGENT_<AGENT_ID>_MODEL
```

Rules:

- `<AGENT_ID>` is a logical role, not necessarily a Python/TypeScript class name.
- Use stable names such as `MAIN`, `ROUTER`, `JUDGE`, `SPEECH_TEXT`, `SCREEN_CONTROL`, `INGEST`, or `EVALUATOR`.
- Provider values should use canonical slugs such as `openai`, `openrouter`, `cerebras`, `anthropic`, or `google`.
- Model values are provider-specific model identifiers.
- If an agent intentionally inherits another agent's provider/model, document that behavior in code or README instead of creating duplicate env vars.

Illustrative example:

```env
LLM_AGENT_MAIN_PROVIDER="openrouter"
LLM_AGENT_MAIN_MODEL="openai/gpt-4.1-mini"
LLM_AGENT_JUDGE_PROVIDER="cerebras"
LLM_AGENT_JUDGE_MODEL="gpt-oss-120b"
```

## Provider Configuration

Provider keys answer: "How does this service authenticate with or route through a provider?"

Required credential pattern:

```text
LLM_PROVIDER_<PROVIDER_ID>_API_KEY
```

Common optional provider fields:

```text
LLM_PROVIDER_<PROVIDER_ID>_BASE_URL
LLM_PROVIDER_<PROVIDER_ID>_ORG_ID
LLM_PROVIDER_<PROVIDER_ID>_APP_TITLE
LLM_PROVIDER_<PROVIDER_ID>_APP_URL
LLM_PROVIDER_<PROVIDER_ID>_PROVIDER_ORDER
LLM_PROVIDER_<PROVIDER_ID>_ALLOW_FALLBACKS
LLM_PROVIDER_<PROVIDER_ID>_REQUIRE_PARAMETERS
```

Rules:

- Store API keys and private credentials in Infisical as sensitive values.
- Put provider defaults in `.env.schema` only when the code reads them and the default is a useful contract.
- Put non-secret provider values in Infisical only when values differ by environment.
- Keep provider routing values provider-specific. For example, OpenRouter routing belongs under `LLM_PROVIDER_OPENROUTER_*`, not under an agent namespace.

Illustrative example:

```env
LLM_PROVIDER_OPENAI_API_KEY=
LLM_PROVIDER_OPENAI_BASE_URL=""

LLM_PROVIDER_OPENROUTER_API_KEY=
LLM_PROVIDER_OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER='["cerebras"]'
LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS=false

LLM_PROVIDER_CEREBRAS_API_KEY=
LLM_PROVIDER_CEREBRAS_BASE_URL=""
```

## Shared Request and Response Controls

Shared controls answer: "What runtime limits does this service apply to model calls regardless of agent/provider?"

Preferred shared keys:

```text
LLM_REQUEST_TIMEOUT_MS
LLM_REQUEST_MAX_RETRIES
LLM_RESPONSE_MAX_TOKENS
```

Rules:

- Use shared request controls before adding per-agent duplicates.
- Keep `max_retries` and `max_tokens` in `.env.schema` when harnesses, tests, or operations need stable knobs.
- Store these in Infisical only when a specific environment needs an override.
- Use provider-neutral names externally. Map them to provider-specific constructor names inside code.
- Do not add `LLM_RESPONSE_MIN_TOKENS` unless the selected provider constructors expose a real common contract.

Provider mapping examples:

| External key | Typical constructor mapping |
| --- | --- |
| `LLM_REQUEST_TIMEOUT_MS` | `timeout` after converting ms to seconds when needed |
| `LLM_REQUEST_MAX_RETRIES` | `max_retries` |
| `LLM_RESPONSE_MAX_TOKENS` | `max_tokens`, `max_completion_tokens`, or provider-specific equivalent |

## Constructor Default Rubric

Before adding an env var for a model constructor parameter, answer these questions:

1. Does active code read this value?
2. Does the value vary by environment, agent, model, or benchmark harness?
3. Is the provider/library default unsafe, too expensive, too slow, or incompatible with the product requirement?
4. Would changing this at runtime be safer than changing code?
5. Can the value be represented consistently across the providers in use?

If the answer is mostly "no", do not add an env var. Use the constructor default or a code-level constant.

Default decisions for common chat model constructors:

| Parameter | Default rule |
| --- | --- |
| `model` | Env-worthy per agent. |
| `provider` | Env-worthy per agent. |
| `api_key` | Env-worthy per provider; sensitive in Infisical. |
| `base_url` | Env-worthy per provider when proxies, gateways, or OpenAI-compatible endpoints are possible. |
| `timeout` | Env-worthy as a shared request control when operations/harnesses need it. |
| `max_retries` | Env-worthy as a shared request control when operations/harnesses need it. |
| `max_tokens` / `max_completion_tokens` | Env-worthy as a shared response cap when operations/harnesses need it. |
| `temperature` | Do not add by default. Use provider/model constructor defaults or code constants. |
| `reasoning`, `reasoning_effort`, `disable_reasoning` | Do not add by default. Add only for a concrete model behavior requirement. |
| `top_p`, penalties, seed, `n`, stop sequences | Do not add by default. |
| `streaming` | Do not add by default. Treat as transport/implementation behavior. |

## Infisical Placement Rules

Put values in Infisical when they are:

- secrets, credentials, API keys, tokens, private DSNs, signing keys, or passwords;
- environment-specific runtime config that active code reads;
- environment-specific agent provider/model choices that operators need to centralize.

Do not put values in Infisical when they are:

- schema-only defaults that should be identical across environments;
- constructor parameters that are intentionally left to provider defaults;
- deploy-only host binds, image names, container names, or local file paths;
- frontend-public values that belong in the frontend service schema.

Never print, paste, summarize, or document secret values. Compare Infisical and `.env.schema` by key name, type, sensitivity, and presence only.

## Anti-Patterns

Avoid these patterns:

```text
OPENROUTER_API_KEY
CEREBRAS_API_KEY
LLM_OPENROUTER_MODEL
LLM_CHAT_TEMPERATURE
LLM_AGENT_MAIN_CHATOPENROUTER_API_KEY
LLM_PROVIDER_CHATCEREBRAS_API_KEY
LLM_BACKEND_PORT
```

Prefer these patterns:

```text
LLM_PROVIDER_OPENROUTER_API_KEY
LLM_PROVIDER_CEREBRAS_API_KEY
LLM_PROVIDER_OPENAI_API_KEY
LLM_AGENT_MAIN_MODEL
LLM_REQUEST_TIMEOUT_MS
LLM_REQUEST_MAX_RETRIES
LLM_RESPONSE_MAX_TOKENS
RUNTIME_PORT
```

## Adding a New LLM Env Var

1. Read the active service settings code and `.env.schema`.
2. Classify the value as agent selection, provider configuration, shared request control, shared response control, feature flag, or non-LLM deployment/runtime config.
3. Check provider constructor defaults and avoid env vars for values that can safely remain defaulted.
4. Pick the key from the namespace patterns above.
5. Add it to the service `.env.schema` with the correct Varlock sensitivity/type decorators.
6. Add it to Infisical only if the placement rules say it belongs there.
7. Update the service README when setup, runtime behavior, or required config changes.
