import { suggestedQuestions } from "@/features/chat/constants"
import { MascotAvatar } from "@/features/chat/components/mascot-avatar"
import { cn } from "@/lib/utils"

type ChatEmptyStateProps = {
  birthYear: string
  location: string
  onBirthYearChange: (value: string) => void
  onLocationChange: (value: string) => void
  onSuggestionClick: (question: string) => void
}

export function ChatEmptyState({
  birthYear,
  location,
  onBirthYearChange,
  onLocationChange,
  onSuggestionClick,
}: ChatEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 rounded-[40px] border border-[#ffb199] bg-[#fff3e7] px-6 py-10 text-center">
      <MascotAvatar className="h-24 w-24 ring-4" imageSize={96} priority />
      <div className="w-full max-w-3xl space-y-3 text-center">
        <h1 className="font-heading text-3xl font-medium tracking-[-0.03em] text-[#1a1919] sm:text-4xl">
          무엇을 도와드릴까요?
        </h1>
        <div className="mx-auto w-full max-w-xl space-y-1">
          <p className="text-base leading-7 text-[#52545a]">
            기초연금·노인복지·고용 등 궁금한 점을 편하게 물어보세요.
          </p>
          <p className="text-sm leading-7 text-[#76716f]">나이와 사는 곳을 입력하면 로디가 더 정확하게 답해드릴게요.</p>
        </div>
      </div>
      <div className="grid w-full max-w-lg grid-cols-2 gap-4 px-2 text-left sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-[40px] border border-[#dfddd8] bg-white px-4 py-2 text-sm text-[#1a1919] shadow-sm">
          <span className="whitespace-nowrap text-sm font-medium text-[#9a3f16]">출생 연도</span>
          <input
            value={birthYear}
            onChange={(event) => onBirthYearChange(event.target.value)}
            inputMode="numeric"
            placeholder="예: 1958년"
            className="h-10 w-full min-w-0 border-0 bg-transparent text-sm font-medium text-[#1a1919] outline-none placeholder:text-[#898c94]"
          />
        </label>
        <label className="flex items-center gap-3 rounded-[40px] border border-[#dfddd8] bg-white px-4 py-2 text-sm text-[#1a1919] shadow-sm">
          <span className="whitespace-nowrap text-sm font-medium text-[#9a3f16]">사는 곳</span>
          <input
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="예: 서울 강남구"
            className="h-10 w-full min-w-0 border-0 bg-transparent text-sm font-medium text-[#1a1919] outline-none placeholder:text-[#898c94]"
          />
        </label>
      </div>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestedQuestions.map((question, index) => (
          <button
            type="button"
            key={question}
            onClick={() => onSuggestionClick(question)}
            className={cn(
              "w-full rounded-full border border-[#dfddd8] bg-white px-8 py-3 text-center text-sm leading-6 font-medium whitespace-normal text-[#312e2e] transition hover:border-[#ff3c00] hover:text-[#0e0e0f]",
              index === suggestedQuestions.length - 1 ? "sm:col-span-2 sm:w-auto sm:justify-self-center" : "",
            )}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
