import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { WalletService } from '../services/wallet.service';
import { KarmaService } from '../services/karma.service';
import { JwtUtil } from '../utils/jwt';
import { ResponseUtil } from '../utils/response';
import { Logger } from '../utils/logger';
import { IUserCreate, ILoginRequest } from '../types';

const userService = new UserService();
const walletService = new WalletService();
const karmaService = new KarmaService();

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const userData: IUserCreate = req.body;

      // Check if email already exists
      const emailExists = await userService.emailExists(userData.email);
      if (emailExists) {
        return ResponseUtil.conflict(res, 'Email address is already registered');
      }

      // Check if phone number already exists
      const phoneExists = await userService.phoneExists(userData.phoneNumber);
      if (phoneExists) {
        return ResponseUtil.conflict(res, 'Phone number is already registered');
      }

      // Check Karma blacklist
      const karmaCheck = await karmaService.comprehensiveCheck(
        userData.email,
        userData.phoneNumber
      );

      if (karmaCheck.data?.blacklisted) {
        Logger.warn('Blacklisted user attempted registration', {
          email: userData.email,
          reason: karmaCheck.data.details?.reason,
        });
        return ResponseUtil.forbidden(
          res,
          'Unable to create account. Please contact support for assistance.'
        );
      }

      // Create user
      const user = await userService.create(userData);

      // Create wallet for user
      const wallet = await walletService.createWallet(user.id);

      // Generate JWT token
      const token = JwtUtil.generateToken({
        userId: user.id,
        email: user.email,
      });

      Logger.info('User registered successfully', { userId: user.id });

      return ResponseUtil.created(
        res,
        {
          user: userService.toResponse(user),
          wallet: walletService.toResponse(wallet),
          token,
        },
        'User registered successfully'
      );
    } catch (error) {
      Logger.error('Error during registration', error);
      return ResponseUtil.error(res, 'Failed to register user', 500);
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const credentials: ILoginRequest = req.body;

      // Validate credentials
      const user = await userService.validateCredentials(
        credentials.email,
        credentials.password
      );

      if (!user) {
        return ResponseUtil.unauthorized(res, 'Invalid email or password');
      }

      if (!user.isActive) {
        return ResponseUtil.forbidden(res, 'Account has been deactivated');
      }

      // Generate JWT token
      const token = JwtUtil.generateToken({
        userId: user.id,
        email: user.email,
      });

      // Get user's wallet
      const wallet = await walletService.findByUserId(user.id);

      Logger.info('User logged in successfully', { userId: user.id });

      return ResponseUtil.success(
        res,
        {
          user: userService.toResponse(user),
          wallet: wallet ? walletService.toResponse(wallet) : null,
          token,
        },
        'Login successful'
      );
    } catch (error) {
      Logger.error('Error during login', error);
      return ResponseUtil.error(res, 'Failed to login', 500);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<Response> {
    try {
      const user = (req as any).user;
      const wallet = await walletService.findByUserId(user.id);

      return ResponseUtil.success(res, {
        user: userService.toResponse(user),
        wallet: wallet ? walletService.toResponse(wallet) : null,
      });
    } catch (error) {
      Logger.error('Error fetching profile', error);
      return ResponseUtil.error(res, 'Failed to fetch profile', 500);
    }
  }
}
