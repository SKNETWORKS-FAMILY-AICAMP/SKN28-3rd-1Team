# Current AWS Runtime Architecture

```mermaid
flowchart LR
    User["Demo user browser<br/>HTTPS"]

    subgraph AWS["AWS account 133946907234 / us-east-1"]
        subgraph Edge["Public demo entry"]
            CF["CloudFront<br/>d2psjdqzzwvjpi.cloudfront.net<br/>viewer: redirect-to-https"]
            ALB["Application Load Balancer<br/>skn28-demo-alb<br/>HTTP :80"]
        end

        subgraph VPC["Default VPC vpc-016d30a173909810c<br/>3 public subnets / assignPublicIp=ENABLED"]
            ALB --> TG["Target group skn28-demo-frontend<br/>HTTP :3000 / health /"]
            TG --> FE["ECS Fargate service<br/>skn28-demo-frontend-migration<br/>Next.js + BFF :3000"]

            FE -->|BFF_BACKEND_BASE_URL<br/>http://backend.skn28.local:8000| BE["ECS Fargate service<br/>skn28-demo-backend<br/>API / agent runtime :8000"]
            BE -->|EXTERNAL_MCP_URL<br/>http://external-mcp.skn28.local:8020/| MCP["ECS Fargate service<br/>skn28-demo-external-mcp<br/>FastMCP :8020"]

            CM["Cloud Map private DNS<br/>skn28.local<br/>backend, external-mcp"] -.-> BE
            CM -.-> MCP

            SGALB["SG skn28-demo-alb-sg<br/>inbound 80 from 0.0.0.0/0"] -.-> ALB
            SGFE["SG skn28-demo-frontend-sg<br/>inbound 3000 from ALB SG"] -.-> FE
            SGBE["SG skn28-demo-backend-sg<br/>inbound 8000 from frontend SG"] -.-> BE
            SGMCP["SG skn28-demo-external-mcp-sg<br/>inbound 8020 from backend SG"] -.-> MCP
        end

        Secrets["AWS Secrets Manager<br/>demo access key, LLM/provider keys"] --> FE
        Secrets --> BE
        Secrets --> MCP

        FE -.-> Logs["CloudWatch Logs<br/>/ecs/skn28/demo/*"]
        BE -.-> Logs
        MCP -.-> Logs

        ECR["Amazon ECR<br/>skn28/frontend-migration<br/>skn28/backend<br/>skn28/external-mcp"] --> FE
        ECR --> BE
        ECR --> MCP
    end

    User --> CF
    CF --> ALB
    BE --> LLM["LLM / TTS / tracing providers<br/>Cerebras, OpenRouter, ElevenLabs, LangSmith"]
    MCP --> Providers["External data APIs<br/>Naver, Firecrawl, TMAP"]

    FE --> Gate["Demo access gate<br/>/demo-access cookie guard<br/>/chat requires cookie"]
```

## Security Notes

- Public entrypoint is CloudFront HTTPS, backed by the HTTP ALB origin.
- ALB only forwards to `frontend_migration`; backend and external MCP have no public load balancer.
- Service-to-service access is constrained by security groups: ALB -> frontend -> backend -> external MCP.
- Cloud Map private DNS names are `backend.skn28.local` and `external-mcp.skn28.local`.
- All three ECS services currently run one Fargate task each on task definition revision `:9`.
