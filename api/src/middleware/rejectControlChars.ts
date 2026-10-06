import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// PostgreSQL refuses NUL in text, and no field here has a use for control
// characters other than tab (9), newline (10) and carriage return (13).
const isControl = (code: number) =>
  code < 32 && code !== 9 && code !== 10 && code !== 13;

const hasControlChar = (text: string) => {
  for (let i = 0; i < text.length; i++)
    if (isControl(text.charCodeAt(i))) return true;
  return false;
};

const hasControl = (value: unknown): boolean => {
  if (typeof value === 'string') return hasControlChar(value);
  if (Array.isArray(value)) return value.some(hasControl);
  if (value && typeof value === 'object')
    return Object.values(value).some(hasControl);
  return false;
};

export const rejectControlChars = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (hasControl(req.body) || hasControl(req.query))
    return next(new AppError(400, 'Request contains invalid characters'));
  next();
};
