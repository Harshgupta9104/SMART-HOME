export type RoomStatus = 'active' | 'archived';

/**
 * Room document stored at: homes/{homeId}/rooms/{roomId}
 */
export interface Room {
  id: string;
  homeId: string;
  name: string;
  icon: string;
  sortOrder: number;
  status: RoomStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomInput {
  homeId: string;
  name: string;
  icon?: string;
  sortOrder?: number;
  createdBy: string;
}

export interface UpdateRoomInput {
  name?: string;
  icon?: string;
  sortOrder?: number;
  status?: RoomStatus;
}
