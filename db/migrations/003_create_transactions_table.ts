import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('wallet_id').notNullable();
    table.enum('type', ['FUNDING', 'TRANSFER', 'WITHDRAWAL']).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.enum('status', ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED']).defaultTo('PENDING');
    table.text('description').nullable();
    table.string('reference', 100).notNullable().unique();
    table.uuid('recipient_wallet_id').nullable();
    table.json('metadata').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table
      .foreign('wallet_id')
      .references('id')
      .inTable('wallets')
      .onDelete('CASCADE');
    
    table
      .foreign('recipient_wallet_id')
      .references('id')
      .inTable('wallets')
      .onDelete('SET NULL');

    // Indexes
    table.index('wallet_id');
    table.index('type');
    table.index('status');
    table.index('reference');
    table.index('created_at');
    table.index(['wallet_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('transactions');
}
