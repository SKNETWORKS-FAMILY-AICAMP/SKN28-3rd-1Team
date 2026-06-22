"use client"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { ChatAudioPlayer } from "@/features/chat/components/chat-audio-player"
import { ChatComposer } from "@/features/chat/components/chat-composer"
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state"
import { ChatMessageList } from "@/features/chat/components/chat-message-list"
import { useChatSession } from "@/features/chat/hooks/use-chat-session"

export function ChatInterface() {
  const {
    messages,
    input,
    setInput,
    birthYear,
    setBirthYear,
    location,
    setLocation,
    audioEnabled,
    setAudioEnabled,
    audioPlayer,
    playAudio,
    pauseAudio,
    replayAudio,
    seekAudio,
    send,
    status,
    error,
    isBusy,
    empty,
  } = useChatSession()

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col px-4 sm:px-6">
      <div className="min-h-0 flex-1 overflow-hidden rounded-[40px] bg-white">
        <Conversation className="h-full bg-[#faf6f1]">
          <ConversationContent className="gap-6 p-6">
            {empty ? (
              <ChatEmptyState
                birthYear={birthYear}
                location={location}
                onBirthYearChange={setBirthYear}
                onLocationChange={setLocation}
                onSuggestionClick={send}
              />
            ) : (
              <ChatMessageList messages={messages} status={status} />
            )}
          </ConversationContent>
          {!empty && <ConversationScrollButton className="border-[#dfddd8] text-[#1a1919]" />}
        </Conversation>
      </div>

      <ChatComposer
        input={input}
        isBusy={isBusy}
        error={error}
        audioPlayer={
          <ChatAudioPlayer
            player={audioPlayer}
            audioEnabled={audioEnabled}
            onAudioEnabledChange={setAudioEnabled}
            onPlay={playAudio}
            onPause={pauseAudio}
            onReplay={replayAudio}
            onSeek={seekAudio}
          />
        }
        onInputChange={setInput}
        onSubmit={() => send(input)}
      />
    </div>
  )
}
