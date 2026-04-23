import { PDFDocument, StandardFonts, type PDFFont, type PDFImage } from "pdf-lib";
import {
  PDF_FOOTER_HEIGHT,
  PDF_MARGIN_X,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PDF_TEXT_MAIN,
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

export type RecuAcomptePdfInput = {
  proprietaire: Record<string, unknown>;
  voyageur: Record<string, unknown>;
  logement: Record<string, unknown>;
  reservation: {
    date_arrivee: string;
    date_depart: string;
    montant_acompte: number;
    solde_restant: number;
    date_limite_solde: string;
  };
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
};

export async function generateRecuAcomptePdfBuffer(input: RecuAcomptePdfInput): Promise<Uint8Array> {
  const { proprietaire, voyageur, logement, reservation, signatureImage } = input;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageW = page.getWidth();
  const pageH = page.getHeight();

  drawProplioPdfHeader(page, font, fontBold, "REÇU D'ACOMPTE", pageH, pageW);
  let y = pdfContentTopAfterHeader(pageH) - 8;

  const lines = [
    `Propriétaire : ${`${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim()}`,
    `Voyageur : ${`${voyageur.prenom ?? ""} ${voyageur.nom ?? ""}`.trim()}`,
    `Logement : ${String(logement.nom ?? "")}`,
    `Séjour : ${reservation.date_arrivee} → ${reservation.date_depart}`,
    `Acompte reçu : ${reservation.montant_acompte.toFixed(2)} €`,
    `Solde restant dû : ${reservation.solde_restant.toFixed(2)} €`,
    `Date limite paiement du solde : ${reservation.date_limite_solde}`,
  ];
  for (const line of lines) {
    page.drawText(sanitizePdfText(line), { x: PDF_MARGIN_X, y, size: 11, font, color: PDF_TEXT_MAIN });
    y -= 18;
  }

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
