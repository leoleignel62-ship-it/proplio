import { PDFDocument, StandardFonts, type PDFImage } from "pdf-lib";
import {
  PDF_FOOTER_HEIGHT,
  PDF_MARGIN_X,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PDF_TEXT_MAIN,
  PDF_TEXT_SECONDARY,
  drawProplioPdfFooterOnAllPages,
  drawProplioPdfHeader,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/proplio-pdf-theme";
import { drawSignatureBlock } from "@/lib/pdf/pdf-utils";

function sanitizePdfText(text: string): string {
  return text
    .replace(/\u2192/g, "->") // →
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-");
}

export type RecuSoldePdfInput = {
  proprietaire: Record<string, unknown>;
  voyageur: Record<string, unknown>;
  logement: Record<string, unknown>;
  reservation: {
    date_arrivee: string;
    date_depart: string;
    tarif_total: number;
    tarif_menage: number;
    taxe_sejour_total: number;
    tarif_caution: number;
    total_ttc: number;
  };
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
};

export async function generateRecuSoldePdfBuffer(input: RecuSoldePdfInput): Promise<Uint8Array> {
  const { proprietaire, voyageur, logement, reservation, signatureImage } = input;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageW = page.getWidth();
  const pageH = page.getHeight();

  drawProplioPdfHeader(page, font, fontBold, "REÇU DE PAIEMENT", pageH, pageW);
  let y = pdfContentTopAfterHeader(pageH) - 8;

  const lines = [
    `Propriétaire : ${`${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim()}`,
    `Voyageur : ${`${voyageur.prenom ?? ""} ${voyageur.nom ?? ""}`.trim()}`,
    `Logement : ${String(logement.nom ?? "")}`,
    `Séjour : ${reservation.date_arrivee} → ${reservation.date_depart}`,
    `Loyer / nuitées : ${reservation.tarif_total.toFixed(2)} €`,
    `Ménage : ${reservation.tarif_menage.toFixed(2)} €`,
    `Taxe de séjour : ${reservation.taxe_sejour_total.toFixed(2)} €`,
    `Caution encaissée : ${reservation.tarif_caution.toFixed(2)} € (restitution selon état des lieux et dégâts éventuels)`,
    `Total TTC payé : ${reservation.total_ttc.toFixed(2)} €`,
  ];
  for (const line of lines) {
    page.drawText(sanitizePdfText(line), { x: PDF_MARGIN_X, y, size: 10, font, color: PDF_TEXT_MAIN });
    y -= 16;
  }
  y -= 6;
  page.drawText(
    sanitizePdfText("La caution sera restituée après l'état des lieux de sortie, déduction faite des sommes dues."),
    {
      x: PDF_MARGIN_X,
      y,
      size: 9,
      font,
      color: PDF_TEXT_SECONDARY,
    },
  );

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
    proprietaireNom: sanitizePdfText(`${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim() || "—"),
    signatureImage: img,
    pageWidth: pageW,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawProplioPdfFooterOnAllPages(pdfDoc, font, fontBold);
  return pdfDoc.save();
}
