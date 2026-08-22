import { Injectable, Logger } from '@nestjs/common';

import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';
import { SmsService } from '../sms/sms.service';

import type {
  OrderConfirmedNotificationInput,
  OrderDeliveredNotificationInput,
  OrderShippedNotificationInput,
  RefundCompletedNotificationInput,
  ReturnApprovedNotificationInput,
  ReturnReceivedNotificationInput,
  ReturnRejectedNotificationInput,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  private readonly logger =
    new Logger(NotificationsService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  async sendOrderConfirmedNotification(
    params: OrderConfirmedNotificationInput,
  ): Promise<void> {
    const tasks: Promise<void>[] = [
      this.emailService.sendOrderPlacedEmail({
        to: params.to,
        name: params.name,
        order: params.order,
      }),

      this.smsService.sendOrderConfirmedSms(
        params.phone,
        params.order.id,
      ),
    ];

    if (params.pushToken) {
      tasks.push(
        this.pushService.sendOrderConfirmedPush(
          params.pushToken,
          params.order.id,
        ),
      );
    }

    await this.runNotificationTasks(
      'order confirmed',
      tasks,
    );
  }

  async sendOrderShippedNotification(
    params: OrderShippedNotificationInput,
  ): Promise<void> {
    const tasks: Promise<void>[] = [
      this.emailService.sendOrderShippedEmail({
        to: params.to,
        name: params.name,
        orderId: params.orderId,
        trackingNumber: params.trackingNumber,
      }),

      this.smsService.sendOrderShippedSms(
        params.phone,
        params.orderId,
        params.trackingNumber,
      ),
    ];

    if (params.pushToken) {
      tasks.push(
        this.pushService.sendOrderShippedPush(
          params.pushToken,
          params.orderId,
          params.trackingNumber,
        ),
      );
    }

    await this.runNotificationTasks(
      'order shipped',
      tasks,
    );
  }

  async sendOrderDeliveredNotification(
    params: OrderDeliveredNotificationInput,
  ): Promise<void> {
    const tasks: Promise<void>[] = [
      this.emailService.sendOrderDeliveredEmail({
        to: params.to,
        name: params.name,
        orderId: params.orderId,
      }),

      this.smsService.sendOrderDeliveredSms(
        params.phone,
        params.orderId,
      ),
    ];

    if (params.pushToken) {
      tasks.push(
        this.pushService.sendOrderDeliveredPush(
          params.pushToken,
          params.orderId,
        ),
      );
    }

    await this.runNotificationTasks(
      'order delivered',
      tasks,
    );
  }

  async sendReturnApprovedNotification(
    params: ReturnApprovedNotificationInput,
  ): Promise<void> {
    const tasks: Promise<void>[] = [
      this.emailService.sendReturnApprovedEmail({
        to: params.to,
        name: params.name,
        returnRequestId: params.returnRequestId,
      }),

      this.smsService.sendReturnApprovedSms(
        params.phone,
        params.returnRequestId,
      ),
    ];

    if (params.pushToken) {
      tasks.push(
        this.pushService.sendReturnApprovedPush(
          params.pushToken,
          params.returnRequestId,
        ),
      );
    }

    await this.runNotificationTasks(
      'return approved',
      tasks,
    );
  }

  async sendReturnRejectedNotification(
    params: ReturnRejectedNotificationInput,
  ): Promise<void> {
    const tasks: Promise<void>[] = [
      this.emailService.sendReturnRejectedEmail({
        to: params.to,
        name: params.name,
        returnRequestId: params.returnRequestId,
        adminNote: params.adminNote,
      }),

      this.smsService.sendReturnRejectedSms(
        params.phone,
        params.returnRequestId,
        params.adminNote,
      ),
    ];

    if (params.pushToken) {
      tasks.push(
        this.pushService.sendReturnRejectedPush(
          params.pushToken,
          params.returnRequestId,
          params.adminNote,
        ),
      );
    }

    await this.runNotificationTasks(
      'return rejected',
      tasks,
    );
  }

  async sendReturnReceivedNotification(
    params: ReturnReceivedNotificationInput,
  ): Promise<void> {
    const tasks: Promise<void>[] = [
      this.emailService.sendReturnReceivedEmail({
        to: params.to,
        name: params.name,
        returnRequestId: params.returnRequestId,
      }),

      this.smsService.sendReturnReceivedSms(
        params.phone,
        params.returnRequestId,
      ),
    ];

    if (params.pushToken) {
      tasks.push(
        this.pushService.sendReturnReceivedPush(
          params.pushToken,
          params.returnRequestId,
        ),
      );
    }

    await this.runNotificationTasks(
      'return received',
      tasks,
    );
  }

  async sendRefundCompletedNotification(
    params: RefundCompletedNotificationInput,
  ): Promise<void> {
    const tasks: Promise<void>[] = [
      this.emailService.sendRefundCompletedEmail({
        to: params.to,
        name: params.name,
        orderId: params.orderId,
        amount: params.amount,
      }),

      this.smsService.sendRefundCompletedSms(
        params.phone,
        params.orderId,
        params.amount,
      ),
    ];

    if (params.pushToken) {
      tasks.push(
        this.pushService.sendRefundCompletedPush(
          params.pushToken,
          params.orderId,
          params.amount,
        ),
      );
    }

    await this.runNotificationTasks(
      'refund completed',
      tasks,
    );
  }

  private async runNotificationTasks(
    eventName: string,
    tasks: Promise<void>[],
  ): Promise<void> {
    const results =
      await Promise.allSettled(tasks);

    for (const result of results) {
      if (result.status === 'rejected') {
        const message =
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown notification error';

        this.logger.error(
          `Unable to send ${eventName} notification: ${message}`,
        );
      }
    }
  }
}