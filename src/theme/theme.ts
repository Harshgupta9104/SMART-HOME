/**
 * App Theme System - Multi-Theme Support
 * Semantic color tokens for light, dark, and custom themes
 * Supports both React Native StyleSheet and NativeWind className utilities
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
  chipBackground: string;
  chipActiveBackground: string;
  switchTrackOn: string;
  switchTrackOff: string;
}

export type AppThemeMode = 'light' | 'dark' | 'ocean' | 'emerald' | 'purple' | 'system';
export type ResolvedThemeMode = 'light' | 'dark' | 'ocean' | 'emerald' | 'purple';

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
  chipBackground: 'rgba(255, 255, 255, 0.6)',
  chipActiveBackground: '#3B82F6',
  switchTrackOn: '#3B82F6',
  switchTrackOff: '#D1D5DB',
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
  chipBackground: 'rgba(31, 41, 55, 0.4)',
  chipActiveBackground: '#60A5FA',
  switchTrackOn: '#60A5FA',
  switchTrackOff: '#4B5563',
};

export const OCEAN_THEME: ThemeColors = {
  // Background - Deep ocean blue
  background: '#0A1F3F',
  backgroundSecondary: '#142856',

  // Surface - Ocean tones
  surface: '#1A3A52',
  surfaceElevated: '#234763',

  // Cards - Teal/cyan accents
  card: 'rgba(26, 58, 82, 0.95)',
  cardGlass: 'rgba(36, 71, 99, 0.4)',

  // Text - Light for readability
  textPrimary: '#E8F4F8',
  textSecondary: '#B3D9E8',
  textMuted: '#96C4D8',

  // Borders - Cyan accents
  border: 'rgba(71, 184, 230, 0.15)',
  borderStrong: 'rgba(71, 184, 230, 0.25)',

  // Semantic colors
  primary: '#47B8E6', // Bright cyan
  primarySoft: 'rgba(71, 184, 230, 0.1)',
  success: '#2DD4BF', // Teal
  warning: '#FBBF24', // Gold
  danger: '#F87171', // Red

  // Components
  icon: '#E8F4F8',
  shadow: '#000000',
  bottomNav: 'rgba(26, 58, 82, 0.98)',
  inputBackground: '#0F2D45',
  chipBackground: 'rgba(36, 71, 99, 0.4)',
  chipActiveBackground: '#47B8E6',
  switchTrackOn: '#47B8E6',
  switchTrackOff: '#2D5A7B',
};

export const EMERALD_THEME: ThemeColors = {
  // Background - Dark forest green
  background: '#0F2818',
  backgroundSecondary: '#153D28',

  // Surface - Deeper green
  surface: '#1B4D35',
  surfaceElevated: '#245A42',

  // Cards - Green accents
  card: 'rgba(27, 77, 53, 0.95)',
  cardGlass: 'rgba(36, 90, 66, 0.4)',

  // Text - Light sage
  textPrimary: '#E8F5F1',
  textSecondary: '#B3D9CC',
  textMuted: '#96CABD',

  // Borders - Emerald accents
  border: 'rgba(16, 185, 129, 0.15)',
  borderStrong: 'rgba(16, 185, 129, 0.25)',

  // Semantic colors
  primary: '#10B981', // Emerald
  primarySoft: 'rgba(16, 185, 129, 0.1)',
  success: '#34D399', // Light emerald
  warning: '#FBBF24', // Gold
  danger: '#F87171', // Red

  // Components
  icon: '#E8F5F1',
  shadow: '#000000',
  bottomNav: 'rgba(27, 77, 53, 0.98)',
  inputBackground: '#0A1F13',
  chipBackground: 'rgba(36, 90, 66, 0.4)',
  chipActiveBackground: '#10B981',
  switchTrackOn: '#10B981',
  switchTrackOff: '#2D5A42',
};

export const PURPLE_THEME: ThemeColors = {
  // Background - Deep purple/violet
  background: '#1A0F3F',
  backgroundSecondary: '#2D1B52',

  // Surface - Rich purple
  surface: '#3D2663',
  surfaceElevated: '#4D3173',

  // Cards - Violet accents
  card: 'rgba(61, 38, 99, 0.95)',
  cardGlass: 'rgba(77, 49, 115, 0.4)',

  // Text - Light purple
  textPrimary: '#F3E8FF',
  textSecondary: '#D8B4FE',
  textMuted: '#C4B5FD',

  // Borders - Purple accents
  border: 'rgba(168, 85, 247, 0.15)',
  borderStrong: 'rgba(168, 85, 247, 0.25)',

  // Semantic colors
  primary: '#A855F7', // Purple
  primarySoft: 'rgba(168, 85, 247, 0.1)',
  success: '#10B981', // Green (for smart home status)
  warning: '#FBBF24', // Gold
  danger: '#F87171', // Red

  // Components
  icon: '#F3E8FF',
  shadow: '#000000',
  bottomNav: 'rgba(61, 38, 99, 0.98)',
  inputBackground: '#1A0F3F',
  chipBackground: 'rgba(77, 49, 115, 0.4)',
  chipActiveBackground: '#A855F7',
  switchTrackOn: '#A855F7',
  switchTrackOff: '#6D28D9',
};

/**
 * Get theme colors based on mode
 * System mode resolves to light or dark based on phone setting
 */
export function getTheme(
  mode: ResolvedThemeMode | AppThemeMode,
  systemColorScheme?: 'light' | 'dark' | null,
): ThemeColors {
  // Handle system mode
  if (mode === 'system') {
    const resolved = systemColorScheme === 'dark' ? 'dark' : 'light';
    return getTheme(resolved, systemColorScheme);
  }

  switch (mode) {
    case 'light':
      return LIGHT_THEME;
    case 'dark':
      return DARK_THEME;
    case 'ocean':
      return OCEAN_THEME;
    case 'emerald':
      return EMERALD_THEME;
    case 'purple':
      return PURPLE_THEME;
    default:
      return LIGHT_THEME;
  }
}

/**
 * Get React Navigation theme object based on resolved theme mode
 */
export function getNavigationTheme(resolvedMode: ResolvedThemeMode) {
  const isDark = resolvedMode !== 'light';
  const colors = getTheme(resolvedMode);

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

/**
 * Check if a theme mode is a dark-based theme
 */
export function isDarkTheme(mode: ResolvedThemeMode): boolean {
  return mode === 'dark' || mode === 'ocean' || mode === 'emerald' || mode === 'purple';
}

/**
 * Get available theme modes
 */
export const AVAILABLE_THEMES: { mode: ResolvedThemeMode; label: string }[] = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'ocean', label: 'Ocean Blue' },
  { mode: 'emerald', label: 'Emerald Green' },
  { mode: 'purple', label: 'Royal Purple' },
];

