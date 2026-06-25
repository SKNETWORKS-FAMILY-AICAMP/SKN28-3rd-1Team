"use client";

import { useCallback, useMemo, useState } from "react";

import type { DictationStatus } from "@/page/chat/hooks/use-browser-speech-dictation";
import type { TtsPlaybackStatus } from "@/page/chat/hooks/use-tts-streaming-playback";
import type { MascotAnimationName } from "@/ui/components/mascot/mascot-animation-data";
import {
  createDefaultChatWorkspaceState,
  reduceChatWorkspaceState,
  resolveChatWorkspaceState,
  type ChatWorkspaceCommand,
} from "@/ui/components/chat/workspace_root/workspace-state";

type UseChatWorkspaceControllerOptions = {
  chatStatus: "submitted" | "streaming" | "ready" | "error";
  dictationStatus: DictationStatus;
  ttsPlaybackStatus: TtsPlaybackStatus;
};

export function useChatWorkspaceController({
  chatStatus,
  dictationStatus,
  ttsPlaybackStatus,
}: UseChatWorkspaceControllerOptions) {
  const [workspaceState, setWorkspaceState] = useState(
    createDefaultChatWorkspaceState
  );
  const runtimeMascotAnimation = resolveRuntimeMascotAnimation({
    chatStatus,
    dictationStatus,
    ttsPlaybackStatus,
  });
  const state = useMemo(
    () => resolveChatWorkspaceState(workspaceState, runtimeMascotAnimation),
    [runtimeMascotAnimation, workspaceState]
  );
  const applyCommand = useCallback((command: ChatWorkspaceCommand) => {
    setWorkspaceState((current) => reduceChatWorkspaceState(current, command));
  }, []);

  return {
    applyCommand,
    state,
  };
}

function resolveRuntimeMascotAnimation({
  chatStatus,
  dictationStatus,
  ttsPlaybackStatus,
}: UseChatWorkspaceControllerOptions): MascotAnimationName {
  if (
    chatStatus === "error" ||
    dictationStatus === "error" ||
    ttsPlaybackStatus.phase === "error"
  ) {
    return "sad";
  }

  if (dictationStatus === "listening") return "listening";

  if (
    ttsPlaybackStatus.phase === "buffering" ||
    ttsPlaybackStatus.phase === "playing"
  ) {
    return "speaking";
  }

  if (chatStatus === "submitted" || chatStatus === "streaming") {
    return "thinking";
  }

  return "idle";
}
