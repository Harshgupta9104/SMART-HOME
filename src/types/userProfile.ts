export type UserProfileStatus = 'active' | 'disabled';

export type ThemeModePreference = 'light' | 'dark' | 'system';

export interface UserProfilePreferences {
  themeMode: ThemeModePreference;
  notificationsEnabled: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  status: UserProfileStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  preferences: UserProfilePreferences;
}

export interface CreateUserProfileInput {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
}

export interface UpdateUserProfileInput {
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  preferences?: Partial<UserProfilePreferences>;
}
