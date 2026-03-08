import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  fundAccountValidationSchema,
  transferValidationSchema,
  withdrawalValidationSchema,
} from '../validations/wallet.validation';

const router = Router();
const walletController = new WalletController();

// All wallet routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/wallet
 * @desc    Get wallet details and balance
 * @access  Private
 */
router.get('/', walletController.getWallet.bind(walletController));

/**
 * @route   POST /api/wallet/fund
 * @desc    Fund account
 * @access  Private
 */
router.post(
  '/fund',
  validate(fundAccountValidationSchema),
  walletController.fundAccount.bind(walletController)
);

/**
 * @route   POST /api/wallet/transfer
 * @desc    Transfer funds to another user
 * @access  Private
 */
router.post(
  '/transfer',
  validate(transferValidationSchema),
  walletController.transferFunds.bind(walletController)
);

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Withdraw funds
 * @access  Private
 */
router.post(
  '/withdraw',
  validate(withdrawalValidationSchema),
  walletController.withdrawFunds.bind(walletController)
);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/transactions', walletController.getTransactionHistory.bind(walletController));

export default router;
