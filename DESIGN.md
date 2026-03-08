# Design Document - Demo Credit Wallet Service

## Executive Summary

This document outlines the design and architecture decisions made during the development of the Demo Credit Wallet Service, an MVP wallet functionality for a mobile lending application. The service is built with Node.js, TypeScript, MySQL, and Knex.js ORM.

## Table of Contents

1. [Requirements Analysis](#requirements-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Database Design](#database-design)
4. [Security Considerations](#security-considerations)
5. [Transaction Handling](#transaction-handling)
6. [API Design](#api-design)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)

## Requirements Analysis

### Functional Requirements

1. **User Management**
   - User registration with email, password, first name, last name, phone number
   - Login with email and password
   - Profile retrieval

2. **Wallet Operations**
   - Create wallet on user registration
   - Fund account (add money)
   - Transfer funds to another user
   - Withdraw funds
   - View transaction history

3. **Karma Blacklist Integration**
   - Check users against Lendsqr Adjutor Karma blacklist before onboarding
   - Prevent blacklisted users from creating accounts

### Non-Functional Requirements

1. **Security**
   - Secure password storage
   - JWT-based authentication
   - Input validation
   - SQL injection prevention

2. **Performance**
   - Handle concurrent transactions
   - Efficient database queries
   - Proper indexing

3. **Reliability**
   - Atomic transactions
   - Proper error handling
   - Data consistency

## Architecture Overview

### Architectural Pattern: Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (Routes, Controllers, Middleware, Validations)         │
├─────────────────────────────────────────────────────────┤
│                    Business Logic Layer                  │
│  (Services: UserService, WalletService, KarmaService)   │
├─────────────────────────────────────────────────────────┤
│                    Data Access Layer                     │
│  (Knex.js ORM, Database Models)                         │
├─────────────────────────────────────────────────────────┤
│                    Database Layer                        │
│  (MySQL)                                                │
└─────────────────────────────────────────────────────────┘
```

### Design Patterns Used

1. **Repository Pattern**: Services act as repositories for data access
2. **Dependency Injection**: Services are injected into controllers
3. **Middleware Pattern**: Cross-cutting concerns handled via middleware
4. **Factory Pattern**: Object creation abstracted
5. **Singleton Pattern**: Database connection, service instances

### Folder Structure Rationale

```
src/
├── config/         # Configuration files (database, etc.)
├── controllers/    # HTTP request handlers
├── middleware/     # Express middleware (auth, validation, error handling)
├── routes/         # Route definitions
├── services/       # Business logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── validations/    # Joi validation schemas
```

**Why this structure?**
- **Separation of Concerns**: Each folder has a single responsibility
- **Testability**: Easy to unit test each layer independently
- **Maintainability**: Clear organization makes code easier to navigate
- **Scalability**: New features can be added following the same pattern

## Database Design

### Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐
│     users       │         │     wallets     │
├─────────────────┤         ├─────────────────┤
│ PK id (UUID)    │◄───────►│ PK id (UUID)    │
│    email        │   1:1   │ FK user_id      │
│    password     │         │    balance      │
│    first_name   │         │    currency     │
│    last_name    │         │    is_active    │
│    phone_number │         │    created_at   │
│    is_active    │         │    updated_at   │
│    created_at   │         └─────────────────┘
│    updated_at   │                │
└─────────────────┘                │
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  transactions   │
                          ├─────────────────┤
                          │ PK id (UUID)    │
                          │ FK wallet_id    │
                          │    type         │
                          │    amount       │
                          │    status       │
                          │    description  │
                          │    reference    │
                          │ FK recipient_id │
                          │    metadata     │
                          │    created_at   │
                          │    updated_at   │
                          └─────────────────┘
```

### Schema Design Decisions

#### 1. UUID Primary Keys

**Decision**: Use UUID instead of auto-incrementing integers

**Rationale**:
- Prevents ID enumeration attacks
- Allows distributed ID generation
- Better for microservices architecture
- No sequential pattern that could leak business information

#### 2. DECIMAL for Monetary Values

**Decision**: Use DECIMAL(15, 2) for balance and amount fields

**Rationale**:
- Avoids floating-point precision issues
- Supports values up to 999,999,999,999.99 (sufficient for MVP)
- 2 decimal places for currency precision

#### 3. JSON Metadata Column

**Decision**: Use JSON type for transaction metadata

**Rationale**:
- Flexible schema for varying transaction types
- Stores additional context without schema changes
- Queryable in MySQL 8.0+

#### 4. Soft Deletes Not Implemented

**Decision**: No soft delete columns (deleted_at)

**Rationale**:
- Financial records should be immutable
- Use is_active flag for account status
- Transactions are never deleted, only reversed with new records

### Indexing Strategy

| Table | Column(s) | Reason |
|-------|-----------|--------|
| users | email | Login lookups |
| users | phone_number | Karma blacklist checks |
| wallets | user_id | Wallet lookups by user |
| transactions | wallet_id | Transaction history queries |
| transactions | reference | Reference lookups |
| transactions | created_at | Sorting and date range queries |
| transactions | [wallet_id, created_at] | Optimized history queries |

## Security Considerations

### 1. Password Security

**Implementation**:
- bcryptjs with 12 salt rounds
- Passwords never stored in plain text
- Password comparison using bcrypt's timing-safe comparison

**Why bcrypt?**
- Industry standard for password hashing
- Adaptive (can increase rounds as hardware improves)
- Resistant to rainbow table attacks
- Built-in salt generation

### 2. JWT Authentication

**Implementation**:
- HS256 algorithm
- 24-hour expiration
- Payload contains only userId and email

**Why JWT?**
- Stateless authentication
- No server-side session storage needed
- Easy to scale horizontally
- Works well with mobile apps

### 3. Input Validation

**Implementation**:
- Joi validation schemas
- Validation middleware
- Sanitization of inputs

**Why Joi?**
- Declarative schema definition
- Detailed error messages
- TypeScript support
- Extensive validation rules

### 4. SQL Injection Prevention

**Implementation**:
- Knex.js query builder (parameterized queries)
- No raw SQL concatenation
- Input validation before database operations

### 5. Karma Blacklist Integration

**Implementation**:
- Check before user creation
- Generic error message to prevent information leakage
- Comprehensive check (email + phone)

**Why check before creation?**
- Prevents unnecessary database writes
- Early failure reduces resource usage
- Better user experience (faster response)

## Transaction Handling

### ACID Compliance

All financial operations are wrapped in database transactions to ensure ACID properties:

```typescript
const trx = await db.transaction();
try {
  // 1. Lock wallet row for update
  // 2. Update balance
  // 3. Create transaction record
  await trx.commit();
} catch (error) {
  await trx.rollback();
  throw error;
}
```

### Concurrency Control

**Problem**: Multiple concurrent requests modifying the same wallet

**Solution**: Row-level locking with `FOR UPDATE`

```typescript
await trx('wallets').where({ id }).forUpdate();
```

**Why this works**:
- Locks the row until transaction commits/rolls back
- Other transactions wait for the lock
- Prevents race conditions and double-spending

### Deadlock Prevention

**Problem**: Two transactions trying to lock the same rows in different orders

**Solution**: Always lock wallets in consistent order (by ID)

```typescript
const walletIds = [senderWalletId, recipientWalletId].sort();
await trx('wallets').whereIn('id', walletIds).forUpdate();
```

### Transaction Types

| Type | Description | Balance Effect |
|------|-------------|----------------|
| FUNDING | Add money to wallet | +amount |
| TRANSFER | Send money to another user | -amount (sender), +amount (recipient) |
| WITHDRAWAL | Remove money from wallet | -amount |

## API Design

### RESTful Principles

1. **Resource-based URLs**: `/api/wallet`, `/api/auth/register`
2. **HTTP Methods**: GET, POST for operations
3. **Status Codes**: Proper HTTP status codes
4. **Consistent Response Format**: All responses follow same structure

### Response Format

```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "error": string | null,
  "errors": array | null
}
```

### Error Handling

| Status Code | Usage |
|-------------|-------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (created) |
| 400 | Bad request (validation errors) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (blacklisted, deactivated) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email/phone) |
| 500 | Internal server error |

### Authentication Flow

```
1. Client sends credentials to POST /api/auth/login
2. Server validates credentials
3. Server generates JWT token
4. Client stores token
5. Client includes token in Authorization header for protected routes
6. Server validates token and extracts user info
```

## Testing Strategy

### Test Pyramid

```
       /\
      /  \
     / E2E \         (Few tests - Full system)
    /--------\
   /          \
  / Integration \   (Some tests - API endpoints)
 /--------------\
/                \
/    Unit Tests   \ (Many tests - Services, Utils)
-------------------
```

### Unit Tests

**Coverage**:
- Service layer (UserService, WalletService, KarmaService)
- Utility functions (PasswordUtil, JwtUtil)
- Validation schemas

**Why unit tests?**
- Fast execution
- Easy to debug
- Test business logic in isolation

### Integration Tests

**Coverage**:
- API endpoints
- Database interactions
- Authentication flow

**Why integration tests?**
- Verify components work together
- Test actual HTTP requests/responses
- Validate database state changes

### Test Scenarios

| Feature | Positive Tests | Negative Tests |
|---------|---------------|----------------|
| Registration | Valid data, wallet created | Duplicate email, invalid data, blacklisted user |
| Login | Valid credentials | Invalid password, non-existent user |
| Fund Account | Valid amount | Invalid amount, insufficient permissions |
| Transfer | Valid transfer | Insufficient balance, self-transfer, non-existent recipient |
| Withdrawal | Valid withdrawal | Insufficient balance, invalid amount |

## Deployment Strategy

### Environment Configuration

| Environment | Purpose | Database |
|-------------|---------|----------|
| Development | Local development | Local MySQL |
| Test | Automated testing | Separate test database |
| Production | Live application | Production MySQL |

### Docker Deployment

**Benefits**:
- Consistent environment across dev/staging/prod
- Easy local development setup
- Isolated dependencies

### Heroku Deployment

**Steps**:
1. Create Heroku app
2. Add JawsDB MySQL addon
3. Set environment variables
4. Deploy via Git
5. Run migrations

### Health Checks

```http
GET /health
```

Returns:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "production"
}
```

## Performance Considerations

### Database Optimization

1. **Connection Pooling**: Knex.js built-in pooling
2. **Indexing**: Strategic indexes on frequently queried columns
3. **Query Optimization**: Select only needed columns

### Caching Opportunities (Future)

1. User sessions (Redis)
2. Wallet balances (short-term cache)
3. Transaction history (pagination with caching)

### Rate Limiting (Future)

1. API rate limiting per user
2. Transaction rate limiting to prevent abuse

## Monitoring and Logging

### Logging Strategy

1. **Info Logs**: Normal operations (user login, transactions)
2. **Error Logs**: Exceptions and failures
3. **Debug Logs**: Development-only detailed logs

### Metrics to Track (Future)

1. Transaction volume
2. Average transaction amount
3. Failed transaction rate
4. API response times
5. Error rates

## Future Enhancements

1. **Real Payment Integration**: Paystack, Flutterwave
2. **Email Notifications**: Transaction alerts
3. **Two-Factor Authentication**: Enhanced security
4. **Transaction Fees**: Fee calculation and deduction
5. **Multi-Currency Support**: USD, EUR, GBP
6. **Webhooks**: External system notifications
7. **Admin Dashboard**: Transaction monitoring
8. **Audit Logging**: Compliance requirements

## Conclusion

This design document outlines the architecture and decisions made for the Demo Credit Wallet Service. The implementation follows best practices for security, reliability, and maintainability while keeping the scope appropriate for an MVP.

Key strengths of this design:
- Clear separation of concerns
- Comprehensive error handling
- Secure transaction processing
- Well-tested codebase
- Scalable architecture

The service is ready for deployment and can be extended with additional features as requirements evolve.
