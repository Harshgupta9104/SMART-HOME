/**
 * App Theme System
 * Semantic color tokens for light and dark modes
 */

export interface ThemeColors {
  // Background
  background: string;
  backgroundSecondary: string;

  // Surface
  surface: string;
  surfaceElevated: string;

  // Cards
  card: string;
  cardGlass: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  border: string;
  borderStrong: string;

  // Semantic colors
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;

  // Components
  icon: string;
  shadow: string;
  bottomNav: string;
  inputBackground: string;
  switchTrack: string;
  chipBackground: string;
  chipActiveBackground: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export const LIGHT_THEME: ThemeColors = {
  // Background
  background: '#F4F7FB',
  backgroundSecondary: '#EBEEF2',

  // Surface
  surface: '#FFFFFF',
  surfaceElevated: '#F9FAFB',

  // Cards
  card: 'rgba(255, 255, 255, 0.9)',
  cardGlass: 'rgba(255, 255, 255, 0.6)',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderStrong: 'rgba(0, 0, 0, 0.12)',

  // Semantic colors
  primary: '#3B82F6',
  primarySoft: 'rgba(59, 130, 246, 0.1)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Components
  icon: '#111827',
  shadow: '#000000',
  bottomNav: 'rgba(255, 255, 255, 0.95)',
  inputBackground: '#F3F4F6',
  switchTrack: '#E5E7EB',
  chipBackground: 'rgba(255, 255, 255, 0.6)',
  chipActiveBackground: '#3B82F6',
};

export const DARK_THEME: ThemeColors = {
  // Background
  background: '#0B1120',
  backgroundSecondary: '#111827',

  // Surface
  surface: '#111827',
  surfaceElevated: '#1F2937',

  // Cards
  card: 'rgba(17, 24, 39, 0.95)',
  cardGlass: 'rgba(31, 41, 55, 0.4)',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',

  // Semantic colors
  primary: '#60A5FA',
  primarySoft: 'rgba(96, 165, 250, 0.1)',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',

  // Components
  icon: '#F9FAFB',
  shadow: '#000000',
  bottomNav: 'rgba(17, 24, 39, 0.98)',
  inputBackground: '#1F2937',
  switchTrack: '#374151',
  chipBackground: 'rgba(31, 41, 55, 0.4)',
  chipActiveBackground: '#60A5FA',
};

export function getTheme(isDark: boolean): ThemeColors {
  return isDark ? DARK_THEME : LIGHT_THEME;
}

export function getNavigationTheme(isDark: boolean) {
  const colors = getTheme(isDark);
  return {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.danger,
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400' as const,
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500' as const,
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700' as const,
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '800' as const,
      },
    },
  };
}
