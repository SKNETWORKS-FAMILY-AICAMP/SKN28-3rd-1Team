import type { Metadata } from "next"

import { SharePageClient } from "./share-page-client"

export const metadata: Metadata = {
  title: "로디 상담 답변 공유",
  description: "로디 상담 답변을 임시 공유 링크로 확인합니다.",
}

export default function SharePage() {
  return <SharePageClient />
}
