import Image from "next/image"
import { cn } from "@/lib/utils"

type MascotAvatarProps = {
  className?: string
  imageSize?: number
  alt?: string
  priority?: boolean
}

export function MascotAvatar({ className, imageSize = 40, alt = "로디", priority = false }: MascotAvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ffb199] ring-2 ring-[#ff764c]/30",
        className,
      )}
    >
      <Image
        src="/images/mascot.png"
        alt={alt}
        width={imageSize}
        height={imageSize}
        priority={priority}
        className="size-full object-cover"
      />
    </span>
  )
}
