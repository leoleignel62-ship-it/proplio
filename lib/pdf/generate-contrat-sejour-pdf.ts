import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import {
  PDF_MARGIN_X,
  PDF_FOOTER_HEIGHT,
  PDF_INFO_BLOCK_BG,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PDF_TABLE_ALT,
  PDF_TEXT_MAIN,
  PDF_TEXT_SECONDARY,
  PDF_VIOLET,
  PDF_VIOLET_DARK,
  PDF_VIOLET_LIGHT,
  PDF_BORDER,
  PDF_TABLE_HIGHLIGHT_BG,
  drawLocavioPdfFooterOnAllPages,
  drawLocavioPdfHeader,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/locavio-pdf-theme";
import { getLocavioLockupPngBytes } from "@/lib/pdf/load-locavio-lockup-png";
import { drawSignatureBlock, sanitizePdfText } from "@/lib/pdf/pdf-utils";

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

function formatDateFr(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatHeure(h: string): string {
  const t = h.trim();
  if (t.length >= 5) return t.slice(0, 5);
  return t || "—";
}

function formatEuro(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

type PdfCtx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  fontBold: PDFFont;
  logoImageBytes: Uint8Array | null;
};

const HEADER_RIGHT =
  "CONTRAT DE LOCATION SAISONNIÈRE\nArticles L.324-1 et suivants\ndu Code du tourisme";

async function startPage(ctx: PdfCtx): Promise<void> {
  ctx.page = ctx.doc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  await drawLocavioPdfHeader(
    ctx.doc,
    ctx.page,
    ctx.font,
    ctx.fontBold,
    HEADER_RIGHT,
    PDF_PAGE_H,
    PDF_PAGE_W,
    ctx.logoImageBytes,
  );
  ctx.y = pdfContentTopAfterHeader(PDF_PAGE_H) - 10;
}

async function ensureSpace(ctx: PdfCtx, minYNeeded: number): Promise<void> {
  if (ctx.y >= PDF_FOOTER_HEIGHT + minYNeeded) return;
  await startPage(ctx);
}

async function drawSectionTitle(ctx: PdfCtx, title: string, size = 11): Promise<void> {
  await ensureSpace(ctx, 36);
  const barH = 22;
  ctx.page.drawRectangle({
    x: PDF_MARGIN_X + 3,
    y: ctx.y - barH + 2,
    width: PDF_PAGE_W - 2 * PDF_MARGIN_X - 3,
    height: barH,
    color: PDF_VIOLET_LIGHT,
    borderColor: PDF_BORDER,
    borderWidth: 0.5,
  });
  ctx.page.drawRectangle({
    x: PDF_MARGIN_X,
    y: ctx.y - barH + 2,
    width: 3,
    height: barH,
    color: PDF_VIOLET,
  });
  ctx.page.drawText(sanitizePdfText(title), {
    x: PDF_MARGIN_X + 10,
    y: ctx.y - 12,
    size,
    font: ctx.fontBold,
    color: PDF_VIOLET_DARK,
  });
  ctx.y -= barH + 8;
}

async function drawParagraph(ctx: PdfCtx, text: string, size = 9, bold = false): Promise<void> {
  const maxW = PDF_PAGE_W - 2 * PDF_MARGIN_X;
  const font = bold ? ctx.fontBold : ctx.font;
  const lines = wrapLines(text, font, size, maxW);
  for (const ln of lines) {
    await ensureSpace(ctx, 16);
    ctx.page.drawText(ln, {
      x: PDF_MARGIN_X,
      y: ctx.y,
      size,
      font,
      color: PDF_TEXT_MAIN,
    });
    ctx.y -= size + 3;
  }
  ctx.y -= 4;
}

async function drawTwoColBlock(
  ctx: PdfCtx,
  leftTitle: string,
  leftLines: string[],
  rightTitle: string,
  rightLines: string[],
): Promise<void> {
  await ensureSpace(ctx, 120);
  const mid = PDF_PAGE_W / 2;
  const gap = 12;
  const colW = (PDF_PAGE_W - 2 * PDF_MARGIN_X - gap) / 2;
  const xL = PDF_MARGIN_X;
  const xR = mid + gap / 2;
  const textInset = 10;
  const xTextL = xL + textInset;
  const xTextR = xR + textInset;
  const colTextMaxW = colW - textInset - 4;
  let yTop = ctx.y;
  const cardH = 94;

  ctx.page.drawRectangle({
    x: xL + 3,
    y: yTop - cardH,
    width: colW - 3,
    height: cardH,
    color: PDF_INFO_BLOCK_BG,
    borderColor: PDF_BORDER,
    borderWidth: 0.5,
  });
  ctx.page.drawRectangle({
    x: xL,
    y: yTop - cardH,
    width: 3,
    height: cardH,
    color: PDF_VIOLET,
  });
  ctx.page.drawRectangle({
    x: xR + 3,
    y: yTop - cardH,
    width: colW - 3,
    height: cardH,
    color: PDF_INFO_BLOCK_BG,
    borderColor: PDF_BORDER,
    borderWidth: 0.5,
  });
  ctx.page.drawRectangle({
    x: xR,
    y: yTop - cardH,
    width: 3,
    height: cardH,
    color: PDF_VIOLET,
  });

  ctx.page.drawText(sanitizePdfText(leftTitle), { x: xTextL, y: yTop, size: 9, font: ctx.fontBold, color: PDF_VIOLET });
  ctx.page.drawText(sanitizePdfText(rightTitle), { x: xTextR, y: yTop, size: 9, font: ctx.fontBold, color: PDF_VIOLET });
  yTop -= 14;

  const drawCol = (x: number, lines: string[], maxWidth: number) => {
    let yy = yTop;
    for (const line of lines) {
      for (const ln of wrapLines(line, ctx.font, 8.5, maxWidth)) {
        if (yy < PDF_FOOTER_HEIGHT + 24) return yy;
        ctx.page.drawText(ln, { x, y: yy, size: 8.5, font: ctx.font, color: PDF_TEXT_SECONDARY });
        yy -= 10;
      }
    }
    return yy;
  };

  const yEndL = drawCol(xTextL, leftLines, colTextMaxW);
  const yEndR = drawCol(xTextR, rightLines, colTextMaxW);
  ctx.y = Math.min(yEndL, yEndR) - 12;
}

/** Ligne simple : label | valeur (2 colonnes) */
async function drawKeyValueRow(ctx: PdfCtx, label: string, value: string, rowH = 18): Promise<void> {
  await ensureSpace(ctx, rowH + 4);
  ctx.page.drawRectangle({
    x: PDF_MARGIN_X,
    y: ctx.y - rowH + 2,
    width: PDF_PAGE_W - 2 * PDF_MARGIN_X,
    height: rowH,
    borderColor: PDF_BORDER,
    borderWidth: 0.4,
    color: rgb(1, 1, 1),
  });
  ctx.page.drawText(sanitizePdfText(label), {
    x: PDF_MARGIN_X + 6,
    y: ctx.y - 12,
    size: 9,
    font: ctx.fontBold,
    color: PDF_TEXT_MAIN,
  });
  const v = sanitizePdfText(value);
  const vw = ctx.font.widthOfTextAtSize(v, 9);
  ctx.page.drawText(v, {
    x: PDF_PAGE_W - PDF_MARGIN_X - vw - 6,
    y: ctx.y - 12,
    size: 9,
    font: ctx.font,
    color: PDF_TEXT_MAIN,
  });
  ctx.y -= rowH + 2;
}

/** Tableau 3 colonnes : libellé | détail | montant */
async function drawTarifRow(
  ctx: PdfCtx,
  col1: string,
  col2: string,
  col3: string,
  opts?: { bold?: boolean; highlight?: boolean },
): Promise<void> {
  const rowH = 20;
  await ensureSpace(ctx, rowH + 4);
  const w = PDF_PAGE_W - 2 * PDF_MARGIN_X;
  const w1 = w * 0.34;
  const w2 = w * 0.38;
  const w3 = w - w1 - w2;
  const yRect = ctx.y - rowH + 2;
  ctx.page.drawRectangle({
    x: PDF_MARGIN_X,
    y: yRect,
    width: w,
    height: rowH,
    borderColor: PDF_BORDER,
    borderWidth: 0.4,
    color: opts?.highlight ? PDF_TABLE_HIGHLIGHT_BG : Math.floor((ctx.y / rowH)) % 2 === 0 ? rgb(1, 1, 1) : PDF_TABLE_ALT,
  });
  const font = opts?.bold ? ctx.fontBold : ctx.font;
  const fs = opts?.bold ? 9.5 : 9;
  ctx.page.drawText(sanitizePdfText(col1), {
    x: PDF_MARGIN_X + 5,
    y: ctx.y - 13,
    size: fs,
    font,
    color: opts?.bold ? PDF_VIOLET_DARK : PDF_TEXT_MAIN,
  });
  ctx.page.drawText(sanitizePdfText(col2), {
    x: PDF_MARGIN_X + w1 + 5,
    y: ctx.y - 13,
    size: 9,
    font: ctx.font,
    color: PDF_TEXT_SECONDARY,
  });
  const c3 = sanitizePdfText(col3);
  const tw = ctx.fontBold.widthOfTextAtSize(c3, fs);
  ctx.page.drawText(c3, {
    x: PDF_MARGIN_X + w1 + w2 + w3 - tw - 5,
    y: ctx.y - 13,
    size: fs,
    font: opts?.bold ? ctx.fontBold : ctx.font,
    color: PDF_TEXT_MAIN,
  });
  ctx.y -= rowH + 2;
}

async function drawArticle(ctx: PdfCtx, num: number, title: string, body: string): Promise<void> {
  await drawSectionTitle(ctx, `Article ${num} - ${title}`, 10);
  await drawParagraph(ctx, body, 9);
}

export type ContratSejourPdfInput = {
  proprietaire: Record<string, unknown>;
  voyageur: Record<string, unknown>;
  logement: Record<string, unknown>;
  reservation: {
    date_arrivee: string;
    date_depart: string;
    heure_arrivee: string;
    heure_depart: string;
    nb_voyageurs: number;
    nb_nuits: number;
    tarif_nuit: number;
    tarif_total: number;
    tarif_menage: number;
    /** false = ménage à la charge du voyageur (tarif_menage attendu à 0 en base) */
    menage_inclus?: boolean;
    tarif_caution: number;
    taxe_sejour_total: number;
    montant_acompte: number;
  };
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
};

export async function generateContratSejourPdfBuffer(input: ContratSejourPdfInput): Promise<Uint8Array> {
  const { proprietaire, voyageur, logement, reservation, signatureImage } = input;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pNom = `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim();
  const pAdresse = [proprietaire.adresse, [proprietaire.code_postal, proprietaire.ville].filter(Boolean).join(" ")]
    .filter((x) => String(x ?? "").trim())
    .join(", ");
  const pEmail = String(proprietaire.email ?? "").trim();
  const pTel = String(proprietaire.telephone ?? "").trim();

  const vNom = `${voyageur.prenom ?? ""} ${voyageur.nom ?? ""}`.trim();
  const vEmail = String(voyageur.email ?? "").trim();
  const vTel = String(voyageur.telephone ?? "").trim();
  const vNat = String(voyageur.nationalite ?? "").trim() || "—";

  const logAdresse = [logement.adresse, [logement.code_postal, logement.ville].filter(Boolean).join(" ")]
    .filter((x) => String(x ?? "").trim())
    .join(", ");
  const logType = String(logement.type ?? "").trim();
  const surface = logement.surface != null && Number(logement.surface) > 0 ? `${Number(logement.surface)} m²` : "";
  const typeSurface =
    logType && surface ? `${logType} — ${surface}` : logType || surface || "—";
  const capMax =
    logement.capacite_max != null && Number(logement.capacite_max) > 0
      ? String(logement.capacite_max)
      : "—";
  const equipementsArr = Array.isArray(logement.equipements_saisonnier)
    ? (logement.equipements_saisonnier as unknown[]).filter((e): e is string => typeof e === "string")
    : [];
  const equipementsStr = equipementsArr.length > 0 ? equipementsArr.join(", ") : "Non renseigné";
  const reglement = String(logement.reglement_interieur ?? "").trim();

  const hArr = formatHeure(reservation.heure_arrivee);
  const hDep = formatHeure(reservation.heure_depart);
  const dArr = formatDateFr(reservation.date_arrivee);
  const dDep = formatDateFr(reservation.date_depart);

  const nv = Math.max(1, reservation.nb_voyageurs);
  const nn = Math.max(0, reservation.nb_nuits);
  const taxe = reservation.taxe_sejour_total;
  const taxeDetailDenom = nv * nn;
  const taxeUnit =
    taxeDetailDenom > 0 && taxe > 0 ? taxe / taxeDetailDenom : 0;
  const taxeDetailStr =
    taxe <= 0
      ? "—"
      : `${nv} pers. × ${nn} nuit(s) × ${taxeUnit.toFixed(2)} €`;

  const menageInclus = reservation.menage_inclus !== false;
  const tarifMenagePourTotal = menageInclus ? reservation.tarif_menage : 0;
  const baseLocative = reservation.tarif_total + tarifMenagePourTotal + taxe;
  const totalTtc = baseLocative + reservation.tarif_caution;
  const acompte = reservation.montant_acompte;
  const acomptePct =
    baseLocative > 0 ? Math.round((acompte / baseLocative) * 1000) / 10 : 0;
  const soldeAvantArrivee = Math.max(0, totalTtc - acompte);

  const villeBailleur = String(proprietaire.ville ?? "").trim() || String(proprietaire.adresse ?? "").split(",")[0]?.trim() || "—";
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const logoBytes = getLocavioLockupPngBytes();
  const firstPage = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  await drawLocavioPdfHeader(pdfDoc, firstPage, font, fontBold, HEADER_RIGHT, PDF_PAGE_H, PDF_PAGE_W, logoBytes);
  const ctx: PdfCtx = {
    doc: pdfDoc,
    page: firstPage,
    y: 0,
    font,
    fontBold,
    logoImageBytes: logoBytes,
  };
  ctx.y = pdfContentTopAfterHeader(PDF_PAGE_H) - 10;

  await drawTwoColBlock(
    ctx,
    "LE BAILLEUR",
    [
      pNom || "—",
      pAdresse || "—",
      pEmail ? `E-mail : ${pEmail}` : "",
      pTel ? `Tél. : ${pTel}` : "",
    ].filter(Boolean),
    "LE PRENEUR",
    [
      vNom || "—",
      vEmail ? `E-mail : ${vEmail}` : "",
      vTel ? `Tél. : ${vTel}` : "",
      `Nationalité : ${vNat}`,
    ].filter(Boolean),
  );

  await drawSectionTitle(ctx, "DÉSIGNATION DU BIEN");
  await drawParagraph(ctx, `Adresse : ${logAdresse || "—"}`);
  await drawParagraph(ctx, `Type et surface : ${typeSurface}`);
  await drawParagraph(ctx, `Capacité maximale : ${capMax} personne(s).`);
  await drawParagraph(ctx, `Équipements : ${equipementsStr}`);

  await drawSectionTitle(ctx, "CONDITIONS DE LOCATION");
  await drawKeyValueRow(ctx, "Arrivée", `${dArr} à ${hArr}`);
  await drawKeyValueRow(ctx, "Départ", `${dDep} à ${hDep}`);
  await drawKeyValueRow(ctx, "Durée", `${nn} nuit(s)`);
  await drawKeyValueRow(ctx, "Personnes", `${nv}`);

  await drawSectionTitle(ctx, "TARIFS");
  await drawTarifRow(ctx, "Libellé", "Détail", "Montant", { bold: true, highlight: true });
  const nuitsTarifStr = `${nn} nuit(s) × ${reservation.tarif_nuit.toFixed(2)} €`;
  await drawTarifRow(ctx, "Hébergement", nuitsTarifStr, formatEuro(reservation.tarif_total));
  await drawTarifRow(ctx, "Taxe de séjour", taxeDetailStr, formatEuro(taxe));
  if (menageInclus) {
    await drawTarifRow(ctx, "Frais de ménage", "", formatEuro(tarifMenagePourTotal));
  } else {
    await drawTarifRow(ctx, "Ménage", "À la charge du preneur", "—");
  }
  await drawTarifRow(ctx, "Caution", "(remboursable)", formatEuro(reservation.tarif_caution));
  await drawTarifRow(ctx, "TOTAL TTC", "", formatEuro(totalTtc), { bold: true, highlight: true });

  if (!menageInclus) {
    await drawParagraph(
      ctx,
      "Le ménage est à la charge du preneur. Le logement devra être rendu propre et en ordre.",
      9,
    );
  }

  await drawSectionTitle(ctx, "MODALITÉS DE PAIEMENT");
  await drawParagraph(
    ctx,
    `Acompte : ${acomptePct}% soit ${formatEuro(acompte)} à la signature.`,
  );
  await drawParagraph(ctx, `Solde : ${formatEuro(soldeAvantArrivee)} dû avant l'arrivée.`);
  await drawParagraph(
    ctx,
    `Caution : ${formatEuro(reservation.tarif_caution)} restituée sous 7 jours après départ sous réserve d'état des lieux.`,
  );

  await drawSectionTitle(ctx, "CONDITIONS GÉNÉRALES");
  await drawArticle(
    ctx,
    1,
    "OBJET ET DURÉE",
    "Le présent contrat a pour objet la location saisonnière du bien désigné ci-dessus, conformément aux articles L.324-1 et suivants du Code du tourisme. La durée de la location ne peut excéder 90 jours consécutifs.",
  );
  await drawArticle(
    ctx,
    2,
    "OCCUPATION",
    "Le bien est destiné exclusivement à un usage d'habitation temporaire. La sous-location est interdite. Le nombre d'occupants ne peut dépasser la capacité maximale indiquée.",
  );
  await drawArticle(
    ctx,
    3,
    "ÉTAT DES LIEUX",
    "Un état des lieux sera établi contradictoirement à l'entrée et à la sortie. Les dégradations constatées pourront être imputées sur la caution.",
  );
  await drawArticle(
    ctx,
    4,
    "ASSURANCE",
    "Le preneur est invité à vérifier que son assurance habitation couvre les risques locatifs pendant son séjour.",
  );
  if (reglement) {
    await drawArticle(ctx, 5, "RÈGLEMENT INTÉRIEUR", reglement);
    await drawArticle(
      ctx,
      6,
      "RÉSILIATION",
      "En cas d'annulation par le preneur, l'acompte versé reste acquis au bailleur. En cas d'annulation par le bailleur, les sommes versées sont intégralement remboursées.",
    );
  } else {
    await drawArticle(
      ctx,
      5,
      "RÉSILIATION",
      "En cas d'annulation par le preneur, l'acompte versé reste acquis au bailleur. En cas d'annulation par le bailleur, les sommes versées sont intégralement remboursées.",
    );
  }

  /* Signatures */
  await ensureSpace(ctx, 200);
  await drawSectionTitle(ctx, "SIGNATURES");
  ctx.y -= 6;

  let img: PDFImage | null = null;
  if (signatureImage?.bytes?.length) {
    try {
      img = signatureImage.isPng ? await pdfDoc.embedPng(signatureImage.bytes) : await pdfDoc.embedJpg(signatureImage.bytes);
    } catch {
      img = null;
    }
  }

  drawSignatureBlock(ctx.page, {
    font,
    fontBold,
    ville: villeBailleur,
    dateStr,
    proprietaireNom: pNom || "—",
    signatureImage: img,
    marginX: PDF_MARGIN_X,
    pageWidth: PDF_PAGE_W,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawLocavioPdfFooterOnAllPages(pdfDoc, font, fontBold);
  return pdfDoc.save();
}
