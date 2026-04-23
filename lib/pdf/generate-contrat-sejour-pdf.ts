import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import {
  PDF_MARGIN_X,
  PDF_FOOTER_HEIGHT,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PDF_TEXT_MAIN,
  PDF_TEXT_SECONDARY,
  drawProplioPdfFooterOnAllPages,
  drawProplioPdfHeader,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/proplio-pdf-theme";
import { sanitizePdfText } from "@/lib/pdf/pdf-utils";

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export type ContratSejourPdfInput = {
  proprietaire: Record<string, unknown>;
  voyageur: Record<string, unknown>;
  logement: Record<string, unknown>;
  reservation: {
    date_arrivee: string;
    date_depart: string;
    nb_voyageurs: number;
    nb_nuits: number;
    tarif_nuit: number;
    tarif_total: number;
    tarif_menage: number;
    tarif_caution: number;
    taxe_sejour_total: number;
  };
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
};

export async function generateContratSejourPdfBuffer(input: ContratSejourPdfInput): Promise<Uint8Array> {
  const { proprietaire, voyageur, logement, reservation, signatureImage } = input;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageW = page.getWidth();
  const pageH = page.getHeight();
  const right = pageW - PDF_MARGIN_X;
  const maxW = right - PDF_MARGIN_X;

  drawProplioPdfHeader(page, font, fontBold, "CONTRAT DE LOCATION\nSAISONNIÈRE", pageH, pageW);
  let y = pdfContentTopAfterHeader(pageH) - 8;

  const pNom = `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim();
  const vNom = `${voyageur.prenom ?? ""} ${voyageur.nom ?? ""}`.trim();
  const logLabel = String(logement.nom ?? "");

  const blocks: string[] = [
    `Propriétaire : ${pNom}`,
    `Voyageur : ${vNom}`,
    `Logement : ${logLabel}`,
    `Séjour du ${reservation.date_arrivee} au ${reservation.date_depart} — ${reservation.nb_nuits} nuit(s) — ${reservation.nb_voyageurs} personne(s).`,
    `Tarif nuit : ${reservation.tarif_nuit.toFixed(2)} € — Total nuitées : ${reservation.tarif_total.toFixed(2)} €`,
    `Ménage : ${reservation.tarif_menage.toFixed(2)} € — Caution : ${reservation.tarif_caution.toFixed(2)} € — Taxe de séjour : ${reservation.taxe_sejour_total.toFixed(2)} €`,
  ];

  for (const line of blocks) {
    page.drawText(sanitizePdfText(line), { x: PDF_MARGIN_X, y, size: 10, font, color: PDF_TEXT_MAIN });
    y -= 16;
  }
  y -= 8;

  const legal =
    "Le présent contrat est conclu pour une location saisonnière au sens des articles L. 324-1 et suivants du Code du tourisme. " +
    "Durée maximale du séjour : 90 jours. Le voyageur s'engage à occuper les lieux en bon père de famille. " +
    "Les parties reconnaissent avoir pris connaissance des conditions générales et du règlement intérieur éventuellement annexé. " +
    "En cas de litige, compétence des tribunaux du lieu de situation du bien.";

  for (const ln of wrapLines(legal, font, 9, maxW)) {
    if (y < PDF_FOOTER_HEIGHT + 140) break;
    page.drawText(ln, { x: PDF_MARGIN_X, y, size: 9, font, color: PDF_TEXT_SECONDARY });
    y -= 11;
  }

  const ville = String(proprietaire.ville ?? proprietaire.adresse ?? "").split(",")[0]?.trim() || "—";
  const dateStr = new Date().toLocaleDateString("fr-FR");
  const mid = pageW / 2;
  let sigY = PDF_FOOTER_HEIGHT + 118;
  page.drawText(sanitizePdfText(`Fait à ${ville}, le ${dateStr}`), {
    x: PDF_MARGIN_X,
    y: sigY + 28,
    size: 10,
    font,
    color: PDF_TEXT_SECONDARY,
  });
  page.drawText("Signature du voyageur", { x: PDF_MARGIN_X, y: sigY, size: 10, font: fontBold, color: PDF_TEXT_MAIN });
  page.drawText(sanitizePdfText(vNom || "—"), { x: PDF_MARGIN_X, y: sigY - 16, size: 10, font, color: PDF_TEXT_MAIN });
  page.drawText("Signature du propriétaire", { x: mid, y: sigY, size: 10, font: fontBold, color: PDF_TEXT_MAIN });

  let img: PDFImage | null = null;
  if (signatureImage?.bytes?.length) {
    try {
      img = signatureImage.isPng ? await pdfDoc.embedPng(signatureImage.bytes) : await pdfDoc.embedJpg(signatureImage.bytes);
    } catch {
      img = null;
    }
  }
  if (img) {
    const maxWImg = pageW / 2 - PDF_MARGIN_X - 12;
    const maxH = 40;
    const ratio = Math.min(maxWImg / img.width, maxH / img.height, 1);
    page.drawImage(img, {
      x: mid,
      y: sigY - 8 - img.height * ratio,
      width: img.width * ratio,
      height: img.height * ratio,
    });
  }
  page.drawText(sanitizePdfText(pNom || "—"), { x: mid, y: sigY - 52, size: 10, font, color: PDF_TEXT_MAIN });

  drawProplioPdfFooterOnAllPages(pdfDoc, font, fontBold);
  return pdfDoc.save();
}
