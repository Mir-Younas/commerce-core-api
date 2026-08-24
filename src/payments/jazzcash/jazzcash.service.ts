import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createJazzCashSecureHash,
  verifyJazzCashSecureHash,
} from './jazzcash-hash.helper';
import {
  JazzCashCallback,
  JazzCashPaymentFields,
  JazzCashPaymentResult,
} from './jazzcash.types';
import { CreatePaymentRequestInput } from '../types/payements.types';
import { updateProductStock } from 'src/products/helpers/product-stock.helper';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';

@Injectable()
export class JazzcashService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getJazzCashConfig() {
    const merchantId = this.configService.get<string>('JAZZCASH_MERCHANT_ID');

    const password = this.configService.get<string>('JAZZCASH_PASSWORD');

    const integritySalt = this.configService.get<string>(
      'JAZZCASH_INTEGRITY_SALT',
    );

    const returnUrl = this.configService.get<string>('JAZZCASH_RETURN_URL');

    const paymentUrl = this.configService.get<string>('JAZZCASH_PAYMENT_URL');

    if (
      !merchantId ||
      !password ||
      !integritySalt ||
      !returnUrl ||
      !paymentUrl
    ) {
      throw new ServiceUnavailableException(
        'JazzCash payment is not configured',
      );
    }

    return {
      merchantId,
      password,
      integritySalt,
      returnUrl,
      paymentUrl,
    };
  }
  createJazzCashPaymentRequest(
    params: CreatePaymentRequestInput,
  ): JazzCashPaymentResult {
    const { merchantId, password, integritySalt, returnUrl, paymentUrl } =
      this.getJazzCashConfig();

    const now = new Date();

    const expiryDate = new Date(now.getTime() + 30 * 60 * 1000);

    const txnDateTime = this.formatJazzCashDate(now);

    const txnExpiryDateTime = this.formatJazzCashDate(expiryDate);

    const txnRefNo = `T${txnDateTime}`;

    /*
     * Your DB currently stores prices as integer PKR.
     *
     * JazzCash expects the amount without a decimal
     * separator and assumes the currency decimal position.
     *
     * Example:
     * Rs 1,500 -> "150000"
     */
    const amount = String(params.amount * 100);

    const requestWithoutHash = {
      pp_Version: '2.0',
      pp_TxnType: 'MPAY',
      pp_Language: 'EN',

      pp_MerchantID: merchantId,
      pp_Password: password,

      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: txnDateTime,

      pp_BillReference: params.orderId,
      pp_Description: `Payment for order ${params.orderId}`,

      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ReturnURL: returnUrl,

      /*
       * Custom field used to carry our own
       * Payment.id through the gateway.
       */
      ppmpf_1: params.paymentId,
    };

    const pp_SecureHash = createJazzCashSecureHash(
      requestWithoutHash,
      integritySalt,
    );

    const fields: JazzCashPaymentFields = {
      ...requestWithoutHash,
      pp_SecureHash,
    };

    return {
      paymentUrl,
      fields,
    };
  }

  private formatJazzCashDate(date: Date): string {
    const year = date.getFullYear().toString();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const hours = String(date.getHours()).padStart(2, '0');

    const minutes = String(date.getMinutes()).padStart(2, '0');

    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  async handleJazzCashCallback(body: JazzCashCallback) {
    const result = this.verifyCallback(body);

    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

    if (!result.successful) {
      const failedPayment = await this.markOnlinePaymentFailed(
        result.paymentId,
      );

      return {
        redirectUrl: `${clientUrl}/orders/${failedPayment.orderId}/payment-failed`,
      };
    }

    const transactionId = result.providerTransactionId ?? result.txnRefNo;

    if (!transactionId) {
      throw new BadRequestException('JazzCash transaction ID is missing');
    }

    const paymentResult = await this.markOnlinePaymentSucceeded(
      result.paymentId,
      'JAZZCASH',
      transactionId,
    );

    return {
      redirectUrl: `${clientUrl}/orders/${paymentResult.orderId}/success`,
    };
  }

  verifyCallback(body: JazzCashCallback) {
    const integritySalt = this.configService.getOrThrow<string>(
      'JAZZCASH_INTEGRITY_SALT',
    );

    const validHash = verifyJazzCashSecureHash(body, integritySalt);

    if (!validHash) {
      throw new UnauthorizedException('Invalid JazzCash secure hash');
    }

    const responseCode = body.pp_ResponseCode;
    const paymentId = body.ppmpf_1;
    const txnRefNo = body.pp_TxnRefNo;

    const providerTransactionId = body.pp_RetreivalReferenceNo ?? txnRefNo;

    if (!paymentId) {
      throw new BadRequestException(
        'JazzCash callback does not contain payment reference',
      );
    }

    return {
      successful: responseCode === '000',
      responseCode,
      paymentId,
      txnRefNo,
      providerTransactionId,
      responseMessage: body.pp_ResponseMessage,
    };
  }

  async markOnlinePaymentSucceeded(
    paymentId: string,
    provider: PaymentProvider,
    transactionId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
          where: {
            id: paymentId,
          },
          select: {
            id: true,
            orderId: true,
            method: true,
            provider: true,
            status: true,

            order: {
              select: {
                status: true,
              },
            },
          },
        });

        if (!payment) {
          throw new NotFoundException('Payment not found');
        }

        if (payment.method !== PaymentMethod.ONLINE) {
          throw new BadRequestException('Payment is not an online payment');
        }

        if (payment.provider !== provider) {
          throw new BadRequestException('Payment provider does not match');
        }

        if (payment.status === PaymentStatus.PAID) {
          return {
            payment: {
              id: payment.id,
              orderId: payment.orderId,
              method: payment.method,
              provider: payment.provider,
              status: payment.status,
            },
            orderId: payment.orderId,
          };
        }

        if (payment.status !== PaymentStatus.PENDING) {
          throw new BadRequestException(
            `Payment cannot be completed while status is ${payment.status}`,
          );
        }

        if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
          throw new BadRequestException(
            `Order cannot be confirmed while status is ${payment.order.status}`,
          );
        }

        const updatedPayment = await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.PAID,
            transactionId,
            paidAt: new Date(),
          },
          select: {
            id: true,
            orderId: true,
            method: true,
            provider: true,
            status: true,
          },
        });

        await tx.order.update({
          where: {
            id: payment.orderId,
          },
          data: {
            status: OrderStatus.CONFIRMED,
          },
        });

        return {
          payment: updatedPayment,
          orderId: payment.orderId,
        };
      },
      {
        maxWait: 10000,
        timeout: 10000,
      },
    );
  }

  async markOnlinePaymentFailed(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: {
          id: paymentId,
        },

        select: {
          id: true,
          orderId: true,
          method: true,
          status: true,

          order: {
            select: {
              status: true,

              items: {
                select: {
                  productId: true,
                  productName: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.method !== PaymentMethod.ONLINE) {
        throw new BadRequestException('Payment is not an online payment');
      }

      if (payment.status === PaymentStatus.FAILED) {
        return {
          paymentId: payment.id,
          orderId: payment.orderId,
        };
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `Payment cannot be failed while status is ${payment.status}`,
        );
      }

      if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          `Order cannot be cancelled while status is ${payment.order.status}`,
        );
      }

      await tx.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: PaymentStatus.FAILED,
        },
      });

      await tx.order.update({
        where: {
          id: payment.orderId,
        },

        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      await updateProductStock(tx, payment.order.items, 'increment');

      return {
        paymentId: payment.id,
        orderId: payment.orderId,
      };
    });
  }
}
