"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

export function HeroMascotCard() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const playMascotVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  const stopMascotVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
  };

  return (
    <Link
      href="/chat"
      aria-label="상담 화면으로 이동"
      className="group relative flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-card to-secondary/60 shadow-xl ring-1 ring-border transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onBlur={stopMascotVideo}
      onFocus={playMascotVideo}
      onPointerEnter={playMascotVideo}
      onPointerLeave={stopMascotVideo}
    >
      <Image
        src="/mascots/mascot.png"
        alt="법률 가이드 책을 든 법률 챗봇 마스코트 로디"
        width={520}
        height={520}
        loading="eager"
        priority
        className="h-auto w-[90%] drop-shadow-2xl transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0"
      />
      <video
        ref={videoRef}
        aria-hidden="true"
        className="absolute h-auto w-[90%] opacity-0 drop-shadow-2xl transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        loop
        muted
        playsInline
        poster="/mascots/mascot2.png"
        preload="auto"
      >
        <source src="/mascots/mascot2.mp4" type="video/mp4" />
      </video>
      <span className="absolute -right-3 top-10 rounded-2xl bg-card px-4 py-2 text-sm font-medium text-foreground shadow-md ring-1 ring-border">
        안녕하세요, 로디예요!
      </span>
    </Link>
  );
}
