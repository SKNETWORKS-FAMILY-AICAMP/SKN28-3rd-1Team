# Deploy Presentation Diagrams

이 디렉터리는 현재 demo 배포 구조를 발표 자료에 넣기 위한 diagram-as-code 원본입니다.

## Generated Files

| File | Purpose |
| --- | --- |
| `01-ci-cd-pipeline.mermaid.md` | GitHub main merge부터 CodePipeline, CodeBuild, ECR push, ECS deploy까지의 CI/CD 흐름 |
| `01-ci-cd-pipeline.eraserdiagram` | 같은 CI/CD 흐름의 Eraser import용 원본 |
| `02-aws-architecture.mermaid.md` | CloudFront, ALB, ECS Fargate, Cloud Map, SG, Secrets Manager를 포함한 현재 AWS runtime 구조 |
| `02-aws-architecture.eraserdiagram` | 같은 AWS runtime 구조의 Eraser import용 원본 |
| `02-aws-architecture_simplified.mermaid.md` | 발표 첫 장용으로 단순화한 AWS runtime 구조 |
| `02-aws-architecture_simplified.eraserdiagram` | 같은 단순화 구조의 Eraser import용 원본 |

## Current Verified AWS State

| Area | Value |
| --- | --- |
| AWS account / region | `133946907234` / `us-east-1` |
| CodePipeline | `skn28-container-pipeline` |
| GitHub source | `SKNETWORKS-FAMILY-AICAMP/SKN28-3rd-1Team`, branch `main`, `DetectChanges=true` |
| CodeBuild | `skn28-container-build`, `aws/codebuild/standard:7.0`, privileged Docker build |
| ECS cluster | `skn28-demo-cluster` |
| Deployed task definitions | `skn28-demo-external-mcp:9`, `skn28-demo-backend:9`, `skn28-demo-frontend-migration:9` |
| Last verified image tag | `01d62abe9e9d` |
| CloudFront demo URL | `https://d2psjdqzzwvjpi.cloudfront.net` |
| ALB origin | `skn28-demo-alb-1645582252.us-east-1.elb.amazonaws.com` |
| Private DNS namespace | `skn28.local` |

## Sources Inspected

- `deploy/aws/README.md`
- `deploy/aws/buildspec.yml`
- `deploy/aws/scripts/create-codepipeline.sh`
- `deploy/aws/scripts/create-ecs-demo-stack.sh`
- AWS CLI: CodePipeline, CodeBuild, ECS services, ALB/listener/target group, CloudFront, ECR, Cloud Map, security groups, CloudWatch log groups

## Confirmed Dependencies

| Source | Target | Transport | Evidence |
| --- | --- | --- | --- |
| GitHub `main` | CodePipeline Source | CodeStarSourceConnection | AWS CodePipeline configuration |
| CodePipeline Build | CodeBuild `skn28-container-build` | CodePipeline artifact | AWS CodePipeline and CodeBuild configuration |
| CodeBuild | ECR repositories | Docker push | `deploy/aws/buildspec.yml` |
| CodeBuild | ECS deploy actions | `imagedefinitions/*.json` | `deploy/aws/buildspec.yml`, pipeline deploy actions |
| CloudFront | ALB | HTTPS viewer, HTTP origin | AWS CloudFront distribution `ECA1DMEG108XP` |
| ALB | `frontend_migration` ECS service | HTTP target group port 3000 | ALB listener and target group |
| `frontend_migration` | `backend` | HTTP `backend.skn28.local:8000` | ECS task env and Cloud Map service |
| `backend` | `external_mcp` | HTTP `external-mcp.skn28.local:8020` | ECS task env and Cloud Map service |
| ECS tasks | Secrets Manager | ECS task definition secrets | `create-ecs-demo-stack.sh` and task definition config |
| ECS tasks | CloudWatch Logs | awslogs driver | ECS task definitions and log groups |

## Interface Boundaries

| Boundary | Runtime contract |
| --- | --- |
| Browser to frontend | HTTPS CloudFront URL, demo cookie gate for `/chat` |
| Frontend to backend | Next.js BFF calls backend `/chat/stream` over internal HTTP |
| Backend to external MCP | backend tool runtime calls FastMCP streamable HTTP service |
| Backend to providers | LLM, TTS, and tracing provider APIs |
| External MCP to providers | Naver, Firecrawl, and TMAP APIs |

## Notes

- RAG services are intentionally omitted from these deploy diagrams because the current demo deploy target is `frontend_migration`, `backend`, and `external_mcp`.
- Backend and external MCP are not attached to a public load balancer. They are reachable through the frontend/backend security group chain and Cloud Map private DNS.
- The current setup uses public subnets with `assignPublicIp=ENABLED`; there is no NAT gateway in the demo architecture.
