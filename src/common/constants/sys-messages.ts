export const SysMessages = {
  // Authentication messages
  AUTH: {
    GOOGLE_AUTH_SUCCESS: 'Google authentication successful',
    GOOGLE_AUTH_FAILED: 'Google authentication failed',
    USER_NOT_FOUND: 'User not found',
    INVALID_CREDENTIALS: 'Invalid credentials',
    UNAUTHORIZED: 'Unauthorized access',
  },

  // Payment messages
  PAYMENT: {
    INITIATION_SUCCESS: 'Payment initiated successfully',
    INITIATION_FAILED: 'Payment initiation failed',
    TRANSACTION_NOT_FOUND: 'Transaction not found',
    INVALID_AMOUNT: 'Invalid payment amount',
    WEBHOOK_SECRET_MISSING: 'Webhook secret not configured',
    INVALID_SIGNATURE: 'Invalid webhook signature',
    VERIFICATION_FAILED: 'Transaction verification failed',
    STATUS_UPDATE_SUCCESS: 'Transaction status updated',
  },

  // General messages
  GENERAL: {
    SERVER_ERROR: 'An internal server error occurred',
    VALIDATION_ERROR: 'Validation failed',
    NOT_FOUND: 'Resource not found',
    SUCCESS: 'Operation completed successfully',
    FAILED: 'Operation failed',
  },

  // Database messages
  DATABASE: {
    CREATE_SUCCESS: 'Record created successfully',
    UPDATE_SUCCESS: 'Record updated successfully',
    DELETE_SUCCESS: 'Record deleted successfully',
    QUERY_FAILED: 'Database query failed',
  },
} as const;

export type SysMessageKey = keyof typeof SysMessages;
