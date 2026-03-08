# Quick Start Guide

This guide will help you get the Demo Credit Wallet Service up and running quickly.

## Prerequisites

- Node.js (v18 LTS or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Option 1: Local Development Setup

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd lendsqr-wallet-service
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

Example `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lendsqr_wallet
JWT_SECRET=your_super_secret_key
ADJUTOR_API_KEY=your_adjutor_api_key
```

### Step 3: Create Database

```sql
CREATE DATABASE lendsqr_wallet;
CREATE DATABASE lendsqr_wallet_test;
```

### Step 4: Run Migrations

```bash
npm run migrate
```

### Step 5: Seed Database (Optional)

```bash
npm run seed
```

### Step 6: Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## Option 2: Docker Setup

### Step 1: Start with Docker Compose

```bash
docker-compose up -d
```

This will start:
- MySQL database on port 3306
- Node.js application on port 3000

### Step 2: Run Migrations

```bash
docker-compose exec app npm run migrate
```

### Step 3: Access the API

```bash
curl http://localhost:3000/health
```

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "08012345678"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

Save the token from the response.

### 3. Fund Account

```bash
curl -X POST http://localhost:3000/api/wallet/fund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 10000,
    "description": "Initial funding"
  }'
```

### 4. Check Balance

```bash
curl http://localhost:3000/api/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Transfer Funds

```bash
curl -X POST http://localhost:3000/api/wallet/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipientEmail": "recipient@example.com",
    "amount": 5000,
    "description": "Payment"
  }'
```

### 6. Withdraw Funds

```bash
curl -X POST http://localhost:3000/api/wallet/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 3000,
    "description": "Withdrawal"
  }'
```

### 7. View Transaction History

```bash
curl "http://localhost:3000/api/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm test -- --coverage
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm test` | Run test suite |
| `npm run migrate` | Run database migrations |
| `npm run migrate:rollback` | Rollback last migration |
| `npm run seed` | Seed database with test data |

## Troubleshooting

### Database Connection Error

**Problem**: `Error: connect ECONNREFUSED`

**Solution**: 
- Ensure MySQL is running
- Check database credentials in `.env`
- Verify database exists

### Migration Error

**Problem**: `Error: Table already exists`

**Solution**:
```bash
npm run migrate:rollback
npm run migrate
```

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

### Karma API Key Missing

**Problem**: Blacklist check not working

**Solution**: 
- Sign up at https://adjutor.io
- Get API key from dashboard
- Add to `.env` file

## Postman Collection

Import `API_COLLECTION.json` into Postman for easy testing.

## Next Steps

1. Review the [README.md](README.md) for detailed documentation
2. Check [DESIGN.md](DESIGN.md) for architecture decisions
3. Explore the codebase to understand the implementation
4. Deploy to your preferred platform

## Support

For issues or questions, please refer to:
- README.md - Comprehensive documentation
- DESIGN.md - Architecture and design decisions
- API_COLLECTION.json - Postman collection for testing
