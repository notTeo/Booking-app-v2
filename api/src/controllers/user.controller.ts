import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import { updateUser, deleteUser } from '../services/auth.service';

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        createdAt: true,
        passwordHash: true,
        subscription: {
          select: {
            status: true,
            stripePriceId: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const plan =
      user.subscription?.status === 'active' ||
      user.subscription?.status === 'trialing'
        ? 'pro'
        : 'free';

    const { passwordHash, ...userWithoutHash } = user;
    successResponse(res, { user: { ...userWithoutHash, plan, hasPassword: !!passwordHash } });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    const result = await updateUser(req.user!.userId!, { email, password });
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

export const deleteMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { password } = req.body;
    await deleteUser(req.user!.userId!, password);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    successResponse(res, { message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};
