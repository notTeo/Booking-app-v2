// The one shape every auth/user endpoint returns for a user. GET /user/me,
// login, invite registration, email verification and profile updates all go
// through here, so the client's user object is identical wherever it came from
// and passwordHash never leaves the server.
export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isVerified: true,
  isPro: true,
  createdAt: true,
  passwordHash: true,
} as const;

export interface UserRow {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  isPro: boolean;
  createdAt: Date;
  passwordHash: string | null;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  isPro: boolean;
  createdAt: Date;
  hasPassword: boolean;
}

export const toUserDto = (user: UserRow): UserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isVerified: user.isVerified,
  isPro: user.isPro,
  createdAt: user.createdAt,
  hasPassword: !!user.passwordHash,
});
