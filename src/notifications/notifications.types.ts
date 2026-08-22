import type {
  OrderDeliveredEmailParams,
  OrderPlacedEmailParams,
  OrderShippedEmailParams,
  RefundCompletedEmailParams,
  ReturnApprovedEmailParams,
  ReturnReceivedEmailParams,
  ReturnRejectedEmailParams,
} from '../email/types/email.types';

export type OrderConfirmedNotificationInput =
  OrderPlacedEmailParams & {
    phone: string;
    pushToken?: string | null;
  };

export type OrderShippedNotificationInput =
  OrderShippedEmailParams & {
    phone: string;
    pushToken?: string | null;
  };

export type OrderDeliveredNotificationInput =
  OrderDeliveredEmailParams & {
    phone: string;
    pushToken?: string | null;
  };

export type ReturnApprovedNotificationInput =
  ReturnApprovedEmailParams & {
    phone: string;
    pushToken?: string | null;
  };

export type ReturnRejectedNotificationInput =
  ReturnRejectedEmailParams & {
    phone: string;
    pushToken?: string | null;
  };

export type ReturnReceivedNotificationInput =
  ReturnReceivedEmailParams & {
    phone: string;
    pushToken?: string | null;
  };

export type RefundCompletedNotificationInput =
  RefundCompletedEmailParams & {
    phone: string;
    pushToken?: string | null;
  };