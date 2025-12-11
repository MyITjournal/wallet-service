# TR Wallet Service with Paystack, JWT (from Google Sign-In) & API Keys (service-to-service access)

This is a comprehensive NestJS backend wallet service implementing Google OAuth authentication, Paystack payment integration, and full wallet management with dual authentication support (JWT and API Keys).

## Features

### Dual Authentication System

- **JWT Authentication** (for end-users)
  - Google OAuth 2.0 Sign-In
  - JWT token generation and validation
  - User profile management
  - Secure callback handling
  - Protected routes with JWT guards

- **API Key Authentication** (for service-to-service)
  - Secure API key validation
  - Service identity tracking
  - Dedicated service endpoints
  - No user login required

### Wallet Management

- **Deposit Money** - Fund wallet using Paystack payment gateway
- **Wallet Balance** - View current balance and lifetime totals
- **Transfer Funds** - Send money to other users by email
- **Withdraw to Bank** - Send money to Nigerian bank accounts
- **Transaction History** - Complete audit trail of all wallet operations
- **Auto-credit** - Automatic wallet funding after successful payments

### Payments

- Paystack payment initialization
- User-specific transaction tracking
- Transaction history for authenticated users
- Webhook verification with HMAC SHA512
- Transaction status tracking
- Idempotency support
- Real-time payment verification

### Architecture

- Model-Actions pattern (business logic separation)
- Global exception filter with error standardization
- Response transformation interceptor
- TypeORM with PostgreSQL
- Snake_case database columns
- Soft delete support
- Database transaction locking for wallet operations
- Comprehensive error handling

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- Google Cloud Console account
- Paystack account

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/MyITjournal/google-signin-paystack-payment.git
cd google-signin-paystack-payment
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=google_paystack_db

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# API Key for Service-to-Service Authentication
API_KEY=your_generated_api_key_here

# Application Configuration
PORT=3000
NODE_ENV=development
```

**Generate API Key:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb google_paystack_db

# Database migrations are handled automatically by TypeORM (synchronize: true)
```

## Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The application is available at `http://localhost:3000`

** Swagger API Documentation:** `http://localhost:3000/docs`

## API Documentation

### Quick Start with Swagger

Once the server is running, visit **`http://localhost:3000/docs`** for interactive API documentation where you can:

- Try out all endpoints directly in your browser
- See request/response schemas
- Authenticate with JWT or API keys
- View all validation rules

### Authentication Endpoints

#### 1. Google Authentication - Initiate Sign-In

```http
GET /auth/google
```

**Response:** 302 Redirect to Google OAuth consent page

**Description:** Triggers Google sign-in flow. User will be redirected to Google's OAuth consent screen to select account and grant permissions.

---

#### 2. Google Authentication - OAuth Callback

```http
GET /auth/google/callback?code={authorization_code}
```

**Success Response (200):**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Description:**

- Logs in user after Google authentication
- Creates user if not existing in database
- Returns JWT token valid for 7 days
- Token includes user_id, email, name, and tokenVersion

**Error Responses:**

- `400` - Missing authorization code
- `401` - Invalid authorization code
- `500` - OAuth provider error

---

### API Key Management Endpoints

#### 3. Create API Key

```http
POST /keys/create
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "wallet-service",
  "permissions": ["deposit", "transfer", "read"],
  "expiry": "1D"
}
```

**Success Response (201):**

```json
{
  "api_key": "sk_live_YOUR_API_KEY_HERE",
  "expires_at": "2025-12-10T12:00:00Z"
}
```

**Rules:**

- `expiry` accepts: `1H` (Hour), `1D` (Day), `1M` (Month), `1Y` (Year)
- Backend converts expiry to real datetime and stores as `expires_at`
- Maximum 5 active keys per user
- Permissions must be explicitly assigned

**Available Permissions:**

- `deposit` - Allow wallet deposits
- `transfer` - Allow wallet transfers
- `read` - Allow reading wallet balance and transactions

**Error Responses:**

- `400` - Invalid expiry format or permissions
- `403` - Maximum keys limit reached (5 active keys)
- `401` - Unauthorized

---

#### 4. Rollover Expired API Key

```http
POST /keys/rollover
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "expired_key_id": "550e8400-e29b-41d4-a716-446655440001",
  "expiry": "1M"
}
```

**Success Response (201):**

```json
{
  "api_key": "sk_live_YOUR_API_KEY_HERE",
  "expires_at": "2026-01-09T12:00:00Z"
}
```

**Description:**

- Creates new API key with same permissions as expired key
- Old key must be truly expired
- New key reuses same permissions from old key
- `expiry` is converted to new `expires_at` value

**Rules:**

- Expired key must have `is_active = false` and `expires_at < now()`
- New key inherits all permissions from expired key
- Old key remains in database for audit trail

**Error Responses:**

- `400` - Invalid expiry format
- `404` - Expired key not found
- `403` - Key is not expired or maximum keys limit reached
- `401` - Unauthorized

---

### Wallet Endpoints

#### 5. Wallet Deposit (Paystack)

```http
POST /wallet/deposit
Authorization: Bearer {jwt_token} OR X-API-Key: {api_key}
Content-Type: application/json

{
  "amount": 5000
}
```

**Success Response (201):**

```json
{
  "reference": "fw_1733700000000_abc123",
  "authorization_url": "https://checkout.paystack.com/xyz"
}
```

**Authentication:**

- JWT token (user authentication) **OR**
- API Key with `deposit` permission

**Description:**

- Initiates Paystack payment for wallet deposit
- Amount in kobo (smallest currency unit)
- Returns Paystack checkout URL for payment
- Wallet is NOT credited until webhook confirms success

**Error Responses:**

- `400` - Invalid amount
- `401` - Unauthorized (missing or invalid JWT/API key)
- `403` - Wallet is locked or missing deposit permission
- `500` - Payment initialization failed

---

#### 6. Paystack Webhook

```http
POST /wallet/paystack/webhook
X-Paystack-Signature: {hmac_sha512_signature}
Content-Type: application/json

{
  "event": "charge.success",
  "data": {
    "reference": "fw_1733700000000_abc123",
    "status": "success",
    "amount": 5000
  }
}
```

**Success Response (200):**

```json
{
  "status": true
}
```

**Description:**

- Receives transaction updates from Paystack
- **ONLY this endpoint can credit wallets** (not manual checks)
- Verifies Paystack signature using HMAC SHA512
- Updates transaction status in database
- Auto-credits wallet if payment successful

**Security:**

- Validates `X-Paystack-Signature` header
- Compares HMAC hash with `PAYSTACK_WEBHOOK_SECRET`
- Rejects requests with invalid signatures

**Actions:**

1. Verify signature
2. Find transaction by reference
3. Update transaction status
4. Credit wallet if status = "success"

**Error Responses:**

- `400` - Invalid signature or payload
- `500` - Server error

**Important:** Configure this webhook URL in your Paystack dashboard:

```
https://yourdomain.com/wallet/paystack/webhook
```

---

#### 7. Verify Deposit Status (Read-Only)

```http
GET /wallet/deposit/{reference}/status
Authorization: Bearer {jwt_token}
```

**Success Response (200):**

```json
{
  "reference": "fw_1733700000000_abc123",
  "status": "success",
  "amount": 5000
}
```

**Description:**

- Optional manual check for deposit status
- **Does NOT credit wallets** (read-only)
- Only webhook is allowed to credit wallets
- Returns current status from database

**Status Values:**

- `pending` - Payment initiated but not confirmed
- `success` - Payment confirmed and wallet credited
- `failed` - Payment failed

**Error Responses:**

- `400` - Invalid reference
- `404` - Transaction not found
- `401` - Unauthorized

---

#### 8. Get Wallet Balance

```http
GET /wallet/balance
Authorization: Bearer {jwt_token} OR X-API-Key: {api_key}
```

**Success Response (200):**

```json
{
  "balance": 15000
}
```

**Authentication:**

- JWT token (user authentication) **OR**
- API Key with `read` permission

**Description:**

- Returns current wallet balance
- Amount in kobo (smallest currency unit)
- Balance is updated only by webhook after successful payments

**Error Responses:**

- `401` - Unauthorized (missing or invalid JWT/API key)
- `403` - Missing read permission (for API keys)

---

#### 9. Transfer to User

```http
POST /wallet/transfer
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "amount": 50000,
  "recipient_email": "recipient@example.com",
  "description": "Payment for services"
}
```

**Success Response (201):**

```json
{
  "reference": "TRANSFER_1733700000000_def456",
  "amount": 500.0,
  "recipient": "recipient@example.com",
  "status": "success"
}
```

**Description:**

- P2P transfer between wallet users
- Atomic transaction with dual database locking
- Amount in kobo (smallest currency unit)
- Deducts from sender, credits recipient instantly

**Error Responses:**

- `400` - Insufficient balance or cannot transfer to yourself
- `401` - Unauthorized
- `403` - Sender or recipient wallet is locked
- `404` - Recipient not found

---

#### 10. Withdraw to Bank Account

```http
POST /wallet/withdraw
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "amount": 10000,
  "account_number": "0123456789",
  "bank_code": "058"
}
```

**Success Response (201):**

```json
{
  "reference": "WALLET_WD_1733700000000_xyz789",
  "amount": 100.0,
  "status": "pending"
}
```

**Description:**

- Withdraws funds from wallet to Nigerian bank account
- Amount deducted immediately, refunded if transfer fails

**Error Responses:**

- `400` - Insufficient balance
- `401` - Unauthorized
- `403` - Wallet is locked
- `500` - Transfer initiation failed

---

#### 11. Get Wallet Transaction History

```http
GET /wallet/transactions?limit=50
Authorization: Bearer {jwt_token}
```

**Success Response (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "credit",
    "amount": 500.0,
    "balance_before": 0.0,
    "balance_after": 500.0,
    "status": "success",
    "reference": "fw_1733700000000_abc123",
    "description": "Wallet funding via Paystack",
    "metadata": null,
    "created_at": "2025-12-09T10:00:00.000Z"
  }
]
```

**Transaction Types:**

- `credit` - Wallet funded
- `debit` - Withdrawal
- `transfer_out` - Sent to another user
- `transfer_in` - Received from another user

---

### API Key Management (Additional Endpoints)

#### 12. List All API Keys

```http
GET /keys
Authorization: Bearer {jwt_token}
```

#### 13. Get API Key Details

```http
GET /keys/{id}
Authorization: Bearer {jwt_token}
```

#### 14. Update API Key

```http
PUT /keys/{id}
Authorization: Bearer {jwt_token}
```

#### 15. Delete API Key

```http
DELETE /keys/{id}
Authorization: Bearer {jwt_token}
```

#### 16. Get API Key Usage Stats

```http
GET /keys/{id}/stats
Authorization: Bearer {jwt_token}
```

#### 17. Get API Key Usage Logs

```http
GET /keys/{id}/logs
Authorization: Bearer {jwt_token}
```

**Error Responses:**

- `401` - Unauthorized (missing or invalid API key / JWT token)
- `404` - User not found
- `400` - Insufficient balance / Invalid input
- `403` - Wallet locked
- `500` - Server error

---

## Project Structure

```
src/
├── common/
│   ├── constants/
│   │   └── sys-messages.ts           # Centralized error messages
│   ├── decorators/
│   │   └── index.ts                   # Custom decorators (CurrentUser, RequirePermission, SkipWrap)
│   ├── entities/
│   │   └── base-entity.ts             # Base entity with timestamps & soft delete
│   ├── enums/
│   │   └── transaction-status.enum.ts
│   ├── exceptions/
│   │   ├── custom-exceptions.ts       # Domain-specific exceptions
│   │   └── global-exception.filter.ts # Global error handler
│   ├── interceptors/
│   │   ├── transform.interceptor.ts   # Response wrapper
│   │   └── api-key-logging.interceptor.ts
│   ├── interfaces/
│   │   ├── jwt.interface.ts           # JWT & Auth types
│   │   └── paystack.interface.ts      # Paystack API types
│   └── services/
│       ├── cache.service.ts           # In-memory caching
│       └── paystack-api.service.ts    # Paystack integration
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   │   ├── google.strategy.ts     # Google OAuth strategy
│   │   │   └── jwt.strategy.ts        # JWT validation strategy
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── api-key.guard.ts
│   │   │   └── jwt-or-api-key.guard.ts # Dual auth support
│   │   └── services/
│   │       └── google-api.service.ts
│   ├── users/
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── actions/
│   │   │   └── user.actions.ts        # User business logic (Model-Actions pattern)
│   │   └── users.module.ts
│   ├── wallet/
│   │   ├── entities/
│   │   │   ├── wallet.entity.ts
│   │   │   └── wallet-transaction.entity.ts
│   │   ├── model-actions/
│   │   │   ├── wallet.model-actions.ts
│   │   │   └── wallet-transaction.model-actions.ts
│   │   ├── dto/
│   │   │   ├── fund-wallet.dto.ts
│   │   │   ├── withdraw-wallet.dto.ts
│   │   │   └── transfer-wallet.dto.ts
│   │   ├── wallet.controller.ts
│   │   ├── wallet.service.ts
│   │   └── wallet.module.ts
│   ├── payments/
│   │   ├── entities/
│   │   │   └── transaction.entity.ts
│   │   ├── model-actions/
│   │   │   └── payment.model-actions.ts
│   │   ├── dto/
│   │   │   └── initiate-payment.dto.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── payments.module.ts
│   └── api-keys/
│       ├── entities/
│       │   ├── api-key.entity.ts
│       │   └── api-key-usage-log.entity.ts
│       ├── model-actions/
│       │   ├── api-key.model-actions.ts
│       │   └── api-key-usage-log.model-actions.ts
│       ├── dto/
│       │   ├── create-api-key.dto.ts
│       │   ├── update-api-key.dto.ts
│       │   └── rollover-api-key.dto.ts
│       ├── api-keys.controller.ts
│       ├── api-keys.service.ts
│       └── api-keys.module.ts
├── app.module.ts
└── main.ts
```

## Security Features

### 1. Authentication & Authorization

- **Dual Authentication**: JWT (users) + API Keys (services)
- **Google OAuth 2.0**: Server-side flow with callback validation
- **JWT Tokens**: 7-day expiry with token versioning
- **API Key Features**:
  - Granular permissions (read, deposit, transfer)
  - Rate limiting (hourly/daily)
  - IP whitelisting
  - Automatic expiration
  - Usage logging & analytics
  - Maximum 5 active keys per user

### 2. Paystack Webhook Security

- HMAC SHA512 signature verification
- Prevents fake payment updates
- Idempotent transaction processing
- Secret key validation

### 3. Error Handling

- Global exception filter with uniform responses
- **No stack traces** in client responses (security)
- Sanitized error messages
- Detailed server-side logging

### 4. Database Security

- Soft delete pattern (data retention)
- Pessimistic locking for wallet operations
- Atomic transactions (no partial updates)
- Input validation with class-validator

### 5. Business Logic Protection

- Duplicate transaction prevention
- Reference uniqueness enforcement
- Insufficient balance checks
- Wallet locking mechanism
- Transfer atomicity (sender debit + recipient credit)

---

## Model-Actions Pattern

Services are thin orchestration layers:

```typescript
// Service (orchestration only)
async initiatePayment(dto: InitiatePaymentDto) {
  const existingTransaction =
    await this.paymentActions.findRecentDuplicateTransaction(dto.amount);

  if (existingTransaction) {
    return { reference: existingTransaction.reference, ... };
  }

  const reference = this.paymentActions.generateReference();
  const paystackData = await this.paymentActions.initializePaystackTransaction(...);
  await this.paymentActions.createTransaction(...);

  return { reference, authorization_url: paystackData.authorization_url };
}
```

Actions handle business logic and throw specific exceptions:

```typescript
// Action (business logic)
async initializePaystackTransaction(reference: string, amount: number) {
  const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
  if (!secretKey) {
    throw new InternalServerErrorException('Payment config error');
  }

  const response = await axios.post(...);
  // ... validation and error handling

  return response.data.data;
}
```

---

## Swagger Documentation Setup

The project uses **Swagger/OpenAPI** for interactive API documentation.

### Accessing Swagger UI

```bash
# Start the development server
npm run start:dev

# Open in browser
http://localhost:3000/docs
```

### Adding Swagger Decorators

**Controllers:**

```typescript
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Wallet') // Group endpoints
@Controller('wallet')
export class WalletController {
  @ApiBearerAuth() // Requires JWT authentication
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('balance')
  async getBalance(@CurrentUser() user: JwtPayload) {
    return this.walletService.getBalance(user.userId);
  }
}
```

**DTOs:**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class FundWalletDto {
  @ApiProperty({
    description: 'Amount to fund in kobo (₦100 = 10000 kobo)',
    example: 50000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100)
  amount: number;
}
```

**API Key Authentication:**

```typescript
import { ApiSecurity } from '@nestjs/swagger';

@ApiSecurity('api-key') // Requires X-API-Key header
@Controller('wallet/service')
export class WalletServiceController {
  // ...endpoints
}
```

### Available Tags

- `Authentication` - Google OAuth & JWT endpoints
- `Wallet` - User wallet operations
- `Payments` - Paystack integration
- `API Keys` - API key management

### Testing in Swagger UI

1. **Authenticate**: Click "Authorize" → Enter JWT token or API key
2. **Try Endpoint**: Click "Try it out" → Fill parameters → Execute
3. **View Response**: See real-time response with status codes

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Production Deployment

### 1. Environment Setup

Create a `.env` file with production values:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database (Production Credentials)
DATABASE_HOST=your-prod-db-host.com
DATABASE_PORT=5432
DATABASE_USERNAME=produser
DATABASE_PASSWORD=secure_password
DATABASE_NAME=wallet_db

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourapp.com/auth/google/callback

# JWT
JWT_SECRET=your_production_jwt_secret

# Paystack
PAYSTACK_SECRET_KEY=your_live_paystack_secret
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Frontend
FRONTEND_URL=https://yourfrontend.com
```

### 2. Database Configuration

** TypeORM Synchronization (Automatic)**

The application automatically manages database schema based on `NODE_ENV`:

- **Development (`NODE_ENV=development`)**: `synchronize: true` (auto-creates/updates schema)
- **Production (`NODE_ENV=production`)**: `synchronize: false` (manual schema required)

**For production deployment:**

Since migrations are not configured, you have two options:

**Option A: Export schema from development**

```bash
# In development, let TypeORM create schema
NODE_ENV=development npm run start:dev

# Export the schema
pg_dump -h localhost -U postgres -d google_paystack_db --schema-only > schema.sql

# Import to production database
psql -h prod-host -U produser -d wallet_db < schema.sql
```

**Option B: Set up migrations (recommended for teams)**

```bash
# 1. Create migrations directory
mkdir -p src/database/migrations

# 2. Add migration scripts to package.json:
# "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/data-source.ts",
# "migration:run": "typeorm-ts-node-commonjs migration:run -d src/data-source.ts"

# 3. Generate migration from entities
npm run migration:generate -- -n InitialSchema

# 4. Run migrations in production
npm run migration:run
```

### 4. Performance Optimization

- **Caching**: Implement Redis for frequently accessed data
- **Connection Pooling**: TypeORM handles this (max: 10)
- **Database Indexing**: Add indexes on frequently queried columns
- **Query Optimization**: Use `select` to limit returned columns
- **Compression**: Enable gzip compression in NestJS

### 5. Build & Deploy

```bash
# Install production dependencies only
npm ci --only=production

# Build application
npm run build

# Start production server
npm run start:prod
```

### 6. Paystack Webhook Setup

1. Go to **Paystack Dashboard** → **Settings** → **Webhooks**
2. Add webhook URL: `https://yourapp.com/payments/webhook`
3. Copy webhook secret to `.env` as `PAYSTACK_WEBHOOK_SECRET`
4. Test webhook with Paystack's test events

### 7. Health Check

```bash
# Basic health check
curl https://yourapp.com
# Expected: "Hello World!"

# API documentation
curl https://yourapp.com/docs
# Expected: Swagger UI
```

### 8. Monitoring & Logging

**Application Logs:**

- Use Winston or Pino for structured logging
- Send logs to centralized service (CloudWatch, Datadog)
- Log critical events: failed payments, API key abuse, exceptions

**Metrics to Monitor:**

- API response times
- Database query performance
- Wallet transaction success rate
- API key usage patterns
- Error rates by endpoint

---

## Additional Documentation

- **Swagger API Docs**: http://localhost:3000/docs

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author

**Ade Adebayo**

- GitHub: https://github.com/MyITjournal/wallet-service
- Base URL: https://paystack-integration-76e6df6dd489.herokuapp.com/
- Swagger link: https://paystack-integration-76e6df6dd489.herokuapp.com/docs#/
- Heroku: https://git.heroku.com/paystack-integration.git
