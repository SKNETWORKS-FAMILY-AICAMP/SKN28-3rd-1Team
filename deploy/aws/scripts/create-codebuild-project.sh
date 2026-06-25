#!/bin/sh
set -eu

AWS_PROFILE="${AWS_PROFILE:-sknetworksTeam3}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-skn28-container-build}"
ROLE_NAME="${ROLE_NAME:-skn28-codebuild-service-role}"

AWS_ACCOUNT_ID="$(aws sts get-caller-identity \
  --profile "$AWS_PROFILE" \
  --query Account \
  --output text)"
ARTIFACT_BUCKET="${ARTIFACT_BUCKET:-skn28-codepipeline-artifacts-${AWS_ACCOUNT_ID}-${AWS_REGION}}"
ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

create_artifact_bucket() {
  if aws s3api head-bucket \
    --profile "$AWS_PROFILE" \
    --bucket "$ARTIFACT_BUCKET" >/dev/null 2>&1; then
    printf "%s\n" "exists: s3://$ARTIFACT_BUCKET"
  else
    if [ "$AWS_REGION" = "us-east-1" ]; then
      aws s3api create-bucket \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --bucket "$ARTIFACT_BUCKET" >/dev/null
    else
      aws s3api create-bucket \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --bucket "$ARTIFACT_BUCKET" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
    fi
    printf "%s\n" "created: s3://$ARTIFACT_BUCKET"
  fi

  aws s3api put-public-access-block \
    --profile "$AWS_PROFILE" \
    --bucket "$ARTIFACT_BUCKET" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null

  aws s3api put-bucket-encryption \
    --profile "$AWS_PROFILE" \
    --bucket "$ARTIFACT_BUCKET" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null
}

create_codebuild_role() {
  trust_policy="$TMP_DIR/codebuild-trust-policy.json"
  cat > "$trust_policy" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

  if aws iam get-role \
    --profile "$AWS_PROFILE" \
    --role-name "$ROLE_NAME" >/dev/null 2>&1; then
    printf "%s\n" "exists: iam role $ROLE_NAME"
  else
    aws iam create-role \
      --profile "$AWS_PROFILE" \
      --role-name "$ROLE_NAME" \
      --assume-role-policy-document "file://$trust_policy" >/dev/null
    printf "%s\n" "created: iam role $ROLE_NAME"
  fi

  inline_policy="$TMP_DIR/codebuild-inline-policy.json"
  cat > "$inline_policy" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:log-group:/aws/codebuild/${PROJECT_NAME}:*"
    },
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": [
        "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/skn28/backend",
        "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/skn28/frontend-migration",
        "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/skn28/external-mcp"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:PutObject",
        "s3:GetBucketAcl",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::${ARTIFACT_BUCKET}",
        "arn:aws:s3:::${ARTIFACT_BUCKET}/*"
      ]
    }
  ]
}
JSON

  aws iam put-role-policy \
    --profile "$AWS_PROFILE" \
    --role-name "$ROLE_NAME" \
    --policy-name "${ROLE_NAME}-policy" \
    --policy-document "file://$inline_policy" >/dev/null

  aws iam wait role-exists \
    --profile "$AWS_PROFILE" \
    --role-name "$ROLE_NAME"
}

create_or_update_project() {
  project_json="$TMP_DIR/codebuild-project.json"
  cat > "$project_json" <<JSON
{
  "name": "${PROJECT_NAME}",
  "description": "Build and push SKN28 service containers to ECR",
  "source": {
    "type": "CODEPIPELINE",
    "buildspec": "deploy/aws/buildspec.yml"
  },
  "artifacts": {
    "type": "CODEPIPELINE"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:7.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "privilegedMode": true
  },
  "serviceRole": "${ROLE_ARN}",
  "timeoutInMinutes": 60,
  "queuedTimeoutInMinutes": 60,
  "logsConfig": {
    "cloudWatchLogs": {
      "status": "ENABLED",
      "groupName": "/aws/codebuild/${PROJECT_NAME}"
    }
  }
}
JSON

  existing_project="$(aws codebuild batch-get-projects \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --names "$PROJECT_NAME" \
    --query 'projects[0].name' \
    --output text)"

  attempt=1
  while [ "$attempt" -le 6 ]; do
    if [ "$existing_project" = "$PROJECT_NAME" ]; then
      if aws codebuild update-project \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --cli-input-json "file://$project_json" >/dev/null; then
        printf "%s\n" "updated: codebuild project $PROJECT_NAME"
        return
      fi
    else
      if aws codebuild create-project \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --cli-input-json "file://$project_json" >/dev/null; then
        printf "%s\n" "created: codebuild project $PROJECT_NAME"
        return
      fi
    fi

    attempt=$((attempt + 1))
    sleep 10
  done

  printf "%s\n" "failed to create or update CodeBuild project after retries: $PROJECT_NAME" >&2
  exit 1
}

create_artifact_bucket
create_codebuild_role
create_or_update_project

printf "%s\n" "artifact bucket: $ARTIFACT_BUCKET"
printf "%s\n" "codebuild role: $ROLE_ARN"
