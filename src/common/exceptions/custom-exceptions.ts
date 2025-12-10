import { HttpException, HttpStatus } from '@nestjs/common';

export interface PaystackErrorResponse {
  message?: string;
  [key: string]: unknown;
}

export class PaymentException extends HttpException {
  constructor(message: string, statusCode = HttpStatus.PAYMENT_REQUIRED) {
    super(
      {
        statusCode,
        message,
        error: 'Payment Error',
      },
      statusCode,
    );
  }
}

export class PaystackException extends PaymentException {
  constructor(message: string, paystackError?: PaystackErrorResponse) {
    const errorMessage = paystackError?.message || message;
    super(`Paystack Error: ${errorMessage}`, HttpStatus.BAD_GATEWAY);
  }
}

export class DuplicateTransactionException extends PaymentException {
  constructor(reference: string) {
    super(
      `Duplicate transaction detected. Use existing reference: ${reference}`,
      HttpStatus.CONFLICT,
    );
  }
}

export class WebhookVerificationException extends HttpException {
  constructor(message = 'Invalid webhook signature') {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: 'Webhook Verification Failed',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class GoogleAuthException extends HttpException {
  constructor(message: string, originalError?: Error) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: `Google Authentication Failed: ${message}`,
        error: 'Google Auth Error',
        details: originalError?.message,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class UserNotFoundException extends HttpException {
  constructor(identifier: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `User not found: ${identifier}`,
        error: 'User Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class TransactionNotFoundException extends HttpException {
  constructor(reference: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Transaction not found: ${reference}`,
        error: 'Transaction Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ConfigurationException extends HttpException {
  constructor(configKey: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Missing or invalid configuration: ${configKey}`,
        error: 'Configuration Error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
