"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  MASCOT_ANIMATION_CLIPS,
  MASCOT_SPRITE,
  type MascotAnimationName,
} from "@/ui/components/mascot/mascot-animation-data";

import styles from "./animated-mascot.module.css";

type AnimatedMascotProps = {
  alt?: string;
  animation?: MascotAnimationName;
  className?: string;
  shadow?: boolean;
  size?: number | string;
};

export function AnimatedMascot({
  alt = "로디",
  animation = "idle",
  className,
  shadow = false,
  size = 220,
}: AnimatedMascotProps) {
  const [playback, setPlayback] = useState<{
    animation: MascotAnimationName;
    frameIndex: number;
  }>({ animation, frameIndex: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();
  const clip = MASCOT_ANIMATION_CLIPS[animation];
  const frameIndex = playback.animation === animation ? playback.frameIndex : 0;
  const frame = clip.frames[frameIndex % clip.frames.length];
  const x = toBackgroundPosition(frame.column, MASCOT_SPRITE.columns);
  const y = toBackgroundPosition(frame.row, MASCOT_SPRITE.rows);
  const resolvedSize = typeof size === "number" ? `${size}px` : size;

  useEffect(() => {
    if (prefersReducedMotion || clip.frames.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setPlayback((current) => {
        const currentFrameIndex =
          current.animation === animation ? current.frameIndex : 0;

        return {
          animation,
          frameIndex: (currentFrameIndex + 1) % clip.frames.length,
        };
      });
    }, clip.frameDurationMs);

    return () => window.clearInterval(intervalId);
  }, [
    animation,
    clip.frameDurationMs,
    clip.frames.length,
    prefersReducedMotion,
  ]);

  return (
    <span
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
      className={cn(styles.sprite, shadow && styles.stageShadow, className)}
      data-animation={animation}
      role={alt ? "img" : undefined}
      style={
        {
          aspectRatio: `${MASCOT_SPRITE.frameWidth} / ${MASCOT_SPRITE.frameHeight}`,
          backgroundImage: `url("${MASCOT_SPRITE.src}")`,
          backgroundPosition: `${x}% ${y}%`,
          backgroundSize: `${MASCOT_SPRITE.columns * 100}% ${
            MASCOT_SPRITE.rows * 100
          }%`,
          width: resolvedSize,
        } as CSSProperties
      }
    />
  );
}

function toBackgroundPosition(index: number, total: number) {
  if (total <= 1) return 0;

  return (index / (total - 1)) * 100;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}
