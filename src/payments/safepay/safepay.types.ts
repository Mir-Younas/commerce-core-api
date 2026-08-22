import { z } from 'zod';

import type { CreatePaymentRequestInput } from '../types/payements.types';

export type CreateSafepayPaymentRequestInput =
  Omit<CreatePaymentRequestInput, 'paymentId'>;

export type SafepayEnvironment =
  | 'sandbox'
  | 'production';

export type SafepayPaymentResult = {
  checkoutUrl: string;
};

export const safepayWebhookSchema = z.object({
  token: z.string(),
  version: z.string(),
  merchant_api_key: z.string(),
  type: z.string(),

  endpoint: z.string().optional(),

  data: z.object({
    tracker: z.string(),

    intent: z.string().optional(),
    state: z.string().optional(),

    amount: z.number().optional(),
    currency: z.string().optional(),

    net: z.number().optional(),
    fee: z.number().optional(),

    balance: z.number().optional(),
    refund_amount: z.number().optional(),

    customer_email: z.string().optional(),

    category: z.string().optional(),
    code: z.number().optional(),
    message: z.string().optional(),

    metadata: z
      .object({
        order_id: z.string().optional(),
        source: z.string().optional(),
      })
      .optional(),
  }),

  created_at: z
    .object({
      seconds: z.number().optional(),
      nanos: z.number().optional(),
    })
    .optional(),
});

export type SafepayWebhookEvent =
  z.infer<typeof safepayWebhookSchema>;