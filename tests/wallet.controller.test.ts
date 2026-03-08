import request from 'supertest';
import express from 'express';
import walletRoutes from '../src/routes/wallet.routes';
import authRoutes from '../src/routes/auth.routes';
import { errorHandler } from '../src/middleware/error.middleware';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use(errorHandler);

describe('Wallet Controller', () => {
  let authToken: string;
  let recipientToken: string;
  const testUser = {
    email: `wallettest${Date.now()}@example.com`,
    password: 'TestPassword123',
    firstName: 'Wallet',
    lastName: 'Test',
    phoneNumber: `080${Date.now().toString().slice(-8)}`,
  };

  beforeAll(async () => {
    // Register and login test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    authToken = registerResponse.body.data.token;

    // Register recipient user
    const recipientResponse = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUser,
        email: `recipient${Date.now()}@example.com`,
        phoneNumber: `081${Date.now().toString().slice(-8)}`,
      });

    recipientToken = recipientResponse.body.data.token;
  });

  describe('GET /api/wallet', () => {
    it('should get wallet details', async () => {
      const response = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.wallet).toBeDefined();
      expect(response.body.data.wallet.balance).toBeDefined();
      expect(response.body.data.wallet.currency).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/wallet').expect(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/wallet/fund', () => {
    it('should fund account successfully', async () => {
      const response = await request(app)
        .post('/api/wallet/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000,
          description: 'Test funding',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.wallet.balance).toBe(10000);
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.transaction.type).toBe('FUNDING');
      expect(response.body.data.transaction.amount).toBe(10000);
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .post('/api/wallet/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for zero amount', async () => {
      const response = await request(app)
        .post('/api/wallet/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 0,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/wallet/transfer', () => {
    beforeAll(async () => {
      // Fund the test account
      await request(app)
        .post('/api/wallet/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50000,
          description: 'Initial funding for transfer tests',
        });
    });

    it('should transfer funds successfully', async () => {
      // Get recipient email from profile
      const recipientProfile = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${recipientToken}`);

      const recipientEmail = recipientProfile.body.data.user.email;

      const response = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail,
          amount: 5000,
          description: 'Test transfer',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.type).toBe('TRANSFER');
      expect(response.body.data.transaction.amount).toBe(5000);
      expect(response.body.data.transaction.recipient).toBeDefined();
    });

    it('should return 400 for insufficient balance', async () => {
      const recipientProfile = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${recipientToken}`);

      const recipientEmail = recipientProfile.body.data.user.email;

      const response = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail,
          amount: 100000000, // Very large amount
          description: 'Test transfer',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it('should return 404 for non-existent recipient', async () => {
      const response = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail: 'nonexistent@example.com',
          amount: 1000,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for self-transfer', async () => {
      const userProfile = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      const userEmail = userProfile.body.data.user.email;

      const response = await request(app)
        .post('/api/wallet/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail: userEmail,
          amount: 1000,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('own account');
    });
  });

  describe('POST /api/wallet/withdraw', () => {
    it('should withdraw funds successfully', async () => {
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          description: 'Test withdrawal',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.type).toBe('WITHDRAWAL');
      expect(response.body.data.transaction.amount).toBe(5000);
    });

    it('should return 400 for insufficient balance', async () => {
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100000000,
          description: 'Test withdrawal',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/wallet/transactions', () => {
    it('should get transaction history', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeDefined();
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });
});
