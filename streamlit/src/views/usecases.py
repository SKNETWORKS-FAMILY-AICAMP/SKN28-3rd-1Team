import pandas as pd
import streamlit as st


SCENARIOS = [
    {
        "id": "UC-FE-01",
        "title": "질문과 조건을 입력한다",
        "user_goal": "사용자는 법률 RAG에 물어볼 질문과 필요한 조건을 한곳에서 입력한다.",
        "user_action": "질문을 작성하고, 대상/상황/첨부 파일처럼 검색에 필요한 조건을 선택한다.",
        "frontend_role": "필수 입력값이 비어 있거나 조건이 부족하면 실행 전에 명확히 알려준다.",
        "screen_elements": ["질문 입력창", "조건 선택", "파일 업로드", "입력 검증 메시지"],
        "state": "입력 전",
    },
    {
        "id": "UC-FE-02",
        "title": "백엔드에 처리를 요청한다",
        "user_goal": "사용자는 실행 버튼을 눌러 질문 처리를 시작한다.",
        "user_action": "입력 내용을 확인한 뒤 실행 버튼을 누른다.",
        "frontend_role": "요청 시작, 처리 중, 실패 상태를 구분해서 보여준다.",
        "screen_elements": ["실행 버튼", "처리 상태", "로딩 표시", "오류 알림"],
        "state": "처리 중",
    },
    {
        "id": "UC-FE-03",
        "title": "RAG 답변과 근거를 확인한다",
        "user_goal": "사용자는 생성된 답변과 참고한 근거 문서를 분리해서 확인한다.",
        "user_action": "요약 답변을 먼저 보고, 필요한 경우 상세 답변과 출처를 펼쳐 본다.",
        "frontend_role": "답변, 법령/문서 근거, 참고 정보를 서로 다른 영역으로 렌더링한다.",
        "screen_elements": ["답변 요약", "상세 답변", "근거/출처 패널", "참고 정보 탭"],
        "state": "응답 완료",
    },
    {
        "id": "UC-FE-04",
        "title": "입력을 고쳐 다시 실행한다",
        "user_goal": "사용자는 질문이나 조건을 수정해 더 정확한 답변을 다시 요청한다.",
        "user_action": "기존 입력값을 수정하고 재실행한다.",
        "frontend_role": "이전 결과와 새 결과가 섞이지 않도록 최근 실행 기준을 갱신한다.",
        "screen_elements": ["재실행 버튼", "최근 실행 기준", "이전 결과 접기"],
        "state": "재실행",
    },
    {
        "id": "UC-FE-05",
        "title": "통합 흐름을 검증한다",
        "user_goal": "사용자는 백엔드 API와 RAG 응답이 연결된 전체 흐름을 확인한다.",
        "user_action": "통합 테스트 화면에서 요청, 응답, 원본 JSON을 함께 점검한다.",
        "frontend_role": "API 응답 상태와 원본 응답을 개발자가 검증할 수 있게 제공한다.",
        "screen_elements": ["통합 테스트 화면", "API 응답 상태", "원본 JSON 확인 영역"],
        "state": "검증",
    },
]


def _scenario_table() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "ID": scenario["id"],
                "사용자 시나리오": scenario["title"],
                "사용자 행동": scenario["user_action"],
                "화면 요소": ", ".join(scenario["screen_elements"]),
            }
            for scenario in SCENARIOS
        ]
    )


def _render_scenario_summary() -> None:
    cols = st.columns(len(SCENARIOS))
    for col, scenario in zip(cols, SCENARIOS, strict=True):
        with col:
            with st.container(border=True):
                st.caption(scenario["id"])
                st.markdown(f"**{scenario['title']}**")
                st.caption(scenario["state"])


def _render_selected_scenario(scenario: dict[str, str | list[str]]) -> None:
    st.subheader(f"{scenario['id']} · {scenario['title']}")

    goal_col, role_col = st.columns([1, 1])
    with goal_col:
        st.markdown("**사용자 목표**")
        st.write(scenario["user_goal"])
    with role_col:
        st.markdown("**프론트엔드 책임**")
        st.write(scenario["frontend_role"])

    st.markdown("**사용자 행동**")
    st.info(str(scenario["user_action"]))

    st.markdown("**렌더링할 화면 요소**")
    element_cols = st.columns(2)
    for index, element in enumerate(scenario["screen_elements"]):
        with element_cols[index % 2]:
            st.checkbox(str(element), value=True, disabled=True)


def _render_flow_preview() -> None:
    st.subheader("사용자 흐름")

    with st.status("질문 입력부터 결과 검증까지의 기본 흐름", expanded=True):
        st.write("1. 사용자가 질문과 조건을 입력한다.")
        st.write("2. 실행 버튼으로 백엔드 API 처리를 요청한다.")
        st.write("3. 요약 답변, 상세 답변, 근거/출처를 구분해서 확인한다.")
        st.write("4. 필요하면 입력을 수정하고 재실행한다.")
        st.write("5. 개발 단계에서는 API 상태와 원본 JSON을 확인한다.")


def render_usecases() -> None:
    st.title("사용자 시나리오")
    st.write(
        "이번 Streamlit 화면은 먼저 사용자 질문 흐름에 집중합니다. "
        "백엔드 응답 스키마와 mock 렌더링 화면은 이후 연결 단계에서 확장합니다."
    )

    _render_scenario_summary()
    st.divider()

    selected_title = st.selectbox(
        "확인할 사용자 시나리오",
        [scenario["title"] for scenario in SCENARIOS],
    )
    selected_scenario = next(
        scenario for scenario in SCENARIOS if scenario["title"] == selected_title
    )
    _render_selected_scenario(selected_scenario)

    st.divider()
    _render_flow_preview()

    st.subheader("시나리오 매핑")
    st.dataframe(_scenario_table(), width="stretch", hide_index=True)
