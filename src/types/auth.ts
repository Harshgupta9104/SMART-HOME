export type AppAuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
};

export type AuthLoadingState = 'initializing' | 'ready';

export type AuthOperationResult<T = void> = {
  ok: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
};
