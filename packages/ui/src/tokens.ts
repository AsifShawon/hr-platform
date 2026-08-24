/**
 * Design Tokens for Local-First HR ID Card Platform
 * Palette: Deep Teal System
 */

export const COLOR_TOKENS = {
  primary: {
    DEFAULT: '#134E4A', // Deep Teal 900
    hover: '#115E59', // Teal 800
    active: '#134E4A',
    light: '#CCFBF1', // Teal 100
  },
  secondary: {
    DEFAULT: '#0F766E', // Teal 700
    hover: '#115E59',
    light: '#E6FFFA',
  },
  accent: {
    DEFAULT: '#14B8A6', // Teal 500
    hover: '#0D9488', // Teal 600
    light: '#F0FDFA', // Teal 50
  },
  background: {
    DEFAULT: '#F0FDFA', // Teal 50
    subtle: '#F8FAFC', // Slate 50
    card: '#FFFFFF',
  },
  text: {
    primary: '#0F172A', // Slate 900
    secondary: '#475569', // Slate 600
    muted: '#94A3B8', // Slate 400
    inverse: '#FFFFFF',
  },
  border: {
    DEFAULT: '#E2E8F0', // Slate 200
    strong: '#CBD5E1', // Slate 300
    focus: '#0F766E', // Teal 700
  },
  feedback: {
    success: '#059669', // Emerald 600
    successBg: '#ECFDF5',
    warning: '#D97706', // Amber 600
    warningBg: '#FFFBEB',
    error: '#E11D48', // Rose 600
    errorBg: '#FFF1F2',
    info: '#0284C7', // Sky 600
    infoBg: '#F0F9FF',
  },
} as const;

export const FOCUS_RING_CLASSES =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

export const CARD_GEOMETRY = {
  defaultWidthMm: 60,
  defaultHeightMm: 90,
  aspectRatio: '60/90',
  standardDpi: 300,
} as const;
