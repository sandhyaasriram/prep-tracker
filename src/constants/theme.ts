/**
 * Design tokens and theme configuration for Placement OS.
 * Colors, typography, spacing, and other design constants.
 */

export const lightTheme = {
  bg: {
    primary: '#FAF8F4',
    surface: '#FFFFFF',
    raised: '#F3F0EB',
  },
  text: {
    primary: '#1A1614',
    muted: '#7A736B',
  },
  accent: {
    primary: '#5B5FEF', // indigo
    warm: '#E8622A', // terracotta
    green: '#2D7A4F', // forest green
    amber: '#C4841A', // amber
  },
  border: '#E8E3DC',
} as const;

export const darkTheme = {
  bg: {
    primary: '#0D0F12',
    surface: '#13161A',
    raised: '#1C2028',
  },
  text: {
    primary: '#E8EDF2',
    muted: '#6B7280',
  },
  accent: {
    primary: '#6B6FF5', // indigo
    warm: '#E8622A', // terracotta
    green: '#3D9B63', // forest green
    amber: '#D4941A', // amber
  },
  border: '#232830',
} as const;

export const categoryColors = {
  DSA: '#5B5FEF', // indigo
  Applications: '#E8622A', // terracotta
  Projects: '#2D7A4F', // forest green
  Certifications: '#C4841A', // amber
  'Interview Prep': '#B85C7A', // dusty rose
  Journal: '#7A736B', // warm grey
} as const;

export const difficultyColors = {
  Easy: '#2D7A4F', // green
  Medium: '#C4841A', // amber
  Hard: '#E8622A', // terracotta
} as const;

export const typography = {
  fontFamily: {
    display: '"Instrument Serif", serif',
    body: '"Satoshi", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  fontSize: {
    micro: '11px',
    small: '13px',
    body: '15px',
    h3: '18px',
    h2: '24px',
    h1: '32px',
    display: '48px',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.15)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.2)',
} as const;

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
