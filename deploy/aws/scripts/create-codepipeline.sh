#!/bin/sh
set -eu

AWS_PROFILE="${AWS_PROFILE:-sknetworksTeam3}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PIPELINE_NAME="${PIPELINE_NAME:-skn28-container-pipeline}"
PIPELINE_ROLE_NAME="${PIPELINE_ROLE_NAME:-skn28-codepipeline-service-role}"
CODEBUILD_PROJECT_NAME="${CODEBUILD_PROJECT_NAME:-skn28-container-build}"
CONNECTION_ARN="${CONNECTION_ARN:-arn:aws:codeconnections:us-east-1:133946907234:connection/53fce0db-ae94-4b3f-baa7-781d8644b5bf}"
FULL_REPOSITORY_ID="${FULL_REPOSITORY_ID:-SKNETWORKS-FAMILY-AICAMP/SKN28-3rd-1Team}"
BRANCH_NAME="${BRANCH_NAME:-main}"

AWS_ACCOUNT_ID="$(aws sts get-caller-identity \
  --profile "$AWS_PROFILE" \
  --query Account \
  --output text)"
ARTIFACT_BUCKET="${ARTIFACT_BUCKET:-skn28-codepipeline-artifacts-${AWS_ACCOUNT_ID}-${AWS_REGION}}"
PIPELINE_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PIPELINE_ROLE_NAME}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

create_pipeline_role() {
  trust_policy="$TMP_DIR/codepipeline-trust-policy.json"
  cat > "$trust_policy" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

  if aws iam get-role \
    --profile "$AWS_PROFILE" \
    --role-name "$PIPELINE_ROLE_NAME" >/dev/null 2>&1; then
    printf "%s\n" "exists: iam role $PIPELINE_ROLE_NAME"
  else
    aws iam create-role \
      --profile "$AWS_PROFILE" \
      --role-name "$PIPELINE_ROLE_NAME" \
      --assume-role-policy-document "file://$trust_policy" >/dev/null
    printf "%s\n" "created: iam role $PIPELINE_ROLE_NAME"
  fi

  inline_policy="$TMP_DIR/codepipeline-inline-policy.json"
  cat > "$inline_policy" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:GetBucketVersioning",
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::${ARTIFACT_BUCKET}",
        "arn:aws:s3:::${ARTIFACT_BUCKET}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codestar-connections:UseConnection",
        "codeconnections:UseConnection"
      ],
      "Resource": "${CONNECTION_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "codebuild:BatchGetBuilds",
        "codebuild:StartBuild"
      ],
      "Resource": "arn:aws:codebuild:${AWS_REGION}:${AWS_ACCOUNT_ID}:project/${CODEBUILD_PROJECT_NAME}"
    }
  ]
}
JSON

  aws iam put-role-policy \
    --profile "$AWS_PROFILE" \
    --role-name "$PIPELINE_ROLE_NAME" \
    --policy-name "${PIPELINE_ROLE_NAME}-policy" \
    --policy-document "file://$inline_policy" >/dev/null

  aws iam wait role-exists \
    --profile "$AWS_PROFILE" \
    --role-name "$PIPELINE_ROLE_NAME"
}

create_or_update_pipeline() {
  pipeline_json="$TMP_DIR/codepipeline.json"
  cat > "$pipeline_json" <<JSON
{
  "pipeline": {
    "name": "${PIPELINE_NAME}",
    "roleArn": "${PIPELINE_ROLE_ARN}",
    "artifactStore": {
      "type": "S3",
      "location": "${ARTIFACT_BUCKET}"
    },
    "pipelineType": "V2",
    "stages": [
      {
        "name": "Source",
        "actions": [
          {
            "name": "GitHubSource",
            "actionTypeId": {
              "category": "Source",
              "owner": "AWS",
              "provider": "CodeStarSourceConnection",
              "version": "1"
            },
            "runOrder": 1,
            "configuration": {
              "ConnectionArn": "${CONNECTION_ARN}",
              "FullRepositoryId": "${FULL_REPOSITORY_ID}",
              "BranchName": "${BRANCH_NAME}",
              "DetectChanges": "true"
            },
            "outputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ]
          }
        ]
      },
      {
        "name": "Build",
        "actions": [
          {
            "name": "BuildAndPushImages",
            "actionTypeId": {
              "category": "Build",
              "owner": "AWS",
              "provider": "CodeBuild",
              "version": "1"
            },
            "runOrder": 1,
            "configuration": {
              "ProjectName": "${CODEBUILD_PROJECT_NAME}"
            },
            "inputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ],
            "outputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ]
          }
        ]
      }
    ]
  }
}
JSON

  existing_pipeline="$(aws codepipeline get-pipeline \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --name "$PIPELINE_NAME" \
    --query 'pipeline.name' \
    --output text 2>/dev/null || true)"

  attempt=1
  while [ "$attempt" -le 6 ]; do
    if [ "$existing_pipeline" = "$PIPELINE_NAME" ]; then
      if aws codepipeline update-pipeline \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --cli-input-json "file://$pipeline_json" >/dev/null; then
        printf "%s\n" "updated: codepipeline $PIPELINE_NAME"
        return
      fi
    else
      if aws codepipeline create-pipeline \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --cli-input-json "file://$pipeline_json" >/dev/null; then
        printf "%s\n" "created: codepipeline $PIPELINE_NAME"
        return
      fi
    fi

    attempt=$((attempt + 1))
    sleep 10
  done

  printf "%s\n" "failed to create or update CodePipeline after retries: $PIPELINE_NAME" >&2
  exit 1
}

create_pipeline_role
create_or_update_pipeline

printf "%s\n" "pipeline role: $PIPELINE_ROLE_ARN"
printf "%s\n" "connection arn: $CONNECTION_ARN"
