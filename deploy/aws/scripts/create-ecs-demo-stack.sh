#!/bin/sh
set -eu

AWS_PROFILE="${AWS_PROFILE:-sknetworksTeam3}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT:-skn28}"
STACK="${STACK:-demo}"
VPC_ID="${VPC_ID:-vpc-016d30a173909810c}"
SUBNET_IDS="${SUBNET_IDS:-subnet-032f38be813b94cf3,subnet-0cabb05a7be8432e4,subnet-0ede9995266f1d20e}"
IMAGE_TAG="${IMAGE_TAG:-e98a9545c088}"
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
CLUSTER_NAME="${PROJECT}-${STACK}-cluster"
NAMESPACE_NAME="${PROJECT}.local"
ALB_NAME="${PROJECT}-${STACK}-alb"
FRONTEND_TG_NAME="${PROJECT}-${STACK}-frontend"
EXECUTION_ROLE_NAME="${PROJECT}-${STACK}-ecs-execution-role"
TASK_ROLE_NAME="${PROJECT}-${STACK}-ecs-task-role"
EXECUTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${EXECUTION_ROLE_NAME}"
TASK_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${TASK_ROLE_NAME}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

aws_cli() {
  aws "$@" --profile "$AWS_PROFILE" --region "$AWS_REGION"
}

comma_to_json_array() {
  printf '%s' "$1" | awk -F, '{
    printf "["
    for (i = 1; i <= NF; i++) {
      gsub(/^ +| +$/, "", $i)
      printf "%s\"%s\"", (i == 1 ? "" : ","), $i
    }
    printf "]"
  }'
}

get_secret_arn() {
  aws_cli secretsmanager describe-secret --secret-id "$1" --query ARN --output text
}

create_role_if_missing() {
  role_name="$1"
  trust_file="$2"

  if aws iam get-role --profile "$AWS_PROFILE" --role-name "$role_name" >/dev/null 2>&1; then
    printf "%s\n" "exists: iam role $role_name"
  else
    aws iam create-role \
      --profile "$AWS_PROFILE" \
      --role-name "$role_name" \
      --assume-role-policy-document "file://$trust_file" >/dev/null
    printf "%s\n" "created: iam role $role_name"
  fi
}

ensure_iam_roles() {
  trust_file="$TMP_DIR/ecs-task-trust.json"
  cat > "$trust_file" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

  create_role_if_missing "$EXECUTION_ROLE_NAME" "$trust_file"
  create_role_if_missing "$TASK_ROLE_NAME" "$trust_file"

  aws iam attach-role-policy \
    --profile "$AWS_PROFILE" \
    --role-name "$EXECUTION_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy >/dev/null 2>&1 || true

  execution_policy="$TMP_DIR/ecs-execution-inline-policy.json"
  cat > "$execution_policy" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:skn28/*"
    }
  ]
}
JSON

  aws iam put-role-policy \
    --profile "$AWS_PROFILE" \
    --role-name "$EXECUTION_ROLE_NAME" \
    --policy-name "${EXECUTION_ROLE_NAME}-secrets" \
    --policy-document "file://$execution_policy" >/dev/null

  aws iam wait role-exists --profile "$AWS_PROFILE" --role-name "$EXECUTION_ROLE_NAME"
  aws iam wait role-exists --profile "$AWS_PROFILE" --role-name "$TASK_ROLE_NAME"
}

ensure_log_group() {
  log_group="$1"
  if aws_cli logs describe-log-groups --log-group-name-prefix "$log_group" --query 'logGroups[?logGroupName==`'"$log_group"'`].logGroupName | [0]' --output text | grep -qx "$log_group"; then
    printf "%s\n" "exists: log group $log_group"
  else
    aws_cli logs create-log-group --log-group-name "$log_group"
    printf "%s\n" "created: log group $log_group"
  fi
  aws_cli logs put-retention-policy --log-group-name "$log_group" --retention-in-days 3
}

ensure_security_group() {
  name="$1"
  description="$2"
  group_id="$(aws_cli ec2 describe-security-groups \
    --filters Name=vpc-id,Values="$VPC_ID" Name=group-name,Values="$name" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)"
  if [ "$group_id" = "None" ]; then
    group_id="$(aws_cli ec2 create-security-group \
      --group-name "$name" \
      --description "$description" \
      --vpc-id "$VPC_ID" \
      --query GroupId \
      --output text)"
    aws_cli ec2 create-tags --resources "$group_id" --tags Key=Project,Value=SKN28 Key=Name,Value="$name" >/dev/null
    printf "%s\n" "created: security group $name $group_id" >&2
  else
    printf "%s\n" "exists: security group $name $group_id" >&2
  fi
  printf "%s" "$group_id"
}

authorize_ingress() {
  group_id="$1"
  protocol="$2"
  port="$3"
  source="$4"

  if [ "$source" = "0.0.0.0/0" ]; then
    aws_cli ec2 authorize-security-group-ingress \
      --group-id "$group_id" \
      --ip-permissions "IpProtocol=${protocol},FromPort=${port},ToPort=${port},IpRanges=[{CidrIp=0.0.0.0/0}]" >/dev/null 2>&1 || true
  else
    aws_cli ec2 authorize-security-group-ingress \
      --group-id "$group_id" \
      --ip-permissions "IpProtocol=${protocol},FromPort=${port},ToPort=${port},UserIdGroupPairs=[{GroupId=${source}}]" >/dev/null 2>&1 || true
  fi
}

ensure_networking() {
  ALB_SG_ID="$(ensure_security_group "${PROJECT}-${STACK}-alb-sg" "SKN28 demo public ALB")"
  FRONTEND_SG_ID="$(ensure_security_group "${PROJECT}-${STACK}-frontend-sg" "SKN28 demo frontend tasks")"
  BACKEND_SG_ID="$(ensure_security_group "${PROJECT}-${STACK}-backend-sg" "SKN28 demo backend tasks")"
  EXTERNAL_MCP_SG_ID="$(ensure_security_group "${PROJECT}-${STACK}-external-mcp-sg" "SKN28 demo external MCP tasks")"

  authorize_ingress "$ALB_SG_ID" tcp 80 "0.0.0.0/0"
  authorize_ingress "$FRONTEND_SG_ID" tcp 3000 "$ALB_SG_ID"
  authorize_ingress "$BACKEND_SG_ID" tcp 8000 "$FRONTEND_SG_ID"
  authorize_ingress "$EXTERNAL_MCP_SG_ID" tcp 8020 "$BACKEND_SG_ID"
}

ensure_alb() {
  alb_arn="$(aws_cli elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || true)"
  if [ -z "$alb_arn" ] || [ "$alb_arn" = "None" ]; then
    alb_arn="$(aws_cli elbv2 create-load-balancer \
      --name "$ALB_NAME" \
      --subnets $(printf '%s' "$SUBNET_IDS" | tr ',' ' ') \
      --security-groups "$ALB_SG_ID" \
      --scheme internet-facing \
      --type application \
      --ip-address-type ipv4 \
      --tags Key=Project,Value=SKN28 \
      --query 'LoadBalancers[0].LoadBalancerArn' \
      --output text)"
    printf "%s\n" "created: alb $ALB_NAME"
  else
    printf "%s\n" "exists: alb $ALB_NAME"
  fi
  ALB_ARN="$alb_arn"
  ALB_DNS="$(aws_cli elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" --query 'LoadBalancers[0].DNSName' --output text)"

  tg_arn="$(aws_cli elbv2 describe-target-groups --names "$FRONTEND_TG_NAME" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)"
  if [ -z "$tg_arn" ] || [ "$tg_arn" = "None" ]; then
    tg_arn="$(aws_cli elbv2 create-target-group \
      --name "$FRONTEND_TG_NAME" \
      --protocol HTTP \
      --port 3000 \
      --vpc-id "$VPC_ID" \
      --target-type ip \
      --health-check-protocol HTTP \
      --health-check-path / \
      --matcher HttpCode=200-399 \
      --tags Key=Project,Value=SKN28 \
      --query 'TargetGroups[0].TargetGroupArn' \
      --output text)"
    printf "%s\n" "created: target group $FRONTEND_TG_NAME"
  else
    printf "%s\n" "exists: target group $FRONTEND_TG_NAME"
  fi
  FRONTEND_TG_ARN="$tg_arn"

  listener_arn="$(aws_cli elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query 'Listeners[?Port==`80`].ListenerArn | [0]' --output text 2>/dev/null || true)"
  if [ -z "$listener_arn" ] || [ "$listener_arn" = "None" ]; then
    aws_cli elbv2 create-listener \
      --load-balancer-arn "$ALB_ARN" \
      --protocol HTTP \
      --port 80 \
      --default-actions Type=forward,TargetGroupArn="$FRONTEND_TG_ARN" >/dev/null
    printf "%s\n" "created: http listener 80"
  else
    printf "%s\n" "exists: http listener 80"
  fi
}

ensure_cloudmap() {
  namespace_id="$(aws_cli servicediscovery list-namespaces --query 'Namespaces[?Name==`'"$NAMESPACE_NAME"'` && Type==`DNS_PRIVATE`].Id | [0]' --output text)"
  if [ "$namespace_id" = "None" ]; then
    operation_id="$(aws_cli servicediscovery create-private-dns-namespace \
      --name "$NAMESPACE_NAME" \
      --vpc "$VPC_ID" \
      --description "SKN28 demo private service discovery" \
      --query OperationId \
      --output text)"
    while :; do
      status="$(aws_cli servicediscovery get-operation --operation-id "$operation_id" --query 'Operation.Status' --output text)"
      if [ "$status" = "SUCCESS" ]; then
        namespace_id="$(aws_cli servicediscovery get-operation --operation-id "$operation_id" --query 'Operation.Targets.NAMESPACE' --output text)"
        break
      fi
      if [ "$status" = "FAIL" ]; then
        aws_cli servicediscovery get-operation --operation-id "$operation_id" --output json >&2
        exit 1
      fi
      sleep 5
    done
    printf "%s\n" "created: cloudmap namespace $NAMESPACE_NAME"
  else
    printf "%s\n" "exists: cloudmap namespace $NAMESPACE_NAME"
  fi
  NAMESPACE_ID="$namespace_id"
}

ensure_cloudmap_service() {
  name="$1"
  service_id="$(aws_cli servicediscovery list-services \
    --filters Name=NAMESPACE_ID,Values="$NAMESPACE_ID",Condition=EQ \
    --query 'Services[?Name==`'"$name"'`].Id | [0]' \
    --output text)"
  if [ "$service_id" = "None" ]; then
    service_id="$(aws_cli servicediscovery create-service \
      --name "$name" \
      --dns-config "NamespaceId=${NAMESPACE_ID},RoutingPolicy=MULTIVALUE,DnsRecords=[{Type=A,TTL=10}]" \
      --health-check-custom-config FailureThreshold=1 \
      --query Service.Id \
      --output text)"
    printf "%s\n" "created: cloudmap service $name" >&2
  else
    printf "%s\n" "exists: cloudmap service $name" >&2
  fi
  aws_cli servicediscovery get-service --id "$service_id" --query 'Service.Arn' --output text
}

register_task_definitions() {
  frontend_secret_arn="$(get_secret_arn skn28/frontend-migration/DEMO_ACCESS_KEY)"
  backend_cerebras_arn="$(get_secret_arn skn28/backend/LLM_PROVIDER_CEREBRAS_API_KEY)"
  backend_openrouter_arn="$(get_secret_arn skn28/backend/LLM_PROVIDER_OPENROUTER_API_KEY)"
  backend_elevenlabs_arn="$(get_secret_arn skn28/backend/ELEVENLABS_API_KEY)"
  backend_langsmith_arn="$(get_secret_arn skn28/backend/LANGSMITH_API_KEY)"
  backend_elevenlabs_voice_arn="$(get_secret_arn skn28/backend/ELEVENLABS_VOICE_ID)"
  backend_openrouter_app_title_arn="$(get_secret_arn skn28/backend/LLM_PROVIDER_OPENROUTER_APP_TITLE)"
  backend_openrouter_app_url_arn="$(get_secret_arn skn28/backend/LLM_PROVIDER_OPENROUTER_APP_URL)"
  backend_openrouter_base_url_arn="$(get_secret_arn skn28/backend/LLM_PROVIDER_OPENROUTER_BASE_URL)"
  backend_openrouter_provider_order_arn="$(get_secret_arn skn28/backend/LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER)"
  backend_openrouter_allow_fallbacks_arn="$(get_secret_arn skn28/backend/LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS)"
  backend_openrouter_require_parameters_arn="$(get_secret_arn skn28/backend/LLM_PROVIDER_OPENROUTER_REQUIRE_PARAMETERS)"
  backend_runtime_cors_origins_arn="$(get_secret_arn skn28/backend/RUNTIME_CORS_ORIGINS)"
  backend_rag_tool_timeout_arn="$(get_secret_arn skn28/backend/RAG_TOOL_TIMEOUT_MS)"
  external_naver_id_arn="$(get_secret_arn skn28/external-mcp/EXTERNAL_MCP_NAVER_CLIENT_ID)"
  external_naver_secret_arn="$(get_secret_arn skn28/external-mcp/EXTERNAL_MCP_NAVER_CLIENT_SECRET)"
  external_firecrawl_arn="$(get_secret_arn skn28/external-mcp/EXTERNAL_MCP_FIRECRAWL_API_KEY)"
  external_tmap_arn="$(get_secret_arn skn28/external-mcp/EXTERNAL_MCP_TMAP_APP_KEY)"

  ensure_log_group "/ecs/${PROJECT}/${STACK}/frontend-migration"
  ensure_log_group "/ecs/${PROJECT}/${STACK}/backend"
  ensure_log_group "/ecs/${PROJECT}/${STACK}/external-mcp"

  frontend_task_json="$TMP_DIR/frontend-task.json"
  cat > "$frontend_task_json" <<JSON
{
  "family": "${PROJECT}-${STACK}-frontend-migration",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "executionRoleArn": "${EXECUTION_ROLE_ARN}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "runtimePlatform": {
    "operatingSystemFamily": "LINUX",
    "cpuArchitecture": "X86_64"
  },
  "containerDefinitions": [
    {
      "name": "frontend-migration",
      "image": "${ECR_REGISTRY}/skn28/frontend-migration:${IMAGE_TAG}",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "BFF_BACKEND_BASE_URL", "value": "http://backend.${NAMESPACE_NAME}:8000"},
        {"name": "BFF_BACKEND_CHAT_STREAM_PATH", "value": "/chat/stream"},
        {"name": "DEMO_ACCESS_MAX_FAILURES", "value": "5"},
        {"name": "DEMO_ACCESS_LOCKOUT_SECONDS", "value": "600"}
      ],
      "secrets": [
        {"name": "DEMO_ACCESS_KEY", "valueFrom": "${frontend_secret_arn}"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${PROJECT}/${STACK}/frontend-migration",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
JSON

  backend_task_json="$TMP_DIR/backend-task.json"
  cat > "$backend_task_json" <<JSON
{
  "family": "${PROJECT}-${STACK}-backend",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "executionRoleArn": "${EXECUTION_ROLE_ARN}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "runtimePlatform": {
    "operatingSystemFamily": "LINUX",
    "cpuArchitecture": "X86_64"
  },
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "${ECR_REGISTRY}/skn28/backend:${IMAGE_TAG}",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "APP_ENV", "value": "dev"},
        {"name": "RUNTIME_HOST", "value": "0.0.0.0"},
        {"name": "RUNTIME_PORT", "value": "8000"},
        {"name": "RUNTIME_RELOAD", "value": "false"},
        {"name": "RUNTIME_LOG_LEVEL", "value": "INFO"},
        {"name": "METADATA_NAME", "value": "SKN28 Backend"},
        {"name": "METADATA_VERSION", "value": "0.1.0"},
        {"name": "RAG_TOOLS_ENABLED", "value": "false"},
        {"name": "RAG_MCP_URL", "value": "http://127.0.0.1:8010/mcp"},
        {"name": "EXTERNAL_MCP_TOOLS_ENABLED", "value": "true"},
        {"name": "EXTERNAL_MCP_URL", "value": "http://external-mcp.${NAMESPACE_NAME}:8020/"},
        {"name": "EXTERNAL_MCP_TOOL_TIMEOUT_MS", "value": "30000"},
        {"name": "LLM_AGENT_MAIN_PROVIDER", "value": "cerebras"},
        {"name": "LLM_AGENT_MAIN_MODEL", "value": "gpt-oss-120b"},
        {"name": "LLM_AGENT_MAIN_REASONING_EFFORT", "value": "high"},
        {"name": "LLM_AGENT_MAIN_REASONING_FORMAT", "value": "hidden"},
        {"name": "LLM_AGENT_SANITIZE_PROVIDER", "value": "cerebras"},
        {"name": "LLM_AGENT_SANITIZE_MODEL", "value": "gpt-oss-120b"},
        {"name": "LLM_AGENT_SANITIZE_REASONING_EFFORT", "value": "low"},
        {"name": "LLM_AGENT_WINDOW_PROVIDER", "value": "cerebras"},
        {"name": "LLM_AGENT_WINDOW_MODEL", "value": "zai-glm-4.7"},
        {"name": "LLM_AGENT_WINDOW_REASONING_EFFORT", "value": "medium"},
        {"name": "LLM_AGENT_WINDOW_REASONING_FORMAT", "value": "hidden"},
        {"name": "LLM_REQUEST_TIMEOUT_MS", "value": "60000"},
        {"name": "LLM_REQUEST_MAX_RETRIES", "value": "2"},
        {"name": "ELEVENLABS_TTS_MODEL_ID", "value": "eleven_flash_v2_5"},
        {"name": "ELEVENLABS_OUTPUT_FORMAT", "value": "mp3_44100_128"},
        {"name": "ELEVENLABS_STABILITY", "value": "0.5"},
        {"name": "ELEVENLABS_SIMILARITY_BOOST", "value": "0.6"},
        {"name": "ELEVENLABS_STYLE", "value": "0.0"},
        {"name": "ELEVENLABS_SPEED", "value": "1.2"},
        {"name": "ELEVENLABS_USE_SPEAKER_BOOST", "value": "true"},
        {"name": "LANGSMITH_TRACING", "value": "true"},
        {"name": "LANGSMITH_PROJECT", "value": "skn28-backend-agent-dev"},
        {"name": "LANGSMITH_ENDPOINT", "value": "https://api.smith.langchain.com"}
      ],
      "secrets": [
        {"name": "LLM_PROVIDER_CEREBRAS_API_KEY", "valueFrom": "${backend_cerebras_arn}"},
        {"name": "LLM_PROVIDER_OPENROUTER_API_KEY", "valueFrom": "${backend_openrouter_arn}"},
        {"name": "ELEVENLABS_API_KEY", "valueFrom": "${backend_elevenlabs_arn}"},
        {"name": "LANGSMITH_API_KEY", "valueFrom": "${backend_langsmith_arn}"},
        {"name": "ELEVENLABS_VOICE_ID", "valueFrom": "${backend_elevenlabs_voice_arn}"},
        {"name": "LLM_PROVIDER_OPENROUTER_APP_TITLE", "valueFrom": "${backend_openrouter_app_title_arn}"},
        {"name": "LLM_PROVIDER_OPENROUTER_APP_URL", "valueFrom": "${backend_openrouter_app_url_arn}"},
        {"name": "LLM_PROVIDER_OPENROUTER_BASE_URL", "valueFrom": "${backend_openrouter_base_url_arn}"},
        {"name": "LLM_PROVIDER_OPENROUTER_PROVIDER_ORDER", "valueFrom": "${backend_openrouter_provider_order_arn}"},
        {"name": "LLM_PROVIDER_OPENROUTER_ALLOW_FALLBACKS", "valueFrom": "${backend_openrouter_allow_fallbacks_arn}"},
        {"name": "LLM_PROVIDER_OPENROUTER_REQUIRE_PARAMETERS", "valueFrom": "${backend_openrouter_require_parameters_arn}"},
        {"name": "RUNTIME_CORS_ORIGINS", "valueFrom": "${backend_runtime_cors_origins_arn}"},
        {"name": "RAG_TOOL_TIMEOUT_MS", "valueFrom": "${backend_rag_tool_timeout_arn}"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${PROJECT}/${STACK}/backend",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
JSON

  external_task_json="$TMP_DIR/external-task.json"
  cat > "$external_task_json" <<JSON
{
  "family": "${PROJECT}-${STACK}-external-mcp",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "executionRoleArn": "${EXECUTION_ROLE_ARN}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "runtimePlatform": {
    "operatingSystemFamily": "LINUX",
    "cpuArchitecture": "X86_64"
  },
  "containerDefinitions": [
    {
      "name": "external-mcp",
      "image": "${ECR_REGISTRY}/skn28/external-mcp:${IMAGE_TAG}",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8020,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "APP_ENV", "value": "dev"},
        {"name": "EXTERNAL_MCP_HOST", "value": "0.0.0.0"},
        {"name": "EXTERNAL_MCP_PORT", "value": "8020"},
        {"name": "EXTERNAL_MCP_PATH", "value": "/"},
        {"name": "EXTERNAL_MCP_REQUEST_TIMEOUT_MS", "value": "15000"},
        {"name": "EXTERNAL_MCP_SEARCH_DEFAULT_LIMIT", "value": "5"},
        {"name": "EXTERNAL_MCP_SEARCH_MAX_LIMIT", "value": "10"}
      ],
      "secrets": [
        {"name": "EXTERNAL_MCP_NAVER_CLIENT_ID", "valueFrom": "${external_naver_id_arn}"},
        {"name": "EXTERNAL_MCP_NAVER_CLIENT_SECRET", "valueFrom": "${external_naver_secret_arn}"},
        {"name": "EXTERNAL_MCP_FIRECRAWL_API_KEY", "valueFrom": "${external_firecrawl_arn}"},
        {"name": "EXTERNAL_MCP_TMAP_APP_KEY", "valueFrom": "${external_tmap_arn}"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${PROJECT}/${STACK}/external-mcp",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
JSON

  FRONTEND_TASK_DEF_ARN="$(aws_cli ecs register-task-definition --cli-input-json "file://$frontend_task_json" --query 'taskDefinition.taskDefinitionArn' --output text)"
  BACKEND_TASK_DEF_ARN="$(aws_cli ecs register-task-definition --cli-input-json "file://$backend_task_json" --query 'taskDefinition.taskDefinitionArn' --output text)"
  EXTERNAL_MCP_TASK_DEF_ARN="$(aws_cli ecs register-task-definition --cli-input-json "file://$external_task_json" --query 'taskDefinition.taskDefinitionArn' --output text)"
  printf "%s\n" "registered task definitions"
}

ensure_cluster() {
  if aws_cli ecs describe-clusters --clusters "$CLUSTER_NAME" --query 'clusters[0].status' --output text 2>/dev/null | grep -qx ACTIVE; then
    printf "%s\n" "exists: ecs cluster $CLUSTER_NAME"
  else
    aws_cli ecs create-cluster --cluster-name "$CLUSTER_NAME" --tags key=Project,value=SKN28 >/dev/null
    printf "%s\n" "created: ecs cluster $CLUSTER_NAME"
  fi
}

create_or_update_service() {
  service_name="$1"
  task_def_arn="$2"
  sg_id="$3"
  container_name="$4"
  container_port="$5"
  target_group_arn="${6:-}"
  registry_arn="${7:-}"

  subnet_json="$(comma_to_json_array "$SUBNET_IDS")"
  service_exists="$(aws_cli ecs describe-services --cluster "$CLUSTER_NAME" --services "$service_name" --query 'services[0].status' --output text 2>/dev/null || true)"

  if [ "$service_exists" = "ACTIVE" ] || [ "$service_exists" = "DRAINING" ]; then
    aws_cli ecs update-service \
      --cluster "$CLUSTER_NAME" \
      --service "$service_name" \
      --task-definition "$task_def_arn" \
      --desired-count 1 \
      --force-new-deployment >/dev/null
    printf "%s\n" "updated: ecs service $service_name"
    return
  fi

  base_args="awsvpcConfiguration={subnets=${subnet_json},securityGroups=[\"${sg_id}\"],assignPublicIp=ENABLED}"

  if [ -n "$target_group_arn" ]; then
    aws_cli ecs create-service \
      --cluster "$CLUSTER_NAME" \
      --service-name "$service_name" \
      --task-definition "$task_def_arn" \
      --desired-count 1 \
      --launch-type FARGATE \
      --network-configuration "$base_args" \
      --load-balancers "targetGroupArn=${target_group_arn},containerName=${container_name},containerPort=${container_port}" \
      --health-check-grace-period-seconds 60 \
      --tags key=Project,value=SKN28 >/dev/null
  else
    aws_cli ecs create-service \
      --cluster "$CLUSTER_NAME" \
      --service-name "$service_name" \
      --task-definition "$task_def_arn" \
      --desired-count 1 \
      --launch-type FARGATE \
      --network-configuration "$base_args" \
      --service-registries "registryArn=${registry_arn}" \
      --tags key=Project,value=SKN28 >/dev/null
  fi

  printf "%s\n" "created: ecs service $service_name"
}

ensure_services() {
  BACKEND_CLOUDMAP_ARN="$(ensure_cloudmap_service backend)"
  EXTERNAL_MCP_CLOUDMAP_ARN="$(ensure_cloudmap_service external-mcp)"

  create_or_update_service "${PROJECT}-${STACK}-external-mcp" "$EXTERNAL_MCP_TASK_DEF_ARN" "$EXTERNAL_MCP_SG_ID" external-mcp 8020 "" "$EXTERNAL_MCP_CLOUDMAP_ARN"
  create_or_update_service "${PROJECT}-${STACK}-backend" "$BACKEND_TASK_DEF_ARN" "$BACKEND_SG_ID" backend 8000 "" "$BACKEND_CLOUDMAP_ARN"
  create_or_update_service "${PROJECT}-${STACK}-frontend-migration" "$FRONTEND_TASK_DEF_ARN" "$FRONTEND_SG_ID" frontend-migration 3000 "$FRONTEND_TG_ARN"
}

ensure_iam_roles
ensure_networking
ensure_alb
ensure_cloudmap
ensure_cluster
register_task_definitions
ensure_services

printf "%s\n" "ALB URL: http://${ALB_DNS}"
