import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';

export const ApiAuthTags = () => applyDecorators(ApiTags('Authentication'));

export const ApiGoogleAuth = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Google Sign-In',
      description:
        'Triggers Google sign-in flow. Redirects to Google OAuth consent page.',
    }),
    ApiResponse({
      status: 302,
      description: 'Redirects to Google OAuth consent page',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
    }),
  );

export const ApiGoogleAuthCallback = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Google OAuth Callback',
      description:
        'Handles Google OAuth callback. ' +
        'Logs in the user. ' +
        'Creates the user if not existing. ' +
        'Returns a JWT token.',
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully authenticated and returns JWT token',
      schema: {
        type: 'object',
        example: {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          name: 'John Doe',
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        properties: {
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'User ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email',
          },
          name: {
            type: 'string',
            description: 'User full name',
          },
          access_token: {
            type: 'string',
            description: 'JWT access token for API authentication',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Missing authorization code',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'Authorization code is required',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error - OAuth provider error',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: {
            type: 'string',
            example: 'OAuth provider error. Please try again.',
          },
          error: { type: 'string', example: 'Internal Server Error' },
        },
      },
    }),
  );

export const ApiGoogleTokenExchange = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Exchange Google Token for JWT (Testing)',
      description:
        ' For Swagger/API testing only. Exchange a Google access token for a JWT. ' +
        'To get a Google token:\n' +
        '1. Visit: https://developers.google.com/oauthplayground\n' +
        '2. Select "Google OAuth2 API v2" → email, profile\n' +
        '3. Authorize and get access token\n' +
        '4. Paste the token below',
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully authenticated and returns JWT token',
      schema: {
        type: 'object',
        example: {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          name: 'John Doe',
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        properties: {
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'User ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email',
          },
          name: {
            type: 'string',
            description: 'User full name',
          },
          access_token: {
            type: 'string',
            description: 'JWT access token for API authentication',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid or missing Google token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'Google access token is required',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
  );

export const ApiHideEndpoint = () => applyDecorators(ApiExcludeEndpoint());
