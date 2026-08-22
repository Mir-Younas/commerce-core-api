export type OrderEmailItem = {
  productName: string;
  productSku: string;
  price: number;
  quantity: number;
  total: number;
};

export type OrderPlacedEmailParams = {
  to: string;
  name: string;

  order: {
    id: string;
    status: string;
    subtotal: number;
    deliveryFee: number;
    total: number;
    items: OrderEmailItem[];
  };
};

export type OrderShippedEmailParams = {
  to: string;
  name: string;
  orderId: string;
  trackingNumber?: string | null;
};

export type OrderDeliveredEmailParams = {
  to: string;
  name: string;
  orderId: string;
};

export type ReturnApprovedEmailParams = {
  to: string;
  name: string;
  returnRequestId: string;
};

export type ReturnRejectedEmailParams = {
  to: string;
  name: string;
  returnRequestId: string;
  adminNote?: string | null;
};

export type ReturnReceivedEmailParams = {
  to: string;
  name: string;
  returnRequestId: string;
};

export type RefundCompletedEmailParams = {
  to: string;
  name: string;
  orderId: string;
  amount: number;
};