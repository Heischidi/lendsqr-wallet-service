import { Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt';
import { ResponseUtil } from '../utils/response';
import { UserService } from '../services/user.service';
import { IAuthRequest } from '../types';

const userService = new UserService();

export const authenticate = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseUtil.unauthorized(res, 'Access token is required');
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      ResponseUtil.unauthorized(res, 'Invalid access token');
      return;
    }

    try {
      const decoded = JwtUtil.verifyToken(token);
      const user = await userService.findById(decoded.userId);

      if (!user) {
        ResponseUtil.unauthorized(res, 'User not found');
        return;
      }

      if (!user.isActive) {
        ResponseUtil.forbidden(res, 'User account is deactivated');
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      ResponseUtil.unauthorized(res, 'Invalid or expired token');
      return;
    }
  } catch (error) {
    ResponseUtil.error(res, 'Authentication failed', 500);
    return;
  }
};
