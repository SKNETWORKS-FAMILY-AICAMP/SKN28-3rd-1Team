#!/bin/sh
set -eu

AWS_PROFILE="${AWS_PROFILE:-sknetworksTeam3}"
AWS_REGION="${AWS_REGION:-us-east-1}"
LIFECYCLE_POLICY='{"rules":[{"rulePriority":1,"description":"Expire untagged images after 7 days","selection":{"tagStatus":"untagged","countType":"sinceImagePushed","countUnit":"days","countNumber":7},"action":{"type":"expire"}}]}'

put_lifecycle_policy() {
  repo_name="$1"

  aws ecr put-lifecycle-policy \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --repository-name "$repo_name" \
    --lifecycle-policy-text "$LIFECYCLE_POLICY" >/dev/null
}

create_repo() {
  repo_name="$1"

  if aws ecr describe-repositories \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --repository-names "$repo_name" >/dev/null 2>&1; then
    printf "%s\n" "exists: $repo_name"
    put_lifecycle_policy "$repo_name"
    return
  fi

  aws ecr create-repository \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --repository-name "$repo_name" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    --tags Key=Project,Value=SKN28 Key=ManagedBy,Value=Codex Key=Service,Value="$repo_name" >/dev/null

  put_lifecycle_policy "$repo_name"
  printf "%s\n" "created: $repo_name"
}

create_repo "skn28/backend"
create_repo "skn28/frontend-migration"
create_repo "skn28/external-mcp"
