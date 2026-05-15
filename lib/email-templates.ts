/** Gabarits HTML e-mails transactionnels Locavio (light mode). */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapLocavioEmail(bodyHtml: string): string {
  return `<div style="background:#f8f7ff;padding:24px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e9d5ff;border-radius:14px;padding:32px;">
    <div style="text-align:center;margin-bottom:28px;">
      <img src="https://locavio.fr/logos/lockup-horizontal-clair.svg?v=2" alt="Locavio" height="36" style="height:36px;width:auto;display:inline-block;" />
    </div>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e9d5ff;margin:28px 0;" />
    <p style="margin:0;text-align:center;color:#6b7280;font-size:12px;">© 2026 Locavio · Axio Tech · <a href="https://locavio.fr" style="color:#7c3aed;text-decoration:none;">locavio.fr</a></p>
  </div>
</div>`;
}

export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 14px 0;color:#4b5563;line-height:1.6;font-size:15px;">${html}</p>`;
}

export function emailGreeting(name?: string): string {
  const label = name?.trim() ? escapeHtml(name.trim()) : "";
  return emailParagraph(
    label ? `Bonjour <span style="color:#1a0533;">${label}</span>,` : `Bonjour,`,
  );
}

export function emailSignoff(name: string): string {
  const n = escapeHtml(name.trim() || "L'équipe Locavio");
  return `<p style="margin:0;color:#1a0533;font-size:15px;">Cordialement,<br/><span style="color:#7c3aed;">${n}</span></p>`;
}

export function emailButton(label: string, href: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<div style="text-align:center;margin:20px 0 0 0;">
      <a href="${safeHref}" style="background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-weight:600;display:inline-block;font-size:15px;">${safeLabel}</a>
    </div>`;
}

export function emailMutedNote(text: string): string {
  return `<p style="margin:14px 0 0 0;color:#6b7280;font-size:13px;line-height:1.5;">${text}</p>`;
}

export function emailRecapBox(innerHtml: string): string {
  return `<div style="margin:0 0 16px 0;padding:16px 18px;background:#f8f7ff;border:1px solid #e9d5ff;border-radius:10px;color:#4b5563;line-height:1.7;font-size:14px;">${innerHtml}</div>`;
}

export function emailSummaryTable(rows: { label: string; value: string }[]): string {
  const trs = rows
    .map(
      (row, i) => {
        const border =
          i < rows.length - 1 ? "border-bottom:1px solid #e9d5ff;" : "";
        return `<tr>
          <td style="padding:10px 12px 10px 0;${border}vertical-align:top;color:#4b5563;">${escapeHtml(row.label)}</td>
          <td style="padding:10px 0;${border}text-align:right;color:#1a0533;">${row.value}</td>
        </tr>`;
      },
    )
    .join("");
  return emailRecapBox(
    `<table style="width:100%;border-collapse:collapse;font-size:14px;">${trs}</table>`,
  );
}
