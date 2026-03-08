# Demo Credit Wallet Service

A Minimum Viable Product (MVP) wallet service for a mobile lending application. This service enables users to create accounts, fund their wallets, transfer funds to other users, and withdraw funds. The service integrates with the Lendsqr Adjutor Karma blacklist API to prevent blacklisted users from onboarding.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture & Design](#architecture--design)
- [E-R Diagram](#e-r-diagram)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)

## Overview

Demo Credit Wallet Service is a RESTful API built with Node.js, TypeScript, and MySQL. It provides core wallet functionality for a mobile lending platform, allowing borrowers to receive loans and make repayments through their digital wallets.

### Key Capabilities

- User registration with Karma blacklist verification
- JWT-based authentication (faux token implementation)
- Wallet management (create, fund, transfer, withdraw)
- Transaction history tracking
- Comprehensive error handling and validation

## Features

### 1. User Account Management
- Create user accounts with email, password, first name, last name, and phone number
- Automatic wallet creation upon registration
- Karma blacklist verification before account creation
- Secure password hashing with bcrypt

### 2. Wallet Operations
- **Fund Account**: Add money to wallet
- **Transfer Funds**: Send money to another user's wallet
- **Withdraw Funds**: Remove money from wallet
- **Balance Inquiry**: Check current wallet balance
- **Transaction History**: View all wallet transactions with pagination

### 3. Security Features
- JWT token-based authentication
- Password hashing (bcrypt with 12 salt rounds)
- Input validation with Joi
- SQL injection protection via Knex.js parameterized queries
- Row-level locking for concurrent transaction handling

### 4. Karma Blacklist Integration
- Pre-registration blacklist check via Lendsqr Adjutor API
- Checks both email and phone number
- Prevents blacklisted users from creating accounts

## Architecture & Design

### System Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │ HTTP/HTTPS
         ▼
┌─────────────────┐
│  Express.js API │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌──────────────┐
│ MySQL  │  │ Adjutor API  │
│Database│  │(Karma Check) │
└────────┘  └──────────────┘
```

### Design Patterns Used

1. **Layered Architecture**: Controllers → Services → Models/Database
2. **Repository Pattern**: Database operations encapsulated in service classes
3. **Dependency Injection**: Services injected into controllers
4. **Middleware Pattern**: Authentication, validation, and error handling as middleware
5. **Transaction Pattern**: Database transactions for atomic operations

## E-R Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIP DIAGRAM                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│        users         │         │       wallets        │
├──────────────────────┤         ├──────────────────────┤
│ PK  id (UUID)        │────┐    │ PK  id (UUID)        │
│     email (UNIQUE)   │    │    │ FK  user_id          │◄──┐
│     password         │    └────│     balance          │   │
│     first_name       │  1:1    │     currency         │   │
│     last_name        │         │     is_active        │   │
│     phone_number     │         │     created_at       │   │
│     is_active        │         │     updated_at       │   │
│     created_at       │         └──────────────────────┘   │
│     updated_at       │                                    │
└──────────────────────┘                                    │
                                                            │
                                                            │
┌──────────────────────┐                                    │
│    transactions      │                                    │
├──────────────────────┤                                    │
│ PK  id (UUID)        │                                    │
│ FK  wallet_id        │────────────────────────────────────┘
│     type             │                              1:N
│     amount
│     status
│     description
│     reference (UNIQUE)
│ FK  recipient_wallet_id (NULLABLE)
│     metadata (JSON)
│     created_at
│     updated_at
└──────────────────────┘

RELATIONSHIPS:
──────────────
• users ────────┬──────── wallets        (1:1) - One user has one wallet
                │
                └──────── transactions   (1:N) - One wallet has many transactions

• wallets ──────┬──────── transactions   (1:N) - One wallet has many outgoing transactions
                │
                └──────── transactions   (1:N) - One wallet can be recipient of many transactions
```

### Database Schema

#### Users Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| first_name | VARCHAR(100) | NOT NULL | User first name |
| last_name | VARCHAR(100) | NOT NULL | User last name |
| phone_number | VARCHAR(20) | NOT NULL | User phone number |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

#### Wallets Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique wallet identifier |
| user_id | UUID | FOREIGN KEY → users.id | Owner of the wallet |
| balance | DECIMAL(15,2) | DEFAULT 0.00 | Current balance |
| currency | VARCHAR(3) | DEFAULT 'NGN' | Currency code |
| is_active | BOOLEAN | DEFAULT TRUE | Wallet status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

#### Transactions Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique transaction identifier |
| wallet_id | UUID | FOREIGN KEY → wallets.id | Source wallet |
| type | ENUM | NOT NULL | FUNDING, TRANSFER, WITHDRAWAL |
| amount | DECIMAL(15,2) | NOT NULL | Transaction amount |
| status | ENUM | DEFAULT 'PENDING' | PENDING, COMPLETED, FAILED, REVERSED |
| description | TEXT | NULLABLE | Transaction description |
| reference | VARCHAR(100) | UNIQUE, NOT NULL | Unique reference code |
| recipient_wallet_id | UUID | FOREIGN KEY → wallets.id | Destination wallet (for transfers) |
| metadata | JSON | NULLABLE | Additional transaction data |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js (LTS) | Runtime environment |
| TypeScript | Type-safe JavaScript |
| Express.js | Web framework |
| Knex.js | SQL query builder/ORM |
| MySQL | Relational database |
| JWT | Authentication tokens |
| bcryptjs | Password hashing |
| Joi | Input validation |
| Jest | Testing framework |
| Supertest | HTTP assertion library |

## Project Structure

```
lendsqr-wallet-service/
├── src/
│   ├── config/
│   │   └── database.ts          # Database configuration
│   ├── controllers/
│   │   ├── auth.controller.ts   # Authentication controllers
│   │   └── wallet.controller.ts # Wallet operation controllers
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT authentication middleware
│   │   ├── error.middleware.ts  # Error handling middleware
│   │   └── validation.middleware.ts # Request validation middleware
│   ├── models/                  # (Implicit via Knex.js)
│   ├── routes/
│   │   ├── auth.routes.ts       # Authentication routes
│   │   └── wallet.routes.ts     # Wallet routes
│   ├── services/
│   │   ├── karma.service.ts     # Adjutor Karma API integration
│   │   ├── user.service.ts      # User business logic
│   │   └── wallet.service.ts    # Wallet business logic
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── utils/
│   │   ├── jwt.ts               # JWT utilities
│   │   ├── logger.ts            # Logging utility
│   │   ├── password.ts          # Password hashing utilities
│   │   └── response.ts          # HTTP response utilities
│   ├── validations/
│   │   ├── auth.validation.ts   # Auth request validation schemas
│   │   └── wallet.validation.ts # Wallet request validation schemas
│   └── server.ts                # Application entry point
├── db/
│   ├── migrations/              # Database migration files
│   │   ├── 001_create_users_table.ts
│   │   ├── 002_create_wallets_table.ts
│   │   └── 003_create_transactions_table.ts
│   └── seeds/                   # Database seed files
├── tests/
│   ├── auth.controller.test.ts  # Auth controller tests
│   ├── wallet.controller.test.ts # Wallet controller tests
│   ├── services.test.ts         # Service layer tests
│   └── setup.ts                 # Test configuration
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── jest.config.js               # Jest test configuration
├── knexfile.ts                  # Knex configuration
├── package.json                 # Project dependencies
├── README.md                    # Project documentation
└── tsconfig.json                # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v18 LTS or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lendsqr-wallet-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Create the database**
   ```sql
   CREATE DATABASE lendsqr_wallet;
   CREATE DATABASE lendsqr_wallet_test;  -- For testing
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | MySQL host | Yes |
| `DB_PORT` | MySQL port | Yes |
| `DB_USER` | MySQL username | Yes |
| `DB_PASSWORD` | MySQL password | Yes |
| `DB_NAME` | Database name | Yes |
| `JWT_SECRET` | Secret key for JWT | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | No (default: 24h) |
| `PORT` | Server port | No (default: 3000) |
| `ADJUTOR_API_KEY` | Lendsqr Adjutor API key | Yes (for production) |
| `ADJUTOR_BASE_URL` | Adjutor API base URL | No |

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "08012345678"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "08012345678",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "wallet": {
      "id": "uuid",
      "userId": "uuid",
      "balance": 0,
      "currency": "NGN",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "wallet": { ... },
    "token": "jwt_token_here"
  }
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Wallet Endpoints

#### Get Wallet
```http
GET /api/wallet
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": "uuid",
      "userId": "uuid",
      "balance": 10000.00,
      "currency": "NGN",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Fund Account
```http
POST /api/wallet/fund
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5000.00,
  "description": "Salary deposit"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account funded successfully",
  "data": {
    "wallet": { ... },
    "transaction": {
      "id": "uuid",
      "type": "FUNDING",
      "amount": 5000.00,
      "status": "COMPLETED",
      "description": "Salary deposit",
      "reference": "FND-XXX-XXX-XXX",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Transfer Funds
```http
POST /api/wallet/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientEmail": "recipient@example.com",
  "amount": 2500.00,
  "description": "Payment for services"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Funds transferred successfully",
  "data": {
    "senderWallet": { ... },
    "transaction": {
      "id": "uuid",
      "type": "TRANSFER",
      "amount": 2500.00,
      "status": "COMPLETED",
      "description": "Payment for services",
      "reference": "TRF-XXX-XXX-XXX",
      "createdAt": "2024-01-01T00:00:00Z",
      "recipient": { ... }
    }
  }
}
```

#### Withdraw Funds
```http
POST /api/wallet/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000.00,
  "description": "ATM withdrawal"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Funds withdrawn successfully",
  "data": {
    "wallet": { ... },
    "transaction": {
      "id": "uuid",
      "type": "WITHDRAWAL",
      "amount": 1000.00,
      "status": "COMPLETED",
      "description": "ATM withdrawal",
      "reference": "WTH-XXX-XXX-XXX",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Get Transaction History
```http
GET /api/wallet/transactions?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (blacklisted user, deactivated account)
- `404` - Not Found
- `409` - Conflict (duplicate email/phone)
- `500` - Internal Server Error

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

The test suite includes:

1. **Unit Tests**
   - Service layer tests (UserService, WalletService, KarmaService)
   - Password hashing utilities
   - JWT utilities

2. **Integration Tests**
   - Authentication endpoints (register, login, profile)
   - Wallet endpoints (fund, transfer, withdraw, history)
   - Error handling and validation

3. **Test Scenarios**
   - Positive test cases (successful operations)
   - Negative test cases (error conditions)
   - Edge cases (boundary values, invalid inputs)

## Deployment

### Heroku Deployment

1. **Create a Heroku app**
   ```bash
   heroku create <candidate-name>-lendsqr-be-test
   ```

2. **Add MySQL database**
   ```bash
   heroku addons:create jawsdb:kitefin
   ```

3. **Set environment variables**
   ```bash
   heroku config:set JWT_SECRET=your_secret_key
   heroku config:set NODE_ENV=production
   heroku config:set ADJUTOR_API_KEY=your_api_key
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Run migrations**
   ```bash
   heroku run npm run migrate
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Design Decisions

### 1. Transaction Scoping

All financial operations (fund, transfer, withdraw) use database transactions to ensure atomicity. This prevents partial updates in case of failures.

```typescript
const trx = await db.transaction();
try {
  // Perform operations
  await trx.commit();
} catch (error) {
  await trx.rollback();
  throw error;
}
```

### 2. Row-Level Locking

To handle concurrent transactions, we use `FOR UPDATE` to lock wallet rows during operations:

```typescript
await trx('wallets').where({ id }).forUpdate();
```

This prevents race conditions when multiple requests try to modify the same wallet simultaneously.

### 3. Wallet-User Relationship

We chose a 1:1 relationship between users and wallets for simplicity in this MVP. Each user gets exactly one wallet upon registration.

### 4. Transaction Reference Generation

Each transaction gets a unique reference code for traceability:
```
Format: {PREFIX}-{TIMESTAMP}-{RANDOM}-{UUID}
Example: FND-K8J2M9-ABCD-1234EFGH
```

### 5. Karma Blacklist Integration

The blacklist check happens before user creation. If a user is blacklisted, the registration fails early with a generic error message to prevent information leakage.

### 6. Password Security

- Passwords are hashed using bcrypt with 12 salt rounds
- Raw passwords are never stored or logged
- Password comparison uses bcrypt's secure comparison

### 7. JWT Authentication

- Stateless authentication using JWT tokens
- Tokens expire after 24 hours (configurable)
- Tokens contain user ID and email only (no sensitive data)

### 8. Error Handling

- Centralized error handling middleware
- Operational errors (expected) vs Programming errors (unexpected)
- Consistent error response format
- Detailed logging for debugging

### 9. Validation

- Input validation using Joi schemas
- Validation happens before controller logic
- Detailed error messages for each field

### 10. Code Organization

- **DRY Principle**: Shared utilities in `utils/` folder
- **Single Responsibility**: Each service handles one domain
- **Separation of Concerns**: Controllers handle HTTP, Services handle business logic

## Future Improvements

1. **Real Payment Integration**: Integrate with actual payment gateways (Paystack, Flutterwave)
2. **Email Notifications**: Send email alerts for transactions
3. **Rate Limiting**: Implement API rate limiting
4. **API Documentation**: Add Swagger/OpenAPI documentation
5. **Audit Logging**: Comprehensive audit trail for compliance
6. **Multi-Currency Support**: Support for multiple currencies
7. **Transaction Fees**: Add transaction fee calculation
8. **Webhooks**: Notify external systems of transaction events

## License

MIT License - This project is for assessment purposes only.

---

**Note**: This is an MVP implementation for the Lendsqr Backend Engineering Assessment. None of this code will be used in production at Lendsqr.
