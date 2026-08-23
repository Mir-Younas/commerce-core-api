export type FindReturnableOrderInput = {
  userId: string;
  orderId: string;
};

export type FindOwnedReturnRequestInput = {
  userId: string;
  returnRequestId: string;
};

export type ValidateReturnQuantityInput = {
  orderItemId: string;
  purchasedQuantity: number;
  requestedQuantity: number;
  alreadyReturnedQuantity: number;
};
