import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';

export const ApiWalletTags = () => applyDecorators(ApiTags('Wallet'));

export const ApiWalletBearerAuth = () =>
  applyDecorators(ApiBearerAuth(), ApiSecurity('x-api-key'));

export const ApiWalletDeposit = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Wallet Deposit (Paystack)',
      description:
        'Initiate a wallet deposit via Paystack. Requires JWT or API Key with deposit permission.',
    }),
    ApiResponse({
      status: 201,
      description: 'Deposit initiated successfully',
      schema: {
        type: 'object',
        example: {
          reference: 'fw_1702300000000_abc123xyz',
          authorization_url: 'https://paystack.co/checkout/...',
        },
        properties: {
          reference: {
            type: 'string',
            description: 'Unique transaction reference',
          },
          authorization_url: {
            type: 'string',
            description: 'Paystack checkout URL',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid amount',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT/API Key',
    }),
  );

export const ApiPaystackWebhook = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Paystack Webhook events',
      description:
        'Use this endpoint to receive transaction updates from Paystack.',
    }),
    ApiHeader({
      name: 'x-paystack-signature',
      description: 'Paystack webhook signature for validation',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Webhook processed successfully',
      schema: {
        type: 'object',
        example: {
          status: true,
        },
        properties: {
          status: {
            type: 'boolean',
            description: 'Processing status',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid signature or payload',
    }),
  );

export const ApiVerifyDepositStatus = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Verify Deposit Status',
      description: ' For manual status verification only.',
    }),
    ApiParam({
      name: 'reference',
      description: 'Transaction reference',
      example: 'fw_1702300000000_abc123xyz',
    }),
    ApiResponse({
      status: 200,
      description: 'Deposit status retrieved',
      schema: {
        type: 'object',
        example: {
          reference: 'fw_1702300000000_abc123xyz',
          status: 'success',
          amount: 5000,
        },
        properties: {
          reference: {
            type: 'string',
            description: 'Transaction reference',
          },
          status: {
            type: 'string',
            enum: ['success', 'failed', 'pending'],
            description: 'Transaction status',
          },
          amount: {
            type: 'number',
            description: 'Transaction amount',
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT/API Key',
    }),
    ApiResponse({
      status: 404,
      description: 'Transaction not found',
    }),
  );

export const ApiGetWalletBalance = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get Wallet Balance',
      description:
        'Retrieve wallet balance. Requires JWT or API Key with read permission.',
    }),
    ApiResponse({
      status: 200,
      description: 'Balance retrieved successfully',
      schema: {
        type: 'object',
        example: {
          balance: 15000,
        },
        properties: {
          balance: {
            type: 'number',
            description: 'Current wallet balance',
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT/API Key',
    }),
  );

export const ApiWalletTransfer = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Wallet Transfer',
      description:
        'Transfer funds to another wallet. Requires JWT or API Key with transfer permission.',
    }),
    ApiResponse({
      status: 201,
      description: 'Transfer completed successfully',
      schema: {
        type: 'object',
        example: {
          status: 'success',
          message: 'Transfer completed',
        },
        properties: {
          status: {
            type: 'string',
            description: 'Transfer status',
          },
          message: {
            type: 'string',
            description: 'Status message',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Bad Request - Insufficient balance or invalid wallet number',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT/API Key',
    }),
  );

export const ApiTransactionHistory = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Retrieve Transaction History',
      description: 'Requires JWT or API Key with read permission.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Number of transactions to return (default: 50)',
      example: 50,
    }),
    ApiResponse({
      status: 200,
      description: 'Transaction history retrieved',
      schema: {
        type: 'array',
        example: [
          {
            type: 'credit',
            amount: 2800,
            status: 'success',
          },
          {
            type: 'debit',
            amount: 1300,
            status: 'success',
          },
        ],
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Transaction type',
            },
            amount: {
              type: 'number',
              description: 'Transaction amount',
            },
            status: {
              type: 'string',
              description: 'Transaction status',
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT/API Key',
    }),
  );
