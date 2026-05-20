import { PDFDocument, StandardFonts, type PDFFont, type PDFImage } from "pdf-lib";
import {
  PDF_BORDER,
  PDF_FOOTER_HEIGHT,
  PDF_MARGIN_X,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PDF_TABLE_ALT,
  PDF_TEXT_MAIN,
  PDF_TEXT_SECONDARY,
  PDF_VIOLET_DARK,
  PDF_WHITE,
  drawLocavioPdfFooterOnAllPages,
  drawLocavioPdfHeader,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/locavio-pdf-theme";
import { getLocavioLockupPngBytes } from "@/lib/pdf/load-locavio-lockup-png";
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

const MENTION_LEGALE_ACOMPTE =
  "Le présent versement constitue un acompte sur le prix total de la location et non des arrhes au sens de l'article 1590 du Code civil. En cas d'annulation par le preneur, l'acompte reste acquis au bailleur. En cas d'annulation par le bailleur, celui-ci devra restituer le double de l'acompte reçu.";

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
    nb_nuits?: number;
    tarif_nuit?: number;
    tarif_total?: number;
    tarif_menage?: number;
    taxe_sejour_total?: number;
    tarif_caution?: number;
    menage_inclus?: boolean;
  };
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
  voyageurNom?: string;
};

function drawRecapRow(
  page: ReturnType<PDFDocument["addPage"]>,
  font: PDFFont,
  fontBold: PDFFont,
  y: number,
  col1: string,
  col2: string,
  alt: boolean,
): number {
  const rowH = 20;
  const tableW = PDF_PAGE_W - 2 * PDF_MARGIN_X;
  const w1 = tableW * 0.68;
  page.drawRectangle({
    x: PDF_MARGIN_X,
    y: y - rowH,
    width: tableW,
    height: rowH,
    color: alt ? PDF_TABLE_ALT : PDF_WHITE,
    borderColor: PDF_BORDER,
    borderWidth: 0.4,
  });
  page.drawText(sanitizePdfText(col1), {
    x: PDF_MARGIN_X + 6,
    y: y - 13,
    size: 9,
    font,
    color: PDF_TEXT_MAIN,
  });
  const c2 = sanitizePdfText(col2);
  const tw = fontBold.widthOfTextAtSize(c2, 9);
  page.drawText(c2, {
    x: PDF_MARGIN_X + tableW - tw - 6,
    y: y - 13,
    size: 9,
    font: fontBold,
    color: PDF_TEXT_MAIN,
  });
  return y - rowH - 2;
}

export async function generateRecuAcomptePdfBuffer(input: RecuAcomptePdfInput): Promise<Uint8Array> {
  const { proprietaire, voyageur, logement, reservation, signatureImage, voyageurNom } = input;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const pageW = page.getWidth();
  const pageH = page.getHeight();

  const logoBytes = getLocavioLockupPngBytes();
  await drawLocavioPdfHeader(pdfDoc, page, font, fontBold, "REÇU D'ACOMPTE", pageH, pageW, logoBytes);
  let y = pdfContentTopAfterHeader(pageH) - 8;

  const nn = reservation.nb_nuits ?? 0;
  const tarifNuit = reservation.tarif_nuit ?? 0;
  const tarifTotal = reservation.tarif_total ?? 0;
  const tarifMenage = reservation.tarif_menage ?? 0;
  const taxeSejour = reservation.taxe_sejour_total ?? 0;
  const tarifCaution = reservation.tarif_caution ?? 0;
  const menageInclus = reservation.menage_inclus !== false;
  const totalTtc =
    tarifTotal + (menageInclus ? tarifMenage : 0) + taxeSejour + tarifCaution;

  const headerLines = [
    `Propriétaire : ${`${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim()}`,
    `Voyageur : ${`${voyageur.prenom ?? ""} ${voyageur.nom ?? ""}`.trim()}`,
    `Logement : ${String(logement.nom ?? "")}`,
    `Séjour : ${reservation.date_arrivee} -> ${reservation.date_depart}`,
  ];
  for (const line of headerLines) {
    page.drawText(sanitizePdfText(line), { x: PDF_MARGIN_X, y, size: 11, font, color: PDF_TEXT_MAIN });
    y -= 18;
  }

  y -= 4;
  page.drawText(sanitizePdfText("Détail du décompte"), {
    x: PDF_MARGIN_X,
    y,
    size: 10,
    font: fontBold,
    color: PDF_VIOLET_DARK,
  });
  y -= 16;

  const hebergementDetail =
    nn > 0 && tarifNuit > 0 ? `Hébergement (${nn} nuits × ${tarifNuit.toFixed(2)} €/nuit)` : "Hébergement";
  y = drawRecapRow(page, font, fontBold, y, hebergementDetail, `${tarifTotal.toFixed(2)} €`, false);
  y = drawRecapRow(page, font, fontBold, y, "Taxe de séjour", `${taxeSejour.toFixed(2)} €`, true);
  if (menageInclus && tarifMenage > 0) {
    y = drawRecapRow(page, font, fontBold, y, "Frais de ménage", `${tarifMenage.toFixed(2)} €`, false);
  }
  y = drawRecapRow(page, font, fontBold, y, "Caution", `${tarifCaution.toFixed(2)} €`, true);
  y = drawRecapRow(page, font, fontBold, y, "TOTAL TTC", `${totalTtc.toFixed(2)} €`, false);
  y -= 10;

  const paymentLines = [
    `Acompte reçu : ${reservation.montant_acompte.toFixed(2)} €`,
    `Solde restant dû : ${reservation.solde_restant.toFixed(2)} €`,
    `Date limite paiement du solde : ${reservation.date_limite_solde}`,
  ];
  for (const line of paymentLines) {
    page.drawText(sanitizePdfText(line), { x: PDF_MARGIN_X, y, size: 11, font, color: PDF_TEXT_MAIN });
    y -= 18;
  }

  y -= 6;
  for (const chunk of MENTION_LEGALE_ACOMPTE.match(/.{1,95}(\s|$)/g) ?? [MENTION_LEGALE_ACOMPTE]) {
    page.drawText(sanitizePdfText(chunk.trim()), {
      x: PDF_MARGIN_X,
      y,
      size: 10,
      font: fontItalic,
      color: PDF_TEXT_SECONDARY,
    });
    y -= 13;
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
  const vNom =
    voyageurNom?.trim() || `${voyageur.prenom ?? ""} ${voyageur.nom ?? ""}`.trim() || undefined;
  drawSignatureBlock(page, {
    font,
    fontBold,
    ville: sanitizePdfText(ville),
    dateStr: sanitizePdfText(new Date().toLocaleDateString("fr-FR")),
    proprietaireNom: sanitizePdfText(`${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim() || "—"),
    locataireNom: vNom ? sanitizePdfText(vNom) : undefined,
    signatureImage: img,
    marginX: PDF_MARGIN_X,
    pageWidth: pageW,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawLocavioPdfFooterOnAllPages(pdfDoc, font, fontBold);
  return pdfDoc.save();
}
