import { Request, Response, NextFunction } from "express";
import { LoginDto, RegisterDto } from '../types/auth.types';
import { forgotPassword, getSessions, loginUser, logoutUser, refreshAccessToken, registerUser, resendVerificationEmail, resetPassword, revokeAllSessions, verifyEmail, verifyEmailChange } from "../services/auth.service";
import { successResponse } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { env } from "../config/env"


export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dto: RegisterDto = req.body;
    await registerUser(dto);
    successResponse(
      res,
      { message: 'Verification email sent. Please check your inbox.' },
      201,
    );
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dto: LoginDto = req.body;
    const { refreshToken, ...result } = await loginUser(dto);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    });

    successResponse(res, result , 200);
  } catch (err) {
    next(err);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      throw new AppError(401, 'No refresh token provided');
    }

    const { accessToken, newRefreshToken } = await refreshAccessToken(token);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    successResponse(res, { accessToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      await logoutUser(token);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    successResponse(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

export const verifyEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.query as { token: string };

    if (!token) {
      throw new AppError(400, 'Token is required');
    }

    const user = await verifyEmail(token);
    successResponse(res, { user });
  } catch (err) {
    next(err);
  }
};

export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;
    await forgotPassword(email);
    successResponse(res, {
      message: 'If this email exists you will receive a reset link shortly.',
    });
  } catch (err) {
    next(err);
  }
};

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token, password } = req.body;
    await resetPassword(token, password);
    successResponse(res, { message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

export const resendVerificationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;
    await resendVerificationEmail(email);
    successResponse(res, { message: 'If a pending registration exists, a new verification email has been sent.' });
  } catch (err) {
    next(err);
  }
};

export const verifyEmailChangeController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.query as { token: string };

    if (!token) {
      throw new AppError(400, 'Token is required');
    }

    const user = await verifyEmailChange(token);
    successResponse(res, { user });
  } catch (err) {
    next(err);
  }
};

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { accessToken, refreshToken } = req.user as any;

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with access token
    res.redirect(`${env.clientUrl}/oauth/callback?accessToken=${accessToken}`);
  } catch (err) {
    next(err);
  }
};

export const googleFailure = (
  req: Request,
  res: Response,
) => {
  res.redirect(`${env.clientUrl}/login?error=oauth_failed`);
};

export const getSessionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessions = await getSessions(req.user!.userId!);
    successResponse(res, { sessions });
  } catch (err) {
    next(err);
  }
};

export const revokeAllSessionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentToken = req.cookies?.refreshToken;
    await revokeAllSessions(req.user!.userId!, currentToken);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    successResponse(res, { message: 'All sessions revoked' });
  } catch (err) {
    next(err);
  }
};
