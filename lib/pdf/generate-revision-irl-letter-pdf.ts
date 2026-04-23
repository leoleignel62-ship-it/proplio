import { PDFDocument, PDFPage, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import {
  PDF_BORDER as BORDER_TAB,
  PDF_INFO_BLOCK_BG,
  PDF_MARGIN_X as MARGIN,
  PDF_PAGE_H as PAGE_H,
  PDF_PAGE_W as PAGE_W,
  PDF_TABLE_ALT as TABLE_ALT,
  PDF_TABLE_HIGHLIGHT_BG as VIOLET_ROW_BG,
  PDF_TEXT_MAIN as TEXT_MAIN,
  PDF_TEXT_SECONDARY as TEXT_SEC,
  PDF_VIOLET as VIOLET,
  drawProplioPdfFooterOnAllPages,
  drawProplioPdfHeader,
  PDF_MARGIN_Y,
  pdfContentMinY,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/proplio-pdf-theme";
import { PDF_FOOTER_HEIGHT, drawSignatureBlock, sanitizePdfText } from "@/lib/pdf/pdf-utils";

const CONTENT_BOTTOM = pdfContentMinY();

const BODY_PT = 10.5;
const BODY_LEAD = 14;
const SMALL_PT = 9;

export type RevisionIrlLetterPdfInput = {
  villeSignature: string;
  dateLettre: string;
  proprietaireNom: string;
  proprietaireAdresseLignes: string[];
  proprietaireEmail?: string;
  proprietaireTelephone?: string;
  locataireNom: string;
  locataireAdresseLignes: string[];
  dateDebutBail: string;
  trimestreIrl: string;
  /** Libellé affiché à côté de l’IRL de référence (ex. trimestre ou « réf. date du bail »). */
  trimestreIrlReference: string;
  valeurIrl: string;
  irlReferenceBail: string;
  loyerAvant: string;
  loyerApres: string;
  chargesMensuelles: string;
  totalMensuel: string;
  dateEffetRevision: string;
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
};

function wrapToWidth(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = font.widthOfTextAtSize(w, size) <= maxW ? w : w.slice(0, Math.max(1, Math.floor(w.length * 0.6)));
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

const REVISION_HEADER_TITLE = "LETTRE DE RÉVISION";

function measureColHeight(
  lines: { text: string; bold?: boolean; size?: number }[],
  colW: number,
  font: PDFFont,
  fontBold: PDFFont,
): number {
  const lh = (sz: number) => sz + 4;
  let h = 0;
  for (const ln of lines) {
    const sz = ln.size ?? 10;
    const f = ln.bold ? fontBold : font;
    const wrapped = wrapToWidth(sanitizePdfText(ln.text), f, sz, colW - 4);
    h += wrapped.length * lh(sz);
  }
  return h;
}

function drawTwoColumnBlock(
  page: PDFPage,
  yTop: number,
  font: PDFFont,
  fontBold: PDFFont,
  leftLines: { text: string; bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }[],
  rightLines: { text: string; bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }[],
  dateLine: string,
): number {
  const innerW = PAGE_W - 2 * MARGIN;
  const gap = 16;
  const colW = (innerW - gap) / 2;
  const sepX = MARGIN + colW + gap / 2;

  const dateLineSafe = sanitizePdfText(dateLine);
  const dateW = font.widthOfTextAtSize(dateLineSafe, 9);
  page.drawText(sanitizePdfText(dateLineSafe), {
    x: PAGE_W - MARGIN - dateW,
    y: yTop,
    size: 9,
    font,
    color: TEXT_SEC,
  });

  const contentTop = yTop - 22;
  const hLeft = measureColHeight(leftLines, colW, font, fontBold);
  const hRight = measureColHeight(rightLines, colW, font, fontBold);
  const padTop = 10;
  const padBottom = 12;
  const boxH = padTop + Math.max(hLeft, hRight) + padBottom;
  const boxTop = contentTop;
  const boxBottom = boxTop - boxH;

  page.drawRectangle({
    x: MARGIN,
    y: boxBottom,
    width: innerW,
    height: boxH,
    color: PDF_INFO_BLOCK_BG,
    borderColor: BORDER_TAB,
    borderWidth: 0.5,
  });
  page.drawRectangle({
    x: MARGIN,
    y: boxBottom,
    width: 3,
    height: boxH,
    color: VIOLET,
  });
  page.drawLine({
    start: { x: sepX, y: boxBottom },
    end: { x: sepX, y: boxTop },
    thickness: 0.45,
    color: BORDER_TAB,
  });

  const lh = (sz: number) => sz + 4;
  const drawCol = (
    x: number,
    w: number,
    lines: { text: string; bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }[],
    startY: number,
  ) => {
    let yy = startY;
    for (const ln of lines) {
      const sz = ln.size ?? 10;
      const f = ln.bold ? fontBold : font;
      const col = ln.color ?? TEXT_MAIN;
      for (const wl of wrapToWidth(sanitizePdfText(ln.text), f, sz, w - 4)) {
        page.drawText(sanitizePdfText(wl), { x: x + 8, y: yy, size: sz, font: f, color: col });
        yy -= lh(sz);
      }
    }
  };

  drawCol(MARGIN, colW, leftLines, boxTop - padTop);
  drawCol(MARGIN + colW + gap, colW, rightLines, boxTop - padTop);

  return boxBottom - 20;
}

function drawTableRevision(
  page: PDFPage,
  yTop: number,
  font: PDFFont,
  fontBold: PDFFont,
  rows: { label: string; value: string; highlight?: boolean; alt?: boolean }[],
): number {
  const innerW = PAGE_W - 2 * MARGIN;
  const labelW = innerW * 0.48;
  const rowH = 26;
  let y = yTop;
  const x0 = MARGIN;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const yBottom = y - rowH;
    if (r.highlight) {
      page.drawRectangle({
        x: x0,
        y: yBottom,
        width: innerW,
        height: rowH,
        color: VIOLET_ROW_BG,
      });
    } else if (r.alt) {
      page.drawRectangle({
        x: x0,
        y: yBottom,
        width: innerW,
        height: rowH,
        color: TABLE_ALT,
      });
    }
    page.drawRectangle({
      x: x0,
      y: yBottom,
      width: innerW,
      height: rowH,
      borderColor: BORDER_TAB,
      borderWidth: 0.5,
    });
    page.drawLine({
      start: { x: x0 + labelW, y: yBottom },
      end: { x: x0 + labelW, y: y },
      thickness: 0.5,
      color: BORDER_TAB,
    });

    const vy = yBottom + (rowH - 10) / 2;
    page.drawText(sanitizePdfText(r.label), {
      x: x0 + 8,
      y: vy,
      size: 10,
      font: r.highlight ? fontBold : font,
      color: TEXT_MAIN,
    });
    page.drawText(sanitizePdfText(r.value), {
      x: x0 + labelW + 8,
      y: vy,
      size: 10,
      font: r.highlight ? fontBold : font,
      color: r.highlight ? TEXT_MAIN : TEXT_SEC,
    });
    y = yBottom;
  }
  return y - 12;
}

export async function generateRevisionIrlLetterPdfBuffer(
  input: RevisionIrlLetterPdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const leftCol: { text: string; bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }[] = [
    { text: "Expéditeur", bold: true, size: 9, color: TEXT_SEC },
    { text: input.proprietaireNom, bold: true, size: 11 },
    ...input.proprietaireAdresseLignes.map((t) => ({ text: t, size: 10 as const })),
  ];
  if (input.proprietaireEmail?.trim()) {
    leftCol.push({ text: input.proprietaireEmail.trim(), size: 10 });
  }
  if (input.proprietaireTelephone?.trim()) {
    leftCol.push({ text: `Tél. ${input.proprietaireTelephone.trim()}`, size: 10 });
  }

  const rightCol: { text: string; bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }[] = [
    { text: "Destinataire", bold: true, size: 9, color: TEXT_SEC },
    { text: input.locataireNom, bold: true, size: 11 },
    ...input.locataireAdresseLignes.map((t) => ({ text: t, size: 10 as const })),
  ];

  const dateLine = `${input.villeSignature}, le ${input.dateLettre}`;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  drawProplioPdfHeader(page, font, fontBold, REVISION_HEADER_TITLE);

  let y = pdfContentTopAfterHeader() - 8;

  y = drawTwoColumnBlock(page, y, font, fontBold, leftCol, rightCol, dateLine);

  const SIG_AND_FOOTER_PTS = 150;
  const yMinAboveSignatureBand = PDF_MARGIN_Y + SIG_AND_FOOTER_PTS;

  const ensureSpace = (needed: number) => {
    if (y < CONTENT_BOTTOM + needed) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      drawProplioPdfHeader(page, font, fontBold, REVISION_HEADER_TITLE);
      y = pdfContentTopAfterHeader() - 12;
    }
  };

  const drawParagraph = (text: string, opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }) => {
    const sz = opts?.size ?? BODY_PT;
    const f = opts?.bold ? fontBold : font;
    const col = opts?.color ?? TEXT_MAIN;
    const cleaned = sanitizePdfText(text);
    for (const line of wrapToWidth(cleaned, f, sz, PAGE_W - 2 * MARGIN)) {
      ensureSpace(BODY_LEAD + 4);
      page.drawText(sanitizePdfText(line), { x: MARGIN, y, size: sz, font: f, color: col });
      y -= BODY_LEAD;
    }
  };

  ensureSpace(48);
  const objet = sanitizePdfText("Objet : Révision annuelle du loyer");
  page.drawText(sanitizePdfText(objet), {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: TEXT_MAIN,
  });
  const ow = fontBold.widthOfTextAtSize(objet, 11);
  page.drawLine({
    start: { x: MARGIN, y: y - 2 },
    end: { x: MARGIN + ow, y: y - 2 },
    thickness: 0.75,
    color: TEXT_MAIN,
  });
  y -= 20;
  drawParagraph(`Bail du ${input.dateDebutBail}`, { size: SMALL_PT, color: TEXT_SEC });
  y -= 4;

  drawParagraph(
    "Madame, Monsieur,",
    { bold: false },
  );
  y -= 2;

  drawParagraph(
    "Conformément à l'article 17-1 de la loi n°89-462 du 6 juillet 1989 et à la clause de révision prévue au contrat de bail signé le " +
      `${input.dateDebutBail}, nous vous informons de la révision annuelle de votre loyer.`,
  );
  y -= 2;

  drawParagraph(
    "Cette révision est calculée sur la base de l'Indice de Référence des Loyers (IRL) publié par l'INSEE.",
  );
  y -= 8;

  ensureSpace(155);
  const tableRows = [
    {
      label: "IRL de référence",
      value: `${input.irlReferenceBail} (${input.trimestreIrlReference})`,
      alt: true,
    },
    { label: "IRL applicable", value: `${input.valeurIrl} (${input.trimestreIrl})` },
    { label: "Loyer actuel HC", value: `${input.loyerAvant} €`, alt: true },
    { label: "Nouveau loyer HC", value: `${input.loyerApres} €`, highlight: true },
    { label: "Charges mensuelles", value: `${input.chargesMensuelles} €` },
    { label: "Total mensuel", value: `${input.totalMensuel} €`, highlight: true },
  ];
  y = drawTableRevision(page, y, font, fontBold, tableRows);
  y -= 4;

  /** ~hauteur des 3 derniers paragraphes + marge avant le bandeau signature fixe (150 pt + marge basse). */
  const closingBlockApprox = 120;
  if (y < yMinAboveSignatureBand + closingBlockApprox) {
    page = doc.addPage([PAGE_W, PAGE_H]);
    drawProplioPdfHeader(page, font, fontBold, REVISION_HEADER_TITLE);
    y = pdfContentTopAfterHeader() - 12;
  }

  drawParagraph(`Cette révision prendra effet à compter du ${input.dateEffetRevision}.`);
  y -= 2;
  drawParagraph("Nous restons à votre disposition pour tout renseignement complémentaire.");
  y -= 2;
  drawParagraph(
    "Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
  );
  y -= 14;

  let sigImg: PDFImage | null = null;
  if (input.signatureImage?.bytes?.length) {
    try {
      sigImg = input.signatureImage.isPng
        ? await doc.embedPng(input.signatureImage.bytes)
        : await doc.embedJpg(input.signatureImage.bytes);
    } catch {
      sigImg = null;
    }
  }

  drawSignatureBlock(page, {
    font,
    fontBold,
    ville: input.villeSignature || "—",
    dateStr: input.dateLettre || "—",
    proprietaireNom: input.proprietaireNom,
    signatureImage: sigImg,
    marginX: MARGIN,
    pageWidth: PAGE_W,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawProplioPdfFooterOnAllPages(doc, font, fontBold);

  return doc.save();
}
