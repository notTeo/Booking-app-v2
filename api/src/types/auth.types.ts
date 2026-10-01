export interface RegisterDto {
  email: string;
  name: string;
  password: string;
  // Must be literally true (validated); the server stamps version and time.
  acceptTerms?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    isVerified: boolean;
    createdAt: Date;
  };
  accessToken: string;
}
