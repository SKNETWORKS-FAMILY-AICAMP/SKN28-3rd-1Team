import type { UIMessage } from "ai";

import type { ChatWorkspaceRemoteCommand } from "@/ui/components/chat/workspace_root/workspace-state";

export type ChatSource = {
  title: string;
  ref: string;
};

export type ChatMessageMetadata = {
  sources?: ChatSource[];
};

export type ChatMessageData = {
  agentTrace: {
    type: string;
    sourceAgent?: string | null;
    node?: string | null;
    text?: string;
    timestamp?: string;
    toolCall?: {
      id?: string | null;
      name?: string | null;
      status?: string | null;
      sourceAgent?: string | null;
    };
  };
  audio: {
    audioBase64: string;
  };
  audioDone: {
    chunks: number;
  };
  audioInterrupted: {
    reason: string;
  };
  audioStatus: {
    chunks: number;
    completed: boolean;
    interrupted?: boolean;
    reason?: string;
    sourceAgent?: string | null;
  };
  speechText: {
    text: string;
    sourceAgent?: string | null;
    timestamp?: string;
  };
  messageTimestamp: {
    timestamp: string;
  };
  toolCall: {
    event?: string;
    id?: string | null;
    name?: string | null;
    status?: string | null;
    sourceAgent?: string | null;
    timestamp?: string;
  };
  workspaceCommand: {
    id?: string | null;
    command: ChatWorkspaceRemoteCommand;
    sourceAgent?: string | null;
    node?: string | null;
    timestamp?: string;
  };
};

export type LegalChatMessage = UIMessage<ChatMessageMetadata, ChatMessageData>;
