/**
 * HTML + plain-text personal review email.
 * Inline-safe table layout. No JavaScript. No PDF attachment.
 */

import type { PeriodReportEmailView } from "@/lib/services/periodIntelligence/email/viewModel";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function block(
  title: string,
  body: string | null,
  accent: string,
): string {
  if (!body) return "";
  return `<tr><td style="padding:18px 0 0;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${accent};font-family:system-ui,sans-serif;font-weight:700;">${escapeHtml(title)}</p>
    <p style="margin:8px 0 0;font-size:16px;line-height:1.45;color:#0f172a;">${escapeHtml(body)}</p>
  </td></tr>`;
}

export function renderPeriodReportEmailHtml(view: PeriodReportEmailView): string {
  const glance = view.glance
    .map(
      (point) =>
        `<tr><td style="padding:6px 0 0;font-size:15px;line-height:1.45;color:#1e293b;">• ${escapeHtml(point)}</td></tr>`,
    )
    .join("");

  const context =
    view.contextHeadline && view.contextChannel
      ? `<tr><td style="padding:18px 0 0;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;font-family:system-ui,sans-serif;font-weight:700;">Relevant context</p>
          <p style="margin:8px 0 0;font-size:12px;font-weight:700;color:#475569;font-family:system-ui,sans-serif;">${escapeHtml(view.contextChannel)}</p>
          <p style="margin:6px 0 0;font-size:15px;line-height:1.45;color:#0f172a;">${escapeHtml(view.contextHeadline)}</p>
        </td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(view.subject)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Georgia,serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(view.previewText)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#0f172a;color:#ffffff;padding:28px 24px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-family:system-ui,sans-serif;">Tobailey</p>
          <p style="margin:8px 0 0;font-size:14px;color:#cbd5e1;font-family:system-ui,sans-serif;">${escapeHtml(view.brandLine)}</p>
          <p style="margin:16px 0 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#22d3ee;font-family:system-ui,sans-serif;font-weight:700;">${escapeHtml(view.kicker)}</p>
          <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;font-weight:700;">${escapeHtml(view.conclusion)}</h1>
          <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;font-family:system-ui,sans-serif;">${escapeHtml(view.dateRangeLabel)}</p>
        </td></tr>
        <tr><td style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${
              glance
                ? `<tr><td>
              <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;font-family:system-ui,sans-serif;font-weight:700;">At a glance</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">${glance}</table>
            </td></tr>`
                : ""
            }
            ${block("What happened", view.happened, "#0891b2")}
            ${block("What changed", view.changed, "#475569")}
            ${block("Am I on track?", view.goal, "#d97706")}
            ${block("Looking ahead", view.ahead, "#0d9488")}
            ${context}
            <tr><td style="padding:28px 0 0;">
              <a href="${escapeHtml(view.reviewUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-family:system-ui,sans-serif;font-weight:700;font-size:15px;padding:14px 20px;border-radius:12px;">View full review in Tobailey</a>
            </td></tr>
            <tr><td style="padding:12px 0 0;">
              <a href="${escapeHtml(view.pdfUrl)}" style="font-family:system-ui,sans-serif;font-size:14px;font-weight:600;color:#0369a1;">Download PDF in Tobailey</a>
            </td></tr>
            <tr><td style="padding:24px 0 0;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;font-family:system-ui,sans-serif;">${escapeHtml(view.trustLine)}</p>
              <p style="margin:8px 0 0;font-size:12px;font-family:system-ui,sans-serif;"><a href="${escapeHtml(view.settingsUrl)}" style="color:#0369a1;">Manage email preferences</a></p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderPeriodReportEmailText(view: PeriodReportEmailView): string {
  const lines = [
    "Tobailey",
    view.brandLine,
    view.kicker,
    "",
    view.conclusion,
    view.dateRangeLabel,
    "",
  ];
  if (view.glance.length > 0) {
    lines.push("At a glance");
    for (const point of view.glance) lines.push(`- ${point}`);
    lines.push("");
  }
  if (view.happened) {
    lines.push("What happened");
    lines.push(view.happened);
    lines.push("");
  }
  if (view.changed) {
    lines.push("What changed");
    lines.push(view.changed);
    lines.push("");
  }
  if (view.goal) {
    lines.push("Am I on track?");
    lines.push(view.goal);
    lines.push("");
  }
  if (view.ahead) {
    lines.push("Looking ahead");
    lines.push(view.ahead);
    lines.push("");
  }
  if (view.contextHeadline && view.contextChannel) {
    lines.push("Relevant context");
    lines.push(view.contextChannel);
    lines.push(view.contextHeadline);
    lines.push("");
  }
  lines.push("View full review in Tobailey:");
  lines.push(view.reviewUrl);
  lines.push("");
  lines.push("Download PDF in Tobailey:");
  lines.push(view.pdfUrl);
  lines.push("");
  lines.push(view.trustLine);
  lines.push("Manage email preferences:");
  lines.push(view.settingsUrl);
  return lines.join("\n");
}

export function renderPeriodReportEmail(view: PeriodReportEmailView): {
  subject: string;
  previewText: string;
  html: string;
  text: string;
} {
  return {
    subject: view.subject,
    previewText: view.previewText,
    html: renderPeriodReportEmailHtml(view),
    text: renderPeriodReportEmailText(view),
  };
}
