import { PencilLine, Search, MessageSquareText } from "lucide-react"

const steps = [
  {
    icon: PencilLine,
    step: "01",
    title: "질문을 입력해요",
    desc: "일상 언어로 편하게 물어보세요. 예: \"기초연금은 어떻게 신청하나요?\"",
  },
  {
    icon: Search,
    step: "02",
    title: "로디가 자료를 찾아요",
    desc: "노인복지법·기초연금법·고령자고용법 등 관련 법령과 공공 문서를 검색해 근거를 모아요.",
  },
  {
    icon: MessageSquareText,
    step: "03",
    title: "근거와 함께 답변해요",
    desc: "찾은 문서를 바탕으로 쉽게 설명하고, 더 확인이 필요한 부분까지 함께 안내해드려요.",
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-heading text-3xl text-foreground text-balance sm:text-4xl">
            3단계로 끝나는 복지·법률 상담
          </h2>
          <p className="mt-3 text-pretty text-lg text-muted-foreground">
            복잡한 절차 없이, 질문 한 줄이면 충분해요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="relative rounded-3xl border border-border bg-card p-8 shadow-sm">
              <span className="font-heading text-5xl text-primary/25">{s.step}</span>
              <span className="mt-2 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <s.icon className="size-6" />
              </span>
              <h3 className="mt-5 font-heading text-xl text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
