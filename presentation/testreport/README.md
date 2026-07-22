# testreport

이 폴더는 workspace source를 수정하지 않고 테스트 계획, 테스트 결과, evidence summary를 정리하기 위한 산출물 폴더다.

포함 파일:

- `test_plan_and_result_report.md`: 테스트 계획 및 결과 보고서
- `scripts/collect_test_evidence.py`: repo 내부 테스트/산출물/소스 guard를 읽어 JSON evidence를 생성하는 스크립트
- `results/test_evidence_summary.json`: evidence 수집 결과
- `langsmith/README.md`: LangSmith trace export 설명
- `langsmith/traces/*.jsonl`: metadata-only LangSmith trace artifact

재생성:

```bash
python presentation/testreport/scripts/collect_test_evidence.py --repo . --out presentation/testreport/results/test_evidence_summary.json
```
