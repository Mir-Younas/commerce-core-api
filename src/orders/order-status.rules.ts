import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

const ORDER_STATUS_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],

  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],

  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],

  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],

  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],

  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function validateOrderStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
): void {
  if (currentStatus === newStatus) {
    throw new BadRequestException(`Order status is already ${newStatus}`);
  }

  const allowedNextStatuses = ORDER_STATUS_TRANSITIONS[currentStatus];

  if (!allowedNextStatuses.includes(newStatus)) {
    throw new BadRequestException(
      `Cannot change order status from ${currentStatus} to ${newStatus}`,
    );
  }
}
