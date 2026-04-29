import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import {
  PDF_BORDER,
  PDF_INFO_BLOCK_BG,
  PDF_MARGIN_X,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PDF_TABLE_ALT,
  PDF_TABLE_HIGHLIGHT_BG,
  PDF_TEXT_MAIN,
  PDF_TEXT_SECONDARY,
  PDF_VIOLET,
  PDF_VIOLET_DARK,
  PDF_WHITE,
  drawLocavioPdfFooterOnAllPages,
  drawLocavioPdfHeader,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/locavio-pdf-theme";
import { getLocavioLockupPngBytes } from "@/lib/pdf/load-locavio-lockup-png";
import {
  PDF_FOOTER_HEIGHT,
  PDF_SIGNATURE_BLOCK_HEIGHT,
  PDF_SIGNATURE_FOOTER_RESERVE,
  drawSignatureBlock,
} from "@/lib/pdf/pdf-utils";

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function getLastDayOfMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function formatFrenchDate(date: Date) {
  return date.toLocaleDateString("fr-FR");
}

export type QuittancePdfParty = Record<string, unknown>;
export type QuittancePdfLogement = Record<string, unknown>;

export type QuittancePdfInput = {
  proprietaire: QuittancePdfParty;
  locataire: QuittancePdfParty;
  logement: QuittancePdfLogement;
  quittance: {
    id?: string;
    mois: number;
    annee: number;
    loyer: number;
    charges: number;
    total: number;
  };
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
};

function wrapLegal(text: string, maxLen: number): string[] {
  const m = text.match(new RegExp(`.{1,${maxLen}}(\\s|$)`, "g"));
  return m ?? [text];
}

export async function generateQuittancePdfBuffer(input: QuittancePdfInput): Promise<Uint8Array> {
  const { proprietaire, locataire, logement, quittance, signatureImage } = input;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const left = PDF_MARGIN_X;
  const right = pageWidth - PDF_MARGIN_X;
  const lineHeight = 18;

  const logoBytes = getLocavioLockupPngBytes();
  await drawLocavioPdfHeader(pdfDoc, page, font, fontBold, "QUITTANCE DE LOYER", pageHeight, pageWidth, logoBytes);

  let y = pdfContentTopAfterHeader(pageHeight);

  const monthLabel = MONTHS_FR[Number(quittance.mois) - 1] ?? String(quittance.mois);
  const lastDay = getLastDayOfMonth(Number(quittance.mois), Number(quittance.annee));
  const quittanceNumber = quittance.id?.slice(0, 8).toUpperCase() ?? "N/A";
  const subtitle = `N° ${quittanceNumber} • Période ${monthLabel} ${quittance.annee}`;
  const sw = font.widthOfTextAtSize(subtitle, 10);
  page.drawText(subtitle, {
    x: (pageWidth - sw) / 2,
    y,
    size: 10,
    font,
    color: PDF_TEXT_SECONDARY,
  });
  y -= 28;

  const colsTop = y;
  const colsHeight = 144;
  const gap = 12;
  const colWidth = (right - left - gap) / 2;
  const leftColX = left;
  const rightColX = left + colWidth + gap;

  const drawInfoColumn = (x: number, boxTop: number, boxH: number, w: number, title: string, drawLines: (yy: number) => number) => {
    page.drawRectangle({
      x: x + 3,
      y: boxTop - boxH,
      width: w - 3,
      height: boxH,
      color: PDF_INFO_BLOCK_BG,
      borderColor: PDF_BORDER,
      borderWidth: 0.5,
    });
    page.drawRectangle({
      x,
      y: boxTop - boxH,
      width: 3,
      height: boxH,
      color: PDF_VIOLET,
    });
    let cy = boxTop - 18;
    page.drawText(title, {
      x: x + 14,
      y: cy,
      size: 9,
      font: fontBold,
      color: PDF_VIOLET_DARK,
    });
    cy -= lineHeight;
    cy = drawLines(cy);
    return cy;
  };

  drawInfoColumn(leftColX, colsTop, colsHeight, colWidth, "Propriétaire", (leftY) => {
    let ly = leftY;
    page.drawText(`${proprietaire.prenom || ""} ${proprietaire.nom || ""}`.trim(), {
      x: leftColX + 14,
      y: ly,
      size: 11,
      font,
      color: PDF_TEXT_MAIN,
    });
    ly -= lineHeight;
    page.drawText(`${proprietaire.adresse || ""}`.trim(), {
      x: leftColX + 14,
      y: ly,
      size: 10,
      font,
      color: PDF_TEXT_MAIN,
    });
    ly -= 14;
    page.drawText(`${proprietaire.code_postal || ""} ${proprietaire.ville || ""}`.trim(), {
      x: leftColX + 14,
      y: ly,
      size: 10,
      font,
      color: PDF_TEXT_MAIN,
    });
    ly -= 16;
    page.drawText(`Email: ${proprietaire.email || "—"}`, { x: leftColX + 14, y: ly, size: 9.5, font, color: PDF_TEXT_SECONDARY });
    ly -= 13;
    page.drawText(`Tél: ${proprietaire.telephone || "—"}`, { x: leftColX + 14, y: ly, size: 9.5, font, color: PDF_TEXT_SECONDARY });
    return ly;
  });

  drawInfoColumn(rightColX, colsTop, colsHeight, colWidth, "Locataire", (rightY) => {
    let ry = rightY;
    page.drawText(`${locataire.prenom || ""} ${locataire.nom || ""}`.trim(), {
      x: rightColX + 14,
      y: ry,
      size: 11,
      font,
      color: PDF_TEXT_MAIN,
    });
    ry -= lineHeight;
    page.drawText(`Email: ${locataire.email || "—"}`, { x: rightColX + 14, y: ry, size: 9.5, font, color: PDF_TEXT_SECONDARY });
    ry -= 13;
    page.drawText(`Tél: ${locataire.telephone || "—"}`, { x: rightColX + 14, y: ry, size: 9.5, font, color: PDF_TEXT_SECONDARY });
    return ry;
  });

  y = colsTop - colsHeight - 28;
  const homeTitle = "Logement";
  const homeCardW = right - left;
  const homeCardH = 78;
  const homeCardY = y - homeCardH + 10;
  page.drawRectangle({
    x: left,
    y: homeCardY,
    width: homeCardW,
    height: homeCardH,
    color: PDF_INFO_BLOCK_BG,
    borderColor: PDF_BORDER,
    borderWidth: 0.6,
  });
  page.drawText(homeTitle, {
    x: pageWidth / 2 - fontBold.widthOfTextAtSize(homeTitle, 12) / 2,
    y: y - 8,
    size: 12,
    font: fontBold,
    color: PDF_VIOLET_DARK,
  });
  y -= lineHeight + 4;
  const logementLine = `${logement.nom || ""} - ${logement.adresse || ""}`.trim();
  page.drawText(logementLine, {
    x: pageWidth / 2 - font.widthOfTextAtSize(logementLine, 10.5) / 2,
    y,
    size: 10.5,
    font,
    color: PDF_TEXT_MAIN,
  });
  y -= 14;
  const logementCity = `${logement.code_postal || ""} ${logement.ville || ""}`.trim();
  page.drawText(logementCity, {
    x: pageWidth / 2 - font.widthOfTextAtSize(logementCity, 10) / 2,
    y,
    size: 10,
    font,
    color: PDF_TEXT_MAIN,
  });
  y -= 24;
  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 0.5,
    color: PDF_BORDER,
  });
  y -= 20;

  page.drawText(`Période: ${monthLabel} ${quittance.annee}`, {
    x: left,
    y,
    size: 12,
    font: fontBold,
    color: PDF_TEXT_MAIN,
  });
  y -= lineHeight + 6;

  const tableX = left;
  const tableW = right - left;
  const tableHeaderH = 22;
  const tableRowH = 22;
  const tableColSplit = tableX + tableW * 0.72;

  page.drawRectangle({
    x: tableX,
    y: y - tableHeaderH,
    width: tableW,
    height: tableHeaderH,
    color: PDF_VIOLET_DARK,
  });
  page.drawText("Désignation", {
    x: tableX + 10,
    y: y - 15,
    size: 10.5,
    font: fontBold,
    color: PDF_WHITE,
  });
  page.drawText("Montant", {
    x: tableColSplit + 10,
    y: y - 15,
    size: 10.5,
    font: fontBold,
    color: PDF_WHITE,
  });
  y -= tableHeaderH;

  page.drawRectangle({
    x: tableX,
    y: y - tableRowH,
    width: tableW,
    height: tableRowH,
    color: PDF_WHITE,
    borderColor: PDF_BORDER,
    borderWidth: 0.5,
  });
  page.drawText("Loyer nu", { x: tableX + 10, y: y - 15, size: 10.5, font, color: PDF_TEXT_MAIN });
  const loyerText = `${Number(quittance.loyer).toFixed(2)} €`;
  page.drawText(loyerText, {
    x: tableX + tableW - font.widthOfTextAtSize(loyerText, 10.5) - 10,
    y: y - 15,
    size: 10.5,
    font,
    color: PDF_TEXT_MAIN,
  });
  y -= tableRowH;

  page.drawRectangle({
    x: tableX,
    y: y - tableRowH,
    width: tableW,
    height: tableRowH,
    color: PDF_TABLE_ALT,
    borderColor: PDF_BORDER,
    borderWidth: 0.5,
  });
  page.drawText("Charges", { x: tableX + 10, y: y - 15, size: 10.5, font, color: PDF_TEXT_MAIN });
  const chargesText = `${Number(quittance.charges).toFixed(2)} €`;
  page.drawText(chargesText, {
    x: tableX + tableW - font.widthOfTextAtSize(chargesText, 10.5) - 10,
    y: y - 15,
    size: 10.5,
    font,
    color: PDF_TEXT_MAIN,
  });
  y -= tableRowH;

  page.drawRectangle({
    x: tableX,
    y: y - tableRowH,
    width: tableW,
    height: tableRowH,
    color: PDF_TABLE_HIGHLIGHT_BG,
    borderColor: PDF_BORDER,
    borderWidth: 0.5,
  });
  page.drawText("Total", {
    x: tableX + 10,
    y: y - 15,
    size: 11.5,
    font: fontBold,
    color: PDF_TEXT_MAIN,
  });
  const totalText = `${Number(quittance.total).toFixed(2)} €`;
  page.drawText(totalText, {
    x: tableX + tableW - fontBold.widthOfTextAtSize(totalText, 11.5) - 10,
    y: y - 15,
    size: 11.5,
    font: fontBold,
    color: PDF_VIOLET_DARK,
  });
  y -= tableRowH + 24;

  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 0.5,
    color: PDF_BORDER,
  });
  y -= 20;

  const legalText = `Je soussigné ${`${proprietaire.prenom || ""} ${proprietaire.nom || ""}`.trim()}, bailleur, déclare avoir reçu de ${
    `${locataire.prenom || ""} ${locataire.nom || ""}`.trim()
  }, locataire, la somme de ${Number(quittance.total).toFixed(
    2,
  )} € au titre du loyer et des charges du logement situé ${logement.adresse || ""} pour la période du 1er ${monthLabel} ${
    quittance.annee
  } au ${lastDay} ${monthLabel} ${quittance.annee}.`;

  const legalLines = wrapLegal(legalText, 95);
  const legalBoxTop = y;
  const reserveForSigFooter = PDF_FOOTER_HEIGHT + PDF_SIGNATURE_BLOCK_HEIGHT + 20;
  let legalBoxHeight = 86;
  if (y - legalBoxHeight < reserveForSigFooter) {
    legalBoxHeight = Math.max(52, y - reserveForSigFooter - 6);
  }
  const legalLineGap = y - legalBoxHeight < reserveForSigFooter + 50 ? 10 : 12;
  page.drawRectangle({
    x: left,
    y: legalBoxTop - legalBoxHeight,
    width: right - left,
    height: legalBoxHeight,
    color: PDF_WHITE,
    borderColor: PDF_BORDER,
    borderWidth: 0.5,
  });
  page.drawRectangle({
    x: left,
    y: legalBoxTop - legalBoxHeight,
    width: 3,
    height: legalBoxHeight,
    color: PDF_VIOLET,
  });
  page.drawText("Mention légale", {
    x: left + 10,
    y: legalBoxTop - 16,
    size: 11,
    font: fontBold,
    color: PDF_TEXT_MAIN,
  });
  let legalY = legalBoxTop - 32;
  legalLines.slice(0, 4).forEach((line) => {
    page.drawText(line.trim(), {
      x: left + 10,
      y: legalY,
      size: 8.8,
      font: fontItalic,
      color: PDF_TEXT_SECONDARY,
    });
    legalY -= legalLineGap;
  });

  let img: PDFImage | null = null;
  if (signatureImage?.bytes?.length) {
    try {
      img = signatureImage.isPng ? await pdfDoc.embedPng(signatureImage.bytes) : await pdfDoc.embedJpg(signatureImage.bytes);
    } catch {
      img = null;
    }
  }

  const villeQuittance = String(proprietaire.ville || "—").trim() || "—";
  const dateQuittance = formatFrenchDate(new Date());

  drawSignatureBlock(page, {
    font,
    fontBold,
    ville: villeQuittance,
    dateStr: dateQuittance,
    proprietaireNom: `${proprietaire.prenom || ""} ${proprietaire.nom || ""}`.trim() || "—",
    signatureImage: img,
    marginX: left,
    pageWidth,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawLocavioPdfFooterOnAllPages(pdfDoc, font, fontBold);

  return pdfDoc.save();
}
