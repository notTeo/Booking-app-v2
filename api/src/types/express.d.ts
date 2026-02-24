declare global {
  namespace Express {
    interface User {
      userId?: string;
      user?: {
        id: string;
        email: string;
        isVerified: boolean;
        createdAt: Date;
      };
      accessToken?: string;
      refreshToken?: string;
    }
    interface Request {
      user?: User;
    }
  }
}

export {};