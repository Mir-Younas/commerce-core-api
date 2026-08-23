import { BadGatewayException, Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import twilio from 'twilio';

import type { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private readonly client?: Twilio;

  private readonly fromPhone?: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');

    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    this.fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    this.client = twilio(accountSid, authToken);
  }

  private async sendSms(to: string, body: string): Promise<void> {
    try {
      await this.client?.messages.create({
        from: this.fromPhone,
        to,
        body,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown SMS error';

      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Unable to send SMS: ${message}`, stack);

      throw new BadGatewayException('Unable to send SMS at this time');
    }
  }

  async sendOrderConfirmedSms(phone: string, orderId: string): Promise<void> {
    await this.sendSms(phone, `Your order ${orderId} has been confirmed.`);
  }

  async sendOrderShippedSms(
    phone: string,
    orderId: string,
    trackingNumber?: string | null,
  ): Promise<void> {
    const trackingMessage = trackingNumber
      ? ` Tracking number: ${trackingNumber}.`
      : '';

    await this.sendSms(
      phone,
      `Your order ${orderId} has been shipped.${trackingMessage}`,
    );
  }

  async sendOrderDeliveredSms(phone: string, orderId: string): Promise<void> {
    await this.sendSms(
      phone,
      `Your order ${orderId} has been delivered successfully.`,
    );
  }

  async sendReturnApprovedSms(
    phone: string,
    returnRequestId: string,
  ): Promise<void> {
    await this.sendSms(
      phone,
      `Your return request ${returnRequestId} has been approved.`,
    );
  }

  async sendReturnRejectedSms(
    phone: string,
    returnRequestId: string,
    adminNote?: string | null,
  ): Promise<void> {
    const reason = adminNote ? ` Reason: ${adminNote}` : '';

    await this.sendSms(
      phone,
      `Your return request ${returnRequestId} was rejected.${reason}`,
    );
  }

  async sendReturnReceivedSms(
    phone: string,
    returnRequestId: string,
  ): Promise<void> {
    await this.sendSms(
      phone,
      `We have received your return request ${returnRequestId}.`,
    );
  }

  async sendRefundCompletedSms(
    phone: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    await this.sendSms(
      phone,
      `Your refund of PKR ${amount.toLocaleString(
        'en-PK',
      )} for order ${orderId} has been completed.`,
    );
  }
}
