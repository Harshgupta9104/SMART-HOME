import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ensureHomeHasDefaultRooms,
  createRoom,
  updateRoom,
  archiveRoom,
} from '../services/firebase/roomService';
import { Room, UpdateRoomInput } from '../types/room';
import { useAuth } from './AuthContext';
import { useHome } from './HomeContext';

export type RoomLoadingState = 'idle' | 'loading' | 'ready' | 'error';

type RoomContextValue = {
  rooms: Room[];
  loadingState: RoomLoadingState;
  error: string | null;
  refreshRooms: () => Promise<void>;
  createNewRoom: (name: string, icon?: string) => Promise<Room | null>;
  updateExistingRoom: (roomId: string, updates: UpdateRoomInput) => Promise<Room | null>;
  archiveExistingRoom: (roomId: string) => Promise<boolean>;
};

const RoomContext = createContext<RoomContextValue | undefined>(undefined);

type RoomProviderProps = {
  children: ReactNode;
};

export const RoomProvider = ({ children }: RoomProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const { activeHome, loadingState: homeLoadingState } = useHome();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingState, setLoadingState] = useState<RoomLoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadRooms = React.useCallback(async () => {
    if (!isAuthenticated || !user?.uid) {
      console.log('[RoomContext] Not authenticated, skipping room load');
      setRooms([]);
      setLoadingState('idle');
      setError(null);
      return;
    }

    if (!activeHome || homeLoadingState !== 'ready') {
      console.log('[RoomContext] Home not ready yet', { activeHomeId: activeHome?.id, homeLoadingState });
      setRooms([]);
      setLoadingState('idle');
      setError(null);
      return;
    }

    try {
      console.log('[RoomContext] Loading rooms for home', { homeId: activeHome.id, userId: user.uid });
      setLoadingState('loading');
      setError(null);
      const loadedRooms = await ensureHomeHasDefaultRooms(activeHome.id, user.uid);
      console.log('[RoomContext] Rooms loaded successfully', { count: loadedRooms.length });
      setRooms(loadedRooms);
      setLoadingState('ready');
    } catch (err: any) {
      console.error('[RoomContext] Failed to load rooms', {
        error: err.message,
        code: err.code,
        homeId: activeHome?.id,
        userId: user?.uid,
      });
      setError('Failed to load rooms');
      setLoadingState('error');
      // Do NOT sign user out; room loading failure should not break auth gate
    }
  }, [user?.uid, isAuthenticated, activeHome, homeLoadingState]);

  // Load rooms when user/home changes
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const refreshRooms = React.useCallback(async () => {
    await loadRooms();
  }, [loadRooms]);

  const createNewRoom = React.useCallback(
    async (name: string, icon?: string): Promise<Room | null> => {
      if (!activeHome || !user?.uid) {
        console.error('[RoomContext] No active home or user');
        return null;
      }

      try {
        const newRoom = await createRoom({
          homeId: activeHome.id,
          name,
          icon,
          createdBy: user.uid,
        });
        // Refresh rooms list
        await refreshRooms();
        return newRoom;
      } catch {
        console.error('[RoomContext] Failed to create room');
        return null;
      }
    },
    [activeHome, user?.uid, refreshRooms],
  );

  const updateExistingRoom = React.useCallback(
    async (roomId: string, updates: UpdateRoomInput): Promise<Room | null> => {
      if (!activeHome) {
        console.error('[RoomContext] No active home');
        return null;
      }

      try {
        const updatedRoom = await updateRoom(activeHome.id, roomId, updates);
        // Refresh rooms list
        await refreshRooms();
        return updatedRoom;
      } catch {
        console.error('[RoomContext] Failed to update room');
        return null;
      }
    },
    [activeHome, refreshRooms],
  );

  const archiveExistingRoom = React.useCallback(
    async (roomId: string): Promise<boolean> => {
      if (!activeHome) {
        console.error('[RoomContext] No active home');
        return false;
      }

      try {
        await archiveRoom(activeHome.id, roomId);
        // Refresh rooms list
        await refreshRooms();
        return true;
      } catch {
        console.error('[RoomContext] Failed to archive room');
        return false;
      }
    },
    [activeHome, refreshRooms],
  );

  const value = useMemo<RoomContextValue>(
    () => ({
      rooms,
      loadingState,
      error,
      refreshRooms,
      createNewRoom,
      updateExistingRoom,
      archiveExistingRoom,
    }),
    [rooms, loadingState, error, refreshRooms, createNewRoom, updateExistingRoom, archiveExistingRoom],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = (): RoomContextValue => {
  const context = useContext(RoomContext);

  if (!context) {
    throw new Error('useRoom must be used inside RoomProvider');
  }

  return context;
};
