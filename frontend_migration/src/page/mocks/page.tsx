"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { CharacterAnimationShowcase } from "@/page/mocks/character-animation-showcase";
import { MockChatRail } from "@/page/mocks/mock-chat-rail";
import { getMockScene, mockScenes } from "@/page/mocks/scenes";
import {
  getWorkspaceMockQuestions,
  getWorkspaceMockState,
} from "@/page/mocks/workspace-fixtures";
import { ChatWorkspace } from "@/ui/components/chat/workspace_root/chat-workspace";
import {
  reduceChatWorkspaceState,
  type ChatWorkspaceCommand,
  type ChatWorkspaceState,
} from "@/ui/components/chat/workspace_root/workspace-state";
import "@/page/chat/chat.css";

type MocksPageProps = {
  initialSceneSlug?: string;
};

export function MocksPage({ initialSceneSlug }: MocksPageProps) {
  const [selectedSceneSlug, setSelectedSceneSlug] = useState(() =>
    resolveSceneSlug(initialSceneSlug)
  );
  const selectedScene = useMemo(
    () => getMockScene(selectedSceneSlug) ?? mockScenes[0],
    [selectedSceneSlug]
  );
  const initialWorkspaceState = useMemo(
    () => getWorkspaceMockState(selectedScene.slug),
    [selectedScene.slug]
  );
  const hasConversation =
    selectedScene.slug !== "chat-start" && selectedScene.slug !== "profile-form";

  function handleSceneChange(nextSceneSlug: string) {
    const nextScene = getMockScene(nextSceneSlug);
    if (!nextScene) return;

    setSelectedSceneSlug(nextScene.slug);
    window.history.replaceState(null, "", `/mocks?scene=${nextScene.slug}`);
  }

  return (
    <main className="chat-page flex h-dvh min-h-[660px] flex-col overflow-hidden bg-[var(--chat-bg)] text-[var(--chat-text)]">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[var(--chat-border)] bg-[var(--chat-panel)] px-6">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl text-[var(--chat-text-strong)]">
            로디 목업
          </h1>
          <p className="hidden text-sm font-semibold text-[var(--chat-text-muted)] md:block">
            {selectedScene.description}
          </p>
        </div>

        <label className="ml-auto flex items-center gap-2 text-base font-bold text-[var(--chat-text-muted)]">
          <span className="hidden sm:inline">화면</span>
          <select
            value={selectedScene.slug}
            onChange={(event) => handleSceneChange(event.target.value)}
            className="h-11 min-w-[220px] rounded-[10px] border border-[var(--chat-border-strong)] bg-[var(--chat-panel)] px-3 text-base font-bold text-[var(--chat-text)] outline-none focus-visible:border-[var(--chat-primary)]"
          >
            {mockScenes.map((scene) => (
              <option key={scene.slug} value={scene.slug}>
                {scene.title}
              </option>
            ))}
          </select>
        </label>

        <Link
          href="/chat"
          className="inline-flex h-11 items-center rounded-[10px] border border-[var(--chat-border-strong)] bg-[var(--chat-panel)] px-3 text-base font-bold text-[var(--chat-text-muted)]"
        >
          /chat
        </Link>
      </header>

      {selectedScene.slug === "character-animation" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--chat-bg)] p-6">
          <CharacterAnimationShowcase />
        </div>
      ) : initialWorkspaceState ? (
        <div className="flex min-h-0 flex-1">
          <MockChatRail
            hasConversation={hasConversation}
            questions={getWorkspaceMockQuestions(selectedScene.slug)}
          />
          <MockWorkspacePreview
            key={selectedScene.slug}
            initialState={initialWorkspaceState}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel)] px-5 py-4 text-sm font-semibold text-[var(--chat-text-muted)]">
            목업 상태를 찾을 수 없습니다.
          </div>
        </div>
      )}
    </main>
  );
}

function MockWorkspacePreview({
  initialState,
}: {
  initialState: ChatWorkspaceState;
}) {
  const [workspaceState, setWorkspaceState] = useState(initialState);
  const handleWorkspaceCommand = useCallback((command: ChatWorkspaceCommand) => {
    setWorkspaceState((current) => reduceChatWorkspaceState(current, command));
  }, []);
  const handleStartConsultation = useCallback((prompt: string) => {
    document.documentElement.dataset.lastConsultationPrompt = prompt;
  }, []);

  return (
    <ChatWorkspace
      onCommand={handleWorkspaceCommand}
      onStartConsultation={handleStartConsultation}
      state={workspaceState}
    />
  );
}

function resolveSceneSlug(sceneSlug?: string) {
  if (sceneSlug && getMockScene(sceneSlug)) return sceneSlug;
  return mockScenes[0].slug;
}
