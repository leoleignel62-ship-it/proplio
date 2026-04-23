/**
 * Charte graphique commune aux PDF Proplio (quittances, baux, EDL, lettre IRL).
 */
import { type PDFDocument, type PDFPage, rgb, type PDFFont } from "pdf-lib";

export const PDF_PAGE_W = 595.28;
export const PDF_PAGE_H = 841.89;
export const PDF_MARGIN_X = 40;
export const PDF_MARGIN_Y = 30;
export const PDF_HEADER_H = 76;
export const PDF_FOOTER_H = 26;
export const PDF_FOOTER_TEXT_BASELINE = 12;

export const PDF_VIOLET = rgb(124 / 255, 58 / 255, 237 / 255);
/** Accents / filets (violet adouci) */
export const PDF_VIOLET_LINE = rgb(167 / 255, 139 / 255, 250 / 255);
export const PDF_TEXT_MAIN = rgb(26 / 255, 26 / 255, 26 / 255);
export const PDF_TEXT_SECONDARY = rgb(107 / 255, 107 / 255, 128 / 255);
export const PDF_BORDER = rgb(229 / 255, 229 / 255, 229 / 255);
/** Lignes alternées tableaux */
export const PDF_TABLE_ALT = rgb(249 / 255, 249 / 255, 1);
/** ~#7c3aed15 sur blanc */
export const PDF_TABLE_HIGHLIGHT_BG = rgb(244 / 255, 239 / 255, 254 / 255);
/** Blocs expéditeur / destinataire */
export const PDF_INFO_BLOCK_BG = rgb(249 / 255, 249 / 255, 1);
export const PDF_WHITE = rgb(1, 1, 1);
export const PDF_HEADER_SUBTITLE = rgb(0.93, 0.9, 0.98);
/** Barre sous titres d’article (léger violet) */
export const PDF_ARTICLE_BAR_BG = rgb(244 / 255, 241 / 255, 252 / 255);

const FOOTER_CENTER = "Document généré par Proplio — proplio-red.vercel.app";

/** Bas de zone utile au-dessus du bandeau pied de page */
export function pdfContentMinY(): number {
  return PDF_FOOTER_H + PDF_MARGIN_Y + 16;
}

/** Ordonnée du haut du corps sous le bandeau d’en-tête (origine bas-gauche). */
export function pdfContentTopAfterHeader(pageHeight = PDF_PAGE_H): number {
  return pageHeight - PDF_HEADER_H - PDF_MARGIN_Y;
}

/**
 * Bandeau Proplio : violet pleine largeur, marque à gauche, type de document à droite.
 * `documentTypeRight` peut contenir des retours à la ligne.
 */
export function drawProplioPdfHeader(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  documentTypeRight: string,
  pageHeight = PDF_PAGE_H,
  pageWidth = PDF_PAGE_W,
) {
  page.drawRectangle({
    x: 0,
    y: pageHeight - PDF_HEADER_H,
    width: pageWidth,
    height: PDF_HEADER_H,
    color: PDF_VIOLET,
  });
  page.drawText("Proplio", {
    x: PDF_MARGIN_X,
    y: pageHeight - 22,
    size: 20,
    font: fontBold,
    color: PDF_WHITE,
  });
  page.drawText("Gestion locative", {
    x: PDF_MARGIN_X,
    y: pageHeight - 44,
    size: 10,
    font,
    color: PDF_HEADER_SUBTITLE,
  });

  const maxRightW = pageWidth / 2 - PDF_MARGIN_X;
  const lines = documentTypeRight.split("\n").filter((l) => l.trim().length > 0);
  let ry = pageHeight - 26;
  for (const line of lines) {
    let fs = 11;
    while (fs > 7 && fontBold.widthOfTextAtSize(line, fs) > maxRightW) {
      fs -= 0.5;
    }
    const w = fontBold.widthOfTextAtSize(line, fs);
    page.drawText(line, {
      x: pageWidth - PDF_MARGIN_X - w,
      y: ry,
      size: fs,
      font: fontBold,
      color: PDF_WHITE,
    });
    ry -= fs + 4;
  }
}

export function drawProplioPdfFooter(
  page: PDFPage,
  pageIndex: number,
  totalPages: number,
  font: PDFFont,
  fontBold: PDFFont,
  pageWidth = PDF_PAGE_W,
) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: PDF_FOOTER_H,
    color: PDF_VIOLET,
  });
  const tw = font.widthOfTextAtSize(FOOTER_CENTER, 8);
  page.drawText(FOOTER_CENTER, {
    x: (pageWidth - tw) / 2,
    y: PDF_FOOTER_TEXT_BASELINE,
    size: 8,
    font,
    color: PDF_WHITE,
  });
  if (totalPages > 1) {
    const pg = `Page ${pageIndex + 1} / ${totalPages}`;
    const pw = fontBold.widthOfTextAtSize(pg, 8);
    page.drawText(pg, {
      x: pageWidth - PDF_MARGIN_X - pw,
      y: PDF_FOOTER_TEXT_BASELINE,
      size: 8,
      font: fontBold,
      color: PDF_WHITE,
    });
  }
}

export function drawProplioPdfFooterOnAllPages(doc: PDFDocument, font: PDFFont, fontBold: PDFFont) {
  const pages = doc.getPages();
  const n = pages.length;
  for (let i = 0; i < n; i++) {
    drawProplioPdfFooter(pages[i]!, i, n, font, fontBold);
  }
}
