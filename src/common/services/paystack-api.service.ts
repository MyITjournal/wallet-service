import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import {
  PaystackException,
  ConfigurationException,
  type PaystackErrorResponse,
} from '../exceptions/custom-exceptions';
import {
  PaystackWebhookPayload,
  PaystackInitializeResponse,
  PaystackVerifyResponse,
} from '../interfaces/paystack.interface';

@Injectable()
export class PaystackApiService {
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize a Paystack transaction
   */
  async initializeTransaction(
    reference: string,
    amount: number,
    email: string,
  ): Promise<PaystackInitializeResponse> {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new ConfigurationException('PAYSTACK_SECRET_KEY');
    }

    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/payments/callback?reference=${reference}`;

    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          amount,
          email,
          reference,
          callback_url: callbackUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const responseData = response.data as {
        data?: PaystackInitializeResponse;
      };
      const data = responseData.data;
      if (!data?.authorization_url) {
        throw new PaystackException('Invalid response from Paystack');
      }

      return data;
    } catch (error) {
      if (error instanceof PaystackException) throw error;
      const axiosError = error as AxiosError<PaystackErrorResponse>;
      throw new PaystackException(
        'Failed to initialize transaction',
        axiosError.response?.data,
      );
    }
  }

  /**
   * Verify a transaction with Paystack
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new ConfigurationException('PAYSTACK_SECRET_KEY');
    }

    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
          timeout: 10000,
        },
      );

      const responseData = response.data as { data: PaystackVerifyResponse };
      return responseData.data;
    } catch (error) {
      const axiosError = error as AxiosError<PaystackErrorResponse>;
      throw new PaystackException(
        `Failed to verify transaction: ${reference}`,
        axiosError.response?.data,
      );
    }
  }

  /**
   * Verify Paystack webhook signature
   */
  verifyWebhookSignature(
    signature: string,
    payload: PaystackWebhookPayload,
  ): boolean {
    const webhookSecret = this.configService.get<string>(
      'PAYSTACK_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new ConfigurationException('PAYSTACK_WEBHOOK_SECRET');
    }

    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  /**
   * Create a transfer recipient
   */
  async createTransferRecipient(
    accountNumber: string,
    bankCode: string,
    name: string = 'Wallet Withdrawal',
  ): Promise<string> {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new ConfigurationException('PAYSTACK_SECRET_KEY');
    }

    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const responseData = response.data as {
        data?: { recipient_code?: string };
      };
      const recipientCode = responseData.data?.recipient_code;
      if (!recipientCode) {
        throw new PaystackException('Failed to create transfer recipient');
      }

      return recipientCode;
    } catch (error) {
      if (error instanceof PaystackException) throw error;
      const axiosError = error as AxiosError<PaystackErrorResponse>;
      throw new PaystackException(
        'Failed to create transfer recipient',
        axiosError.response?.data,
      );
    }
  }

  /**
   * Initiate a transfer
   */
  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reference: string,
  ): Promise<void> {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new ConfigurationException('PAYSTACK_SECRET_KEY');
    }

    try {
      await axios.post(
        `${this.paystackBaseUrl}/transfer`,
        {
          source: 'balance',
          amount,
          recipient: recipientCode,
          reference,
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
    } catch (error) {
      const axiosError = error as AxiosError<PaystackErrorResponse>;
      throw new PaystackException(
        'Failed to initiate transfer',
        axiosError.response?.data,
      );
    }
  }

  /**
   * Generate a unique payment reference
   */
  generateReference(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
