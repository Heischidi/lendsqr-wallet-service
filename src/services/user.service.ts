import db from '../config/database';
import { IUser, IUserCreate, IUserResponse } from '../types';
import { PasswordUtil } from '../utils/password';
import { Logger } from '../utils/logger';

export class UserService {
  private readonly tableName = 'users';

  /**
   * Create a new user
   */
  async create(userData: IUserCreate): Promise<IUser> {
    try {
      const hashedPassword = await PasswordUtil.hash(userData.password);

      await db(this.tableName).insert({
        email: userData.email,
        password: hashedPassword,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone_number: userData.phoneNumber,
        is_active: true,
      });

      // MySQL does not support .returning('*') — fetch the inserted row by email
      const user = await db(this.tableName).where({ email: userData.email }).first();
      return this.transformToUser(user);
    } catch (error) {
      Logger.error('Error creating user', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<IUser | null> {
    const user = await db(this.tableName).where({ id }).first();
    return user ? this.transformToUser(user) : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    const user = await db(this.tableName).where({ email }).first();
    return user ? this.transformToUser(user) : null;
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<IUser | null> {
    const user = await db(this.tableName).where({ phone_number: phoneNumber }).first();
    return user ? this.transformToUser(user) : null;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await db(this.tableName).where({ email }).count('id as count').first();
    return (count?.count as number) > 0;
  }

  /**
   * Check if phone number exists
   */
  async phoneExists(phoneNumber: string): Promise<boolean> {
    const count = await db(this.tableName)
      .where({ phone_number: phoneNumber })
      .count('id as count')
      .first();
    return (count?.count as number) > 0;
  }

  /**
   * Validate user credentials
   */
  async validateCredentials(email: string, password: string): Promise<IUser | null> {
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    const isValid = await PasswordUtil.compare(password, user.password);

    if (!isValid) {
      return null;
    }

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const count = await db(this.tableName)
      .where({ id })
      .update({
        ...updates,
        updated_at: new Date(),
      });

    if (!count) return null;
    const updated = await db(this.tableName).where({ id }).first();
    return updated ? this.transformToUser(updated) : null;
  }

  /**
   * Deactivate user
   */
  async deactivate(id: string): Promise<boolean> {
    const result = await db(this.tableName).where({ id }).update({
      is_active: false,
      updated_at: new Date(),
    });

    return result > 0;
  }

  /**
   * Transform database user to IUser interface
   */
  private transformToUser(row: any): IUser {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      phoneNumber: row.phone_number,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform IUser to IUserResponse (without sensitive data)
   */
  toResponse(user: IUser): IUserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
    };
  }
}
