import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JazzcashService } from './jazzcash/jazzcash.service';
import { SafepayService } from './safepay/safepay.service';
import { RefundPaymentInput } from './types/payements.types';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jazzcashService: JazzcashService,
    private readonly safepayService: SafepayService,
  ) {}

  async initiateOnlinePayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
        userId,
      },

      select: {
        id: true,
        orderId: true,
        method: true,
        provider: true,
        status: true,
        amount: true,

        order: {
          select: {
            status: true,
            total: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.method !== PaymentMethod.ONLINE) {
      throw new BadRequestException('This payment is not an online payment');
    }

    if (!payment.provider) {
      throw new BadRequestException('Payment provider is required');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Payment has already been completed');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment cannot be initiated while status is ${payment.status}`,
      );
    }

    if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Payment cannot be initiated for an order with status ${payment.order.status}`,
      );
    }

    if (payment.amount !== payment.order.total) {
      throw new BadRequestException(
        'Payment amount does not match order total',
      );
    }

    switch (payment.provider) {
      case PaymentProvider.JAZZCASH:
        return this.jazzcashService.createJazzCashPaymentRequest({
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
        });

      case PaymentProvider.SAFEPAY:
        return this.safepayService.createSafepayPaymentRequest({
          orderId: payment.orderId,
          amount: payment.amount,
        });

      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }

  async findMyPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
        userId,
      },

      select: {
        id: true,
        orderId: true,
        method: true,
        status: true,
        amount: true,
        provider: true,
        transactionId: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,

        order: {
          select: {
            id: true,
            status: true,
            total: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findPaymentByOrder(userId: string, orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        userId,
      },

      select: {
        id: true,
        orderId: true,
        method: true,
        status: true,
        amount: true,
        provider: true,
        transactionId: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findAllForAdmin() {
    return this.prisma.payment.findMany({
      select: {
        id: true,
        orderId: true,
        userId: true,
        method: true,
        status: true,
        amount: true,
        provider: true,
        transactionId: true,
        paidAt: true,
        createdAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        order: {
          select: {
            id: true,
            status: true,
            total: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createRefundRequest(params: RefundPaymentInput) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: params.paymentId,
      },

      select: {
        id: true,
        orderId: true,
        method: true,
        provider: true,
        status: true,
        amount: true,
        transactionId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.method !== PaymentMethod.ONLINE) {
      throw new BadRequestException(
        'Only online payments can be refunded through a payment provider',
      );
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    if (!payment.provider) {
      throw new BadRequestException('Payment provider not found');
    }

    switch (payment.provider) {
      case PaymentProvider.SAFEPAY:
        return this.safepayService.refundPaymentRequestForSafePay({
          paymentId: payment.id,
          transactionId: payment.transactionId,
          amount: payment.amount,
        });

      case PaymentProvider.JAZZCASH:
        throw new BadRequestException('JazzCash refunds are not supported yet');

      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }
}
