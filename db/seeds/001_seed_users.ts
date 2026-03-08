import { Knex } from 'knex';
import { PasswordUtil } from '../../src/utils/password';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('transactions').del();
  await knex('wallets').del();
  await knex('users').del();

  // Insert test users
  const hashedPassword = await PasswordUtil.hash('TestPassword123');

  const users = await knex('users').insert([
    {
      email: 'test.user@example.com',
      password: hashedPassword,
      first_name: 'Test',
      last_name: 'User',
      phone_number: '08011111111',
      is_active: true,
    },
    {
      email: 'demo.user@example.com',
      password: hashedPassword,
      first_name: 'Demo',
      last_name: 'User',
      phone_number: '08022222222',
      is_active: true,
    },
  ]);

  // Get inserted user IDs
  const testUser = await knex('users').where({ email: 'test.user@example.com' }).first();
  const demoUser = await knex('users').where({ email: 'demo.user@example.com' }).first();

  // Insert wallets for test users
  if (testUser && demoUser) {
    await knex('wallets').insert([
      {
        user_id: testUser.id,
        balance: 100000.00,
        currency: 'NGN',
        is_active: true,
      },
      {
        user_id: demoUser.id,
        balance: 50000.00,
        currency: 'NGN',
        is_active: true,
      },
    ]);

    // Get wallet IDs
    const testWallet = await knex('wallets').where({ user_id: testUser.id }).first();
    const demoWallet = await knex('wallets').where({ user_id: demoUser.id }).first();

    // Insert sample transactions
    if (testWallet && demoWallet) {
      await knex('transactions').insert([
        {
          wallet_id: testWallet.id,
          type: 'FUNDING',
          amount: 100000.00,
          status: 'COMPLETED',
          description: 'Initial deposit',
          reference: `FND-INIT-${Date.now()}-TEST`,
          metadata: JSON.stringify({ method: 'bank_transfer' }),
        },
        {
          wallet_id: testWallet.id,
          type: 'TRANSFER',
          amount: 10000.00,
          status: 'COMPLETED',
          description: 'Transfer to demo user',
          reference: `TRF-INIT-${Date.now()}-TEST`,
          recipient_wallet_id: demoWallet.id,
          metadata: JSON.stringify({
            sender_wallet_id: testWallet.id,
            recipient_wallet_id: demoWallet.id,
          }),
        },
        {
          wallet_id: demoWallet.id,
          type: 'FUNDING',
          amount: 50000.00,
          status: 'COMPLETED',
          description: 'Initial deposit',
          reference: `FND-INIT-${Date.now()}-DEMO`,
          metadata: JSON.stringify({ method: 'card_payment' }),
        },
      ]);
    }
  }
}
