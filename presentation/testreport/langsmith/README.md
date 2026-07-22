# LangSmith Trace Artifacts

이 폴더는 테스트 보고서의 LangSmith 관측 근거를 보강하기 위한 metadata-only trace export 산출물이다.

## Export 기준

- Export 일시: 2026-06-26
- LangSmith workspace id: `b2ffbf86-1386-4cb6-b75e-406874ba6510`
- LangSmith project: `skn28-backend-agent-dev`
- LangSmith project id: `1d12ddf1-d42e-4d58-b4dd-d27e327d64ed`
- Export 범위: 최근 backend chat trace 일부
- Export 방식: `--include-metadata`
- Inputs/outputs 본문 포함 여부: 미포함

## Artifact 요약

- Trace artifact: `presentation/testreport/langsmith/traces/*.jsonl`
- Trace file 수: 18
- Root trace 성공 수: 18/18
- 전체 run status: success 603
- Run type 구성: chain 360, llm 117, tool 126
- `inputs`/`outputs` record 수: 0

## 대표 Trace

- `019f01f0-f282-74c2-9169-ade99f6c8767`
- `019f01ec-a346-75c3-a59f-1d8f51949fe0`
- `019f01ea-3543-72c2-9b7e-d7aabf3bc399`

## LangSmith UI

- Project: `https://smith.langchain.com/o/69215053-ba91-426d-9438-3c44f5610458/projects/p/1d12ddf1-d42e-4d58-b4dd-d27e327d64ed`
- Latest trace: `https://smith.langchain.com/o/69215053-ba91-426d-9438-3c44f5610458/projects/p/1d12ddf1-d42e-4d58-b4dd-d27e327d64ed/r/019f01f0-f282-74c2-9169-ade99f6c8767`

## 재생성 명령

```bash
infisical run --projectId f6a512e6-1960-4186-8ece-a3061824c185 --env dev --path / -- \
  langsmith trace export presentation/testreport/langsmith/traces \
  --workspace b2ffbf86-1386-4cb6-b75e-406874ba6510 \
  --project-id 1d12ddf1-d42e-4d58-b4dd-d27e327d64ed \
  --trace-ids 019f01f0-f282-74c2-9169-ade99f6c8767,019f01ec-a346-75c3-a59f-1d8f51949fe0,019f01ea-3543-72c2-9b7e-d7aabf3bc399 \
  --include-metadata
```

## 주의

- full export는 사용자 입력/응답 본문을 포함할 수 있어 보고서 첨부용으로는 metadata-only export를 사용함.
- 실제 답변 본문 검증은 별도 비식별 샘플 또는 mock 기반 회귀 테스트로 수행 권장.
