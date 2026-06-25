import type { Metadata } from "next";
import { Suspense } from "react";

import { ChatPage } from "@/page/chat/page";

export const metadata: Metadata = {
  title: "로디 상담",
};

export default function Page() {
  return (
    <Suspense
      fallback={<main className="h-dvh min-h-[660px] bg-background" />}
    >
      <ChatPage />
    </Suspense>
  );
}
