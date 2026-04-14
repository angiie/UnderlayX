import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isSubscriptionActive(expiresAt: string | null): boolean {
  return true; // 强制关闭充值限制，所有用户均视为 Pro 用户
}
