/**
 * Utilitaires PDF partagés (pied de page, bloc signature) — pas d’import depuis
 * proplio-pdf-theme pour éviter les dépendances circulaires.
 */
import { type PDFDocument, type PDFPage, rgb, type PDFFont, type PDFImage } from "pdf-lib";

export const PDF_FOOTER_HEIGHT = 28;
export const PDF_SIGNATURE_BLOCK_HEIGHT = 130;
/** Espace minimal à réserver en bas de page pour signature + pied (évite page quasi vide). */
export const PDF_SIGNATURE_FOOTER_RESERVE =
  PDF_FOOTER_HEIGHT + PDF_SIGNATURE_BLOCK_HEIGHT + 24;

const FOOTER_CENTER = "Document généré par Proplio";

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
  page.drawText(nomBold, {
    x: rightColX,
    y: nameBaseline - 12,
    size: 11,
    font: props.fontBold,
    color: TEXT_OWNER,
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
