import firestore from '@react-native-firebase/firestore';
import {
  UserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
} from '../../types/userProfile';

const USERS_COLLECTION = 'users';

/**
 * Create user profile if missing, or update lastLoginAt if exists
 */
export const createUserProfileIfMissing = async (
  input: CreateUserProfileInput,
): Promise<UserProfile> => {
  try {
    const userDocRef = firestore().collection(USERS_COLLECTION).doc(input.uid);
    const userDocSnapshot = await userDocRef.get();

    const now = new Date().toISOString();

    if (userDocSnapshot.exists()) {
      // Profile exists: update only lastLoginAt and updatedAt
      console.log('[UserProfile] Profile exists, updating lastLoginAt');
      await userDocRef.update({
        lastLoginAt: now,
        updatedAt: now,
      });

      // Return merged profile
      const existingData = userDocSnapshot.data() as UserProfile;
      return {
        ...existingData,
        lastLoginAt: now,
        updatedAt: now,
      };
    }

    // Profile missing: create default profile
    console.log('[UserProfile] Creating new user profile');
    const defaultProfile: UserProfile = {
      uid: input.uid,
      email: input.email,
      displayName: input.displayName || null,
      photoURL: input.photoURL || null,
      phoneNumber: input.phoneNumber || null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      preferences: {
        themeMode: 'system',
        notificationsEnabled: true,
      },
    };

    await userDocRef.set(defaultProfile);
    console.log('[UserProfile] User profile created successfully');
    return defaultProfile;
  } catch (error) {
    console.error('[UserProfile] Error creating user profile:', error);
    throw error;
  }
};

/**
 * Get user profile by UID
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocSnapshot = await firestore()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .get();

    if (!userDocSnapshot.exists()) {
      console.log('[UserProfile] User profile not found');
      return null;
    }

    const profile = userDocSnapshot.data() as UserProfile;
    console.log('[UserProfile] User profile retrieved');
    return profile;
  } catch (error) {
    console.error('[UserProfile] Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update user profile with partial data
 */
export const updateUserProfile = async (
  uid: string,
  updates: UpdateUserProfileInput,
): Promise<UserProfile> => {
  try {
    const userDocRef = firestore().collection(USERS_COLLECTION).doc(uid);
    const now = new Date().toISOString();

    // Build update object with only allowed fields
    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    if (updates.displayName !== undefined) {
      updateData.displayName = updates.displayName;
    }

    if (updates.photoURL !== undefined) {
      updateData.photoURL = updates.photoURL;
    }

    if (updates.phoneNumber !== undefined) {
      updateData.phoneNumber = updates.phoneNumber;
    }

    if (updates.preferences !== undefined) {
      // Merge preferences safely
      const currentSnapshot = await userDocRef.get();
      const currentData = currentSnapshot.data() as UserProfile;
      updateData.preferences = {
        ...currentData.preferences,
        ...updates.preferences,
      };
    }

    await userDocRef.update(updateData);
    console.log('[UserProfile] User profile updated');

    // Return updated profile
    const updatedSnapshot = await userDocRef.get();
    return updatedSnapshot.data() as UserProfile;
  } catch (error) {
    console.error('[UserProfile] Error updating user profile:', error);
    throw error;
  }
};

/**
 * Touch lastLoginAt timestamp
 */
export const touchLastLogin = async (uid: string): Promise<void> => {
  try {
    const now = new Date().toISOString();
    await firestore()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .update({
        lastLoginAt: now,
        updatedAt: now,
      });

    console.log('[UserProfile] lastLoginAt touched');
  } catch (error) {
    console.error('[UserProfile] Error touching lastLoginAt:', error);
    throw error;
  }
};

export const userProfileService = {
  createUserProfileIfMissing,
  getUserProfile,
  updateUserProfile,
  touchLastLogin,
};
