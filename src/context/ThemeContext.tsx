import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeColors, getTheme } from '../theme/theme';

interface ThemeContextValue {
  theme: ThemeColors;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_MODE_KEY = '@SmartHome_ThemeMode';
const DEFAULT_MODE: ThemeMode = 'system';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme mode on mount
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setModeState(savedMode as ThemeMode);
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

  // Determine resolved mode (what actually applies - light or dark)
  const resolvedMode: 'light' | 'dark' = (() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  })();

  const isDark = resolvedMode === 'dark';
  const theme = getTheme(isDark);

  const setMode = async (newMode: ThemeMode) => {
    try {
      if (['light', 'dark', 'system'].includes(newMode)) {
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
