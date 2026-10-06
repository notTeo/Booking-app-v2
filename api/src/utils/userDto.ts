// The one shape every auth/user endpoint returns for a user. GET /user/me,
// login, invite registration, email verification and profile updates all go
// through here, so the client's user object is identical wherever it came from
// and passwordHash never leaves the server.
export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isVerified: true,
  createdAt: true,
  passwordHash: true,
  trialUsedAt: true,
} as const;

export interface UserRow {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  createdAt: Date;
  passwordHash: string | null;
  trialUsedAt: Date | null;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  createdAt: Date;
  hasPassword: boolean;
  // Their first shop gets the free trial; false once they have created one.
  trialAvailable: boolean;
}

export const toUserDto = (user: UserRow): UserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  hasPassword: !!user.passwordHash,
  trialAvailable: !user.trialUsedAt,
});
