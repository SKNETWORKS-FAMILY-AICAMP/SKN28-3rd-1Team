"use client";

import {
  CpuChipIcon,
  SpeakerWaveIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { ChatMessageData, LegalChatMessage } from "@/bff/chat/contract";
import type { TtsPlaybackStatus } from "@/page/chat/hooks/use-tts-streaming-playback";
import { MessageResponse } from "@/ui/ai-elements/message";
import { cn } from "@/lib/utils";
import {
  formatTimestamp,
  getDataParts,
  getMessageTimestampValue,
} from "@/page/chat/message-utils";

export type AgentTraceTone = "audio" | "reasoning" | "speech" | "text" | "tool";

export type AgentTraceItem = {
  id: string;
  title: string;
  text: string;
  timestamp?: string;
  tone: AgentTraceTone;
};

export type AgentTraceLane = {
  id: string;
  label: string;
  items: AgentTraceItem[];
};

type AgentTraceGroup = {
  audioStatus?: ChatMessageData["audioStatus"];
  audioTimestamp?: string;
  input: string;
  inputTimestamp?: string;
  reasoning: string;
  reasoningTimestamp?: string;
  speechDelta: string;
  speechFinal: string;
  speechTimestamp?: string;
  text: string;
  textFinal: string;
  textFinalTimestamp?: string;
  textTimestamp?: string;
  tools: ChatMessageData["toolCall"][];
  toolTimestamp?: string;
};

const agentTraceLaneOrder = [
  "main_agent",
  "screen_control_agent",
  "speech_text_agent",
  "speech_synthesis_node",
];

const agentTraceLaneLabels: Record<string, string> = {
  main_agent: "Main Agent",
  speech_synthesis_node: "Speech Synthesis",
  speech_text_agent: "Speech Agent",
  screen_control_agent: "Screen Control Agent",
};

type AgentTraceDrawerProps = {
  lanes: AgentTraceLane[];
  width?: number;
  onClose: () => void;
  onResizePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

export function AgentTraceDrawer({
  lanes,
  width,
  onClose,
  onResizePointerDown,
}: AgentTraceDrawerProps) {
  const hasItems = lanes.some((lane) => lane.items.length > 0);

  return (
    <section
      className="chat-trace-drawer relative flex shrink-0 flex-col border-l border-[var(--chat-trace-border)] bg-[var(--chat-trace-bg)] text-white"
      style={
        {
          "--chat-trace-drawer-current-width": width ? `${width}px` : undefined,
        } as CSSProperties
      }
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <div className="flex items-center gap-2">
          <CpuChipIcon className="size-4 text-[var(--chat-primary-border)]" />
          <h2 className="text-sm font-bold">Agent Trace</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-[8px] text-white/65 transition hover:bg-white/10 hover:text-white"
          aria-label="에이전트 trace 닫기"
        >
          <XMarkIcon className="size-4" />
        </button>
      </div>

      <div className="chat-trace-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {!hasItems ? (
          <div className="rounded-[8px] border border-white/10 px-3 py-2.5 text-xs leading-5 text-white/45">
            아직 수신된 internal stream이 없어요.
          </div>
        ) : null}
        {lanes.map((lane) => (
          <AgentTraceLaneSection key={lane.id} lane={lane} />
        ))}
      </div>

      <button
        type="button"
        aria-label="에이전트 trace 너비 조절"
        className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize rounded-full transition hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
        onPointerDown={onResizePointerDown}
      />
    </section>
  );
}

export function collectAgentTraceLanes(
  messages: LegalChatMessage[],
  ttsPlaybackStatus?: TtsPlaybackStatus
): AgentTraceLane[] {
  const laneItems = new Map<string, AgentTraceItem[]>();
  const latestAudioStatusMessageId = getLatestAudioStatusMessageId(messages);

  function appendLaneItem(agent: string, item: AgentTraceItem) {
    laneItems.set(agent, [...(laneItems.get(agent) ?? []), item]);
  }

  for (const message of messages) {
    if (message.role !== "assistant") continue;

    const messageTimestamp = getMessageTimestampValue(message);
    const groups = new Map<string, AgentTraceGroup>();
    const ensureGroup = (agent: string) => {
      const current = groups.get(agent);
      if (current) return current;

      const next = createAgentTraceGroup();
      groups.set(agent, next);
      return next;
    };

    for (const part of getDataParts(message, "agentTrace")) {
      const trace = part.data;
      const fallbackAgent = trace.type.startsWith("speech_text.")
        ? "speech_text_agent"
        : "main_agent";
      const agent = normalizeAgentName(trace.sourceAgent ?? trace.node, fallbackAgent);
      if (
        agent === "main_agent" &&
        (trace.type === "agent.text.delta" || trace.type === "agent.text.final")
      ) {
        continue;
      }
      if (trace.type === "agent.reasoning.delta" && agent !== "speech_text_agent") {
        continue;
      }

      const group = ensureGroup(agent);
      const text = trace.text ?? "";
      const timestamp = trace.timestamp ?? messageTimestamp;

      if (trace.type === "agent.text.delta") {
        group.text += text;
        group.textTimestamp = timestamp ?? group.textTimestamp;
      } else if (trace.type === "agent.text.final") {
        group.textFinal = text || group.textFinal;
        group.textFinalTimestamp = timestamp ?? group.textFinalTimestamp;
      } else if (trace.type === "agent.reasoning.delta") {
        group.reasoning += text;
        group.reasoningTimestamp = timestamp ?? group.reasoningTimestamp;
      } else if (
        trace.type === "speech_text.input" ||
        trace.type === "screen_control.input"
      ) {
        group.input = text || group.input;
        group.inputTimestamp = timestamp ?? group.inputTimestamp;
      } else if (trace.type === "speech_text.delta") {
        group.speechDelta += text;
        group.speechTimestamp = timestamp ?? group.speechTimestamp;
      } else if (trace.type === "speech_text.final") {
        group.speechFinal = text || group.speechFinal;
        group.speechTimestamp = timestamp ?? group.speechTimestamp;
      }
    }

    for (const part of getDataParts(message, "speechText")) {
      const agent = normalizeAgentName(part.data.sourceAgent, "speech_text_agent");
      const group = ensureGroup(agent);
      group.speechFinal = part.data.text;
      group.speechTimestamp =
        part.data.timestamp ?? messageTimestamp ?? group.speechTimestamp;
    }

    for (const part of getDataParts(message, "toolCall")) {
      const agent = normalizeAgentName(part.data.sourceAgent, "main_agent");
      const group = ensureGroup(agent);
      group.tools.push(part.data);
      group.toolTimestamp = part.data.timestamp ?? messageTimestamp ?? group.toolTimestamp;
    }

    const audioStatus = getDataParts(message, "audioStatus").at(-1)?.data;
    if (audioStatus) {
      const agent = normalizeAgentName(
        audioStatus.sourceAgent,
        "speech_synthesis_node"
      );
      const group = ensureGroup(agent);
      group.audioStatus = audioStatus;
      group.audioTimestamp = messageTimestamp ?? group.audioTimestamp;
    }

    for (const [agent, group] of groups) {
      appendTraceItems({
        agent,
        group,
        message,
        messageTimestamp,
        playbackStatus:
          message.id === latestAudioStatusMessageId ? ttsPlaybackStatus : undefined,
        appendLaneItem,
      });
    }
  }

  const dynamicAgents = [...laneItems.keys()].filter(
    (agent) => !agentTraceLaneOrder.includes(agent)
  );

  return [...agentTraceLaneOrder, ...dynamicAgents].map((agent) => ({
    id: agent,
    label: formatAgentLabel(agent),
    items: (laneItems.get(agent) ?? []).slice(-12),
  }));
}

function AgentTraceLaneSection({ lane }: { lane: AgentTraceLane }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <AgentTraceLaneIcon agent={lane.id} />
          <h3 className="truncate text-[11px] font-extrabold uppercase tracking-normal text-white/55">
            {lane.label}
          </h3>
        </div>
        <span className="font-mono text-[10px] text-white/35">
          {lane.items.length}
        </span>
      </div>

      <ol className="space-y-2">
        {lane.items.length === 0 ? (
          <li className="rounded-[7px] border border-white/10 px-3 py-2 text-xs text-white/35">
            No stream
          </li>
        ) : (
          lane.items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-[7px] border px-3 py-2 text-xs",
                agentTraceToneClassName(item.tone)
              )}
            >
              <div className="mb-1 font-bold uppercase tracking-normal opacity-70">
                {item.title}
              </div>
              <MessageResponse className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5">
                {item.text}
              </MessageResponse>
              <TraceTimestamp timestamp={item.timestamp} />
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

function appendTraceItems({
  agent,
  group,
  message,
  messageTimestamp,
  playbackStatus,
  appendLaneItem,
}: {
  agent: string;
  group: AgentTraceGroup;
  message: LegalChatMessage;
  messageTimestamp?: string;
  playbackStatus?: TtsPlaybackStatus;
  appendLaneItem: (agent: string, item: AgentTraceItem) => void;
}) {
  const input = group.input.trim();
  const reasoning = group.reasoning.trim();
  const finalText = group.textFinal.trim();
  const text = finalText || group.text.trim();
  const speechText = group.speechFinal.trim() || group.speechDelta.trim();

  if (input) {
    appendLaneItem(agent, {
      id: `${message.id}-${agent}-input`,
      title: agent === "screen_control_agent" ? "screen_control.input" : "speech_text.input",
      text: input,
      timestamp: group.inputTimestamp ?? messageTimestamp,
      tone: "speech",
    });
  }

  if (reasoning) {
    appendLaneItem(agent, {
      id: `${message.id}-${agent}-reasoning`,
      title: "agent.reasoning.delta",
      text: reasoning,
      timestamp: group.reasoningTimestamp ?? messageTimestamp,
      tone: "reasoning",
    });
  }

  if (text) {
    appendLaneItem(agent, {
      id: `${message.id}-${agent}-text`,
      title: finalText ? "agent.text.final" : "agent.text.delta",
      text,
      timestamp: group.textFinalTimestamp ?? group.textTimestamp ?? messageTimestamp,
      tone: "text",
    });
  }

  if (speechText) {
    appendLaneItem(agent, {
      id: `${message.id}-${agent}-speech`,
      title: group.speechFinal.trim() ? "speech_text.final" : "speech_text.delta",
      text: speechText,
      timestamp: group.speechTimestamp ?? messageTimestamp,
      tone: "speech",
    });
  }

  if (group.tools.length > 0) {
    appendLaneItem(agent, {
      id: `${message.id}-${agent}-tools`,
      title: "agent.tool_call.delta",
      text: group.tools
        .map((toolCall) => `${toolCall.name ?? "unknown tool"} · ${toolCall.status ?? "streaming"}`)
        .join("\n"),
      timestamp: group.toolTimestamp ?? messageTimestamp,
      tone: "tool",
    });
  }

  if (group.audioStatus) {
    const streamLabel = group.audioStatus.interrupted
      ? "stream interrupted"
      : group.audioStatus.completed
        ? "stream completed"
        : "streaming";
    appendLaneItem(agent, {
      id: `${message.id}-${agent}-audio`,
      title: "tts.audio",
      text: formatAudioTraceText(group.audioStatus, playbackStatus, streamLabel),
      timestamp: group.audioTimestamp ?? messageTimestamp,
      tone: "audio",
    });
  }
}

function getLatestAudioStatusMessageId(messages: LegalChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (getDataParts(messages[index], "audioStatus").length > 0) {
      return messages[index].id;
    }
  }

  return null;
}

function formatTtsPlaybackLabel(status?: TtsPlaybackStatus) {
  if (!status || status.phase === "idle" || status.chunks === 0) return null;

  const modeLabel =
    status.mode === "blob"
      ? "blob fallback"
      : status.mode === "media-source"
        ? "media source"
        : null;
  const phaseLabel = (() => {
    if (status.phase === "buffering") {
      return status.streamCompleted ? "finalizing buffer" : "buffering";
    }
    if (status.phase === "playing") return "playing";
    if (status.phase === "blocked") return "playback blocked";
    if (status.phase === "completed") return "playback completed";
    if (status.phase === "error") return "playback error";
    return null;
  })();

  if (!phaseLabel) return null;
  return modeLabel ? `${phaseLabel} (${modeLabel})` : phaseLabel;
}

function formatAudioTraceText(
  audioStatus: ChatMessageData["audioStatus"],
  playbackStatus: TtsPlaybackStatus | undefined,
  streamLabel: string
) {
  const playbackLabel = formatTtsPlaybackLabel(playbackStatus);
  return [`${audioStatus.chunks} chunks`, streamLabel, playbackLabel]
    .filter(Boolean)
    .join(" · ");
}

function createAgentTraceGroup(): AgentTraceGroup {
  return {
    input: "",
    reasoning: "",
    speechDelta: "",
    speechFinal: "",
    text: "",
    textFinal: "",
    tools: [],
  };
}

function normalizeAgentName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function formatAgentLabel(agent: string) {
  return agentTraceLaneLabels[agent] ?? agent.replaceAll("_", " ");
}

function AgentTraceLaneIcon({ agent }: { agent: string }) {
  if (agent === "speech_synthesis_node") {
    return <SpeakerWaveIcon className="chat-trace-icon-audio size-3.5 shrink-0" />;
  }
  if (agent === "main_agent" || agent === "speech_text_agent") {
    return <CpuChipIcon className="chat-trace-icon-agent size-3.5 shrink-0" />;
  }
  return <WrenchScrewdriverIcon className="size-3.5 shrink-0 text-white/45" />;
}

function agentTraceToneClassName(tone: AgentTraceTone) {
  switch (tone) {
    case "audio":
      return "chat-trace-audio";
    case "reasoning":
      return "chat-trace-reasoning";
    case "speech":
      return "chat-trace-speech";
    case "text":
      return "chat-trace-text";
    case "tool":
      return "chat-trace-tool";
  }
}

function TraceTimestamp({ timestamp }: { timestamp?: string }) {
  const label = formatTimestamp(timestamp);
  if (!label) return null;
  return (
    <div className="mt-1.5 text-right text-[10px] font-medium leading-none text-white/35">
      {label}
    </div>
  );
}
