/**
 * DESIGN SYSTEM & VISUAL STYLE PRESETS (Section 11)
 * Định nghĩa hệ thống thiết kế tái sử dụng: Typography, Colors, Spacing, SafeAreas, Shadows.
 */

export interface DesignPresetConfig {
  name: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgGradient: string;
  cardBg: string;
  cardBorder: string;
  glowColor: string;
  badgeBg: string;
  badgeBorder: string;
}

export const DESIGN_PRESETS: Record<string, DesignPresetConfig> = {
  MODERN: {
    name: 'Modern Clean',
    fontFamily: 'Montserrat',
    primaryColor: '#ffffff',
    secondaryColor: '#94a3b8',
    accentColor: '#38bdf8',
    bgGradient: 'radial-gradient(circle at 50% 30%, #0f172a 0%, #020617 100%)',
    cardBg: 'rgba(15, 23, 42, 0.85)',
    cardBorder: 'rgba(56, 189, 248, 0.3)',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
    badgeBorder: '#38bdf8',
  },
  LUXURY: {
    name: 'Luxury Gold & Slate',
    fontFamily: 'Cinzel, Montserrat',
    primaryColor: '#fef08a',
    secondaryColor: '#d4af37',
    accentColor: '#eab308',
    bgGradient: 'radial-gradient(circle at 50% 30%, #1c1917 0%, #0c0a09 100%)',
    cardBg: 'rgba(28, 25, 23, 0.88)',
    cardBorder: 'rgba(234, 179, 8, 0.4)',
    glowColor: 'rgba(234, 179, 8, 0.3)',
    badgeBg: 'rgba(234, 179, 8, 0.2)',
    badgeBorder: '#eab308',
  },
  CINEMATIC: {
    name: 'Cinematic Emerald & Teal',
    fontFamily: 'Montserrat',
    primaryColor: '#ffffff',
    secondaryColor: '#6ee7b7',
    accentColor: '#10b981',
    bgGradient: 'radial-gradient(circle at 50% 30%, #064e3b 0%, #022c22 100%)',
    cardBg: 'rgba(6, 78, 59, 0.82)',
    cardBorder: 'rgba(16, 185, 129, 0.35)',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badgeBg: 'rgba(16, 185, 129, 0.25)',
    badgeBorder: '#34d399',
  },
  TECH: {
    name: 'Cyberpunk Neon Tech',
    fontFamily: 'Inter, Montserrat',
    primaryColor: '#ffffff',
    secondaryColor: '#c084fc',
    accentColor: '#a855f7',
    bgGradient: 'radial-gradient(circle at 50% 30%, #3b0764 0%, #0f051d 100%)',
    cardBg: 'rgba(59, 7, 100, 0.85)',
    cardBorder: 'rgba(168, 85, 247, 0.4)',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    badgeBg: 'rgba(168, 85, 247, 0.25)',
    badgeBorder: '#c084fc',
  },
  EDITORIAL: {
    name: 'Editorial Crimson & Amber',
    fontFamily: 'Playfair Display, Montserrat',
    primaryColor: '#ffffff',
    secondaryColor: '#fca5a5',
    accentColor: '#ef4444',
    bgGradient: 'radial-gradient(circle at 50% 30%, #450a0a 0%, #1c0505 100%)',
    cardBg: 'rgba(69, 10, 10, 0.85)',
    cardBorder: 'rgba(239, 68, 68, 0.35)',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    badgeBg: 'rgba(239, 68, 68, 0.25)',
    badgeBorder: '#f87171',
  },
  NEWS: {
    name: 'Breaking News Navy',
    fontFamily: 'Roboto, Montserrat',
    primaryColor: '#ffffff',
    secondaryColor: '#93c5fd',
    accentColor: '#3b82f6',
    bgGradient: 'radial-gradient(circle at 50% 30%, #172554 0%, #080f28 100%)',
    cardBg: 'rgba(23, 37, 84, 0.9)',
    cardBorder: 'rgba(59, 130, 246, 0.4)',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    badgeBg: 'rgba(59, 130, 246, 0.3)',
    badgeBorder: '#60a5fa',
  },
  DOCUMENTARY: {
    name: 'Historic Sepia & Amber',
    fontFamily: 'Lora, Montserrat',
    primaryColor: '#fef3c7',
    secondaryColor: '#d97706',
    accentColor: '#f59e0b',
    bgGradient: 'radial-gradient(circle at 50% 30%, #451a03 0%, #1f0b01 100%)',
    cardBg: 'rgba(69, 26, 3, 0.88)',
    cardBorder: 'rgba(245, 158, 11, 0.4)',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
    badgeBorder: '#fbbf24',
  },
};

export class DesignSystem {
  public static getPreset(presetName?: string): DesignPresetConfig {
    if (presetName && DESIGN_PRESETS[presetName]) {
      return DESIGN_PRESETS[presetName];
    }
    return DESIGN_PRESETS.MODERN;
  }
}
