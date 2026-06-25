import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from '@react-native-firebase/auth';
import { AppAuthUser, AuthOperationResult } from '../../types/auth';

const toAppAuthUser = (user: User | null): AppAuthUser | null => {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    isAnonymous: user.isAnonymous,
  };
};

const toAuthError = (error: unknown): AuthOperationResult => {
  const firebaseError = error as { code?: string; message?: string };

  return {
    ok: false,
    errorCode: firebaseError.code || 'auth/unknown-error',
    errorMessage: firebaseError.message || 'Unknown authentication error',
  };
};

export const getCurrentAuthUser = (): AppAuthUser | null => {
  return toAppAuthUser(getAuth().currentUser);
};

export const onAuthUserChanged = (
  callback: (user: AppAuthUser | null) => void,
): (() => void) => {
  return onAuthStateChanged(getAuth(), firebaseUser => {
    callback(toAppAuthUser(firebaseUser));
  });
};

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<AuthOperationResult<AppAuthUser>> => {
  try {
    const credential = await signInWithEmailAndPassword(
      getAuth(),
      email.trim(),
      password,
    );

    return {
      ok: true,
      data: toAppAuthUser(credential.user) || undefined,
    };
  } catch (error) {
    return toAuthError(error) as AuthOperationResult<AppAuthUser>;
  }
};

export const createAccountWithEmail = async (
  email: string,
  password: string,
): Promise<AuthOperationResult<AppAuthUser>> => {
  try {
    const credential = await createUserWithEmailAndPassword(
      getAuth(),
      email.trim(),
      password,
    );

    return {
      ok: true,
      data: toAppAuthUser(credential.user) || undefined,
    };
  } catch (error) {
    return toAuthError(error) as AuthOperationResult<AppAuthUser>;
  }
};

export const sendPasswordReset = async (
  email: string,
): Promise<AuthOperationResult> => {
  try {
    await sendPasswordResetEmail(getAuth(), email.trim());

    return {
      ok: true,
    };
  } catch (error) {
    return toAuthError(error);
  }
};

export const signOutUser = async (): Promise<AuthOperationResult> => {
  try {
    await signOut(getAuth());

    return {
      ok: true,
    };
  } catch (error) {
    return toAuthError(error);
  }
};

export const firebaseAuthService = {
  getCurrentAuthUser,
  onAuthUserChanged,
  signInWithEmail,
  createAccountWithEmail,
  sendPasswordReset,
  signOutUser,
};
