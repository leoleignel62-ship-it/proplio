/**
 * Utilitaires PDF partagés (pied de page, bloc signature) — pas d’import depuis
 * locavio-pdf-theme pour éviter les dépendances circulaires.
 */
import { PDFDocument, StandardFonts, type PDFPage, rgb, type PDFFont, type PDFImage } from "pdf-lib";

export const PDF_FOOTER_HEIGHT = 28;
export const PDF_SIGNATURE_BLOCK_HEIGHT = 130;
/** Espace minimal à réserver en bas de page pour signature + pied (évite page quasi vide). */
export const PDF_SIGNATURE_FOOTER_RESERVE =
  PDF_FOOTER_HEIGHT + PDF_SIGNATURE_BLOCK_HEIGHT + 24;

const FOOTER_CENTER = "Document généré par Locavio";

const VIOLET = rgb(124 / 255, 58 / 255, 237 / 255);
const VIOLET_LIGHT = rgb(237 / 255, 233 / 255, 254 / 255);
const FOOTER_BG = rgb(248 / 255, 247 / 255, 252 / 255);
const BORDER = rgb(220 / 255, 218 / 255, 228 / 255);
const TEXT_MAIN = rgb(15 / 255, 15 / 255, 20 / 255);
const TEXT_SECONDARY = rgb(100 / 255, 100 / 255, 115 / 255);
const TEXT_OWNER = rgb(91 / 255, 33 / 255, 182 / 255);

export function sanitizePdfText(text: string): string {
  return text
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-");
}

export type DrawFooterProps = {
  pageIndex: number;
  totalPages: number;
  font: PDFFont;
  fontBold: PDFFont;
  pageWidth?: number;
};

/**
 * Pied de page premium : fond clair, filet violet, texte centré et pagination à droite.
 */
export function drawFooter(page: PDFPage, props: DrawFooterProps) {
  const w = props.pageWidth ?? 595.28;
  const line = sanitizePdfText(FOOTER_CENTER);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: w,
    height: PDF_FOOTER_HEIGHT,
    color: FOOTER_BG,
  });
  page.drawRectangle({
    x: 0,
    y: PDF_FOOTER_HEIGHT - 1.2,
    width: w,
    height: 1.2,
    color: VIOLET_LIGHT,
  });
  const tw = props.font.widthOfTextAtSize(line, 9);
  page.drawText(line, {
    x: (w - tw) / 2,
    y: 10,
    size: 9,
    font: props.font,
    color: TEXT_SECONDARY,
  });
  const pg = sanitizePdfText(`Page ${props.pageIndex + 1} / ${props.totalPages}`);
  const pw = props.fontBold.widthOfTextAtSize(pg, 9);
  page.drawText(pg, {
    x: w - 40 - pw,
    y: 10,
    size: 9,
    font: props.fontBold,
    color: TEXT_SECONDARY,
  });
}

export type DrawSignatureBlockProps = {
  font: PDFFont;
  fontBold: PDFFont;
  /** Ville pour « Fait à [ville], le … » */
  ville: string;
  /** Date déjà formatée pour l’affichage */
  dateStr: string;
  proprietaireNom: string;
  signatureImage?: PDFImage | null;
  /** Nom du locataire/signataire */
  locataireNom?: string;
  /** Image signature locataire (dessinée via canvas) */
  locataireSignatureImage?: PDFImage | null;
  /** Date de signature locataire formatée */
  locataireSignedAt?: string | null;
  marginX?: number;
  pageWidth?: number;
  /** Ordonnée du bas du bloc (= haut du bandeau pied), en général PDF_FOOTER_HEIGHT */
  blockBottomY?: number;
  blockHeight?: number;
};

/**
 * Bloc signature standardisé premium (2 colonnes), ancré au-dessus du footer.
 */
export function drawSignatureBlock(page: PDFPage, props: DrawSignatureBlockProps) {
  const margin = props.marginX ?? 40;
  const pw = props.pageWidth ?? 595.28;
  const bb = props.blockBottomY ?? PDF_FOOTER_HEIGHT;
  const h = props.blockHeight ?? PDF_SIGNATURE_BLOCK_HEIGHT;
  const top = bb + h;

  const lineY = top - 18;
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: pw - margin, y: lineY },
    thickness: 0.5,
    color: BORDER,
  });

  const villeS = sanitizePdfText(props.ville || "—");
  const dateS = sanitizePdfText(props.dateStr || "—");
  const fait = sanitizePdfText(`Fait à ${villeS}, le ${dateS}`);
  const faitW = props.font.widthOfTextAtSize(fait, 10);
  page.drawText(fait, {
    x: (pw - faitW) / 2,
    y: lineY - 15,
    size: 10,
    font: props.font,
    color: TEXT_SECONDARY,
  });

  const labelY = lineY - 33;
  const colGap = 16;
  const colW = (pw - 2 * margin - colGap) / 2;
  page.drawText(sanitizePdfText("Le locataire"), {
    x: margin + 4,
    y: labelY,
    size: 9,
    font: props.font,
    color: TEXT_SECONDARY,
  });
  page.drawText(sanitizePdfText("Le propriétaire"), {
    x: margin + colW + colGap + 4,
    y: labelY,
    size: 9,
    font: props.font,
    color: TEXT_SECONDARY,
  });

  const zoneTop = labelY - 10;
  const zoneH = 60;
  const zoneBottom = zoneTop - zoneH;
  const leftColX = margin + 4;
  const rightColX = margin + colW + colGap + 4;
  const zoneW = colW - 8;

  page.drawRectangle({
    x: leftColX,
    y: zoneBottom,
    width: zoneW,
    height: zoneH,
    borderColor: BORDER,
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({
    x: rightColX,
    y: zoneBottom,
    width: zoneW,
    height: zoneH,
    borderColor: BORDER,
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });

  const nomBold = sanitizePdfText(props.proprietaireNom || "—");

  if (props.locataireSignatureImage) {
    const img = props.locataireSignatureImage;
    const maxW = 100;
    const maxH = 50;
    const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
    const dw = img.width * ratio;
    const dh = img.height * ratio;
    const imgX = leftColX + (zoneW - dw) / 2;
    const imgY = zoneBottom + (zoneH - dh) / 2;
    page.drawImage(img, { x: imgX, y: imgY, width: dw, height: dh });
  }

  if (props.signatureImage) {
    const img = props.signatureImage;
    const maxW = 100;
    const maxH = 50;
    const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
    const dw = img.width * ratio;
    const dh = img.height * ratio;
    const imgX = rightColX + (zoneW - dw) / 2;
    const imgY = zoneBottom + (zoneH - dh) / 2;
    page.drawImage(img, { x: imgX, y: imgY, width: dw, height: dh });
  }

  const nameBaseline = zoneBottom - 16;
  page.drawText(sanitizePdfText("Le preneur"), {
    x: leftColX,
    y: nameBaseline,
    size: 9,
    font: props.font,
    color: TEXT_SECONDARY,
  });
  page.drawText(sanitizePdfText("Le bailleur"), {
    x: rightColX,
    y: nameBaseline,
    size: 9,
    font: props.font,
    color: TEXT_SECONDARY,
  });

  if (props.locataireNom) {
    page.drawText(sanitizePdfText(props.locataireNom), {
      x: leftColX,
      y: nameBaseline - 12,
      size: 11,
      font: props.fontBold,
      color: TEXT_OWNER,
    });
  }

  if (props.locataireSignedAt) {
    page.drawText(sanitizePdfText(`Signé le ${props.locataireSignedAt}`), {
      x: leftColX,
      y: nameBaseline - 24,
      size: 8,
      font: props.font,
      color: TEXT_SECONDARY,
    });
  }

  page.drawText(nomBold, {
    x: rightColX,
    y: nameBaseline - 12,
    size: 11,
    font: props.fontBold,
    color: TEXT_OWNER,
  });
}

export type AuditCertificateProps = {
  font: PDFFont;
  fontBold: PDFFont;
  documentType: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  signerIp: string;
  signerUserAgent: string;
  signedAt: string;
  otpVerified: boolean;
  documentHash?: string | null;
  pageWidth?: number;
  pageHeight?: number;
};

export function drawAuditCertificatePage(doc: PDFDocument, props: AuditCertificateProps): void {
  const pw = props.pageWidth ?? 595.28;
  const ph = props.pageHeight ?? 841.89;
  const margin = 48;

  const page = doc.addPage([pw, ph]);

  page.drawRectangle({
    x: 0,
    y: ph - 80,
    width: pw,
    height: 80,
    color: VIOLET,
  });

  const title = sanitizePdfText("Certificat de signature électronique");
  const titleW = props.fontBold.widthOfTextAtSize(title, 16);
  page.drawText(title, {
    x: (pw - titleW) / 2,
    y: ph - 50,
    size: 16,
    font: props.fontBold,
    color: rgb(1, 1, 1),
  });

  const subtitle = sanitizePdfText("Document généré par Locavio — locavio.fr");
  const subtitleW = props.font.widthOfTextAtSize(subtitle, 9);
  page.drawText(subtitle, {
    x: (pw - subtitleW) / 2,
    y: ph - 68,
    size: 9,
    font: props.font,
    color: rgb(0.9, 0.87, 0.98),
  });

  const blockY = ph - 200;
  const blockH = 380;
  page.drawRectangle({
    x: margin,
    y: blockY - blockH,
    width: pw - 2 * margin,
    height: blockH,
    color: rgb(250 / 255, 249 / 255, 255 / 255),
    borderColor: BORDER,
    borderWidth: 0.8,
  });

  const docTypeLabel = sanitizePdfText("Document signé");
  page.drawText(docTypeLabel, {
    x: margin + 20,
    y: blockY - 28,
    size: 9,
    font: props.font,
    color: TEXT_SECONDARY,
  });
  const docTypeVal = sanitizePdfText(props.documentType);
  page.drawText(docTypeVal, {
    x: margin + 20,
    y: blockY - 44,
    size: 12,
    font: props.fontBold,
    color: TEXT_MAIN,
  });

  page.drawLine({
    start: { x: margin + 16, y: blockY - 60 },
    end: { x: pw - margin - 16, y: blockY - 60 },
    thickness: 0.5,
    color: BORDER,
  });

  const rows: Array<[string, string]> = [
    ["Signataire", props.signerName],
    ["Email", props.signerEmail],
    ["Date de signature", props.signedAt],
    ["OTP vérifié", props.otpVerified ? "Oui ✓" : "Non"],
    ["Adresse IP", props.signerIp || "—"],
    [
      "Navigateur",
      props.signerUserAgent ? `${props.signerUserAgent.substring(0, 60)}...` : "—",
    ],
    ["Référence document", `${props.documentId.substring(0, 16)}...`],
  ];

  if (props.documentHash) {
    rows.push(["Empreinte SHA-256", `${props.documentHash.substring(0, 32)}...`]);
  }

  let rowY = blockY - 80;
  const rowH = 30;
  const labelX = margin + 20;
  const valueX = margin + 180;

  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i]!;
    if (i % 2 === 0) {
      page.drawRectangle({
        x: margin + 1,
        y: rowY - 20,
        width: pw - 2 * margin - 2,
        height: rowH,
        color: rgb(245 / 255, 243 / 255, 255 / 255),
      });
    }

    page.drawText(sanitizePdfText(label), {
      x: labelX,
      y: rowY - 6,
      size: 9,
      font: props.font,
      color: TEXT_SECONDARY,
    });

    page.drawText(sanitizePdfText(value), {
      x: valueX,
      y: rowY - 6,
      size: 9,
      font: props.fontBold,
      color: TEXT_MAIN,
    });

    rowY -= rowH;
  }

  const legal1 = sanitizePdfText("Ce certificat atteste de la signature électronique du document ci-dessus.");
  const legal2 = sanitizePdfText(
    "Conforme au règlement eIDAS (UE) n°910/2014 — Signature électronique simple avec audit trail.",
  );
  const legal3 = sanitizePdfText("Locavio — locavio.fr — contact@locavio.fr");

  const l1W = props.font.widthOfTextAtSize(legal1, 8);
  const l2W = props.font.widthOfTextAtSize(legal2, 8);
  const l3W = props.font.widthOfTextAtSize(legal3, 8);

  page.drawText(legal1, {
    x: (pw - l1W) / 2,
    y: 80,
    size: 8,
    font: props.font,
    color: TEXT_SECONDARY,
  });
  page.drawText(legal2, {
    x: (pw - l2W) / 2,
    y: 68,
    size: 8,
    font: props.font,
    color: TEXT_SECONDARY,
  });
  page.drawText(legal3, {
    x: (pw - l3W) / 2,
    y: 52,
    size: 8,
    font: props.font,
    color: VIOLET,
  });

  drawFooter(page, {
    pageIndex: doc.getPageCount() - 1,
    totalPages: doc.getPageCount(),
    font: props.font,
    fontBold: props.fontBold,
    pageWidth: pw,
  });
}

export function drawFooterOnAllPages(doc: PDFDocument, font: PDFFont, fontBold: PDFFont) {
  const pages = doc.getPages();
  const n = pages.length;
  for (let i = 0; i < n; i++) {
    const p = pages[i]!;
    drawFooter(p, { pageIndex: i, totalPages: n, font, fontBold, pageWidth: p.getWidth() });
  }
}

export type ElectronicSignatureRecord = {
  signature_data: string | null;
  signer_name: string;
  signer_email: string;
  signer_ip?: string | null;
  signer_user_agent?: string | null;
  signed_at: string;
  otp_verified_at?: string | null;
  document_id: string;
};

export function formatSignatureDateFr(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Injecte la signature locataire sur la dernière page et ajoute le certificat d’audit.
 */
export async function applyElectronicSignatureToPdfBytes(
  pdfBytes: Uint8Array,
  options: {
    sigDoc: ElectronicSignatureRecord;
    documentTypeLabel: string;
    proprietaire: Record<string, unknown>;
    logement?: Record<string, unknown> | null;
    proprietaireSignatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
    marginX?: number;
  },
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let locataireSignatureImage: PDFImage | null = null;
  const sigData = String(options.sigDoc.signature_data ?? "");
  if (sigData) {
    const b64 = sigData.replace(/^data:image\/png;base64,/, "");
    try {
      const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
      locataireSignatureImage = await pdfDoc.embedPng(bytes);
    } catch {
      locataireSignatureImage = null;
    }
  }

  let proprietaireImg: PDFImage | null = null;
  if (options.proprietaireSignatureImage?.bytes?.length) {
    try {
      proprietaireImg = options.proprietaireSignatureImage.isPng
        ? await pdfDoc.embedPng(options.proprietaireSignatureImage.bytes)
        : await pdfDoc.embedJpg(options.proprietaireSignatureImage.bytes);
    } catch {
      proprietaireImg = null;
    }
  }

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  if (!lastPage) {
    return pdfBytes;
  }

  const ville =
    String(options.logement?.ville ?? options.proprietaire.ville ?? "").trim() || "—";
  const signedAtFr = formatSignatureDateFr(String(options.sigDoc.signed_at));
  const proprietaireNom =
    [options.proprietaire.prenom, options.proprietaire.nom].filter(Boolean).join(" ").trim() || "—";
  const marginX = options.marginX ?? 48;

  drawSignatureBlock(lastPage, {
    font,
    fontBold,
    ville,
    dateStr: signedAtFr,
    proprietaireNom,
    signatureImage: proprietaireImg,
    locataireNom: String(options.sigDoc.signer_name ?? ""),
    locataireSignatureImage,
    locataireSignedAt: signedAtFr,
    marginX,
    pageWidth: lastPage.getWidth(),
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawAuditCertificatePage(pdfDoc, {
    font,
    fontBold,
    documentType: options.documentTypeLabel,
    documentId: String(options.sigDoc.document_id),
    signerName: String(options.sigDoc.signer_name),
    signerEmail: String(options.sigDoc.signer_email),
    signerIp: String(options.sigDoc.signer_ip ?? ""),
    signerUserAgent: String(options.sigDoc.signer_user_agent ?? ""),
    signedAt: signedAtFr,
    otpVerified: Boolean(options.sigDoc.otp_verified_at),
    documentHash: null,
  });

  drawFooterOnAllPages(pdfDoc, font, fontBold);

  return pdfDoc.save();
}
