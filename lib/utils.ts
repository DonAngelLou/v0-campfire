import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUserId(walletAddress: string): string {
  // Create a simple hash from wallet address
  let hash = 0
  for (let i = 0; i < walletAddress.length; i++) {
    const char = walletAddress.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Take absolute value and get last 4 digits
  const id = Math.abs(hash) % 10000
  return `#${id.toString().padStart(4, "0")}`
}
