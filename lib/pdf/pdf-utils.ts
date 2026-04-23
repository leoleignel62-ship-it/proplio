/**
 * Utilitaires PDF partagés (pied de page, bloc signature) — pas d’import depuis
 * proplio-pdf-theme pour éviter les dépendances circulaires.
 */
import { type PDFDocument, type PDFPage, rgb, type PDFFont, type PDFImage } from "pdf-lib";

export const PDF_FOOTER_HEIGHT = 30;
export const PDF_SIGNATURE_BLOCK_HEIGHT = 130;
/** Espace minimal à réserver en bas de page pour signature + pied (évite page quasi vide). */
export const PDF_SIGNATURE_FOOTER_RESERVE =
  PDF_FOOTER_HEIGHT + PDF_SIGNATURE_BLOCK_HEIGHT + 24;

const FOOTER_CENTER = "Document généré par Proplio — proplio-red.vercel.app";

const VIOLET = rgb(124 / 255, 58 / 255, 237 / 255);
const WHITE = rgb(1, 1, 1);
const BORDER = rgb(229 / 255, 229 / 255, 229 / 255);
const TEXT_MAIN = rgb(26 / 255, 26 / 255, 26 / 255);
const TEXT_SECONDARY = rgb(107 / 255, 107 / 255, 128 / 255);

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
 * Bandeau pied de page 30 pt, violet #7c3aed, texte centré 9 pt blanc.
 */
export function drawFooter(page: PDFPage, props: DrawFooterProps) {
  const w = props.pageWidth ?? 595.28;
  const line = sanitizePdfText(FOOTER_CENTER);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: w,
    height: PDF_FOOTER_HEIGHT,
    color: VIOLET,
  });
  const tw = props.font.widthOfTextAtSize(line, 9);
  page.drawText(line, {
    x: (w - tw) / 2,
    y: 12,
    size: 9,
    font: props.font,
    color: WHITE,
  });
  if (props.totalPages > 1) {
    const pg = sanitizePdfText(`Page ${props.pageIndex + 1} / ${props.totalPages}`);
    const pw = props.fontBold.widthOfTextAtSize(pg, 9);
    page.drawText(pg, {
      x: w - 40 - pw,
      y: 12,
      size: 9,
      font: props.fontBold,
      color: WHITE,
    });
  }
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
 * Bloc signature standardisé (130 pt), au-dessus du pied : filet, « Fait à… » à droite,
 * deux colonnes (locataire / propriétaire + image + nom).
 */
export function drawSignatureBlock(page: PDFPage, props: DrawSignatureBlockProps) {
  const margin = props.marginX ?? 40;
  const pw = props.pageWidth ?? 595.28;
  const bb = props.blockBottomY ?? PDF_FOOTER_HEIGHT;
  const h = props.blockHeight ?? PDF_SIGNATURE_BLOCK_HEIGHT;
  const top = bb + h;

  const lineY = top - 20;
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: pw - margin, y: lineY },
    thickness: 0.35,
    color: BORDER,
  });

  const villeS = sanitizePdfText(props.ville || "—");
  const dateS = sanitizePdfText(props.dateStr || "—");
  const fait = sanitizePdfText(`Fait à ${villeS}, le ${dateS}`);
  const faitW = props.font.widthOfTextAtSize(fait, 10);
  page.drawText(fait, {
    x: pw - margin - faitW,
    y: lineY - 14,
    size: 10,
    font: props.font,
    color: TEXT_SECONDARY,
  });

  const labelY = lineY - 34;
  const mid = pw / 2;
  const colGap = 16;
  const colW = (pw - 2 * margin - colGap) / 2;
  page.drawText(sanitizePdfText("Le locataire"), {
    x: margin + 4,
    y: labelY,
    size: 10,
    font: props.font,
    color: TEXT_SECONDARY,
  });
  page.drawText(sanitizePdfText("Le propriétaire"), {
    x: mid + colGap / 2 + 4,
    y: labelY,
    size: 10,
    font: props.font,
    color: TEXT_SECONDARY,
  });

  const zoneTop = labelY - 12;
  /** Hauteur des zones de paraphe (nom propriétaire sous le bloc, au-dessus du pied 30 pt). */
  const zoneH = 44;
  const zoneBottom = zoneTop - zoneH;
  const leftColX = margin + 4;
  const rightColX = mid + colGap / 2 + 4;

  page.drawRectangle({
    x: leftColX,
    y: zoneBottom,
    width: colW - 8,
    height: zoneH,
    borderColor: BORDER,
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });

  const nomBold = sanitizePdfText(props.proprietaireNom || "—");

  if (props.signatureImage) {
    const img = props.signatureImage;
    const maxW = colW - 16;
    const maxH = zoneH - 8;
    const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
    const dw = img.width * ratio;
    const dh = img.height * ratio;
    const imgX = rightColX;
    const imgY = zoneBottom + (zoneH - dh) / 2;
    page.drawImage(img, { x: imgX, y: imgY, width: dw, height: dh });
  } else {
    page.drawRectangle({
      x: rightColX,
      y: zoneBottom,
      width: colW - 8,
      height: zoneH,
      borderColor: BORDER,
      borderWidth: 0.5,
      color: rgb(1, 1, 1),
    });
  }

  /** Sous la zone de signature (évite chevauchement avec l’image). */
  const nameBaseline = zoneBottom - 18;
  page.drawText(nomBold, {
    x: rightColX,
    y: nameBaseline,
    size: 11,
    font: props.fontBold,
    color: TEXT_MAIN,
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
