import Image from "next/image";

export function StartScreen() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-10 py-8 text-center">
      <span className="flex size-[min(440px,52vw,46vh)] items-center justify-center overflow-hidden rounded-full bg-[var(--chat-primary-soft)] shadow-[var(--chat-mascot-shadow-lg)]">
        <Image
          src="/mascots/mascot.png"
          alt="로디"
          width={440}
          height={440}
          className="size-full object-cover"
          priority
        />
      </span>
    </div>
  );
}
