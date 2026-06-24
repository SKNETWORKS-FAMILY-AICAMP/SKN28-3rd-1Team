import { BookOpenCheck, FileSearch, ListChecks, MessagesSquare } from "lucide-react";

import { FadeIn } from "@/ui/components/fade-in";

const features = [
  {
    icon: MessagesSquare,
    title: "자연어 상담",
    desc: "어려운 법률 용어 없이, 평소 쓰는 말로 편하게 질문할 수 있어요. 어르신도 부담 없이 물어보세요.",
  },
  {
    icon: BookOpenCheck,
    title: "근거 문서 제공",
    desc: "답변과 함께 관련 법령·공공 문서·출처를 함께 보여드려 어떤 근거로 안내했는지 확인할 수 있어요.",
  },
  {
    icon: FileSearch,
    title: "문서 검색",
    desc: "국가법령정보센터 등 공공 문서와 법령을 검색(RAG)해 사용자에게 맞는 정보를 찾아드려요.",
  },
  {
    icon: ListChecks,
    title: "추가 판단 요소 안내",
    desc: "조건이 부족하면 어떤 점을 더 확인해야 하는지 짚어드려, 본인 상황에 맞는 판단을 도와드려요.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <FadeIn className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="font-heading text-3xl text-foreground text-balance sm:text-4xl">
          로디가 도와드리는 것
        </h2>
        <p className="mt-3 text-pretty text-lg text-muted-foreground">
          흩어진 노인복지·법률 정보를 검색해 근거와 함께 쉽게 안내해드려요.
        </p>
      </FadeIn>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <FadeIn key={feature.title} delay={index * 100}>
            <div className="group flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="size-6" />
              </span>
              <h3 className="font-heading text-lg text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
