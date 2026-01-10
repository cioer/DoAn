import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge className strings with Tailwind CSS classes
 *
 * Uses clsx for conditional class names and tailwind-merge
 * to intelligently merge Tailwind classes without conflicts.
 *
 * @example
 * ```tsx
 * cn('px-4 py-2', 'px-2') // => 'py-2 px-2' (px-2 overrides px-4)
 * cn('text-blue-500', isRed && 'text-red-500') // => conditional
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
