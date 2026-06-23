import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn/ui primitives use this helper to compose conditional Tailwind classes
// while resolving conflicting utilities deterministically.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
