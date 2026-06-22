import { SendHorizonal, Sparkles } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type ChatComposerProps = {
  input: string
  isBusy: boolean
  error?: Error
  audioPlayer?: ReactNode
  onInputChange: (value: string) => void
  onSubmit: () => void
}

export function ChatComposer({ input, isBusy, error, audioPlayer, onInputChange, onSubmit }: ChatComposerProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="sticky bottom-0 z-10 pb-4 pt-4"
    >
      <div className="flex items-center gap-3 rounded-full border border-[#dfddd8] bg-white p-3">
        <Textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
          placeholder="기초연금, 노인복지, 고용 등 궁금한 점을 입력하세요..."
          rows={1}
          disabled={isBusy}
          className="min-h-[56px] w-full resize-none border-0 bg-transparent text-sm leading-6 text-[#1a1919] placeholder:text-[#898c94] shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isBusy}
          className="h-12 w-12 rounded-full bg-[#ff3c00] text-white hover:bg-[#ec4e02]"
        >
          <SendHorizonal className="size-5" />
          <span className="sr-only">전송</span>
        </Button>
      </div>
      {audioPlayer}
      <p className="mt-3 text-center text-xs leading-5 text-[#76716f]">
        <Sparkles className="inline-block size-3" /> 로디는 참고용 정보를 제공해요. 구체적 사안은 변호사 상담을 권장드려요.
      </p>
      {error && <p className="mt-2 text-center text-xs leading-5 text-[#c2410c]">{error.message}</p>}
    </form>
  )
}
