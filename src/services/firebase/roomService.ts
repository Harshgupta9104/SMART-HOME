import firestore from '@react-native-firebase/firestore';
import { Room, CreateRoomInput, UpdateRoomInput } from '../../types/room';

/**
 * Create a room under a home
 */
export const createRoom = async (input: CreateRoomInput): Promise<Room> => {
  try {
    const db = firestore();
    const now = new Date().toISOString();
    const name = (input.name || '').trim();

    if (!name) {
      throw new Error('Room name cannot be empty');
    }

    const roomRef = db
      .collection('homes')
      .doc(input.homeId)
      .collection('rooms')
      .doc();

    const roomId = roomRef.id;

    const newRoom: Room = {
      id: roomId,
      homeId: input.homeId,
      name,
      icon: input.icon || 'home',
      sortOrder: input.sortOrder ?? 0,
      status: 'active',
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    await roomRef.set(newRoom);
    console.log('[RoomService] Room created');

    return newRoom;
  } catch (error) {
    console.error('[RoomService] Failed to create room');
    throw error;
  }
};

/**
 * Get a specific room
 */
export const getRoom = async (
  homeId: string,
  roomId: string,
): Promise<Room | null> => {
  try {
    const roomDoc = await firestore()
      .collection('homes')
      .doc(homeId)
      .collection('rooms')
      .doc(roomId)
      .get();

    if (!roomDoc.exists) {
      console.log('[RoomService] Room not found');
      return null;
    }

    const room = roomDoc.data() as Room;
    console.log('[RoomService] Room retrieved');
    return room;
  } catch (error) {
    console.error('[RoomService] Failed to get room');
    throw error;
  }
};

/**
 * Get all active rooms for a home, sorted by sortOrder
 * Phase 2C: No composite index required - filtering and sorting done in-memory
 */
export const getRoomsForHome = async (homeId: string): Promise<Room[]> => {
  try {
    // Load all rooms without composite index query
    const roomsSnapshot = await firestore()
      .collection('homes')
      .doc(homeId)
      .collection('rooms')
      .get();

    if (roomsSnapshot.empty) {
      console.log('[RoomService] No rooms found');
      return [];
    }

    // Filter and sort in-memory
    const rooms = roomsSnapshot.docs
      .map(doc => doc.data() as Room)
      .filter(room => room.status === 'active')
      .sort((a, b) => {
        // Sort by sortOrder, fallback to name if equal
        const sortA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sortB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;

        if (sortA !== sortB) {
          return sortA - sortB;
        }

        return a.name.localeCompare(b.name);
      });

    console.log('[RoomService] Rooms loaded', { count: rooms.length });
    return rooms;
  } catch (error) {
    console.error('[RoomService] Failed to load rooms', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
    throw error;
  }
};

/**
 * Ensure home has default rooms, creating if needed
 * Idempotent: returns existing rooms if they exist
 */
export const ensureHomeHasDefaultRooms = async (
  homeId: string,
  createdBy: string,
): Promise<Room[]> => {
  try {
    // Check if active rooms already exist
    const existingRooms = await getRoomsForHome(homeId);

    if (existingRooms.length > 0) {
      console.log('[RoomService] Default rooms already exist');
      return existingRooms;
    }

    // Create default rooms
    console.log('[RoomService] Creating default rooms');
    const db = firestore();
    const batch = db.batch();
    const now = new Date().toISOString();

    const defaultRooms = [
      {
        name: 'Living Room',
        icon: 'tv',
        sortOrder: 10,
      },
      {
        name: 'Bedroom',
        icon: 'moon',
        sortOrder: 20,
      },
      {
        name: 'Kitchen',
        icon: 'coffee',
        sortOrder: 30,
      },
    ];

    const createdRooms: Room[] = [];

    for (const roomData of defaultRooms) {
      const roomRef = db
        .collection('homes')
        .doc(homeId)
        .collection('rooms')
        .doc();

      const room: Room = {
        id: roomRef.id,
        homeId,
        name: roomData.name,
        icon: roomData.icon,
        sortOrder: roomData.sortOrder,
        status: 'active',
        createdBy,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(roomRef, room);
      createdRooms.push(room);
    }

    await batch.commit();
    console.log('[RoomService] Default rooms created');

    return createdRooms;
  } catch (error) {
    console.error('[RoomService] Failed to ensure default rooms');
    throw error;
  }
};

/**
 * Update a room
 */
export const updateRoom = async (
  homeId: string,
  roomId: string,
  updates: UpdateRoomInput,
): Promise<Room> => {
  try {
    const db = firestore();
    const roomRef = db
      .collection('homes')
      .doc(homeId)
      .collection('rooms')
      .doc(roomId);

    const now = new Date().toISOString();

    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    if (updates.name !== undefined) {
      const name = (updates.name || '').trim();
      if (!name) {
        throw new Error('Room name cannot be empty');
      }
      updateData.name = name;
    }

    if (updates.icon !== undefined) {
      updateData.icon = updates.icon;
    }

    if (updates.sortOrder !== undefined) {
      updateData.sortOrder = updates.sortOrder;
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    await roomRef.update(updateData);
    console.log('[RoomService] Room updated');

    // Return updated room
    const updatedDoc = await roomRef.get();
    return updatedDoc.data() as Room;
  } catch (error) {
    console.error('[RoomService] Failed to update room');
    throw error;
  }
};

/**
 * Archive a room (soft delete)
 */
export const archiveRoom = async (homeId: string, roomId: string): Promise<void> => {
  try {
    const db = firestore();
    const now = new Date().toISOString();

    await db
      .collection('homes')
      .doc(homeId)
      .collection('rooms')
      .doc(roomId)
      .update({
        status: 'archived',
        updatedAt: now,
      });

    console.log('[RoomService] Room archived');
  } catch (error) {
    console.error('[RoomService] Failed to archive room');
    throw error;
  }
};

export const roomService = {
  createRoom,
  getRoom,
  getRoomsForHome,
  ensureHomeHasDefaultRooms,
  updateRoom,
  archiveRoom,
};
