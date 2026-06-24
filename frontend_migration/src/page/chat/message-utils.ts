import type { ChatMessageData, LegalChatMessage } from "@/bff/chat/contract";

export type DataPartName = keyof ChatMessageData & string;

export function getMessageText(message: LegalChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function getDataParts<TName extends DataPartName>(
  message: LegalChatMessage,
  name: TName
) {
  return message.parts.filter((part) => part.type === `data-${name}`) as Array<{
    type: `data-${TName}`;
    id?: string;
    data: ChatMessageData[TName];
  }>;
}

export function getMessageTimestampValue(message: LegalChatMessage) {
  return getDataParts(message, "messageTimestamp").at(-1)?.data.timestamp;
}

export function getMessageTimestampMap(
  messages: LegalChatMessage[],
  cache: Map<string, string>
) {
  const activeIds = new Set(messages.map((message) => message.id));

  for (const messageId of cache.keys()) {
    if (!activeIds.has(messageId)) cache.delete(messageId);
  }

  for (const message of messages) {
    const timestamp = getMessageTimestampValue(message);
    if (timestamp) cache.set(message.id, timestamp);
    else if (!cache.has(message.id)) cache.set(message.id, new Date().toISOString());
  }

  return new Map(cache);
}

export function formatTimestamp(timestamp?: string) {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
