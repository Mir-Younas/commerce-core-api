import { escapeHtml } from '../utils/escape-html.util';

type ActionEmailTemplateParams = {
  heading: string;
  message: string;
  buttonLabel: string;
  actionUrl: string;
};

export function buildActionEmailTemplate(
  params: ActionEmailTemplateParams,
): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>${escapeHtml(params.heading)}</h2>

      <p>${escapeHtml(params.message)}</p>

      <p>
        <a
          href="${escapeHtml(params.actionUrl)}"
          style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;"
        >
          ${escapeHtml(params.buttonLabel)}
        </a>
      </p>

      <p>If the button does not work, use this link:</p>

      <p>
        <a href="${escapeHtml(params.actionUrl)}">
          ${escapeHtml(params.actionUrl)}
        </a>
      </p>
    </div>
  `;
}
