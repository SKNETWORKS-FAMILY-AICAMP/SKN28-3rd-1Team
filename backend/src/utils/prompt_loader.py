from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from jinja2 import Environment, FileSystemLoader


@lru_cache
def _prompt_env(prompt_dir: str) -> Environment:
    return Environment(
        loader=FileSystemLoader(prompt_dir),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )


def render_prompt(template_path: Path, **context: object) -> str:
    template_file = template_path.resolve()
    template = _prompt_env(str(template_file.parent)).get_template(template_file.name)
    return template.render(**context)
