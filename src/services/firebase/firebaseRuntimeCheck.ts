/**
 * Firebase Runtime Check Service
 *
 * Minimal health check to verify Firebase is initialized at runtime
 * from the native Android google-services.json configuration.
 *
 * Does NOT:
 * - Initialize Firebase manually
 * - Call Auth sign-in
 * - Call Firestore network operations
 * - Create data
 * - Log full API keys
 */

import { getApp, getApps } from '@react-native-firebase/app';

export type FirebaseRuntimeCheckResult = {
  ok: boolean;
  appCount: number;
  appName?: string;
  projectId?: string;
  appIdMasked?: string;
  storageBucket?: string;
  errorMessage?: string;
};

/**
 * Mask sensitive values for logging
 */
const maskValue = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value.length <= 10) {
    return '***MASKED***';
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

/**
 * Check Firebase runtime initialization
 *
 * Verifies that the default Firebase app is available
 * and that native configuration was loaded correctly.
 */
export const checkFirebaseRuntime = (): FirebaseRuntimeCheckResult => {
  try {
    const apps = getApps();
    const app = getApp();
    const options = app.options || {};

    return {
      ok: true,
      appCount: apps.length,
      appName: app.name,
      projectId: options.projectId,
      appIdMasked: maskValue(options.appId),
      storageBucket: options.storageBucket,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      appCount: 0,
      errorMessage: message,
    };
  }
};
