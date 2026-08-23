export type CreatePaymentRequestInput = {
  paymentId: string;
  orderId: string;
  amount: number;
};

export type RefundPaymentInput = {
  paymentId: string;
};

export type RefundPaymentRequestInput = {
  paymentId: string;
  transactionId: string | null;
  amount: number;
};
