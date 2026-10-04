import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getDb } from '../config/db';
import { sendError } from '../utils/apiResponse';
import { IUser } from '../models/schemas';

const JWT_SECRET = process.env.JWT_SECRET || 'aethelgard_dev_jwt_secret_key_change_in_prod_9928172';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export function signToken(user: Pick<IUser, 'id' | 'email' | 'role'>): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. Please sign in.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string };

    const db = getDb();
    const user = db.users.find((u) => u.id === decoded.sub);
    if (!user) {
      return sendError(res, 'Account no longer exists.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Your account has been deactivated. Contact support.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired authentication token.', 401);
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return sendError(res, 'Forbidden: Administrator privileges required.', 403);
    }
    next();
  });
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    errors: ['Rate limit exceeded'],
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait a few minutes before requesting another code.',
    errors: ['OTP rate limit exceeded'],
  },
});
