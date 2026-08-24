import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const BREAKPOINTS = {
  mobile: '360px',
  tablet: '768px',
  desktop: '1280px',
  wide: '1440px',
} as const;

export * from './tokens.js';
export * from './components/button.js';
export * from './components/input.js';
export * from './components/badge.js';
export * from './components/card-preview.js';
export * from './components/dialog.js';
export * from './components/accordion.js';
export * from './components/tabs.js';
export * from './components/table-shell.js';
export * from './components/skeleton.js';
export * from './components/empty-state.js';
