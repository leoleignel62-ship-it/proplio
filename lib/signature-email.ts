import { escapeHtml } from "@/lib/email-templates";

export function humanizeDocumentType(type: string): string {
  const map: Record<string, string> = {
    bail: "Bail de location",
    contrat_sejour: "Contrat de séjour",
    edl: "État des lieux",
    irl: "Révision IRL",
    quittance: "Quittance de loyer",
  };
  return map[type] ?? type;
}

function formatSignedAtDateAndTime(iso: string): { date: string; time: string; full: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: iso, time: "", full: iso };
  }
  return {
    date: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d),
    time: new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d),
    full: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d),
  };
}

function signatureRecapBlock(rows: Array<{ label: string; value: string }>): string {
  const items = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">${escapeHtml(r.label)}</td><td style="padding:6px 0 6px 12px;color:#e5e7eb;font-size:13px;font-weight:600;">${escapeHtml(r.value)}</td></tr>`,
    )
    .join("");
  return `<div style="margin:20px 0;padding:16px;background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.25);border-radius:10px;">
    <table style="width:100%;border-collapse:collapse;">${items}</table>
  </div>`;
}

function signatureEmailShell(title: string, bodyHtml: string, ctaHtml = ""): string {
  return `<div style="margin:0;padding:32px 16px;background:#0f0f1a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(124,58,237,0.35);border-radius:16px;padding:32px 28px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Locavio</span>
    </div>
    <h1 style="margin:0 0 16px 0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.3;">${title}</h1>
    ${bodyHtml}
    ${ctaHtml}
    <hr style="border:none;border-top:1px solid rgba(124,58,237,0.2);margin:28px 0 16px 0;" />
    <p style="margin:0;text-align:center;color:#6b7280;font-size:11px;">Locavio · <a href="https://locavio.fr" style="color:#a78bfa;text-decoration:none;">locavio.fr</a></p>
  </div>
  </div>`;
}

export function emailSignatureOtpInviteSubject(documentType: string): string {
  return `Signature requise : ${documentType} — Locavio`;
}

export function emailSignatureManualConfirmOwner(params: { signerName: string }): string {
  const signer = escapeHtml(params.signerName.trim() || "le signataire");
  const body = `<p style="margin:0 0 14px 0;color:#9ca3af;line-height:1.6;font-size:15px;">
      Vous avez confirmé la réception du document signé par <strong style="color:#ffffff;">${signer}</strong>.
      Ce document est maintenant considéré comme signé.
    </p>`;
  return signatureEmailShell("Document marqué comme signé", body);
}

export function emailSignatureOtpInvite(params: {
  signerName: string;
  otpCode: string;
  signLink: string;
  documentType: string;
  proprietaireNom: string;
  proprietaireEmail: string;
  documentContext?: string;
}): string {
  const name = escapeHtml(params.signerName.trim() || "Bonjour");
  const owner = escapeHtml(params.proprietaireNom.trim() || "Le propriétaire");
  const docType = escapeHtml(params.documentType.trim() || "document");
  const otp = escapeHtml(params.otpCode);
  const signLink = escapeHtml(params.signLink);
  const contextBlock = params.documentContext?.trim()
    ? `<p style="margin:0 0 20px 0;color:#9ca3af;font-size:14px;font-style:italic;line-height:1.6;">Bien concerné : ${escapeHtml(params.documentContext.trim())}</p>`
    : "";

  const body = `<p style="margin:0 0 14px 0;color:#e5e7eb;line-height:1.6;font-size:15px;">Bonjour <strong style="color:#ffffff;">${name}</strong>,</p>
    <p style="margin:0 0 16px 0;color:#9ca3af;line-height:1.6;font-size:15px;">
      <strong style="color:#c4b5fd;">${owner}</strong> vous invite à signer votre ${docType} en ligne via Locavio.
    </p>
    <p style="margin:0 0 16px 0;color:#9ca3af;line-height:1.6;font-size:15px;">
      Le document complet est joint à cet email en pièce jointe. Prenez le temps de le lire avant de signer.
    </p>
    ${contextBlock}
    <p style="margin:0 0 8px 0;color:#9ca3af;line-height:1.6;font-size:14px;">
      Pour signer, entrez d'abord ce code de vérification sur la page de signature :
    </p>
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:#7c3aed;color:white;font-size:36px;font-weight:900;letter-spacing:10px;padding:18px 36px;border-radius:12px;font-family:monospace;">${otp}</div>
      <p style="color:#888;font-size:12px;margin-top:10px;">Code valable 72 heures</p>
    </div>`;

  const ownerEmail = escapeHtml(params.proprietaireEmail.trim());
  const cta = `<div style="text-align:center;margin:24px 0;">
      <a href="${signLink}" style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);color:#ffffff;text-decoration:none;border-radius:10px;padding:14px 28px;font-weight:600;display:inline-block;font-size:15px;box-shadow:0 4px 20px rgba(124,58,237,0.35);">Signer le document →</a>
    </div>
    <p style="margin:16px 0 0;color:#6b7280;font-size:12px;text-align:center;line-height:1.5;">
      Ce lien est valable 72 heures. Après expiration, demandez un nouveau lien au propriétaire.
    </p>`;

  const dualChoice = `<div style="margin:32px 0;padding:20px;background:#1a1a2e;border-radius:12px;border:1px solid #2d2d4e;">
    <p style="color:#a78bfa;font-size:13px;font-weight:700;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:1px;">
      Comment souhaitez-vous signer ?
    </p>
    <div style="display:flex;gap:12px;margin-bottom:16px;align-items:flex-start;">
      <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">✍️</div>
      <div>
        <p style="color:#fff;font-size:13px;font-weight:700;margin:0 0 4px 0;">Option 1 — Signature électronique</p>
        <p style="color:#888;font-size:12px;margin:0;">
          Cliquez sur le bouton ci-dessus, entrez votre code et signez directement en ligne. Rapide et légalement valable.
        </p>
      </div>
    </div>
    <div style="display:flex;gap:12px;align-items:flex-start;">
      <div style="width:32px;height:32px;background:#374151;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">📄</div>
      <div>
        <p style="color:#fff;font-size:13px;font-weight:700;margin:0 0 4px 0;">Option 2 — Signature papier</p>
        <p style="color:#888;font-size:12px;margin:0;">
          Imprimez le document joint, signez-le et retournez-le par email à votre propriétaire :
          <a href="mailto:${ownerEmail}" style="color:#a78bfa;">${ownerEmail}</a>
        </p>
      </div>
    </div>
  </div>`;

  return signatureEmailShell(`Vous êtes invité(e) à signer votre ${docType}`, body, cta + dualChoice);
}

export function emailSignatureSignerConfirmation(params: {
  signerName: string;
  signedAt: string;
  documentType: string;
  signerIp: string;
}): string {
  const name = escapeHtml(params.signerName.trim() || "Bonjour");
  const { date, time } = formatSignedAtDateAndTime(params.signedAt);
  const body = `<p style="margin:0 0 14px 0;color:#e5e7eb;line-height:1.6;font-size:15px;">Bonjour <strong style="color:#ffffff;">${name}</strong>,</p>
    <p style="margin:0 0 20px 0;color:#9ca3af;line-height:1.6;font-size:15px;">
      Votre signature électronique a bien été enregistrée le <strong style="color:#e5e7eb;">${escapeHtml(date)}</strong>${time ? ` à <strong style="color:#e5e7eb;">${escapeHtml(time)}</strong>` : ""}.
      Le propriétaire a été notifié.<br />Conservez cet email comme preuve.
    </p>
    ${signatureRecapBlock([
      { label: "Document", value: humanizeDocumentType(params.documentType) },
      { label: "Date", value: formatSignedAtDateAndTime(params.signedAt).full },
      { label: "IP", value: params.signerIp || "—" },
    ])}`;
  return signatureEmailShell("Document signé avec succès ✓", body);
}

export function emailSignatureOwnerNotification(params: {
  proprietairePrenom: string;
  signerName: string;
  signerEmail: string;
  signedAt: string;
  documentType: string;
  documentsUrl: string;
}): string {
  const prenom = escapeHtml(params.proprietairePrenom.trim() || "Bonjour");
  const signer = escapeHtml(params.signerName.trim() || "Un signataire");
  const docsUrl = escapeHtml(params.documentsUrl);
  const body = `<p style="margin:0 0 14px 0;color:#e5e7eb;line-height:1.6;font-size:15px;">Bonjour <strong style="color:#ffffff;">${prenom}</strong>,</p>
    <p style="margin:0 0 20px 0;color:#9ca3af;line-height:1.6;font-size:15px;">
      <strong style="color:#c4b5fd;">${signer}</strong> vient de signer son document électroniquement sur Locavio.
      Vous pouvez télécharger le PDF signé depuis votre espace.
    </p>
    ${signatureRecapBlock([
      { label: "Signataire", value: params.signerName.trim() || "—" },
      { label: "Email", value: params.signerEmail.trim() || "—" },
      { label: "Date", value: formatSignedAtDateAndTime(params.signedAt).full },
      { label: "Document", value: humanizeDocumentType(params.documentType) },
    ])}`;
  const cta = `<div style="text-align:center;margin:24px 0 0;">
      <a href="${docsUrl}" style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);color:#ffffff;text-decoration:none;border-radius:10px;padding:14px 28px;font-weight:600;display:inline-block;font-size:15px;box-shadow:0 4px 20px rgba(124,58,237,0.35);">Voir le document →</a>
    </div>`;
  return signatureEmailShell("Document signé ! 🎉", body, cta);
}

export function documentsUrlForSignatureType(documentType: string, siteBase: string): string {
  const base = siteBase.replace(/\/+$/, "");
  if (documentType === "contrat_sejour") return `${base}/saisonnier/contrats`;
  return `${base}/baux`;
}
