"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ChatMessageData } from "@/bff/chat/contract";
import { collectAgentTraceLanes } from "@/ui/components/chat/agent-trace-drawer";
import {
  DICTATION_SHORTCUT,
  isDictationShortcut,
} from "@/page/chat/dictation-shortcut";
import { useChatPanelResize } from "@/page/chat/hooks/use-chat-panel-resize";
import { useChatSession } from "@/page/chat/hooks/use-chat-session";
import {
  useBrowserSpeechDictation,
  type DictationStatus,
  type DictationTranscript,
} from "@/page/chat/hooks/use-browser-speech-dictation";
import { useChatWorkspaceController } from "@/page/chat/hooks/use-chat-workspace-controller";
import { getMessageTimestampMap } from "@/page/chat/message-utils";
import {
  normalizeChatWorkspaceCommand,
  selectChatWorkspaceSnapshot,
  type ChatWorkspaceSnapshot,
} from "@/ui/components/chat/workspace_root/workspace-state";

function mergeSpeechTranscript(baseInput: string, transcript: string) {
  const base = baseInput.trim();
  const text = transcript.trim();

  if (!base) return text;
  if (!text) return base;

  return `${base} ${text}`;
}

function canToggleSpeechStatus(status: DictationStatus) {
  return (
    status !== "unsupported" &&
    status !== "requesting-permission" &&
    status !== "loading-model" &&
    status !== "transcribing"
  );
}

export function useChatPageController() {
  const workspaceSnapshotRef = useRef<
    () => ChatWorkspaceSnapshot | undefined
  >(() => undefined);
  const workspaceCommandHandlerRef = useRef<
    (command: ChatMessageData["workspaceCommand"]) => void
  >(() => undefined);
  const executedWorkspaceCommandIdsRef = useRef<Set<string>>(new Set());
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const {
    messages,
    input,
    setInput,
    send,
    status,
    error,
    isBusy,
    ttsPlaybackStatus,
    empty: conversationEmpty,
    reset,
  } = useChatSession({
    getApplicationState: () => workspaceSnapshotRef.current(),
    onWorkspaceCommand: (command) => workspaceCommandHandlerRef.current(command),
    ttsEnabled,
  });
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);
  const [toast, setToast] = useState("");
  const speechBaseInputRef = useRef("");
  const {
    chatSidebarWidth,
    handleChatSidebarResizePointerDown,
    handleTraceDrawerResizePointerDown,
    resetPanelWidths,
    sidebarLayoutStyle,
    traceDrawerWidth,
  } = useChatPanelResize({ isTraceExpanded });
  const handleSpeechTranscript = useCallback(
    (transcript: DictationTranscript) => {
      setInput(
        mergeSpeechTranscript(speechBaseInputRef.current, transcript.text)
      );
    },
    [setInput]
  );
  const dictation = useBrowserSpeechDictation({
    onTranscriptChange: handleSpeechTranscript,
  });
  const {
    errorMessage: dictationError,
    reset: resetDictation,
    start: startDictation,
    status: dictationStatus,
    stop: stopDictation,
  } = dictation;
  const messageTimestamps = useMemo(
    () => getMessageTimestampMap(messages, new Map<string, string>()),
    [messages]
  );
  const agentTraceLanes = useMemo(
    () => collectAgentTraceLanes(messages, ttsPlaybackStatus),
    [messages, ttsPlaybackStatus]
  );
  const agentTraceItemCount = agentTraceLanes.reduce(
    (count, lane) => count + lane.items.length,
    0
  );
  const workspace = useChatWorkspaceController({
    chatStatus: status,
    conversationEmpty,
    dictationStatus,
    draftInputActive: input.trim().length > 0,
    ttsPlaybackStatus,
  });
  const { applyCommand: applyWorkspaceCommand, state: workspaceState } =
    workspace;
  const canUseVoiceInput =
    !isBusy && canToggleSpeechStatus(dictationStatus);

  useLayoutEffect(() => {
    workspaceSnapshotRef.current = () =>
      selectChatWorkspaceSnapshot(workspaceState);
    workspaceCommandHandlerRef.current = (payload) => {
      if (payload.id) {
        if (executedWorkspaceCommandIdsRef.current.has(payload.id)) return;
        executedWorkspaceCommandIdsRef.current.add(payload.id);
      }

      applyWorkspaceCommand(normalizeChatWorkspaceCommand(payload.command));
    };
  }, [applyWorkspaceCommand, workspaceState]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (dictationStatus !== "listening") {
        speechBaseInputRef.current = value;
      }
    },
    [dictationStatus, setInput]
  );

  const toggleSpeechInput = useCallback(() => {
    if (dictationStatus === "listening") {
      stopDictation();
      return;
    }

    speechBaseInputRef.current = input;
    startDictation();
  }, [dictationStatus, input, startDictation, stopDictation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !isDictationShortcut(event) ||
        isBusy ||
        !canToggleSpeechStatus(dictationStatus)
      ) {
        return;
      }

      event.preventDefault();
      toggleSpeechInput();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dictationStatus, isBusy, toggleSpeechInput]);

  function handleChatSubmit() {
    resetDictation();
    send(input);
  }

  function handleWorkspaceConsultationStart(prompt: string) {
    resetDictation();
    send(prompt);
  }

  function resetChat() {
    resetDictation();
    reset();
    executedWorkspaceCommandIdsRef.current.clear();
    setIsTraceExpanded(false);
    resetPanelWidths();
    showToast("새 상담을 시작했어요.");
  }

  return {
    chatSidebar: {
      dictationError,
      dictationShortcut: DICTATION_SHORTCUT,
      dictationStatus,
      error,
      input,
      isBusy,
      messageTimestamps,
      messages,
      onInputChange: handleInputChange,
      onResizePointerDown: handleChatSidebarResizePointerDown,
      onSubmit: handleChatSubmit,
      onToggleTrace: () => setIsTraceExpanded((current) => !current),
      onToggleTtsPlayback: () => setTtsEnabled((current) => !current),
      onVoiceClick: toggleSpeechInput,
      status,
      traceExpanded: isTraceExpanded,
      traceItemCount: agentTraceItemCount,
      ttsEnabled,
      width: chatSidebarWidth,
    },
    header: {
      onNewChat: resetChat,
    },
    sidebarLayout: {
      isTraceExpanded,
      style: sidebarLayoutStyle,
    },
    toast,
    traceDrawer: isTraceExpanded
      ? {
          lanes: agentTraceLanes,
          onClose: () => setIsTraceExpanded(false),
          onResizePointerDown: handleTraceDrawerResizePointerDown,
          width: traceDrawerWidth,
        }
      : null,
    workspace: {
      consultationBusy: isBusy,
      onCommand: applyWorkspaceCommand,
      onVoiceClick: canUseVoiceInput ? toggleSpeechInput : undefined,
      onStartConsultation: handleWorkspaceConsultationStart,
      state: workspaceState,
      voiceInputActive: dictationStatus === "listening",
    },
  };
}
