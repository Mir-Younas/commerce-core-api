import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import Safepay from '@sfpy/node-core';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

import {
  CreateSafepayPaymentRequestInput,
  SafepayEnvironment,
  safepayPassportSchema,
  SafepayPaymentResult,
  safepayPaymentSessionSchema,
  SafepayWebhookEvent,
  safepayWebhookSchema,
} from './safepay.types';
import { RefundPaymentRequestInput } from '../types/payements.types';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';

@Injectable()
export class SafepayService {
  private readonly logger = new Logger(SafepayService.name);
  private readonly safepay: Safepay;
  private readonly environment: SafepayEnvironment;
  private readonly host: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    const secretKey =
      this.configService.getOrThrow<string>('SAFEPAY_SECRET_KEY');

    this.environment = this.configService.getOrThrow<SafepayEnvironment>(
      'SAFEPAY_ENVIRONMENT',
    );

    this.host =
      this.environment === 'production'
        ? 'https://api.getsafepay.com'
        : 'https://sandbox.api.getsafepay.com';

    this.safepay = new Safepay(secretKey, {
      authType: 'secret',
      host: this.host,
    });
  }

  async createSafepayPaymentRequest(
    params: CreateSafepayPaymentRequestInput,
  ): Promise<SafepayPaymentResult> {
    const apiKey = this.configService.getOrThrow<string>('SAFEPAY_API_KEY');

    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

    const returnUrl = `${clientUrl}/orders/${params.orderId}/success`;

    const cancelUrl = `${clientUrl}/orders/${params.orderId}/payment-failed`;

    const amount = params.amount * 100;

    try {
      const paymentSessionRaw: unknown =
        await this.safepay.payments.session.setup({
          merchant_api_key: apiKey,
          intent: 'CYBERSOURCE',
          mode: 'payment',
          entry_mode: 'raw',
          currency: 'PKR',
          amount,
          metadata: {
            order_id: params.orderId,
          },
          include_fees: false,
        });

      const paymentSessionResult =
        safepayPaymentSessionSchema.safeParse(paymentSessionRaw);

      if (!paymentSessionResult.success) {
        this.logger.error(
          `Invalid Safepay payment session response: ${paymentSessionResult.error.message}`,
        );

        throw new BadGatewayException('Invalid response received from Safepay');
      }

      const paymentSession = paymentSessionResult.data;

      const tracker = paymentSession.data.tracker.token;

      const authenticationRaw: unknown =
        await this.safepay.client.passport.create();

      const authenticationResult =
        safepayPassportSchema.safeParse(authenticationRaw);

      if (!authenticationResult.success) {
        this.logger.error(
          `Invalid Safepay authentication response: ${authenticationResult.error.message}`,
        );

        throw new BadGatewayException(
          'Invalid authentication response received from Safepay',
        );
      }

      const authentication = authenticationResult.data;

      const authenticationToken = authentication.data;

      const checkoutUrl = this.safepay.checkout.createCheckoutUrl({
        env: this.environment,
        tracker,
        tbt: authenticationToken,
        source: 'hosted',
        redirect_url: returnUrl,
        cancel_url: cancelUrl,
      });

      if (!checkoutUrl) {
        throw new BadGatewayException('Safepay checkout URL was not generated');
      }

      return {
        checkoutUrl,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown Safepay error';

      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Unable to create Safepay payment request: ${message}`,
        stack,
      );

      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('Unable to process payment at this time');
    }
  }

  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<void> {
    if (!rawBody) {
      throw new BadRequestException('Safepay webhook raw body is missing');
    }

    if (!signature) {
      throw new UnauthorizedException('Safepay webhook signature is missing');
    }

    const event = this.verifyWebhook(rawBody, signature);

    switch (event.type) {
      case 'payment.succeeded':
        await this.handlePaymentSucceeded(event);
        return;

      case 'payment.failed':
        return;

      case 'payment.refunded':
        await this.handlePaymentRefunded(event);
        return;

      default:
        return;
    }
  }

  private verifyWebhook(
    rawBody: Buffer,
    signature: string,
  ): SafepayWebhookEvent {
    if (!/^[a-fA-F0-9]{128}$/.test(signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const webhookSecret = this.configService.getOrThrow<string>(
      'SAFEPAY_WEBHOOK_SECRET',
    );

    const expectedSignature = createHmac('sha512', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    const receivedBuffer = Buffer.from(signature, 'hex');

    if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
      this.logger.warn('Safepay webhook signature verification failed');

      throw new UnauthorizedException('Invalid webhook signature');
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const result = safepayWebhookSchema.safeParse(payload);

    if (!result.success) {
      this.logger.warn(
        `Invalid Safepay webhook payload: ${result.error.message}`,
      );

      throw new BadRequestException('Invalid webhook payload');
    }

    return result.data;
  }

  private async handlePaymentSucceeded(
    event: SafepayWebhookEvent,
  ): Promise<void> {
    try {
      const orderId = event.data.metadata?.order_id;

      if (!orderId) {
        throw new BadRequestException(
          'Safepay webhook does not contain order reference',
        );
      }

      const order = await this.prisma.order.findUnique({
        where: {
          id: orderId,
        },

        select: {
          id: true,
          status: true,

          payment: {
            select: {
              id: true,
              orderId: true,
              method: true,
              provider: true,
              status: true,
              amount: true,
              transactionId: true,
            },
          },
        },
      });

      if (!order) {
        throw new BadRequestException(`Order not found. OrderId: ${orderId}`);
      }

      const payment = order.payment;

      if (!payment) {
        throw new BadRequestException(
          `Payment not found for order. OrderId: ${order.id}`,
        );
      }

      if (payment.method !== PaymentMethod.ONLINE) {
        throw new BadRequestException(
          `Payment is not online. PaymentId: ${payment.id}`,
        );
      }

      if (payment.provider !== PaymentProvider.SAFEPAY) {
        throw new BadRequestException(
          `Payment provider does not match Safepay. PaymentId: ${payment.id}`,
        );
      }

      if (payment.orderId !== orderId) {
        throw new BadRequestException(
          `Safepay order reference does not match payment. PaymentId: ${payment.id}`,
        );
      }

      if (event.data.currency !== 'PKR') {
        throw new BadRequestException(
          `Invalid Safepay currency. Expected: PKR, Received: ${event.data.currency}`,
        );
      }

      const expectedAmount = payment.amount * 100;

      if (event.data.amount !== expectedAmount) {
        throw new BadRequestException(
          `Safepay amount mismatch. PaymentId: ${payment.id}, Expected: ${expectedAmount}, Received: ${event.data.amount}`,
        );
      }

      if (event.data.state !== 'TRACKER_ENDED') {
        throw new BadRequestException(
          `Safepay tracker not completed. Tracker: ${event.data.tracker}, State: ${event.data.state}`,
        );
      }

      if (payment.status === PaymentStatus.PAID) {
        return;
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `Payment cannot be completed while status is ${payment.status}. PaymentId: ${payment.id}`,
        );
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          `Order cannot be confirmed while status is ${order.status}. OrderId: ${order.id}`,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        const paymentResult = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: PaymentStatus.PENDING,
          },

          data: {
            status: PaymentStatus.PAID,
            transactionId: event.data.tracker,
            paidAt: new Date(),
          },
        });

        if (paymentResult.count === 0) {
          return;
        }

        const orderResult = await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.PENDING_PAYMENT,
          },

          data: {
            status: OrderStatus.CONFIRMED,
          },
        });

        if (orderResult.count === 0) {
          throw new Error(`Unable to confirm order. OrderId: ${order.id}`);
        }
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown Safepay payment confirmation error';

      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Unable to process Safepay payment confirmation: ${message}`,
        stack,
      );

      if (error instanceof BadRequestException) {
        throw new BadRequestException('Invalid payment confirmation');
      }

      throw new InternalServerErrorException(
        'Unable to process payment confirmation',
      );
    }
  }

  private async handlePaymentRefunded(
    event: SafepayWebhookEvent,
  ): Promise<void> {
    try {
      const orderId = event.data.metadata?.order_id;

      if (!orderId) {
        throw new BadRequestException(
          'Safepay refund webhook does not contain order reference',
        );
      }

      const order = await this.prisma.order.findUnique({
        where: {
          id: orderId,
        },

        select: {
          id: true,

          payment: {
            select: {
              id: true,
              orderId: true,
              method: true,
              provider: true,
              status: true,
              amount: true,
              transactionId: true,
            },
          },
        },
      });

      if (!order) {
        throw new BadRequestException(`Order not found. OrderId: ${orderId}`);
      }

      const payment = order.payment;

      if (!payment) {
        throw new BadRequestException(
          `Payment not found for order. OrderId: ${order.id}`,
        );
      }

      if (payment.status === PaymentStatus.REFUNDED) {
        return;
      }

      if (payment.method !== PaymentMethod.ONLINE) {
        throw new BadRequestException(
          `Payment is not online. PaymentId: ${payment.id}`,
        );
      }

      if (payment.provider !== PaymentProvider.SAFEPAY) {
        throw new BadRequestException(
          `Payment provider does not match Safepay. PaymentId: ${payment.id}`,
        );
      }

      if (payment.orderId !== orderId) {
        throw new BadRequestException(
          `Safepay order reference does not match payment. PaymentId: ${payment.id}`,
        );
      }

      if (payment.transactionId !== event.data.tracker) {
        throw new BadRequestException(
          `Safepay tracker does not match payment transaction. PaymentId: ${payment.id}`,
        );
      }

      if (event.data.currency !== 'PKR') {
        throw new BadRequestException(
          `Invalid Safepay refund currency. Expected: PKR, Received: ${event.data.currency}`,
        );
      }

      if (event.data.balance === undefined) {
        throw new BadRequestException(
          'Safepay refund webhook does not contain balance',
        );
      }

      const balance = Number(event.data.balance);

      if (balance !== 0) {
        return;
      }

      if (payment.status !== PaymentStatus.PAID) {
        throw new BadRequestException(
          `Payment cannot be refunded while status is ${payment.status}. PaymentId: ${payment.id}`,
        );
      }

      await this.prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: PaymentStatus.PAID,
        },

        data: {
          status: PaymentStatus.REFUNDED,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown Safepay refund error';

      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Unable to process Safepay refund: ${message}`, stack);

      if (error instanceof BadRequestException) {
        throw new BadRequestException('Invalid payment refund confirmation');
      }

      throw new InternalServerErrorException(
        'Unable to process payment refund',
      );
    }
  }

  async refundPaymentRequestForSafePay(
    params: RefundPaymentRequestInput,
  ): Promise<unknown> {
    if (!params.transactionId) {
      throw new BadRequestException(
        'Safepay transaction ID is required for refund',
      );
    }

    if (params.amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    const apiKey = this.configService.getOrThrow<string>('SAFEPAY_API_KEY');

    const amount = params.amount * 100;

    const url = `${this.host}/order/payments/v3/${params.transactionId}/refund`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<unknown>(
          url,
          {
            currency: 'PKR',
            amount,
          },
          {
            headers: {
              'x-sfpy-api-key': apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Safepay refund failed. Status: ${error.response?.status}`,
        );

        this.logger.error(
          `Safepay refund response: ${JSON.stringify(error.response?.data)}`,
        );
      }

      const message =
        error instanceof Error ? error.message : 'Unknown Safepay refund error';

      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Unable to create Safepay refund request: ${message}`,
        stack,
      );

      throw new BadGatewayException(
        'Unable to process Safepay refund at this time',
      );
    }
  }
}
