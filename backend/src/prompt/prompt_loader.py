from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader

PROMPT_DIR = Path(__file__).resolve().parent


# prompt 디렉터리의 Jinja2 환경 생성
def _create_prompt_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(PROMPT_DIR),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )


_PROMPT_ENV = _create_prompt_env()


# prompt 디렉터리의 Jinja2 템플릿을 문자열로 렌더링
def render_prompt(template_name: str, **context: object) -> str:
    template = _PROMPT_ENV.get_template(template_name)
    return template.render(**context)
