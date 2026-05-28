from functools import lru_cache
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

PROMPT_DIR = Path(__file__).resolve().parent

# /prompt dir의 jinja 템플릿 렌더링
def render_prompt(template_name: str, **context: object) -> str:
    env = Environment(
        loader=FileSystemLoader(PROMPT_DIR),
        autoescape=select_autoescape(default=False),
        trim_blocks=True,
        lstrip_blocks=True
    )
    template = env.get_template(template_name)
    return template.render(**context)

# prompt markdown 파일을 읽어 문자열로 반환
@lru_cache
def load_prompt(file_name: str) -> str:
    prompt_path = PROMPT_DIR / file_name
    if not prompt_path.is_file():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
    return prompt_path.read_text(encoding="utf-8")
