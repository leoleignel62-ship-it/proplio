import { PDFDocument, StandardFonts, type PDFImage } from "pdf-lib";
import {
  PDF_BORDER,
  PDF_FOOTER_HEIGHT,
  PDF_MARGIN_X,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PDF_TABLE_ALT,
  PDF_TEXT_MAIN,
  PDF_TEXT_SECONDARY,
  PDF_WHITE,
  drawLocavioPdfFooterOnAllPages,
  drawLocavioPdfHeader,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/locavio-pdf-theme";
import { getLocavioLockupPngBytes } from "@/lib/pdf/load-locavio-lockup-png";
import { drawSignatureBlock, sanitizePdfText } from "@/lib/pdf/pdf-utils";

export type TaxeSejourRowPdf = {
  dates: string;
  voyageurs: string;
  nuits: number;
  nuitees_exonerees?: number;
  motif_exoneration?: string | null;
  tarif_pp_n: number;
  total: number;
};

export type TaxeSejourPdfInput = {
  periodeLabel: string;
  proprietaire: Record<string, unknown>;
  rows: TaxeSejourRowPdf[];
  totalAReverser: number;
  commune?: string | null;
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
};

const REFERENCE_LEGALE =
  "Déclaration établie conformément aux articles L.2333-26 et suivants du Code général des collectivités territoriales (CGCT). La taxe de séjour est collectée par le loueur pour le compte de la commune et doit lui être reversée selon les modalités et échéances fixées par délibération municipale.";

const NOTE_EXONERATIONS =
  "Exonérations légales applicables (article L.2333-31 du CGCT) : mineurs de moins de 18 ans, personnes bénéficiant d'un hébergement d'urgence ou d'un relogement temporaire, titulaires d'un contrat de travail saisonnier dans la commune.";

function wrapLegal(text: string, maxLen: number): string[] {
  const m = text.match(new RegExp(`.{1,${maxLen}}(\\s|$)`, "g"));
  return m ?? [text];
}

function motifExonerationLabel(value: string): string {
  const labels: Record<string, string> = {
    mineurs: "Mineurs de moins de 18 ans",
    handicap: "Personnes en situation de handicap",
    saisonnier: "Travailleurs saisonniers de la commune",
    urgence: "Hébergement d'urgence / relogement temporaire",
    autre: "Autre motif",
  };
  return labels[value] ?? value;
}

export async function generateTaxeSejourPdfBuffer(input: TaxeSejourPdfInput): Promise<Uint8Array> {
  const { periodeLabel, proprietaire, rows, totalAReverser, commune, signatureImage } = input;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const pageW = page.getWidth();
  const pageH = page.getHeight();
  const right = pageW - PDF_MARGIN_X;

  const logoBytes = getLocavioLockupPngBytes();
  await drawLocavioPdfHeader(pdfDoc, page, font, fontBold, "RÉCAPITULATIF TAXE DE SÉJOUR", pageH, pageW, logoBytes);
  let y = pdfContentTopAfterHeader(pageH) - 8;

  for (const ln of wrapLegal(REFERENCE_LEGALE, 105)) {
    page.drawText(sanitizePdfText(ln.trim()), {
      x: PDF_MARGIN_X,
      y,
      size: 10,
      font,
      color: PDF_TEXT_MAIN,
    });
    y -= 13;
  }
  y -= 6;

  page.drawText(sanitizePdfText(`Période : ${periodeLabel}`), {
    x: PDF_MARGIN_X,
    y,
    size: 11,
    font: fontBold,
    color: PDF_TEXT_MAIN,
  });
  y -= 22;
  page.drawText(
    sanitizePdfText(
      `Déclarant : ${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim() || "—",
    ),
    { x: PDF_MARGIN_X, y, size: 10, font, color: PDF_TEXT_MAIN },
  );
  y -= 16;
  if (commune) {
    page.drawText(sanitizePdfText(`Commune : ${commune}`), {
      x: PDF_MARGIN_X,
      y,
      size: 10,
      font,
      color: PDF_TEXT_SECONDARY,
    });
    y -= 20;
  }

  const tableX = PDF_MARGIN_X;
  const tableW = right - PDF_MARGIN_X;
  const rowH = 22;
  const headers = ["Dates", "Voyageurs", "Nuits", "Exonérées", "€/p/n", "Total"];
  const colW = [
    tableW * 0.2,
    tableW * 0.16,
    tableW * 0.1,
    tableW * 0.12,
    tableW * 0.16,
    tableW * 0.26,
  ];

  page.drawRectangle({
    x: tableX,
    y: y - rowH,
    width: tableW,
    height: rowH,
    color: PDF_TABLE_ALT,
    borderColor: PDF_BORDER,
    borderWidth: 0.5,
  });
  let x = tableX + 6;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i]!, { x, y: y - 15, size: 9, font: fontBold, color: PDF_TEXT_MAIN });
    x += colW[i]!;
  }
  y -= rowH;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!;
    const exonerLabel =
      row.nuitees_exonerees != null && row.nuitees_exonerees > 0 ? String(row.nuitees_exonerees) : "—";
    page.drawRectangle({
      x: tableX,
      y: y - rowH,
      width: tableW,
      height: rowH,
      color: r % 2 === 0 ? PDF_TABLE_ALT : PDF_WHITE,
      borderColor: PDF_BORDER,
      borderWidth: 0.5,
    });
    const cells = [
      row.dates,
      row.voyageurs,
      String(row.nuits),
      exonerLabel,
      row.tarif_pp_n.toFixed(2),
      row.total.toFixed(2) + " €",
    ];
    let cx = tableX + 6;
    for (let i = 0; i < cells.length; i++) {
      page.drawText(sanitizePdfText(cells[i]!), { x: cx, y: y - 15, size: 9, font, color: PDF_TEXT_MAIN });
      cx += colW[i]!;
    }
    y -= rowH;
    if (row.motif_exoneration?.trim()) {
      page.drawText(
        sanitizePdfText(`Motif : ${motifExonerationLabel(row.motif_exoneration.trim())}`),
        {
          x: tableX + 6,
          y: y - 11,
          size: 9,
          font: fontItalic,
          color: PDF_TEXT_SECONDARY,
        },
      );
      y -= 14;
    }
    if (y < 180) break;
  }

  y -= 10;
  for (const ln of wrapLegal(NOTE_EXONERATIONS, 105)) {
    page.drawText(sanitizePdfText(ln.trim()), {
      x: PDF_MARGIN_X,
      y,
      size: 9,
      font,
      color: PDF_TEXT_SECONDARY,
    });
    y -= 12;
  }

  y -= 8;
  page.drawText(`Total à reverser à la mairie : ${totalAReverser.toFixed(2)} €`, {
    x: PDF_MARGIN_X,
    y,
    size: 12,
    font: fontBold,
    color: PDF_TEXT_MAIN,
  });
  y -= 28;

  const declarantNom = `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim() || "—";
  const declarationText = `Je soussigné(e) ${declarantNom}, déclare que les informations figurant dans le présent récapitulatif sont exactes et sincères.`;
  for (const ln of wrapLegal(declarationText, 105)) {
    page.drawText(sanitizePdfText(ln.trim()), {
      x: PDF_MARGIN_X,
      y,
      size: 10,
      font,
      color: PDF_TEXT_MAIN,
    });
    y -= 13;
  }
  y -= 6;

  let img: PDFImage | null = null;
  if (signatureImage?.bytes?.length) {
    try {
      img = signatureImage.isPng ? await pdfDoc.embedPng(signatureImage.bytes) : await pdfDoc.embedJpg(signatureImage.bytes);
    } catch {
      img = null;
    }
  }

  const ville = String(proprietaire.ville ?? "").trim() || "—";
  drawSignatureBlock(page, {
    font,
    fontBold,
    ville: sanitizePdfText(ville),
    dateStr: sanitizePdfText(new Date().toLocaleDateString("fr-FR")),
    proprietaireNom: sanitizePdfText(declarantNom),
    signatureImage: img,
    marginX: PDF_MARGIN_X,
    pageWidth: pageW,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawLocavioPdfFooterOnAllPages(pdfDoc, font, fontBold);
  return pdfDoc.save();
}
