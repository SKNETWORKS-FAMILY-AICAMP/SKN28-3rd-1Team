# `src/ui/ai-elements`

AI Elements registry source and AI-native UI building blocks.

Install only the AI Elements needed for the app, such as message, conversation, prompt input, code block, reasoning, or tool display. These components are client-side UI source components and may depend on AI SDK UI message shapes.

Product-specific chat composition belongs in `src/page` or `src/ui/components`, not directly in this directory.

현재 `message`와 `conversation`은 shadcn CLI로 fresh install 한 뒤, CLI 기본 생성 위치인 `src/components/ai-elements`에서 이 디렉토리로 이동했다. 재설치하거나 업데이트할 때도 같은 layer boundary를 유지하고 import path를 확인한다.
