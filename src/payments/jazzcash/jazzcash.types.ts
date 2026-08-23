export type JazzCashPaymentResult = {
  paymentUrl: string;
  fields: JazzCashPaymentFields;
};

export type JazzCashPaymentFields = {
  pp_Version: string;
  pp_TxnType: string;
  pp_Language: string;

  pp_MerchantID: string;
  pp_Password: string;

  pp_TxnRefNo: string;
  pp_Amount: string;
  pp_TxnCurrency: string;
  pp_TxnDateTime: string;

  pp_BillReference: string;
  pp_Description: string;

  pp_TxnExpiryDateTime: string;
  pp_ReturnURL: string;

  pp_SecureHash: string;

  // We use this to carry our internal Payment.id
  // through JazzCash and receive it back.
  ppmpf_1: string;
};

export type JazzCashCallback = Record<string, string | undefined>;
