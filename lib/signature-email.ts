import { escapeHtml } from "@/lib/email-templates";

export function emailSignatureOtpInvite(params: {
  signerName: string;
  proprietaireName: string;
  otp: string;
  signUrl: string;
}): string {
  const name = escapeHtml(params.signerName.trim() || "Bonjour");
  const owner = escapeHtml(params.proprietaireName.trim() || "Un propriétaire");
  const otp = escapeHtml(params.otp);
  const signUrl = escapeHtml(params.signUrl);

  return `<div style="margin:0;padding:32px 16px;background:#0f0f1a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(124,58,237,0.35);border-radius:16px;padding:32px 28px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Locavio</span>
    </div>
    <p style="margin:0 0 14px 0;color:#e5e7eb;line-height:1.6;font-size:15px;">Bonjour <strong style="color:#ffffff;">${name}</strong>,</p>
    <p style="margin:0 0 20px 0;color:#9ca3af;line-height:1.6;font-size:15px;">
      <strong style="color:#c4b5fd;">${owner}</strong> vous invite à signer un document.
    </p>
    <p style="margin:0 0 8px 0;color:#9ca3af;font-size:13px;text-align:center;">Votre code de vérification</p>
    <p style="margin:0 0 24px 0;text-align:center;font-size:36px;font-weight:800;letter-spacing:0.2em;color:#7c3aed;">${otp}</p>
    <p style="margin:0 0 20px 0;color:#9ca3af;line-height:1.6;font-size:14px;text-align:center;">
      Cliquez sur le bouton ci-dessous pour accéder au document et le signer.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${signUrl}" style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);color:#ffffff;text-decoration:none;border-radius:10px;padding:14px 28px;font-weight:600;display:inline-block;font-size:15px;box-shadow:0 4px 20px rgba(124,58,237,0.35);">Signer le document →</a>
    </div>
    <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;line-height:1.5;">Ce lien est valable 30 minutes.</p>
    <hr style="border:none;border-top:1px solid rgba(124,58,237,0.2);margin:28px 0 16px 0;" />
    <p style="margin:0;text-align:center;color:#6b7280;font-size:11px;">© 2026 Locavio · <a href="https://locavio.fr" style="color:#a78bfa;text-decoration:none;">locavio.fr</a></p>
  </div>
  </div>`;
}
