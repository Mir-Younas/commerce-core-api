import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class JazzcashService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  createJazzCashPaymentRequest(
    params: CreatePaymentRequestInput,
  ): JazzCashPaymentResult {
    const merchantId =
      this.configService.getOrThrow<string>(
        'JAZZCASH_MERCHANT_ID',
      );

    const password =
      this.configService.getOrThrow<string>(
        'JAZZCASH_PASSWORD',
      );

    const integritySalt =
      this.configService.getOrThrow<string>(
        'JAZZCASH_INTEGRITY_SALT',
      );

    const returnUrl =
      this.configService.getOrThrow<string>(
        'JAZZCASH_RETURN_URL',
      );

    const paymentUrl =
      this.configService.getOrThrow<string>(
        'JAZZCASH_PAYMENT_URL',
      );

    const now = new Date();

    const expiryDate = new Date(
      now.getTime() + 30 * 60 * 1000,
    );

    const txnDateTime = this.formatJazzCashDate(now);

    const txnExpiryDateTime =
      this.formatJazzCashDate(expiryDate);

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

    const pp_SecureHash =
      createJazzCashSecureHash(
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

  verifyCallback(body: JazzCashCallback) {
    const integritySalt =
      this.configService.getOrThrow<string>(
        'JAZZCASH_INTEGRITY_SALT',
      );

    const validHash = verifyJazzCashSecureHash(
      body,
      integritySalt,
    );

    if (!validHash) {
      throw new UnauthorizedException(
        'Invalid JazzCash secure hash',
      );
    }

    const responseCode = body.pp_ResponseCode;
    const paymentId = body.ppmpf_1;
    const txnRefNo = body.pp_TxnRefNo;

    const providerTransactionId =
      body.pp_RetreivalReferenceNo ??
      txnRefNo;

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
      responseMessage:
        body.pp_ResponseMessage,
    };
  }

  private formatJazzCashDate(date: Date): string {
    const year = date
      .getFullYear()
      .toString();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      date.getDate(),
    ).padStart(2, '0');

    const hours = String(
      date.getHours(),
    ).padStart(2, '0');

    const minutes = String(
      date.getMinutes(),
    ).padStart(2, '0');

    const seconds = String(
      date.getSeconds(),
    ).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }
}