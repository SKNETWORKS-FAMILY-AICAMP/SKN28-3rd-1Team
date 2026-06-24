import type { Metadata } from "next";

import { ChatPage } from "@/page/chat/page";

export const metadata: Metadata = {
  title: "로디 상담",
};

export default function Page() {
  return <ChatPage />;
}
