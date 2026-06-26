import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ensureUserHasDefaultHome } from '../services/firebase/homeService';
import { Home } from '../types/home';
import { useAuth } from './AuthContext';

export type HomeLoadingState = 'idle' | 'loading' | 'ready' | 'error';

type HomeContextValue = {
  activeHome: Home | null;
  loadingState: HomeLoadingState;
  error: string | null;
  refreshHome: () => Promise<void>;
};

const HomeContext = createContext<HomeContextValue | undefined>(undefined);

type HomeProviderProps = {
  children: ReactNode;
};

export const HomeProvider = ({ children }: HomeProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const [activeHome, setActiveHome] = useState<Home | null>(null);
  const [loadingState, setLoadingState] = useState<HomeLoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadActiveHome = React.useCallback(async () => {
    if (!isAuthenticated || !user?.uid) {
      setActiveHome(null);
      setLoadingState('idle');
      setError(null);
      return;
    }

    try {
      setLoadingState('loading');
      setError(null);
      const home = await ensureUserHasDefaultHome(user.uid);
      setActiveHome(home);
      setLoadingState('ready');
    } catch {
      console.error('[HomeContext] Failed to load active home');
      setError('Failed to load home');
      setLoadingState('error');
      // Do NOT sign user out; home loading failure should not break auth gate
    }
  }, [user?.uid, isAuthenticated]);

  // Load home when user authenticates
  useEffect(() => {
    loadActiveHome();
  }, [loadActiveHome]);

  const refreshHome = React.useCallback(async () => {
    await loadActiveHome();
  }, [loadActiveHome]);

  const value = useMemo<HomeContextValue>(
    () => ({
      activeHome,
      loadingState,
      error,
      refreshHome,
    }),
    [activeHome, loadingState, error, refreshHome],
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
};

export const useHome = (): HomeContextValue => {
  const context = useContext(HomeContext);

  if (!context) {
    throw new Error('useHome must be used inside HomeProvider');
  }

  return context;
};
