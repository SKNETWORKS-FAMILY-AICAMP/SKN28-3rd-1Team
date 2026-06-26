#!/bin/sh
set -eu

AWS_PROFILE="${AWS_PROFILE:-sknetworksTeam3}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKEND_INFISICAL_PROJECT_ID="${BACKEND_INFISICAL_PROJECT_ID:-f6a512e6-1960-4186-8ece-a3061824c185}"
EXTERNAL_MCP_INFISICAL_PROJECT_ID="${EXTERNAL_MCP_INFISICAL_PROJECT_ID:-237f306b-17b2-4b2c-ad37-bdc78da2300b}"
INFISICAL_ENV="${INFISICAL_ENV:-dev}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-frontend_migration/.env}"

put_secret() {
  secret_name="$1"
  secret_value="$2"

  if [ -z "$secret_value" ]; then
    printf "%s\n" "skip empty secret: $secret_name"
    return
  fi

  if aws secretsmanager describe-secret \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --secret-id "$secret_name" >/dev/null 2>&1; then
    aws secretsmanager put-secret-value \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      --secret-id "$secret_name" \
      --secret-string "$secret_value" >/dev/null
    printf "%s\n" "updated secret: $secret_name"
  else
    aws secretsmanager create-secret \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      --name "$secret_name" \
      --secret-string "$secret_value" \
      --tags Key=Project,Value=SKN28 Key=ManagedBy,Value=Codex >/dev/null
    printf "%s\n" "created secret: $secret_name"
  fi
}

sync_frontend_secret() {
  if [ ! -f "$FRONTEND_ENV_FILE" ]; then
    printf "%s\n" "missing frontend env file: $FRONTEND_ENV_FILE" >&2
    exit 1
  fi

  demo_access_key="$(awk -F= '$1 == "DEMO_ACCESS_KEY" {sub(/^DEMO_ACCESS_KEY=/, ""); print; exit}' "$FRONTEND_ENV_FILE")"
  put_secret "skn28/frontend-migration/DEMO_ACCESS_KEY" "$demo_access_key"
}

sync_backend_secrets() {
  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" infisical run \
    --projectId "$BACKEND_INFISICAL_PROJECT_ID" \
    --env "$INFISICAL_ENV" \
    --path "$INFISICAL_PATH" \
    --silent \
    -- sh -c '
      set -eu
      put_secret() {
        secret_name="$1"
        secret_value="$2"
        if [ -z "$secret_value" ]; then
          printf "%s\n" "skip empty secret: $secret_name"
          return
        fi
        if aws secretsmanager describe-secret --profile "$AWS_PROFILE" --region "$AWS_REGION" --secret-id "$secret_name" >/dev/null 2>&1; then
          aws secretsmanager put-secret-value --profile "$AWS_PROFILE" --region "$AWS_REGION" --secret-id "$secret_name" --secret-string "$secret_value" >/dev/null
          printf "%s\n" "updated secret: $secret_name"
        else
          aws secretsmanager create-secret --profile "$AWS_PROFILE" --region "$AWS_REGION" --name "$secret_name" --secret-string "$secret_value" --tags Key=Project,Value=SKN28 Key=ManagedBy,Value=Codex >/dev/null
          printf "%s\n" "created secret: $secret_name"
        fi
      }
      put_secret "skn28/backend/LLM_PROVIDER_CEREBRAS_API_KEY" "${LLM_PROVIDER_CEREBRAS_API_KEY:-}"
      put_secret "skn28/backend/LLM_PROVIDER_OPENROUTER_API_KEY" "${LLM_PROVIDER_OPENROUTER_API_KEY:-}"
      put_secret "skn28/backend/LLM_PROVIDER_OPENAI_API_KEY" "${LLM_PROVIDER_OPENAI_API_KEY:-}"
      put_secret "skn28/backend/ELEVENLABS_API_KEY" "${ELEVENLABS_API_KEY:-}"
      put_secret "skn28/backend/LANGSMITH_API_KEY" "${LANGSMITH_API_KEY:-}"
      put_secret "skn28/backend/ELEVENLABS_VOICE_ID" "${ELEVENLABS_VOICE_ID:-}"
      put_secret "skn28/backend/LLM_PROVIDER_OPENROUTER_APP_TITLE" "${LLM_PROVIDER_OPENROUTER_APP_TITLE:-}"
      put_secret "skn28/backend/LLM_PROVIDER_OPENROUTER_APP_URL" "${LLM_PROVIDER_OPENROUTER_APP_URL:-}"
      put_secret "skn28/backend/LLM_PROVIDER_OPENROUTER_BASE_URL" "${LLM_PROVIDER_OPENROUTER_BASE_URL:-}"
      put_secret "skn28/backend/LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER" "${LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER:-}"
      put_secret "skn28/backend/LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS" "${LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS:-}"
      put_secret "skn28/backend/LLM_PROVIDER_OPENROUTER_REQUIRE_PARAMETERS" "${LLM_PROVIDER_OPENROUTER_REQUIRE_PARAMETERS:-}"
      put_secret "skn28/backend/RUNTIME_CORS_ORIGINS" "${RUNTIME_CORS_ORIGINS:-}"
      put_secret "skn28/backend/RAG_TOOL_TIMEOUT_MS" "${RAG_TOOL_TIMEOUT_MS:-}"
    '
}

sync_external_mcp_secrets() {
  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" infisical run \
    --projectId "$EXTERNAL_MCP_INFISICAL_PROJECT_ID" \
    --env "$INFISICAL_ENV" \
    --path "$INFISICAL_PATH" \
    --silent \
    -- sh -c '
      set -eu
      put_secret() {
        secret_name="$1"
        secret_value="$2"
        if [ -z "$secret_value" ]; then
          printf "%s\n" "skip empty secret: $secret_name"
          return
        fi
        if aws secretsmanager describe-secret --profile "$AWS_PROFILE" --region "$AWS_REGION" --secret-id "$secret_name" >/dev/null 2>&1; then
          aws secretsmanager put-secret-value --profile "$AWS_PROFILE" --region "$AWS_REGION" --secret-id "$secret_name" --secret-string "$secret_value" >/dev/null
          printf "%s\n" "updated secret: $secret_name"
        else
          aws secretsmanager create-secret --profile "$AWS_PROFILE" --region "$AWS_REGION" --name "$secret_name" --secret-string "$secret_value" --tags Key=Project,Value=SKN28 Key=ManagedBy,Value=Codex >/dev/null
          printf "%s\n" "created secret: $secret_name"
        fi
      }
      put_secret "skn28/external-mcp/EXTERNAL_MCP_NAVER_CLIENT_ID" "${EXTERNAL_MCP_NAVER_CLIENT_ID:-}"
      put_secret "skn28/external-mcp/EXTERNAL_MCP_NAVER_CLIENT_SECRET" "${EXTERNAL_MCP_NAVER_CLIENT_SECRET:-}"
      put_secret "skn28/external-mcp/EXTERNAL_MCP_FIRECRAWL_API_KEY" "${EXTERNAL_MCP_FIRECRAWL_API_KEY:-}"
      put_secret "skn28/external-mcp/EXTERNAL_MCP_TMAP_APP_KEY" "${EXTERNAL_MCP_TMAP_APP_KEY:-}"
    '
}

sync_frontend_secret
sync_backend_secrets
sync_external_mcp_secrets
