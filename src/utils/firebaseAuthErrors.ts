/**
 * Firebase Auth Error Mapper
 * Converts Firebase Auth error codes to user-friendly messages
 * Does not expose internal details, API keys, or technical information
 */

export const getFirebaseAuthErrorMessage = (errorCode?: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';

    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';

    case 'auth/email-already-in-use':
      return 'An account already exists with this email.';

    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters.';

    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';

    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again later.';

    case 'auth/operation-not-allowed':
      return 'Email/password login is not enabled for this project.';

    case 'auth/missing-email':
      return 'Email is required.';

    case 'auth/missing-password':
      return 'Password is required.';

    default:
      return 'Something went wrong. Please try again.';
  }
};
