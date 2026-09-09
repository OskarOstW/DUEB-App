import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Mergt Tailwind-Klassen konfliktfrei (shadcn-Standard). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
