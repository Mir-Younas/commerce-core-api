import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import type { App } from 'firebase-admin/app';

import {
  getMessaging,
} from 'firebase-admin/messaging';

@Injectable()
export class PushService {
  private readonly logger =
    new Logger(PushService.name);

  private readonly firebaseApp: App;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const projectId =
      this.configService.getOrThrow<string>(
        'FIREBASE_PROJECT_ID',
      );

    const clientEmail =
      this.configService.getOrThrow<string>(
        'FIREBASE_CLIENT_EMAIL',
      );

    const privateKey =
      this.configService
        .getOrThrow<string>(
          'FIREBASE_PRIVATE_KEY',
        )
        .replace(/\\n/g, '\n');

    this.firebaseApp =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
  }

  private async sendPush(
    token: string,
    title: string,
    body: string,
  ): Promise<void> {
    try {
      await getMessaging(
        this.firebaseApp,
      ).send({
        token,

        notification: {
          title,
          body,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown push notification error';

      const stack =
        error instanceof Error
          ? error.stack
          : undefined;

      this.logger.error(
        `Unable to send push notification: ${message}`,
        stack,
      );

      throw new BadGatewayException(
        'Unable to send push notification at this time',
      );
    }
  }

  async sendOrderConfirmedPush(
    token: string,
    orderId: string,
  ): Promise<void> {
    await this.sendPush(
      token,
      'Order Confirmed',
      `Your order ${orderId} has been confirmed.`,
    );
  }

  async sendOrderShippedPush(
    token: string,
    orderId: string,
    trackingNumber?: string | null,
  ): Promise<void> {
    const trackingMessage =
      trackingNumber
        ? ` Tracking number: ${trackingNumber}.`
        : '';

    await this.sendPush(
      token,
      'Order Shipped',
      `Your order ${orderId} has been shipped.${trackingMessage}`,
    );
  }

  async sendOrderDeliveredPush(
    token: string,
    orderId: string,
  ): Promise<void> {
    await this.sendPush(
      token,
      'Order Delivered',
      `Your order ${orderId} has been delivered successfully.`,
    );
  }

  async sendReturnApprovedPush(
    token: string,
    returnRequestId: string,
  ): Promise<void> {
    await this.sendPush(
      token,
      'Return Approved',
      `Your return request ${returnRequestId} has been approved.`,
    );
  }

  async sendReturnRejectedPush(
    token: string,
    returnRequestId: string,
    adminNote?: string | null,
  ): Promise<void> {
    const reason =
      adminNote
        ? ` Reason: ${adminNote}`
        : '';

    await this.sendPush(
      token,
      'Return Rejected',
      `Your return request ${returnRequestId} was rejected.${reason}`,
    );
  }

  async sendReturnReceivedPush(
    token: string,
    returnRequestId: string,
  ): Promise<void> {
    await this.sendPush(
      token,
      'Return Received',
      `We have received your return request ${returnRequestId}.`,
    );
  }

  async sendRefundCompletedPush(
    token: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    await this.sendPush(
      token,
      'Refund Completed',
      `PKR ${amount.toLocaleString(
        'en-PK',
      )} has been refunded for order ${orderId}.`,
    );
  }
}