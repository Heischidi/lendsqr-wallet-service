import request from 'supertest';
import express from 'express';
import authRoutes from './src/routes/auth.routes';
import walletRoutes from './src/routes/wallet.routes';
import { errorHandler } from './src/middleware/error.middleware';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use(errorHandler);

async function run() {
    const testUser = {
        email: `debug${Date.now()}@example.com`,
        password: 'TestPassword123',
        firstName: 'Wallet',
        lastName: 'Test',
        phoneNumber: '080' + Math.floor(10000000 + Math.random() * 90000000),
    };
    const res = await request(app).post('/api/auth/register').send(testUser);
    console.log("RESPONSE HTTP CODE:", res.statusCode);
    console.log("RESPONSE BODY:", JSON.stringify(res.body, null, 2));
}

run();
