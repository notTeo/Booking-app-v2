import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import { updateUser, deleteUser } from '../services/auth.service';
import { USER_SELECT, toUserDto } from '../utils/userDto';

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    successResponse(res, { user: toUserDto(user) });
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
    const { email, password, name, currentPassword } = req.body;
    const result = await updateUser(req.user!.userId!, {
      email,
      password,
      name,
      currentPassword,
    });
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    successResponse(res, { message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};
