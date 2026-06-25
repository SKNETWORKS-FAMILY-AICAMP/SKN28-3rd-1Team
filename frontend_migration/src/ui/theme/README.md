# `src/ui/theme`

마이그레이션 앱의 전역 테마 계약을 관리한다.

`src/app/globals.css`는 Next.js App Router의 전역 CSS 진입점으로만 유지하고, 실제 테마 정의는 이 디렉토리에서 파일별 책임으로 나눈다. 페이지별 스타일은 `src/page` 근처의 CSS Modules로 둔다.

## 파일 역할

- `tokens.css`: Tailwind v4와 shadcn이 사용할 semantic token mapping.
- `fonts.ts`: `next/font/google` 설정과 루트 레이아웃에 붙일 font variable className.
- `font.css`: `fonts.ts`가 주입한 CSS variable을 Tailwind font token으로 연결.
- `white.css`: 기본 white/light color scheme 값과 명시적 `.theme-white` override.
- `dark.css`: OS dark preference와 명시적 `.theme-dark` override.
- `base.css`: 문서 전체에 적용되는 최소한의 `html`, `body`, border, outline 기본값.

## Color Scheme

기본 color contract는 white/light와 dark 두 축으로 관리한다. 컴포넌트는 `#ef8b54` 같은 raw color를 직접 쓰지 않고 `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, `border-border` 같은 semantic token을 사용한다.

`white.css`의 `:root`는 앱의 기본 light scheme이다. `.theme-white`는 사용자가 명시적으로 white/light를 선택했을 때 OS dark preference보다 우선 적용하기 위한 override이다.

`dark.css`는 두 가지 진입점을 가진다. `@media (prefers-color-scheme: dark)` 안의 `:root:not(.theme-white)`는 사용자 OS 설정이 dark일 때 자동 적용된다. `.theme-dark`는 사용자가 명시적으로 dark를 선택했을 때 적용된다. shadcn 기본 dark selector와의 호환을 위해 `.dark`도 같은 dark color contract를 적용한다.

새로운 색이 필요하면 먼저 기존 semantic token으로 표현 가능한지 확인한다. 반복되는 제품 색상만 전역 token으로 승격하고, 특정 페이지나 목업에만 쓰이는 색은 `src/page` 또는 해당 UI 컴포넌트의 scoped style로 둔다.

## 현재 판단

기존 `frontend`의 `globals.css`에 있던 light/dark semantic color contract를 기준으로 가져왔다. `chat`과 `mock` 화면에는 raw hex와 arbitrary Tailwind 값이 많이 흩어져 있으므로, 이는 theme contract 문제가 아니라 consistency debt로 본다.

따라서 현재 단계에서는 전역 theme에는 기본 light/dark color contract와 font contract만 둔다. `chat`/`mock`의 색상 정리는 화면 마이그레이션 시점에 semantic token 또는 page-scoped token으로 별도 정리한다.

## 업데이트 필요

이 README는 theme contract가 바뀔 때 반드시 함께 업데이트해야 한다. 특히 shadcn 초기화, AI Elements 설치, 신규 route/page 마이그레이션, `chat`/`mock` raw color 정리 과정에서 전역 token을 추가하거나 제거하면 이 문서의 color scheme 설명과 파일 역할도 같이 갱신한다.
