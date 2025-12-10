export const SYS_MESSAGES = {
  // API Key messages
  API_KEY_CREATED: 'API key created successfully',
  API_KEY_UPDATED: 'API key updated successfully',
  API_KEY_DELETED: 'API key deleted successfully',
  API_KEY_NOT_FOUND: 'API key not found',
  API_KEY_ROLLOVER_SUCCESS: 'API key rolled over successfully',
  MAX_API_KEYS_REACHED: 'Maximum number of active API keys reached (5)',
  API_KEY_STATS_RETRIEVED: 'API key statistics retrieved successfully',
  API_KEY_LOGS_RETRIEVED: 'API key logs retrieved successfully',
  INVALID_EXPIRY_FORMAT:
    'Invalid expiry format. Use format like 1H, 1D, 1M, or 1Y',
  API_KEY_EXPIRED: 'API key has expired',
  API_KEY_INVALID: 'Invalid API key',
  API_KEY_INACTIVE: 'API key is inactive',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation',
  EXPIRED_KEY_NOT_FOUND: 'Expired API key not found for rollover',
  API_KEY_ALREADY_ACTIVE: 'Cannot rollover an active API key',

  // Authentication messages
  AUTHENTICATION_SUCCESS: 'Google authentication successful',
  AUTHENTICATION_FAILED: 'Google authentication failed',
  MISSING_AUTH_CODE: 'Authorization code is missing',
  INVALID_OAUTH_CODE: 'Invalid authorization code',
  OAUTH_PROVIDER_ERROR: 'OAuth provider error occurred',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized access',

  // Payment messages
  PAYMENT_INITIATED: 'Payment initiated successfully',
  PAYMENT_INITIATION_FAILED: 'Payment initiation failed',
  PAYMENT_CONFIG_ERROR: 'Payment configuration error',
  TRANSACTION_NOT_FOUND: 'Transaction not found',
  INVALID_AMOUNT: 'Invalid payment amount',
  WEBHOOK_SECRET_NOT_CONFIGURED: 'Webhook secret not configured',
  INVALID_SIGNATURE: 'Invalid webhook signature',
  PAYMENT_VERIFICATION_FAILED: 'Transaction verification failed',
  TRANSACTION_STATUS_RETRIEVED: 'Transaction status retrieved successfully',
  WEBHOOK_PROCESSED: 'Webhook processed successfully',

  // General messages
  SERVER_ERROR: 'An internal server error occurred',
  VALIDATION_ERROR: 'Validation failed',
  NOT_FOUND: 'Resource not found',
  SUCCESS: 'Operation completed successfully',
  FAILED: 'Operation failed',
  INVALID_INPUT: 'Invalid input provided',

  // Database messages
  CREATE_SUCCESS: 'Record created successfully',
  UPDATE_SUCCESS: 'Record updated successfully',
  DELETE_SUCCESS: 'Record deleted successfully',
  QUERY_FAILED: 'Database query failed',
} as const;
