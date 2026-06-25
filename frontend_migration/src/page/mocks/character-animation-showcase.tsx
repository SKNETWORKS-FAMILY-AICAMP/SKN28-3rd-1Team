"use client";

import {
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  PlayIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { AnimatedMascot } from "@/ui/components/mascot/animated-mascot";
import {
  MASCOT_ANIMATION_CLIPS,
  MASCOT_ANIMATION_NAMES,
  type MascotAnimationName,
} from "@/ui/components/mascot/mascot-animation-data";

const animationIcons = {
  attentive: PencilSquareIcon,
  greeting: PlayIcon,
  idle: SparklesIcon,
  listening: MicrophoneIcon,
  sad: ExclamationTriangleIcon,
  speaking: ChatBubbleLeftRightIcon,
  thinking: BoltIcon,
} satisfies Record<MascotAnimationName, typeof SparklesIcon>;

const triggerMap: Array<{
  event: string;
  state: MascotAnimationName;
}> = [
  { event: "초기 진입", state: "idle" },
  { event: "로디 클릭", state: "greeting" },
  { event: "텍스트 입력", state: "attentive" },
  { event: "음성 입력", state: "listening" },
  { event: "요청 대기", state: "thinking" },
  { event: "답변 재생", state: "speaking" },
  { event: "오류 발생", state: "sad" },
];

export function CharacterAnimationShowcase() {
  const [selectedAnimation, setSelectedAnimation] =
    useState<MascotAnimationName>("idle");
  const selectedClip = MASCOT_ANIMATION_CLIPS[selectedAnimation];
  const selectedTrigger = useMemo(
    () => triggerMap.find((item) => item.state === selectedAnimation),
    [selectedAnimation]
  );

  return (
    <section className="overflow-hidden rounded-md border border-[#ead9c6] bg-[#ece7e0] text-[#3a342e]">
      <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative flex min-h-[460px] items-center justify-center px-6 py-10">
          <div className="absolute inset-x-10 bottom-10 h-20 rounded-[999px] bg-[#d9cfc2] blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <div className="flex size-[min(420px,70vw)] items-center justify-center rounded-full bg-[#fbe6d4] shadow-[inset_0_0_0_2px_#f4d6bd,0_24px_60px_rgb(239_139_84_/_0.22)]">
              <AnimatedMascot
                animation={selectedAnimation}
                className="max-w-[74%]"
                shadow
                size="74%"
              />
            </div>
            <h2 className="mt-7 text-[28px] font-extrabold text-[#2f2b26]">
              {selectedClip.label}
            </h2>
            <p className="mt-2 max-w-[440px] text-[15px] leading-[1.65] text-[#8c8276]">
              {selectedClip.description}
            </p>
          </div>
        </div>

        <aside className="border-t border-[#ead9c6] bg-[#fffaf3] p-5 lg:border-l lg:border-t-0">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-normal text-[#8c8276]">
              Mascot State
            </p>
            <div className="mt-3 grid gap-2">
              {MASCOT_ANIMATION_NAMES.map((animation) => {
                const clip = MASCOT_ANIMATION_CLIPS[animation];
                const Icon = animationIcons[animation];
                const selected = selectedAnimation === animation;

                return (
                  <button
                    key={animation}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedAnimation(animation)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-[12px] border px-3 text-left text-sm font-bold transition",
                      selected
                        ? "border-[#ef8b54] bg-[#ef8b54] text-white shadow-[0_2px_8px_rgb(239_139_84_/_0.3)]"
                        : "border-[#efe7da] bg-white text-[#3a342e] hover:border-[#f4d6bd]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        selected ? "text-white" : "text-[#ef8b54]"
                      )}
                    />
                    <span>{clip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7">
            <p className="text-xs font-extrabold uppercase tracking-normal text-[#8c8276]">
              Trigger Map
            </p>
            <div className="mt-3 divide-y divide-[#efe7da] overflow-hidden rounded-[12px] border border-[#efe7da] bg-white">
              {triggerMap.map((item) => {
                const active = item.state === selectedAnimation;

                return (
                  <button
                    key={item.event}
                    type="button"
                    onClick={() => setSelectedAnimation(item.state)}
                    className={cn(
                      "grid w-full grid-cols-[88px_minmax(0,1fr)] items-center gap-3 px-3 py-3 text-left text-sm transition",
                      active ? "bg-[#fbe6d4]" : "hover:bg-[#fff3e7]"
                    )}
                  >
                    <span className="font-semibold text-[#8c8276]">
                      {item.event}
                    </span>
                    <span className="font-extrabold text-[#2f2b26]">
                      {MASCOT_ANIMATION_CLIPS[item.state].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7 rounded-[12px] border border-[#efe7da] bg-white px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-normal text-[#8c8276]">
              Selected
            </p>
            <p className="mt-2 text-sm font-bold text-[#2f2b26]">
              {selectedTrigger?.event ?? "직접 선택"} / {selectedClip.label}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
