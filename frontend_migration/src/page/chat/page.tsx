"use client";

import { AgentTraceDrawer } from "@/ui/components/chat/agent-trace-drawer";
import { ChatHeader } from "@/ui/components/chat/chat-header";
import { ChatSidebar } from "@/ui/components/chat/chat-sidebar";
import { ChatWorkspace } from "@/ui/components/chat/chat-workspace";
import { useChatPageController } from "@/page/chat/hooks/use-chat-page-controller";
import "./chat.css";

export function ChatPage() {
  const chatPage = useChatPageController();

  return (
    <main className="chat-page flex h-dvh min-h-[660px] flex-col overflow-hidden">
      <ChatHeader {...chatPage.header} />

      <div className="flex min-h-0 flex-1">
        <aside
          className="chat-layout-sidebar flex shrink-0 flex-col overflow-hidden border-r border-[var(--chat-border)] bg-[var(--chat-sidebar)] transition-[width] duration-200"
          data-trace-expanded={chatPage.sidebarLayout.isTraceExpanded}
          style={chatPage.sidebarLayout.style}
        >
          <div className="flex min-h-0 flex-1">
            <ChatSidebar {...chatPage.chatSidebar} />

            {chatPage.traceDrawer ? (
              <AgentTraceDrawer {...chatPage.traceDrawer} />
            ) : null}
          </div>
        </aside>

        <ChatWorkspace />
      </div>

      {chatPage.toast ? (
        <div className="fixed bottom-7 left-1/2 z-50 -translate-x-1/2 rounded-[11px] bg-[var(--chat-text)] px-5 py-3 text-sm font-medium text-white shadow-lg">
          {chatPage.toast}
        </div>
      ) : null}
    </main>
  );
}
