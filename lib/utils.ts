import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}
