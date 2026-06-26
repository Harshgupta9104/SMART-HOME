export type HomeStatus = 'active' | 'archived';

export type HomeMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export type HomeMemberStatus = 'active' | 'invited' | 'removed';

/**
 * Home document stored at: homes/{homeId}
 */
export interface Home {
  id: string;
  name: string;
  ownerId: string;
  country: string;
  timezone: string;
  status: HomeStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Home member document stored at: homes/{homeId}/members/{uid}
 */
export interface HomeMember {
  uid: string;
  role: HomeMemberRole;
  status: HomeMemberStatus;
  joinedAt: string;
  updatedAt: string;
}

export interface CreateHomeInput {
  ownerId: string;
  name?: string;
  country?: string;
  timezone?: string;
}

export interface UpdateHomeInput {
  name?: string;
  country?: string;
  timezone?: string;
  status?: HomeStatus;
}
