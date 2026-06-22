import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppThemeMode,
  ResolvedThemeMode,
  ThemeColors,
  getTheme,
  isDarkTheme,
} from '../theme/theme';

interface ThemeContextValue {
  theme: ThemeColors;
  mode: AppThemeMode;
  resolvedMode: ResolvedThemeMode;
  isDark: boolean;
  setMode: (mode: AppThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_MODE_KEY = '@SmartHome_ThemeMode';
const DEFAULT_MODE: AppThemeMode = 'system';

// Valid theme modes
const VALID_MODES: AppThemeMode[] = ['light', 'dark', 'ocean', 'emerald', 'purple', 'system'];

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<AppThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme mode on mount
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (savedMode && VALID_MODES.includes(savedMode as AppThemeMode)) {
          setModeState(savedMode as AppThemeMode);
        } else {
          setModeState(DEFAULT_MODE);
        }
      } catch (error) {
        console.error('[ThemeContext] Error loading theme mode:', error);
        setModeState(DEFAULT_MODE);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemeMode();
  }, []);

  // Determine resolved mode (what actually applies)
  const resolvedMode: ResolvedThemeMode = (() => {
    if (mode === 'system') {
      // System mode: use phone setting for light/dark only
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    // Explicit theme selection (ocean, emerald, purple stay as-is)
    return mode as ResolvedThemeMode;
  })();

  const isDark = isDarkTheme(resolvedMode);
  const theme = getTheme(resolvedMode);

  const setMode = async (newMode: AppThemeMode) => {
    try {
      if (VALID_MODES.includes(newMode)) {
        setModeState(newMode);
        await AsyncStorage.setItem(THEME_MODE_KEY, newMode);
        console.log('[ThemeContext] Theme mode changed to:', newMode);
      } else {
        console.error('[ThemeContext] Invalid theme mode:', newMode);
      }
    } catch (error) {
      console.error('[ThemeContext] Error saving theme mode:', error);
    }
  };

  const value: ThemeContextValue = {
    theme,
    mode,
    resolvedMode,
    isDark,
    setMode,
  };

  // Don't render children until theme is loaded to avoid flicker
  if (isLoading) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

