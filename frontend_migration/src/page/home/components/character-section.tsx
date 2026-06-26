import Image from "next/image";
import { MessageCircleHeart, SearchCheck, ShieldCheck } from "lucide-react";

import { FadeIn } from "@/ui/components/fade-in";

const characterPoints = [
  {
    icon: MessageCircleHeart,
    title: "Road + Buddy",
    desc: "길을 뜻하는 Road와 친구를 뜻하는 Buddy를 합친 이름입니다.",
  },
  {
    icon: SearchCheck,
    title: "복지 길잡이",
    desc: "지원 정책, 돌봄 기관, 요양 시설처럼 복잡한 정보를 쉽게 정리합니다.",
  },
  {
    icon: ShieldCheck,
    title: "옆에서 동행",
    desc: "앞에서 끌고 가기보다 곁에서 함께 걸으며 필요한 방향을 알려줍니다.",
  },
];

export function CharacterSection() {
  return (
    <section
      id="character"
      className="border-y border-border/60 bg-secondary/20"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] md:py-24 lg:gap-16">
        <FadeIn direction="left" className="flex max-w-3xl flex-col gap-7">
          <div className="max-w-3xl">
            <span className="text-sm font-bold text-primary">로디 캐릭터 소개</span>
            <h2 className="mt-3 font-heading text-3xl text-foreground text-balance sm:text-4xl">
              복잡한 복지 정보를 쉬운 길로
              <br />
              바꾸는 안내자 로디
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              로디(Rody)는 길을 뜻하는 Road와 친구를 뜻하는 Buddy를 합친 이름입니다.
              복지 서비스, 돌봄 기관, 병원, 요양 시설, 지원 정책처럼 찾기 어려운 정보를 사용자가 이해하기 쉬운 말로 바꾸고,
              필요한 장소와 절차를 차근차근 안내합니다.
            </p>
            <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
              로디가 강아지인 이유는 친근한 동반자처럼 옆에서 기다려주고, 헷갈리는 순간에 방향을 알려주는 이미지를 담기 위해서입니다.
            </p>
          </div>

          <div className="grid gap-4">
            {characterPoints.map((point) => (
              <div
                key={point.title}
                className="grid gap-3 sm:grid-cols-[40px_minmax(0,1fr)]"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <point.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-lg text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                    {point.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn direction="right" className="relative flex justify-center md:justify-end">
          <div className="relative flex aspect-square w-full max-w-sm items-center justify-center lg:mr-6">
            <Image
              src="/mascots/mascot.png"
              alt="법률·복지 안내 캐릭터 로디"
              width={520}
              height={520}
              className="h-auto w-[92%] drop-shadow-2xl"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
