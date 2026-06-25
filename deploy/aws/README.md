# AWS Deploy

AWS-native 배포 흐름은 GitHub source를 CodePipeline에 연결하고, CodeBuild가 세 개 서비스 이미지를 ECR에 push한 뒤 ECS Fargate service를 갱신하는 방식으로 잡는다.

## Target Services

| service | image repository | container name | exposure |
| --- | --- | --- | --- |
| `frontend_migration` | `skn28/frontend-migration` | `frontend-migration` | public ALB |
| `backend` | `skn28/backend` | `backend` | private ECS network |
| `external_mcp` | `skn28/external-mcp` | `external-mcp` | private ECS network |

`backend` and `external_mcp` should not be exposed directly to the public internet. Browser traffic enters through `frontend_migration`; its Next.js BFF calls the backend inside the ECS network, and the backend calls External MCP internally.

## ECR

Create repositories with:

```bash
AWS_PROFILE=sknetworksTeam3 AWS_REGION=us-east-1 ./deploy/aws/scripts/create-ecr-repositories.sh
```

Current target repositories:

- `skn28/backend`
- `skn28/frontend-migration`
- `skn28/external-mcp`

## CodeBuild

`deploy/aws/buildspec.yml` builds and pushes:

- `backend/Dockerfile`
- `frontend_migration/Dockerfile`
- `external_mcp/Dockerfile`

The CodeBuild project must run in privileged mode so Docker builds can run. Local Docker is not required for this pipeline. macOS developers can validate service builds with `make build`, `make check`, and schema checks, while CodeBuild performs the actual Docker builds in AWS.

The build output includes one ECS image definition file per service under `deploy/aws/imagedefinitions/`.

Create or update the CodeBuild project with:

```bash
AWS_PROFILE=sknetworksTeam3 AWS_REGION=us-east-1 ./deploy/aws/scripts/create-codebuild-project.sh
```

## CodePipeline

Use a V2 pipeline with:

1. Source: GitHub repository connection for `SKNETWORKS-FAMILY-AICAMP/SKN28-3rd-1Team`, branch `main`.
2. Build: CodeBuild project using `deploy/aws/buildspec.yml`.
3. Deploy: three ECS standard deploy actions, one per ECS service. The current CLI script creates the Source + Build stages first; add ECS deploy actions after ECS services exist.

Create a GitHub CodeConnections connection first. A connection created by CLI starts in `PENDING` status and must be completed in the AWS console before CodePipeline can use it.

Current connection created by CLI:

```text
arn:aws:codeconnections:us-east-1:133946907234:connection/53fce0db-ae94-4b3f-baa7-781d8644b5bf
```

Create or update the current Source + Build pipeline with:

```bash
AWS_PROFILE=sknetworksTeam3 AWS_REGION=us-east-1 ./deploy/aws/scripts/create-codepipeline.sh
```

Each ECS deploy action should use the corresponding image definitions file:

| ECS service | image definitions file |
| --- | --- |
| `skn28-backend` | `deploy/aws/imagedefinitions/backend.json` |
| `skn28-frontend-migration` | `deploy/aws/imagedefinitions/frontend-migration.json` |
| `skn28-external-mcp` | `deploy/aws/imagedefinitions/external-mcp.json` |

## Runtime Configuration

Use ECS Service Connect or Cloud Map service discovery so services can resolve each other by stable internal DNS names.

```text
frontend_migration -> backend:8000
backend -> external-mcp:8020
```

Recommended runtime URLs:

```text
frontend_migration:
  BFF_BACKEND_BASE_URL=http://backend:8000
  BFF_BACKEND_CHAT_STREAM_PATH=/chat/stream
  DEMO_ACCESS_KEY=<stored in Secrets Manager>
  DEMO_ACCESS_MAX_FAILURES=5
  DEMO_ACCESS_LOCKOUT_SECONDS=600

backend:
  RAG_TOOLS_ENABLED=false
  EXTERNAL_MCP_TOOLS_ENABLED=true
  EXTERNAL_MCP_URL=http://external-mcp:8020/

external_mcp:
  EXTERNAL_MCP_HOST=0.0.0.0
  EXTERNAL_MCP_PORT=8020
  EXTERNAL_MCP_PATH=/
```

Store real secret values in AWS Secrets Manager or SSM Parameter Store and reference them from ECS task definitions. Do not put secret values in CodeBuild environment variables, committed files, Docker build args, or image layers.

`NEXT_PUBLIC_*` values are browser-public by design. Sensitive values must stay in ECS secrets.

The current Infisical MCP identity can read the `backend` secret-manager project, but it cannot read the `external_mcp` project ID from `external_mcp/Makefile`. Add that machine identity to the External MCP Infisical project before automating secret sync for that service.
