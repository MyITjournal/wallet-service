# Google Sign-In & Paystack Payment

This is a NestJS backend application implementing Google OAuth authentication and Paystack payment integration with enterprise-grade architecture and security.

## Features

### Authentication

- Google OAuth 2.0 Sign-In
- JWT token generation and validation
- User profile management (email, name, picture)
- Secure callback handling
- Protected routes with JWT guards

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
- esponse transformation interceptor
- TypeORM with PostgreSQL
- Snake_case database columns
- Soft delete support

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

# Application Configuration
PORT=3000
NODE_ENV=development
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

## API Documentation

### Authentication Endpoints

#### 1. Initiate Google Sign-In

```http
GET /auth/google
```

**Response:** 302 Redirect to Google OAuth consent page

#### 2. Google OAuth Callback

```http
GET /auth/google/callback?code={authorization_code}
```

**Success Response (200):**

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400` - Missing authorization code
- `401` - Invalid authorization code
- `500` - OAuth provider error

### Payment Endpoints

#### 3. Initialize Payment

```http
POST /payments/paystack/initiate
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "amount": 5000  // Amount in kobo (₦50.00)
}
```

**Success Response (201):**

```json
{
  "reference": "TXN_1733567890123_abc123",
  "authorization_url": "https://checkout.paystack.com/xyz"
}
```

**Error Responses:**

- `400` - Invalid input
- `402` - Payment initiation failed
- `500` - Server error

#### 4. Paystack Webhook

```http
POST /payments/paystack/webhook
X-Paystack-Signature: {hmac_signature}
Content-Type: application/json

{
  "event": "charge.success",
  "data": {
    "reference": "TXN_1733567890123_abc123",
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

**Error Responses:**

- `400` - Invalid signature or payload
- `500` - Server error

#### 5. Check Transaction Status

```http
GET /payments/{reference}/status?refresh=true
Authorization: Bearer {jwt_token}
```

**Success Response (200):**

```json
{
  "reference": "TXN_1733567890123_abc123",
  "status": "success",
  "amount": 5000,
  "paid_at": "2025-12-07T10:30:00.000Z"
}
```

**Query Parameters:**

- `refresh` (optional): Set to `true` to fetch live status from Paystack

**Error Responses:**

- `400` - Invalid reference
- `404` - Transaction not found
- `500` - Verification failed

#### 6. Get Transaction History

```http
GET /payments/history
Authorization: Bearer {jwt_token}
```

**Success Response (200):**

```json
[
  {
    "reference": "TXN_1733567890123_abc123",
    "status": "success",
    "amount": 5000,
    "paid_at": "2025-12-07T10:30:00.000Z",
    "created_at": "2025-12-07T10:25:00.000Z"
  },
  {
    "reference": "TXN_1733567890124_def456",
    "status": "pending",
    "amount": 10000,
    "paid_at": null,
    "created_at": "2025-12-07T09:15:00.000Z"
  }
]
```

**Error Responses:**

- `401` - Unauthorized (missing or invalid JWT token)
- `500` - Server error

## 🏗️ Project Structure

```
src/
├── common/
│   ├── constants/
│   │   └── sys-messages.ts        # Centralized error messages
│   ├── decorators/
│   │   └── skip-wrap.decorator.ts # Skip response wrapping
│   ├── entities/
│   │   └── base-entity.ts          # Base entity with timestamps
│   ├── enums/
│   │   └── transaction-status.enum.ts
│   ├── exceptions/
│   │   └── global-exception.filter.ts
│   └── interceptors/
│       └── transform.interceptor.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   │   ├── google.strategy.ts
│   │   │   └── jwt.strategy.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   └── decorators/
│   │       └── current-user.decorator.ts
│   ├── users/
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── actions/
│   │   │   └── user.actions.ts     # Business logic
│   │   └── users.module.ts
│   └── payments/
│       ├── entities/
│       │   └── transaction.entity.ts
│       ├── actions/
│       │   └── payment.actions.ts  # Business logic
│       ├── dto/
│       │   └── initiate-payment.dto.ts
│       ├── payments.controller.ts
│       ├── payments.service.ts
│       └── payments.module.ts
├── app.module.ts
└── main.ts
```

## Security Features (to be put into consideration)

### 1. Environment Variables

- All secrets should be stored in `.env` (excluded from version control)
- Runtime validation of required credentials

### 2. Google OAuth Security

- Server-side OAuth flow
- Callback URL validation
- Profile data verification

### 3. Paystack Webhook Security

- HMAC SHA512 signature verification
- Prevents fake payment updates
- Secret key validation

### 4. Error Handling

- Global exception filter
- Sanitized error messages in production
- Detailed logging with context

### 5. Response Security

- Consistent error format
- Stack traces only in development
- No sensitive data exposure

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

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Use production credentials
   - Enable HTTPS
   - Configure CORS

2. **Database**
   - Disable `synchronize` in TypeORM
   - Use migrations
   - Set up backups

3. **Security**
   - Rotate API keys regularly
   - Enable rate limiting
   - Set up monitoring
   - Configure logging

4. **Performance**
   - Enable caching
   - Use connection pooling
   - Optimize database queries

## Additional Documentation

- [SECURITY.md](SECURITY.md) - Security implementation details
- [MODEL-ACTIONS.md](MODEL-ACTIONS.md) - Architecture pattern documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Author

**Ade Adebayo**

- GitHub: [@MyITjournal](https://github.com/MyITjournal)
