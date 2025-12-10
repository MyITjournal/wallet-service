export interface PaystackWebhookPayload {
  event: string;
  data: {
    reference: string;
    status: string;
    amount?: number;
    paid_at?: string;
    [key: string]: unknown;
  };
}

export interface PaystackTransactionData {
  reference: string;
  amount: number;
  status: string;
  paid_at?: string;
  authorization_url?: string;
  [key: string]: unknown;
}

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  reference: string;
  status: string;
  amount: number;
  paid_at?: string;
  [key: string]: unknown;
}
