import firestore from '@react-native-firebase/firestore';
import { Home, HomeMember, UpdateHomeInput } from '../../types/home';

const HOMES_COLLECTION = 'homes';
const USERS_COLLECTION = 'users';
const MEMBERS_SUBCOLLECTION = 'members';

/**
 * Create a default home for a user with owner membership
 */
export const createDefaultHomeForUser = async (
  ownerId: string,
): Promise<Home> => {
  try {
    const db = firestore();
    const now = new Date().toISOString();

    // Create home document with auto ID
    const homeRef = db.collection(HOMES_COLLECTION).doc();
    const homeId = homeRef.id;

    const defaultHome: Home = {
      id: homeId,
      name: 'My Home',
      ownerId,
      country: 'IN',
      timezone: 'Asia/Kolkata',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    // Use batch write to atomically create home, member, and update user
    const batch = db.batch();

    // 1. Create home
    batch.set(homeRef, defaultHome);

    // 2. Create owner member
    const memberRef = homeRef.collection(MEMBERS_SUBCOLLECTION).doc(ownerId);
    const ownerMember: HomeMember = {
      uid: ownerId,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    };
    batch.set(memberRef, ownerMember);

    // 3. Update user activeHomeId
    const userRef = db.collection(USERS_COLLECTION).doc(ownerId);
    batch.update(userRef, {
      activeHomeId: homeId,
      updatedAt: now,
    });

    await batch.commit();
    console.log('[HomeService] Default home created');

    return defaultHome;
  } catch (error) {
    console.error('[HomeService] Failed to create default home');
    throw error;
  }
};

/**
 * Get home by ID
 */
export const getHome = async (homeId: string): Promise<Home | null> => {
  try {
    const homeDoc = await firestore()
      .collection(HOMES_COLLECTION)
      .doc(homeId)
      .get();

    if (!homeDoc.exists) {
      console.log('[HomeService] Home not found');
      return null;
    }

    const home = homeDoc.data() as Home;
    console.log('[HomeService] Home retrieved');
    return home;
  } catch (error) {
    console.error('[HomeService] Failed to get home');
    throw error;
  }
};

/**
 * Get user's active home
 */
export const getUserActiveHome = async (uid: string): Promise<Home | null> => {
  try {
    const userDoc = await firestore()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      console.log('[HomeService] User profile not found');
      return null;
    }

    const userData = userDoc.data() as any;
    const activeHomeId = userData?.activeHomeId;

    if (!activeHomeId) {
      console.log('[HomeService] User has no active home');
      return null;
    }

    // Fetch the home
    const home = await getHome(activeHomeId);
    return home;
  } catch (error) {
    console.error('[HomeService] Failed to get user active home');
    throw error;
  }
};

/**
 * Ensure user has a default home, creating one if needed
 * Returns either existing home or newly created default home
 */
export const ensureUserHasDefaultHome = async (uid: string): Promise<Home> => {
  try {
    const db = firestore();

    // Check if user has an active home
    const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get();

    if (!userDoc.exists) {
      // User profile missing (shouldn't happen if Phase 2A worked, but handle gracefully)
      console.log('[HomeService] User profile not found, creating default home');
      return createDefaultHomeForUser(uid);
    }

    const userData = userDoc.data() as any;
    const activeHomeId = userData?.activeHomeId;

    if (activeHomeId) {
      // User has activeHomeId, try to fetch it
      const existingHome = await getHome(activeHomeId);
      if (existingHome) {
        console.log('[HomeService] Using existing user home');
        return existingHome;
      }
      // Home was deleted or missing, create replacement
      console.log('[HomeService] Active home missing, creating replacement');
      return createDefaultHomeForUser(uid);
    }

    // No activeHomeId, create default home
    console.log('[HomeService] No active home, creating default');
    return createDefaultHomeForUser(uid);
  } catch (error) {
    console.error('[HomeService] Failed to ensure user has default home');
    throw error;
  }
};

/**
 * Update home with partial data
 */
export const updateHome = async (
  homeId: string,
  updates: UpdateHomeInput,
): Promise<Home> => {
  try {
    const db = firestore();
    const homeRef = db.collection(HOMES_COLLECTION).doc(homeId);
    const now = new Date().toISOString();

    // Build update object with only allowed fields
    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.country !== undefined) {
      updateData.country = updates.country;
    }

    if (updates.timezone !== undefined) {
      updateData.timezone = updates.timezone;
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    await homeRef.update(updateData);
    console.log('[HomeService] Home updated');

    // Return updated home
    const updatedDoc = await homeRef.get();
    return updatedDoc.data() as Home;
  } catch (error) {
    console.error('[HomeService] Failed to update home');
    throw error;
  }
};

/**
 * Get home member
 */
export const getHomeMember = async (
  homeId: string,
  uid: string,
): Promise<HomeMember | null> => {
  try {
    const memberDoc = await firestore()
      .collection(HOMES_COLLECTION)
      .doc(homeId)
      .collection(MEMBERS_SUBCOLLECTION)
      .doc(uid)
      .get();

    if (!memberDoc.exists) {
      console.log('[HomeService] Home member not found');
      return null;
    }

    const member = memberDoc.data() as HomeMember;
    console.log('[HomeService] Home member retrieved');
    return member;
  } catch (error) {
    console.error('[HomeService] Failed to get home member');
    throw error;
  }
};

export const homeService = {
  createDefaultHomeForUser,
  getHome,
  getUserActiveHome,
  ensureUserHasDefaultHome,
  updateHome,
  getHomeMember,
};
