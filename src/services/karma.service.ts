import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { Logger } from '../utils/logger';
import { IKarmaBlacklistResponse } from '../types';

dotenv.config();

export class KarmaService {
  private client: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.ADJUTOR_API_KEY || '';
    this.baseUrl = process.env.ADJUTOR_BASE_URL || 'https://api.adjutor.io/v1';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        Logger.error('Karma API Error', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if a user is on the Karma blacklist
   * @param identity - Can be email, phone number, or BVN
   * @returns Promise<IKarmaBlacklistResponse>
   */
  async checkBlacklist(identity: string): Promise<IKarmaBlacklistResponse> {
    try {
      // If no API key is configured, return as not blacklisted (for development/testing)
      if (!this.apiKey) {
        Logger.warn('No Adjutor API key configured, skipping blacklist check');
        return {
          status: 'success',
          message: 'Blacklist check skipped - no API key',
          data: {
            blacklisted: false,
          },
        };
      }

      const response = await this.client.get(`/karma/blacklist/${identity}`);
      
      return {
        status: 'success',
        message: 'Blacklist check completed',
        data: response.data?.data || { blacklisted: false },
      };
    } catch (error: any) {
      // If 404, user is not blacklisted
      if (error.response?.status === 404) {
        return {
          status: 'success',
          message: 'User is not blacklisted',
          data: {
            blacklisted: false,
          },
        };
      }

      Logger.error('Error checking karma blacklist', error);
      
      // In case of API failure, we should be cautious and allow the user
      // but log the error for investigation
      return {
        status: 'error',
        message: 'Unable to verify blacklist status',
        data: {
          blacklisted: false,
        },
      };
    }
  }

  /**
   * Check blacklist by email
   */
  async checkByEmail(email: string): Promise<IKarmaBlacklistResponse> {
    return this.checkBlacklist(email);
  }

  /**
   * Check blacklist by phone number
   */
  async checkByPhone(phoneNumber: string): Promise<IKarmaBlacklistResponse> {
    return this.checkBlacklist(phoneNumber);
  }

  /**
   * Comprehensive check using multiple identifiers
   */
  async comprehensiveCheck(
    email: string,
    phoneNumber: string
  ): Promise<IKarmaBlacklistResponse> {
    // Check by email first
    const emailCheck = await this.checkByEmail(email);
    
    if (emailCheck.data?.blacklisted) {
      return emailCheck;
    }

    // Check by phone number
    const phoneCheck = await this.checkByPhone(phoneNumber);
    
    return phoneCheck;
  }
}
