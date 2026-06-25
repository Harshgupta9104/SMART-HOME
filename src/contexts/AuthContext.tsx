import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createAccountWithEmail,
  onAuthUserChanged,
  sendPasswordReset,
  signInWithEmail,
  signOutUser,
} from '../services/firebase/firebaseAuthService';
import {
  AppAuthUser,
  AuthLoadingState,
  AuthOperationResult,
} from '../types/auth';

type AuthContextValue = {
  user: AppAuthUser | null;
  loadingState: AuthLoadingState;
  isAuthenticated: boolean;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<AuthOperationResult<AppAuthUser>>;
  createAccountWithEmail: (
    email: string,
    password: string,
  ) => Promise<AuthOperationResult<AppAuthUser>>;
  sendPasswordReset: (email: string) => Promise<AuthOperationResult>;
  signOut: () => Promise<AuthOperationResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [loadingState, setLoadingState] =
    useState<AuthLoadingState>('initializing');

  useEffect(() => {
    const unsubscribe = onAuthUserChanged(nextUser => {
      setUser(nextUser);
      setLoadingState('ready');
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loadingState,
      isAuthenticated: Boolean(user),
      signInWithEmail,
      createAccountWithEmail,
      sendPasswordReset,
      signOut: signOutUser,
    }),
    [user, loadingState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
