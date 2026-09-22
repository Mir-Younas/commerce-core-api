import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { buildActionEmailTemplate } from './templates/action-email.template';
import type {
  OrderDeliveredEmailParams,
  OrderPlacedEmailParams,
  OrderShippedEmailParams,
  RefundCompletedEmailParams,
  ReturnApprovedEmailParams,
  ReturnReceivedEmailParams,
  ReturnRejectedEmailParams,
} from './types/email.types';
import { buildOrderPlacedEmailTemplate } from './templates/order-placed-email.template';
import { buildMessageEmailTemplate } from './templates/message-email.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly fromEmail: string;
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    const appName = this.configService.get<string>('APP_NAME') ?? 'App';

    const fromEmail =
      this.configService.get<string>('SMTP_FROM') ??
      this.configService.getOrThrow<string>('SMTP_USER');

    const host = this.configService.getOrThrow<string>('SMTP_HOST');

    const port = Number(this.configService.getOrThrow<string>('SMTP_PORT'));

    const user = this.configService.getOrThrow<string>('SMTP_USER');

    const pass = this.configService.getOrThrow<string>('SMTP_PASS');

    this.appName = appName;
    this.fromEmail = fromEmail;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';

      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to send email: ${message}`, stack);

      throw new InternalServerErrorException(
        'Unable to send email at this time',
      );
    }
  }

  async sendVerificationEmail(
    to: string,
    verificationUrl: string,
  ): Promise<void> {
    const subject = `${this.appName} Email Verification`;

    const html = buildActionEmailTemplate({
      heading: 'Verify your email',
      message: 'Please click the button below to verify your email address.',
      buttonLabel: 'Verify Email',
      actionUrl: verificationUrl,
    });

    await this.sendEmail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const subject = `${this.appName} Password Reset`;

    const html = buildActionEmailTemplate({
      heading: 'Reset your password',
      message: 'Please click the button below to reset your password.',
      buttonLabel: 'Reset Password',
      actionUrl: resetUrl,
    });

    await this.sendEmail(to, subject, html);
  }

  async sendOrderPlacedEmail(params: OrderPlacedEmailParams): Promise<void> {
    const subject = `${this.appName} Order Confirmation`;

    const html = buildOrderPlacedEmailTemplate(params, this.appName);

    await this.sendEmail(params.to, subject, html);
  }

  async sendOrderShippedEmail(params: OrderShippedEmailParams): Promise<void> {
    const subject = `${this.appName} Order Shipped`;

    const trackingMessage = params.trackingNumber
      ? ` Tracking number: ${params.trackingNumber}.`
      : '';

    const html = buildMessageEmailTemplate({
      heading: 'Your order has been shipped',
      name: params.name,
      message: `Your order ${params.orderId} has been shipped.${trackingMessage}`,
      appName: this.appName,
    });

    await this.sendEmail(params.to, subject, html);
  }

  async sendOrderDeliveredEmail(
    params: OrderDeliveredEmailParams,
  ): Promise<void> {
    const subject = `${this.appName} Order Delivered`;

    const html = buildMessageEmailTemplate({
      heading: 'Your order has been delivered',
      name: params.name,
      message: `Your order ${params.orderId} has been delivered successfully.`,
      appName: this.appName,
    });

    await this.sendEmail(params.to, subject, html);
  }

  async sendReturnApprovedEmail(
    params: ReturnApprovedEmailParams,
  ): Promise<void> {
    const subject = `${this.appName} Return Approved`;

    const html = buildMessageEmailTemplate({
      heading: 'Return request approved',
      name: params.name,
      message: `Your return request ${params.returnRequestId} has been approved.`,
      appName: this.appName,
    });

    await this.sendEmail(params.to, subject, html);
  }

  async sendReturnRejectedEmail(
    params: ReturnRejectedEmailParams,
  ): Promise<void> {
    const subject = `${this.appName} Return Rejected`;

    const adminNote = params.adminNote ? ` Reason: ${params.adminNote}` : '';

    const html = buildMessageEmailTemplate({
      heading: 'Return request rejected',
      name: params.name,
      message: `Your return request ${params.returnRequestId} was rejected.${adminNote}`,
      appName: this.appName,
    });

    await this.sendEmail(params.to, subject, html);
  }

  async sendReturnReceivedEmail(
    params: ReturnReceivedEmailParams,
  ): Promise<void> {
    const subject = `${this.appName} Return Received`;

    const html = buildMessageEmailTemplate({
      heading: 'Returned item received',
      name: params.name,
      message: `We have received your return request ${params.returnRequestId}. Your refund will now be processed according to the payment method used for the order.`,
      appName: this.appName,
    });

    await this.sendEmail(params.to, subject, html);
  }
  async sendRefundCompletedEmail(
    params: RefundCompletedEmailParams,
  ): Promise<void> {
    const subject = `${this.appName} Refund Completed`;

    const html = buildMessageEmailTemplate({
      heading: 'Refund completed',
      name: params.name,
      message: `Your refund of PKR ${params.amount.toLocaleString(
        'en-PK',
      )} for order ${params.orderId} has been completed.`,
      appName: this.appName,
    });

    await this.sendEmail(params.to, subject, html);
  }
}
