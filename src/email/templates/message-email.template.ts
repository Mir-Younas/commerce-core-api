import { escapeHtml } from '../utils/escape-html.util';

type MessageEmailTemplateParams = {
  heading: string;
  name: string;
  message: string;
  appName: string;
};

export function buildMessageEmailTemplate(
  params: MessageEmailTemplateParams,
): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>${escapeHtml(params.heading)}</h2>

      <p>Hello ${escapeHtml(params.name)},</p>

      <p>${escapeHtml(params.message)}</p>

      <p>Thank you for using ${escapeHtml(params.appName)}.</p>
    </div>
  `;
}
