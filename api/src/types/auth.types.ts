export interface RegisterDto {
  email: string;
  name:string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name:string;
    email: string;
    isVerified: boolean;
    createdAt: Date;
  };
  accessToken: string;
}