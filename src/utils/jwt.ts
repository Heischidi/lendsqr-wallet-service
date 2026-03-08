import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export interface IJwtPayload {
  userId: string;
  email: string;
}

export class JwtUtil {
  private static readonly SECRET = process.env.JWT_SECRET || 'default_secret_key';
  private static readonly EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  static generateToken(payload: IJwtPayload): string {
    return jwt.sign(payload, this.SECRET, {
      expiresIn: this.EXPIRES_IN as any,
    });
  }

  static verifyToken(token: string): IJwtPayload {
    return jwt.verify(token, this.SECRET) as IJwtPayload;
  }

  static decodeToken(token: string): IJwtPayload | null {
    try {
      return jwt.decode(token) as IJwtPayload;
    } catch {
      return null;
    }
  }
}
