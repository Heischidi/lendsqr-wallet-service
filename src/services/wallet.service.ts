import db from '../config/database';
import { IWallet, IWalletResponse, ITransaction, TransactionType, TransactionStatus } from '../types';
import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class WalletService {
  private readonly walletTable = 'wallets';
  private readonly transactionTable = 'transactions';

  /**
   * Create a new wallet for a user
   */
  async createWallet(userId: string, currency: string = 'NGN'): Promise<IWallet> {
    try {
      await db(this.walletTable).insert({
        user_id: userId,
        balance: 0,
        currency,
        is_active: true,
      });

      // MySQL does not support .returning('*') — fetch by user_id
      const wallet = await db(this.walletTable).where({ user_id: userId }).first();
      return this.transformToWallet(wallet);
    } catch (error) {
      Logger.error('Error creating wallet', error);
      throw error;
    }
  }

  /**
   * Find wallet by ID
   */
  async findById(id: string): Promise<IWallet | null> {
    const wallet = await db(this.walletTable).where({ id }).first();
    return wallet ? this.transformToWallet(wallet) : null;
  }

  /**
   * Find wallet by user ID
   */
  async findByUserId(userId: string): Promise<IWallet | null> {
    const wallet = await db(this.walletTable).where({ user_id: userId }).first();
    return wallet ? this.transformToWallet(wallet) : null;
  }

  /**
   * Get wallet balance
   */
  async getBalance(walletId: string): Promise<number> {
    const wallet = await this.findById(walletId);
    return wallet ? wallet.balance : 0;
  }

  /**
   * Fund account - adds money to wallet
   */
  async fundAccount(
    walletId: string,
    amount: number,
    description?: string
  ): Promise<{ wallet: IWallet; transaction: ITransaction }> {
    const trx = await db.transaction();

    try {
      // Lock the wallet row for update to prevent race conditions
      const [walletRow] = await trx(this.walletTable)
        .where({ id: walletId })
        .forUpdate();

      if (!walletRow) {
        await trx.rollback();
        throw new Error('Wallet not found');
      }

      // Update wallet balance
      await trx(this.walletTable)
        .where({ id: walletId })
        .update({
          balance: trx.raw('balance + ?', [amount]),
          updated_at: new Date(),
        });

      // Fetch updated wallet
      const updatedWallet = await trx(this.walletTable).where({ id: walletId }).first();

      // Create transaction record
      const reference = this.generateReference('FND');
      const transactionId = uuidv4();
      await trx(this.transactionTable).insert({
        id: transactionId,
        wallet_id: walletId,
        type: TransactionType.FUNDING,
        amount,
        status: TransactionStatus.COMPLETED,
        description: description || 'Account funding',
        reference,
        metadata: JSON.stringify({ method: 'direct_funding' }),
      });

      const transaction = await trx(this.transactionTable).where({ id: transactionId }).first();

      await trx.commit();

      return {
        wallet: this.transformToWallet(updatedWallet),
        transaction: this.transformToTransaction(transaction),
      };
    } catch (error) {
      await trx.rollback();
      Logger.error('Error funding account', error);
      throw error;
    }
  }

  /**
   * Transfer funds from one wallet to another
   */
  async transferFunds(
    senderWalletId: string,
    recipientWalletId: string,
    amount: number,
    description?: string
  ): Promise<{ senderWallet: IWallet; recipientWallet: IWallet; transaction: ITransaction }> {
    const trx = await db.transaction();

    try {
      // Lock both wallets for update (order matters to prevent deadlocks)
      const walletIds = [senderWalletId, recipientWalletId].sort();
      const wallets = await trx(this.walletTable)
        .whereIn('id', walletIds)
        .forUpdate();

      const senderWallet = wallets.find((w) => w.id === senderWalletId);
      const recipientWallet = wallets.find((w) => w.id === recipientWalletId);

      if (!senderWallet) {
        await trx.rollback();
        throw new Error('Sender wallet not found');
      }

      if (!recipientWallet) {
        await trx.rollback();
        throw new Error('Recipient wallet not found');
      }

      // Check sufficient balance
      if (parseFloat(senderWallet.balance) < amount) {
        await trx.rollback();
        throw new Error('Insufficient balance');
      }

      // Deduct from sender
      await trx(this.walletTable)
        .where({ id: senderWalletId })
        .update({
          balance: trx.raw('balance - ?', [amount]),
          updated_at: new Date(),
        });
      const updatedSender = await trx(this.walletTable).where({ id: senderWalletId }).first();

      // Add to recipient
      await trx(this.walletTable)
        .where({ id: recipientWalletId })
        .update({
          balance: trx.raw('balance + ?', [amount]),
          updated_at: new Date(),
        });
      const updatedRecipient = await trx(this.walletTable).where({ id: recipientWalletId }).first();

      // Create transaction record
      const reference = this.generateReference('TRF');
      const transactionId = uuidv4();
      await trx(this.transactionTable).insert({
        id: transactionId,
        wallet_id: senderWalletId,
        type: TransactionType.TRANSFER,
        amount,
        status: TransactionStatus.COMPLETED,
        description: description || 'Fund transfer',
        reference,
        recipient_wallet_id: recipientWalletId,
        metadata: JSON.stringify({
          sender_wallet_id: senderWalletId,
          recipient_wallet_id: recipientWalletId,
        }),
      });
      const transaction = await trx(this.transactionTable).where({ id: transactionId }).first();

      await trx.commit();

      return {
        senderWallet: this.transformToWallet(updatedSender),
        recipientWallet: this.transformToWallet(updatedRecipient),
        transaction: this.transformToTransaction(transaction),
      };
    } catch (error) {
      await trx.rollback();
      Logger.error('Error transferring funds', error);
      throw error;
    }
  }

  /**
   * Withdraw funds from wallet
   */
  async withdrawFunds(
    walletId: string,
    amount: number,
    description?: string,
    bankDetails?: { bankAccount: string; bankCode: string }
  ): Promise<{ wallet: IWallet; transaction: ITransaction }> {
    const trx = await db.transaction();

    try {
      // Lock the wallet row for update
      const [walletRow] = await trx(this.walletTable)
        .where({ id: walletId })
        .forUpdate();

      if (!walletRow) {
        await trx.rollback();
        throw new Error('Wallet not found');
      }

      // Check sufficient balance
      if (parseFloat(walletRow.balance) < amount) {
        await trx.rollback();
        throw new Error('Insufficient balance');
      }

      // Deduct from wallet
      await trx(this.walletTable)
        .where({ id: walletId })
        .update({
          balance: trx.raw('balance - ?', [amount]),
          updated_at: new Date(),
        });
      const updatedWallet = await trx(this.walletTable).where({ id: walletId }).first();

      // Create transaction record
      const reference = this.generateReference('WTH');
      const transactionId = uuidv4();
      await trx(this.transactionTable).insert({
        id: transactionId,
        wallet_id: walletId,
        type: TransactionType.WITHDRAWAL,
        amount,
        status: TransactionStatus.COMPLETED,
        description: description || 'Fund withdrawal',
        reference,
        metadata: JSON.stringify({
          bank_account: bankDetails?.bankAccount,
          bank_code: bankDetails?.bankCode,
        }),
      });
      const transaction = await trx(this.transactionTable).where({ id: transactionId }).first();

      await trx.commit();

      return {
        wallet: this.transformToWallet(updatedWallet),
        transaction: this.transformToTransaction(transaction),
      };
    } catch (error) {
      await trx.rollback();
      Logger.error('Error withdrawing funds', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    walletId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    const offset = (page - 1) * limit;

    const [transactions, countResult] = await Promise.all([
      db(this.transactionTable)
        .where(function () {
          this.where({ wallet_id: walletId }).orWhere({ recipient_wallet_id: walletId });
        })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db(this.transactionTable)
        .where(function () {
          this.where({ wallet_id: walletId }).orWhere({ recipient_wallet_id: walletId });
        })
        .count('id as count')
        .first(),
    ]);

    return {
      transactions: transactions.map((t) => this.transformToTransaction(t)),
      total: parseInt(countResult?.count as string, 10) || 0,
    };
  }

  /**
   * Generate unique transaction reference
   */
  private generateReference(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const uuid = uuidv4().substring(0, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}-${uuid}`;
  }

  /**
   * Transform database wallet to IWallet interface
   */
  private transformToWallet(row: any): IWallet {
    return {
      id: row.id,
      userId: row.user_id,
      balance: parseFloat(row.balance),
      currency: row.currency,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform database transaction to ITransaction interface
   */
  private transformToTransaction(row: any): ITransaction {
    return {
      id: row.id,
      walletId: row.wallet_id,
      type: row.type,
      amount: parseFloat(row.amount),
      status: row.status,
      description: row.description,
      reference: row.reference,
      recipientWalletId: row.recipient_wallet_id,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform IWallet to IWalletResponse
   */
  toResponse(wallet: IWallet): IWalletResponse {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
      createdAt: wallet.createdAt,
    };
  }
}
