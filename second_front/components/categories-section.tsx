import Link from "next/link"
import { Coins, HeartHandshake, Briefcase, Scale, Clock, ShieldAlert } from "lucide-react"
import { FadeIn } from "@/components/fade-in"

const categories = [
  { icon: Coins, title: "기초연금", q: "기초연금 신청 방법과 준비 서류를 알려줘." },
  { icon: HeartHandshake, title: "노인복지 · 혜택", q: "65세 이상 노인이 받을 수 있는 혜택은 뭐가 있어?" },
  { icon: Briefcase, title: "노인일자리 · 고용", q: "노인일자리 신청은 어디에서 할 수 있어?" },
  { icon: ShieldAlert, title: "연령차별 대응", q: "고령자가 나이 때문에 채용에서 차별받으면 어떻게 대응해야 해?" },
  { icon: Clock, title: "퇴직금 · 근로", q: "퇴직금을 못 받았을 때 어떤 법을 확인해야 해?" },
  { icon: Scale, title: "권리 보호 절차", q: "어르신이 권리를 침해당했을 때 도움받을 수 있는 곳은 어디야?" },
]

export function CategoriesSection() {
  return (
    <section id="categories" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <FadeIn className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="font-heading text-3xl text-foreground text-balance sm:text-4xl">
          어떤 점이 궁금하세요?
        </h2>
        <p className="mt-3 text-pretty text-lg text-muted-foreground">
          분야를 선택하면 바로 로디와 상담을 시작할 수 있어요.
        </p>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c, i) => (
          <FadeIn key={c.title} delay={i * 80}>
            <Link
              href={`/chat?q=${encodeURIComponent(c.q)}`}
              className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <c.icon className="size-6" />
              </span>
              <div>
                <h3 className="font-heading text-lg text-foreground">{c.title}</h3>
                <p className="line-clamp-1 text-sm text-muted-foreground">{c.q}</p>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
