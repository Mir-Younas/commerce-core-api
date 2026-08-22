import type { OrderPlacedEmailParams } from '../types/email.types';
import { escapeHtml } from '../utils/escape-html.util';

function formatAmount(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function buildOrderPlacedEmailTemplate(
  params: OrderPlacedEmailParams,
  appName: string,
): string {
  const itemsHtml = params.order.items
    .map((item) => {
      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">
            ${escapeHtml(item.productName)}
          </td>
          <td style="padding:8px;border:1px solid #ddd;">
            ${escapeHtml(item.productSku)}
          </td>
          <td style="padding:8px;border:1px solid #ddd;">
            ${item.quantity}
          </td>
          <td style="padding:8px;border:1px solid #ddd;">
            ${formatAmount(item.price)}
          </td>
          <td style="padding:8px;border:1px solid #ddd;">
            ${formatAmount(item.total)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Order placed successfully</h2>

      <p>Hello ${escapeHtml(params.name)},</p>

      <p>Thank you for your order. Your order has been placed successfully.</p>

      <p><strong>Order ID:</strong> ${escapeHtml(params.order.id)}</p>
      <p><strong>Status:</strong> ${escapeHtml(params.order.status)}</p>

      <table style="border-collapse:collapse;width:100%;margin-top:16px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Product</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">SKU</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Price</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Total</th>
          </tr>
        </thead>

        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <p><strong>Subtotal:</strong> ${formatAmount(params.order.subtotal)}</p>
      <p><strong>Delivery Fee:</strong> ${formatAmount(params.order.deliveryFee)}</p>
      <p><strong>Total:</strong> ${formatAmount(params.order.total)}</p>

      <p>We will notify you when your order status changes.</p>

      <p>Thank you for shopping with ${escapeHtml(appName)}.</p>
    </div>
  `;
}