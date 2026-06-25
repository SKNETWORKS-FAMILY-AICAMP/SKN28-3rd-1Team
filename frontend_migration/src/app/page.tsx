import type { Metadata } from "next";

import { HomePage } from "@/page/home/page";

export const metadata: Metadata = {
  title: "로디 — RAG 기반 법률 챗봇",
  description: "복잡한 법률, 이제 로디에게 물어보세요. 검색 기반 AI가 쉽고 빠르게 답해드립니다.",
};

export default function Page() {
  return <HomePage />;
}
