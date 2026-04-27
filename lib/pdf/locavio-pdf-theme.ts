/**
 * Charte graphique commune aux PDF Locavio (quittances, baux, EDL, lettre IRL).
 */
import { type PDFDocument, type PDFPage, rgb, type PDFFont } from "pdf-lib";
import {
  drawFooter,
  drawFooterOnAllPages,
  PDF_FOOTER_HEIGHT,
  PDF_SIGNATURE_BLOCK_HEIGHT,
  PDF_SIGNATURE_FOOTER_RESERVE,
} from "@/lib/pdf/pdf-utils";

export const PDF_PAGE_W = 595.28;
export const PDF_PAGE_H = 841.89;
export const PDF_MARGIN_X = 48;
export const PDF_MARGIN_Y = 36;
export const PDF_HEADER_H = 80;
/** @deprecated alias — utiliser PDF_FOOTER_HEIGHT depuis pdf-utils */
export const PDF_FOOTER_H = PDF_FOOTER_HEIGHT;
export { PDF_FOOTER_HEIGHT, PDF_SIGNATURE_BLOCK_HEIGHT, PDF_SIGNATURE_FOOTER_RESERVE };

export const PDF_VIOLET = rgb(124 / 255, 58 / 255, 237 / 255);
export const PDF_VIOLET_LIGHT = rgb(237 / 255, 233 / 255, 254 / 255);
export const PDF_VIOLET_DARK = rgb(91 / 255, 33 / 255, 182 / 255);
/** Accents / filets (violet adouci) */
export const PDF_VIOLET_LINE = rgb(167 / 255, 139 / 255, 250 / 255);
export const PDF_TEXT_MAIN = rgb(15 / 255, 15 / 255, 20 / 255);
export const PDF_TEXT_SECONDARY = rgb(100 / 255, 100 / 255, 115 / 255);
export const PDF_BORDER = rgb(220 / 255, 218 / 255, 228 / 255);
/** Lignes alternées tableaux */
export const PDF_TABLE_ALT = rgb(250 / 255, 249 / 255, 255 / 255);
/** ~#7c3aed15 sur blanc */
export const PDF_TABLE_HIGHLIGHT_BG = rgb(237 / 255, 233 / 255, 254 / 255);
/** Blocs expéditeur / destinataire */
export const PDF_INFO_BLOCK_BG = rgb(250 / 255, 249 / 255, 255 / 255);
export const PDF_WHITE = rgb(1, 1, 1);
export const PDF_SUCCESS = rgb(22 / 255, 163 / 255, 74 / 255);
export const PDF_WARNING = rgb(234 / 255, 88 / 255, 12 / 255);
export const PDF_HEADER_SUBTITLE = rgb(0.93, 0.9, 0.98);
/** Barre sous titres d’article (léger violet) */
export const PDF_ARTICLE_BAR_BG = PDF_VIOLET_LIGHT;

/** Bas de zone utile pour le corps (pages intermédiaires : pied seulement). */
export function pdfContentMinY(): number {
  return PDF_FOOTER_HEIGHT + PDF_MARGIN_Y + 16;
}

/**
 * Ordonnée minimale du bas du corps sur la dernière page lorsqu’un bloc signature
 * standard (130 pt) + pied (30 pt) suit — au-dessus de cette ligne le contenu ne doit pas passer.
 */
export function pdfContentMinYWithSignature(): number {
  return PDF_SIGNATURE_FOOTER_RESERVE + PDF_MARGIN_Y;
}

/** Ordonnée du haut du corps sous le bandeau d’en-tête (origine bas-gauche). */
export function pdfContentTopAfterHeader(pageHeight = PDF_PAGE_H): number {
  return pageHeight - PDF_HEADER_H - PDF_MARGIN_Y;
}

/**
 * Bandeau Locavio : violet pleine largeur, marque à gauche, type de document à droite.
 * `documentTypeRight` peut contenir des retours à la ligne.
 */
export function drawLocavioPdfHeader(
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
  page.drawText("Locavio", {
    x: PDF_MARGIN_X,
    y: pageHeight - 27,
    size: 22,
    font: fontBold,
    color: PDF_WHITE,
  });
  page.drawText("Gestion locative", {
    x: PDF_MARGIN_X,
    y: pageHeight - 46,
    size: 9,
    font,
    color: rgb(1, 1, 1),
    opacity: 0.72,
  });
  page.drawLine({
    start: { x: PDF_MARGIN_X + 96, y: pageHeight - PDF_HEADER_H + 12 },
    end: { x: PDF_MARGIN_X + 96, y: pageHeight - 12 },
    thickness: 0.6,
    color: PDF_WHITE,
    opacity: 0.45,
  });

  const maxRightW = pageWidth / 2 - PDF_MARGIN_X;
  const lines = documentTypeRight.split("\n").filter((l) => l.trim().length > 0);
  let ry = pageHeight - 30;
  for (const line of lines) {
    let fs = 13;
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
  page.drawRectangle({
    x: 0,
    y: pageHeight - PDF_HEADER_H - 2,
    width: pageWidth,
    height: 2,
    color: PDF_VIOLET_LIGHT,
  });
}

export function drawLocavioPdfFooter(
  page: PDFPage,
  pageIndex: number,
  totalPages: number,
  font: PDFFont,
  fontBold: PDFFont,
  pageWidth = PDF_PAGE_W,
) {
  drawFooter(page, { pageIndex, totalPages, font, fontBold, pageWidth });
}

export function drawLocavioPdfFooterOnAllPages(doc: PDFDocument, font: PDFFont, fontBold: PDFFont) {
  drawFooterOnAllPages(doc, font, fontBold);
}
