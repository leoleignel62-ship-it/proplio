import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  PDF_BORDER,
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
import { sanitizePdfText } from "@/lib/pdf/pdf-utils";

export type TaxeSejourRowPdf = {
  dates: string;
  voyageurs: string;
  nuits: number;
  tarif_pp_n: number;
  total: number;
};

export type TaxeSejourPdfInput = {
  periodeLabel: string;
  proprietaire: Record<string, unknown>;
  rows: TaxeSejourRowPdf[];
  totalAReverser: number;
  commune?: string | null;
};

export async function generateTaxeSejourPdfBuffer(input: TaxeSejourPdfInput): Promise<Uint8Array> {
  const { periodeLabel, proprietaire, rows, totalAReverser, commune } = input;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageW = page.getWidth();
  const pageH = page.getHeight();
  const right = pageW - PDF_MARGIN_X;

  const logoBytes = getLocavioLockupPngBytes();
  await drawLocavioPdfHeader(pdfDoc, page, font, fontBold, "RÉCAPITULATIF TAXE DE SÉJOUR", pageH, pageW, logoBytes);
  let y = pdfContentTopAfterHeader(pageH) - 8;

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
  const headers = ["Dates", "Voyageurs", "Nuits", "€/p/n", "Total"];
  const colW = [tableW * 0.28, tableW * 0.22, 0.12 * tableW, 0.18 * tableW, 0.2 * tableW];

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
      row.tarif_pp_n.toFixed(2),
      row.total.toFixed(2) + " €",
    ];
    let cx = tableX + 6;
    for (let i = 0; i < cells.length; i++) {
      page.drawText(sanitizePdfText(cells[i]!), { x: cx, y: y - 15, size: 9, font, color: PDF_TEXT_MAIN });
      cx += colW[i]!;
    }
    y -= rowH;
    if (y < 120) break;
  }

  y -= 12;
  page.drawText(`Total à reverser à la mairie : ${totalAReverser.toFixed(2)} €`, {
    x: PDF_MARGIN_X,
    y,
    size: 12,
    font: fontBold,
    color: PDF_TEXT_MAIN,
  });

  drawLocavioPdfFooterOnAllPages(pdfDoc, font, fontBold);
  return pdfDoc.save();
}
