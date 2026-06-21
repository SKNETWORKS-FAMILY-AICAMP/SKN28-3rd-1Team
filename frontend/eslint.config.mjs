import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const eslintConfig = [
  {
    ignores: [".bun/**", ".bun-tmp/**", "chat_page/**"],
  },
  ...nextVitals,
  ...nextTypescript,
]

export default eslintConfig
