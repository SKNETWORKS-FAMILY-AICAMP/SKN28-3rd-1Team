import type { Metadata } from "next";

import { HomePage } from "@/page/home/page";

export const metadata: Metadata = {
  title: "로디",
  description: "노인·고령층을 위한 법률·복지 상담 시작 페이지",
};

export default function Page() {
  return <HomePage />;
}
