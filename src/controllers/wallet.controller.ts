import { Response } from 'express';
import { WalletService } from '../services/wallet.service';
import { UserService } from '../services/user.service';
import { ResponseUtil } from '../utils/response';
import { Logger } from '../utils/logger';
import {
  IFundAccountRequest,
  ITransferRequest,
  IWithdrawalRequest,
  IAuthRequest,
} from '../types';

const walletService = new WalletService();
const userService = new UserService();

export class WalletController {
  /**
   * Get wallet details and balance
   */
  async getWallet(req: IAuthRequest, res: Response): Promise<Response> {
    try {
      const user = req.user!;
      const wallet = await walletService.findByUserId(user.id);

      if (!wallet) {
        return ResponseUtil.notFound(res, 'Wallet not found');
      }

      return ResponseUtil.success(res, {
        wallet: walletService.toResponse(wallet),
      });
    } catch (error) {
      Logger.error('Error fetching wallet', error);
      return ResponseUtil.error(res, 'Failed to fetch wallet', 500);
    }
  }

  /**
   * Fund account
   */
  async fundAccount(req: IAuthRequest, res: Response): Promise<Response> {
    try {
      const user = req.user!;
      const fundData: IFundAccountRequest = req.body;

      const wallet = await walletService.findByUserId(user.id);

      if (!wallet) {
        return ResponseUtil.notFound(res, 'Wallet not found');
      }

      const result = await walletService.fundAccount(
        wallet.id,
        fundData.amount,
        fundData.description
      );

      Logger.info('Account funded successfully', {
        userId: user.id,
        walletId: wallet.id,
        amount: fundData.amount,
        reference: result.transaction.reference,
      });

      return ResponseUtil.success(
        res,
        {
          wallet: walletService.toResponse(result.wallet),
          transaction: {
            id: result.transaction.id,
            type: result.transaction.type,
            amount: result.transaction.amount,
            status: result.transaction.status,
            description: result.transaction.description,
            reference: result.transaction.reference,
            createdAt: result.transaction.createdAt,
          },
        },
        'Account funded successfully'
      );
    } catch (error: any) {
      Logger.error('Error funding account', error);
      return ResponseUtil.error(res, error.message || 'Failed to fund account', 500);
    }
  }

  /**
   * Transfer funds to another user
   */
  async transferFunds(req: IAuthRequest, res: Response): Promise<Response> {
    try {
      const user = req.user!;
      const transferData: ITransferRequest = req.body;

      // Get sender's wallet
      const senderWallet = await walletService.findByUserId(user.id);

      if (!senderWallet) {
        return ResponseUtil.notFound(res, 'Sender wallet not found');
      }

      // Find recipient by email
      const recipient = await userService.findByEmail(transferData.recipientEmail);

      if (!recipient) {
        return ResponseUtil.notFound(res, 'Recipient not found');
      }

      if (recipient.id === user.id) {
        return ResponseUtil.badRequest(res, 'Cannot transfer to your own account');
      }

      // Get recipient's wallet
      const recipientWallet = await walletService.findByUserId(recipient.id);

      if (!recipientWallet) {
        return ResponseUtil.notFound(res, 'Recipient wallet not found');
      }

      // Check sufficient balance
      if (senderWallet.balance < transferData.amount) {
        return ResponseUtil.badRequest(res, 'Insufficient balance');
      }

      const result = await walletService.transferFunds(
        senderWallet.id,
        recipientWallet.id,
        transferData.amount,
        transferData.description
      );

      Logger.info('Funds transferred successfully', {
        senderId: user.id,
        recipientId: recipient.id,
        amount: transferData.amount,
        reference: result.transaction.reference,
      });

      return ResponseUtil.success(
        res,
        {
          senderWallet: walletService.toResponse(result.senderWallet),
          transaction: {
            id: result.transaction.id,
            type: result.transaction.type,
            amount: result.transaction.amount,
            status: result.transaction.status,
            description: result.transaction.description,
            reference: result.transaction.reference,
            createdAt: result.transaction.createdAt,
            recipient: userService.toResponse(recipient),
          },
        },
        'Funds transferred successfully'
      );
    } catch (error: any) {
      Logger.error('Error transferring funds', error);
      return ResponseUtil.error(res, error.message || 'Failed to transfer funds', 500);
    }
  }

  /**
   * Withdraw funds
   */
  async withdrawFunds(req: IAuthRequest, res: Response): Promise<Response> {
    try {
      const user = req.user!;
      const withdrawalData: IWithdrawalRequest = req.body;

      const wallet = await walletService.findByUserId(user.id);

      if (!wallet) {
        return ResponseUtil.notFound(res, 'Wallet not found');
      }

      // Check sufficient balance
      if (wallet.balance < withdrawalData.amount) {
        return ResponseUtil.badRequest(res, 'Insufficient balance');
      }

      const bankDetails =
        withdrawalData.bankAccount && withdrawalData.bankCode
          ? {
            bankAccount: withdrawalData.bankAccount,
            bankCode: withdrawalData.bankCode,
          }
          : undefined;

      const result = await walletService.withdrawFunds(
        wallet.id,
        withdrawalData.amount,
        withdrawalData.description,
        bankDetails
      );

      Logger.info('Funds withdrawn successfully', {
        userId: user.id,
        walletId: wallet.id,
        amount: withdrawalData.amount,
        reference: result.transaction.reference,
      });

      return ResponseUtil.success(
        res,
        {
          wallet: walletService.toResponse(result.wallet),
          transaction: {
            id: result.transaction.id,
            type: result.transaction.type,
            amount: result.transaction.amount,
            status: result.transaction.status,
            description: result.transaction.description,
            reference: result.transaction.reference,
            createdAt: result.transaction.createdAt,
          },
        },
        'Funds withdrawn successfully'
      );
    } catch (error: any) {
      Logger.error('Error withdrawing funds', error);
      return ResponseUtil.error(res, error.message || 'Failed to withdraw funds', 500);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req: IAuthRequest, res: Response): Promise<Response> {
    try {
      const user = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const wallet = await walletService.findByUserId(user.id);

      if (!wallet) {
        return ResponseUtil.notFound(res, 'Wallet not found');
      }

      const { transactions, total } = await walletService.getTransactionHistory(
        wallet.id,
        page,
        limit
      );

      const totalPages = Math.ceil(total / limit);

      return ResponseUtil.success(res, {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      Logger.error('Error fetching transaction history', error);
      return ResponseUtil.error(res, 'Failed to fetch transaction history', 500);
    }
  }
}
