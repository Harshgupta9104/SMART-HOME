/**
 * Hook to create themed style objects dynamically
 * This helps reduce repetition across screens
 */

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/theme';

export interface CommonStyles {
  screenBg: any;
  headerBg: any;
  headerText: any;
  cardBg: any;
  cardBorder: any;
  textPrimary: any;
  textSecondary: any;
  iconColor: any;
  divider: any;
  statusBarStyle: 'light-content' | 'dark-content';
}

export const useThemedStyles = (): CommonStyles => {
  const { theme } = useTheme();

  return {
    screenBg: {
      backgroundColor: theme.background,
    },
    headerBg: {
      backgroundColor: theme.surface,
      borderBottomColor: theme.border,
    },
    headerText: {
      color: theme.textPrimary,
    },
    cardBg: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    cardBorder: {
      borderColor: theme.border,
    },
    textPrimary: {
      color: theme.textPrimary,
    },
    textSecondary: {
      color: theme.textSecondary,
    },
    iconColor: theme.icon,
    divider: {
      borderColor: theme.border,
    },
    statusBarStyle: theme.textPrimary === '#F9FAFB' ? 'light-content' : 'dark-content',
  };
};
