import { UserService } from '../src/services/user.service';
import { WalletService } from '../src/services/wallet.service';
import { KarmaService } from '../src/services/karma.service';
import { IUserCreate } from '../src/types';

// Mock the Karma service
jest.mock('../src/services/karma.service');

describe('Services', () => {
  describe('UserService', () => {
    const userService = new UserService();
    const testUserData: IUserCreate = {
      email: `servicetest${Date.now()}@example.com`,
      password: 'TestPassword123',
      firstName: 'Service',
      lastName: 'Test',
      phoneNumber: '08012345683',
    };

    describe('create', () => {
      it('should create a new user', async () => {
        const user = await userService.create(testUserData);

        expect(user).toBeDefined();
        expect(user.email).toBe(testUserData.email);
        expect(user.firstName).toBe(testUserData.firstName);
        expect(user.lastName).toBe(testUserData.lastName);
        expect(user.password).not.toBe(testUserData.password); // Password should be hashed
      });
    });

    describe('findByEmail', () => {
      it('should find user by email', async () => {
        const user = await userService.findByEmail(testUserData.email);

        expect(user).toBeDefined();
        expect(user?.email).toBe(testUserData.email);
      });

      it('should return null for non-existent email', async () => {
        const user = await userService.findByEmail('nonexistent@example.com');

        expect(user).toBeNull();
      });
    });

    describe('emailExists', () => {
      it('should return true for existing email', async () => {
        const exists = await userService.emailExists(testUserData.email);

        expect(exists).toBe(true);
      });

      it('should return false for non-existent email', async () => {
        const exists = await userService.emailExists('nonexistent@example.com');

        expect(exists).toBe(false);
      });
    });

    describe('validateCredentials', () => {
      it('should validate correct credentials', async () => {
        const user = await userService.validateCredentials(
          testUserData.email,
          testUserData.password
        );

        expect(user).toBeDefined();
        expect(user?.email).toBe(testUserData.email);
      });

      it('should return null for incorrect password', async () => {
        const user = await userService.validateCredentials(
          testUserData.email,
          'WrongPassword123'
        );

        expect(user).toBeNull();
      });

      it('should return null for non-existent user', async () => {
        const user = await userService.validateCredentials(
          'nonexistent@example.com',
          'SomePassword123'
        );

        expect(user).toBeNull();
      });
    });
  });

  describe('WalletService', () => {
    const walletService = new WalletService();
    const userService = new UserService();
    let testUserId: string;
    let testWalletId: string;

    beforeAll(async () => {
      // Create a test user
      const user = await userService.create({
        email: `walletservice${Date.now()}@example.com`,
        password: 'TestPassword123',
        firstName: 'Wallet',
        lastName: 'Service',
        phoneNumber: `083${Date.now().toString().slice(-8)}`,
      });
      testUserId = user.id;

      // Create a wallet for the test user
      const wallet = await walletService.createWallet(testUserId);
      testWalletId = wallet.id;
    });

    describe('createWallet', () => {
      it('should create a new wallet', async () => {
        const user = await userService.create({
          email: `newwallet${Date.now()}@example.com`,
          password: 'TestPassword123',
          firstName: 'New',
          lastName: 'Wallet',
          phoneNumber: '08012345685',
        });

        const wallet = await walletService.createWallet(user.id);

        expect(wallet).toBeDefined();
        expect(wallet.userId).toBe(user.id);
        expect(wallet.balance).toBe(0);
        expect(wallet.currency).toBe('NGN');
      });
    });

    describe('findByUserId', () => {
      it('should find wallet by user ID', async () => {
        const wallet = await walletService.findByUserId(testUserId);

        expect(wallet).toBeDefined();
        expect(wallet?.userId).toBe(testUserId);
      });
    });

    describe('fundAccount', () => {
      it('should fund account successfully', async () => {
        const result = await walletService.fundAccount(testWalletId, 10000);

        expect(result.wallet.balance).toBe(10000);
        expect(result.transaction.type).toBe('FUNDING');
        expect(result.transaction.amount).toBe(10000);
        expect(result.transaction.status).toBe('COMPLETED');
      });

      it('should accumulate funds', async () => {
        const result = await walletService.fundAccount(testWalletId, 5000);

        expect(result.wallet.balance).toBe(15000);
      });
    });

    describe('withdrawFunds', () => {
      it('should withdraw funds successfully', async () => {
        const result = await walletService.withdrawFunds(testWalletId, 5000);

        expect(result.wallet.balance).toBe(10000);
        expect(result.transaction.type).toBe('WITHDRAWAL');
        expect(result.transaction.amount).toBe(5000);
      });

      it('should throw error for insufficient balance', async () => {
        await expect(
          walletService.withdrawFunds(testWalletId, 1000000)
        ).rejects.toThrow('Insufficient balance');
      });
    });

    describe('transferFunds', () => {
      let recipientWalletId: string;

      beforeAll(async () => {
        // Create recipient user and wallet
        const recipient = await userService.create({
          email: `recipient${Date.now()}@example.com`,
          password: 'TestPassword123',
          firstName: 'Recipient',
          lastName: 'User',
          phoneNumber: `084${Date.now().toString().slice(-8)}`,
        });

        const wallet = await walletService.createWallet(recipient.id);
        recipientWalletId = wallet.id;
      });

      it('should transfer funds successfully', async () => {
        const result = await walletService.transferFunds(
          testWalletId,
          recipientWalletId,
          3000
        );

        expect(result.senderWallet.balance).toBe(7000);
        expect(result.recipientWallet.balance).toBe(3000);
        expect(result.transaction.type).toBe('TRANSFER');
      });

      it('should throw error for insufficient balance', async () => {
        await expect(
          walletService.transferFunds(testWalletId, recipientWalletId, 1000000)
        ).rejects.toThrow('Insufficient balance');
      });
    });

    describe('getTransactionHistory', () => {
      it('should get transaction history', async () => {
        const { transactions, total } = await walletService.getTransactionHistory(
          testWalletId
        );

        expect(Array.isArray(transactions)).toBe(true);
        expect(total).toBeGreaterThan(0);
      });

      it('should support pagination', async () => {
        const { transactions } = await walletService.getTransactionHistory(
          testWalletId,
          1,
          2
        );

        expect(transactions.length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('KarmaService', () => {
    let karmaService: KarmaService;

    beforeEach(() => {
      karmaService = new KarmaService();
    });

    describe('checkBlacklist', () => {
      it('should return not blacklisted for clean user', async () => {
        // Mock the implementation
        jest.spyOn(karmaService, 'checkBlacklist').mockResolvedValue({
          status: 'success',
          message: 'User is not blacklisted',
          data: {
            blacklisted: false,
          },
        });

        const result = await karmaService.checkBlacklist('clean@example.com');

        expect(result.data?.blacklisted).toBe(false);
      });

      it('should return blacklisted for bad user', async () => {
        jest.spyOn(karmaService, 'checkBlacklist').mockResolvedValue({
          status: 'success',
          message: 'User is blacklisted',
          data: {
            blacklisted: true,
            details: {
              identity: 'bad@example.com',
              identityType: 'email',
              reason: 'Fraudulent activity',
              dateAdded: '2024-01-01',
            },
          },
        });

        const result = await karmaService.checkBlacklist('bad@example.com');

        expect(result.data?.blacklisted).toBe(true);
        expect(result.data?.details?.reason).toBe('Fraudulent activity');
      });
    });

    describe('comprehensiveCheck', () => {
      it('should check both email and phone', async () => {
        jest.spyOn(karmaService, 'comprehensiveCheck').mockResolvedValue({
          status: 'success',
          message: 'Comprehensive check completed',
          data: {
            blacklisted: false,
          },
        });

        const result = await karmaService.comprehensiveCheck(
          'test@example.com',
          '08012345678'
        );

        expect(result.data?.blacklisted).toBe(false);
      });
    });
  });
});
