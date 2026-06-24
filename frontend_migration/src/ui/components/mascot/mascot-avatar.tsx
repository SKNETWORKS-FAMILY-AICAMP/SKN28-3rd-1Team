import Image from "next/image";

import { cn } from "@/lib/utils";

type MascotAvatarProps = {
  className?: string;
  imageSize?: number;
  alt?: string;
  priority?: boolean;
};

export function MascotAvatar({
  className,
  imageSize = 40,
  alt = "로디",
  priority = false,
}: MascotAvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-2 ring-primary/30",
        className
      )}
    >
      <Image
        src="/mascots/mascot.png"
        alt={alt}
        width={imageSize}
        height={imageSize}
        priority={priority}
        className="size-full object-cover"
      />
    </span>
  );
}
