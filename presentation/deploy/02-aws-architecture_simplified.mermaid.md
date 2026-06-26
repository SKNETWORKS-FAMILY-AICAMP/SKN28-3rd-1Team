# Current AWS Runtime Architecture - Simplified

```mermaid
flowchart LR
    User["Demo user<br/>browser"] --> Entry["CloudFront HTTPS<br/>demo URL"]
    Entry --> ALB["Public ALB<br/>HTTP origin"]

    subgraph AWS["AWS demo runtime<br/>us-east-1"]
        ALB --> FE["frontend_migration<br/>Next.js + BFF<br/>demo access gate"]
        FE -->|internal HTTP| BE["backend<br/>chat stream API<br/>agent runtime"]
        BE -->|internal MCP HTTP| MCP["external_mcp<br/>Naver / Firecrawl / TMAP tools"]

        PrivateNet["Private service boundary<br/>Cloud Map + security groups"] -.-> FE
        PrivateNet -.-> BE
        PrivateNet -.-> MCP

        Secrets["Secrets Manager<br/>runtime config"] -.-> FE
        Secrets -.-> BE
        Secrets -.-> MCP
    end

    BE --> LLM["LLM / TTS / tracing<br/>providers"]
    MCP --> DataApis["Search / map / route<br/>external APIs"]
```

## Slide Notes

- Public user traffic enters through CloudFront HTTPS and reaches only the frontend service through the ALB.
- `frontend_migration` owns browser routes, `/demo-access`, and the BFF call into backend.
- `backend` and `external_mcp` are internal ECS services resolved through Cloud Map and constrained by security groups.
- Runtime secrets are injected from AWS Secrets Manager; no secret values are shown in this diagram.
