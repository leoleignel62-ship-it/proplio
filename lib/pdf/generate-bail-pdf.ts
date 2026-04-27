import { PDFDocument, PDFPage, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { getChambreAt, parseChambresDetails } from "@/lib/colocation";
import {
  PDF_ARTICLE_BAR_BG as ARTICLE_TITLE_BG,
  PDF_BORDER as BORDER_LIGHT,
  PDF_INFO_BLOCK_BG,
  PDF_MARGIN_X as MARGIN,
  PDF_MARGIN_Y,
  PDF_PAGE_H as PAGE_H,
  PDF_PAGE_W as PAGE_W,
  PDF_TABLE_ALT as TABLE_ROW_ALT,
  PDF_TABLE_HIGHLIGHT_BG,
  PDF_TEXT_MAIN as TEXT_BODY,
  PDF_TEXT_SECONDARY as TEXT_MUTED,
  PDF_SUCCESS,
  PDF_VIOLET as PRIMARY,
  PDF_VIOLET_DARK,
  PDF_VIOLET_LINE as SECONDARY,
  PDF_WHITE as WHITE,
  drawLocavioPdfFooterOnAllPages,
  drawLocavioPdfHeader,
  pdfContentMinY,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/locavio-pdf-theme";
import { PDF_FOOTER_HEIGHT, drawSignatureBlock } from "@/lib/pdf/pdf-utils";

/** Marge réservée sous le corps du document */
const CONTENT_BOTTOM = pdfContentMinY();

const BAIL_HEADER_TITLE = "CONTRAT DE BAIL\nD'HABITATION";

const TABLE_HEADER = PRIMARY;

const BODY_PT = 10;
const BODY_GAP = 15;
const LEGAL_PT = 9;
const LEGAL_GAP = Math.round(9 * 1.5);

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

const DIAG_ROWS: { key: string; label: string }[] = [
  { key: "dpe", label: "Diagnostic de performance énergétique (DPE)" },
  { key: "amiante", label: "Constat de risque d'exposition au plomb (CREP) / amiante" },
  { key: "plomb", label: "Plomb (immeuble avant 1949)" },
  { key: "electricite", label: "État de l'installation intérieure d'électricité" },
  { key: "gaz", label: "État de l'installation intérieure de gaz" },
  { key: "erp", label: "État des risques naturels, miniers, technologiques, pollution des sols (ERP)" },
  { key: "bruit", label: "Information sur les nuisances sonores (zones de bruit)" },
];

export type BailPdfLocataire = {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
};

type PartyLineMeta = { text: string; bold: boolean };

function partyBoxInnerHeight(lines: PartyLineMeta[], font: PDFFont, fontBold: PDFFont, innerW: number): number {
  const lh = 12;
  let h = 0;
  for (const pl of lines) {
    if (!pl.text) {
      h += 6;
      continue;
    }
    const f = pl.bold ? fontBold : font;
    const wrapped = wrapLines(pl.text, f, 9, innerW);
    h += wrapped.length * lh;
  }
  return h;
}

function buildLocatairePartyLines(locataires: BailPdfLocataire[]): PartyLineMeta[] {
  if (!locataires.length) return [{ text: "—", bold: true }];
  const out: PartyLineMeta[] = [];
  locataires.forEach((l, i) => {
    if (i > 0) out.push({ text: "", bold: false });
    const name = `${l.prenom ?? ""} ${l.nom ?? ""}`.trim();
    out.push({ text: name || `Locataire ${i + 1}`, bold: true });
    const cpVille = [l.code_postal, l.ville].filter(Boolean).join(" ").trim();
    const addrLine = [String(l.adresse ?? "").trim(), cpVille].filter(Boolean).join(", ");
    if (addrLine) out.push({ text: addrLine, bold: false });
    const em = String(l.email ?? "").trim();
    if (em) out.push({ text: em, bold: false });
    const tel = String(l.telephone ?? "").trim();
    if (tel) out.push({ text: `Tél. ${tel}`, bold: false });
    const dn = l.date_naissance ? formatDateFrLong(String(l.date_naissance)) : "";
    if (dn && dn !== "—") out.push({ text: `Né(e) le ${dn}`, bold: false });
  });
  return out;
}

function drawPartyBoxDetailed(
  page: PDFPage,
  x: number,
  boxY: number,
  boxH: number,
  colW: number,
  title: string,
  lines: PartyLineMeta[],
  font: PDFFont,
  fontBold: PDFFont,
) {
  const innerW = colW - 20;
  page.drawRectangle({
    x: x + 3,
    y: boxY,
    width: colW - 3,
    height: boxH,
    color: PDF_INFO_BLOCK_BG,
    borderColor: BORDER_LIGHT,
    borderWidth: 0.6,
  });
  page.drawRectangle({
    x,
    y: boxY,
    width: 3,
    height: boxH,
    color: PRIMARY,
  });
  page.drawText(title, {
    x: x + 10,
    y: boxY + boxH - 20,
    size: 10,
    font: fontBold,
    color: PRIMARY,
  });
  let ly = boxY + boxH - 36;
  for (const pl of lines) {
    if (!pl.text) {
      ly -= 6;
      continue;
    }
    const f = pl.bold ? fontBold : font;
    const color = pl.bold ? TEXT_BODY : TEXT_MUTED;
    for (const wl of wrapLines(pl.text, f, 9, innerW)) {
      page.drawText(wl, { x: x + 10, y: ly, size: 9, font: f, color });
      ly -= 12;
    }
  }
}

function truncateOneLine(text: string, font: PDFFont, size: number, maxW: number): string {
  if (maxW <= 8) return "…";
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  const ell = "…";
  let cut = text.length;
  while (cut > 0 && font.widthOfTextAtSize(`${text.slice(0, cut)}${ell}`, size) > maxW) {
    cut -= 1;
  }
  return cut > 0 ? `${text.slice(0, cut)}${ell}` : ell;
}

export type GenerateBailPdfParams = {
  bail: Record<string, unknown>;
  proprietaire: Record<string, unknown>;
  logement: Record<string, unknown> | null;
  locatairesOrdered: BailPdfLocataire[];
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
};

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(tryLine, size) <= maxWidth) {
      line = tryLine;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function formatDateFrLong(isoOrDate: string | Date | undefined | null): string {
  if (!isoOrDate) return "—";
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function euroBold(n: number): string {
  return `${n.toFixed(2)} €`;
}

type PdfCtx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  fontBold: PDFFont;
  fontOblique: PDFFont;
};

function newPage(ctx: PdfCtx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  drawLocavioPdfHeader(ctx.page, ctx.font, ctx.fontBold, BAIL_HEADER_TITLE);
  ctx.y = pdfContentTopAfterHeader();
}

/** Évite de commencer un bloc avec moins de ~3 lignes utiles en bas de page */
function ensureSpace(ctx: PdfCtx, needPt: number) {
  if (ctx.y < CONTENT_BOTTOM + needPt) {
    newPage(ctx);
  }
}

/** Hauteur minimale réservée en bas de page (3 lignes) */
function ensureSpaceMinLines(ctx: PdfCtx, lines = 3) {
  ensureSpace(ctx, lines * BODY_GAP + BODY_PT);
}

function drawArticleTitle(ctx: PdfCtx, num: number, title: string) {
  ensureSpaceMinLines(ctx, 4);
  const barH = 24;
  const titleText = `Article ${num} — ${title}`;
  ctx.page.drawRectangle({
    x: MARGIN + 3,
    y: ctx.y - barH,
    width: PAGE_W - MARGIN * 2 - 3,
    height: barH,
    color: ARTICLE_TITLE_BG,
    borderColor: SECONDARY,
    borderWidth: 0.6,
  });
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - barH,
    width: 3,
    height: barH,
    color: PRIMARY,
  });
  ctx.page.drawText(titleText, {
    x: MARGIN + 10,
    y: ctx.y - 16,
    size: 10.5,
    font: ctx.fontBold,
    color: PDF_VIOLET_DARK,
  });
  ctx.y -= barH + 12;
}

function drawArticleSeparator(ctx: PdfCtx) {
  ctx.y -= 4;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.35,
    color: BORDER_LIGHT,
  });
  ctx.y -= 14;
}

function drawParagraph(ctx: PdfCtx, text: string, opts?: { oblique?: boolean; size?: number }) {
  const size = opts?.size ?? BODY_PT;
  const gap = Math.round(size * 1.5);
  const font = opts?.oblique ? ctx.fontOblique : ctx.font;
  const color = opts?.oblique ? TEXT_MUTED : TEXT_BODY;
  const maxW = PAGE_W - MARGIN * 2;
  for (const line of wrapLines(text, font, size, maxW)) {
    ensureSpace(ctx, gap + 2);
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size, font, color });
    ctx.y -= gap;
  }
}

function drawBulletList(ctx: PdfCtx, items: string[], legal = false) {
  const size = legal ? LEGAL_PT : BODY_PT;
  const gap = legal ? LEGAL_GAP : BODY_GAP;
  const font = legal ? ctx.fontOblique : ctx.font;
  const color = legal ? TEXT_MUTED : TEXT_BODY;
  for (const item of items) {
    const maxW = PAGE_W - MARGIN * 2 - 14;
    const lines = wrapLines(item, font, size, maxW);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(ctx, gap + 2);
      if (i === 0) {
        ctx.page.drawText("•", { x: MARGIN, y: ctx.y, size, font: ctx.fontBold, color: SECONDARY });
      }
      ctx.page.drawText(lines[i]!, { x: MARGIN + 14, y: ctx.y, size, font, color });
      ctx.y -= gap;
    }
    ctx.y -= 2;
  }
}

function drawLabelValueBlock(
  ctx: PdfCtx,
  rows: { label: string; value: string; valueBold?: boolean }[],
) {
  for (const row of rows) {
    ensureSpace(ctx, 28);
    ctx.page.drawText(`${row.label} :`, {
      x: MARGIN,
      y: ctx.y,
      size: 9,
      font: ctx.fontBold,
      color: PRIMARY,
    });
    ctx.y -= 11;
    const vFont = row.valueBold !== false ? ctx.fontBold : ctx.font;
    const maxW = PAGE_W - MARGIN * 2 - 8;
    for (const line of wrapLines(row.value, vFont, BODY_PT, maxW)) {
      ensureSpace(ctx, BODY_GAP + 2);
      ctx.page.drawText(line, {
        x: MARGIN + 8,
        y: ctx.y,
        size: BODY_PT,
        font: vFont,
        color: row.valueBold !== false ? TEXT_BODY : TEXT_MUTED,
      });
      ctx.y -= BODY_GAP;
    }
    ctx.y -= 4;
  }
}

/** Tableau financier ou diagnostics : ne pas couper — tout sur une page */
function drawSinglePageTable(
  ctx: PdfCtx,
  headerLabel: string,
  headerValue: string,
  bodyRows: { left: string; right: string; rightBold?: boolean }[],
  rowH: number,
) {
  const headerRowH = rowH;
  const totalH = headerRowH + bodyRows.length * rowH + 8;
  if (ctx.y < CONTENT_BOTTOM + totalH) {
    newPage(ctx);
  }

  const tw = PAGE_W - MARGIN * 2;
  const x0 = MARGIN;
  let ty = ctx.y;

  ctx.page.drawRectangle({
    x: x0,
    y: ty - headerRowH,
    width: tw,
    height: headerRowH,
    color: TABLE_HEADER,
  });
  ctx.page.drawText(headerLabel, {
    x: x0 + 8,
    y: ty - 13,
    size: 9,
    font: ctx.fontBold,
    color: WHITE,
  });
  ctx.page.drawText(headerValue, {
    x: x0 + tw * 0.52,
    y: ty - 13,
    size: 9,
    font: ctx.fontBold,
    color: WHITE,
  });
  ty -= headerRowH;

  bodyRows.forEach((row, i) => {
    ctx.page.drawRectangle({
      x: x0,
      y: ty - rowH,
      width: tw,
      height: rowH,
      color: i % 2 === 0 ? WHITE : TABLE_ROW_ALT,
      borderColor: BORDER_LIGHT,
      borderWidth: 0.4,
    });
    ctx.page.drawText(row.left, {
      x: x0 + 8,
      y: ty - 13,
      size: 9,
      font: ctx.fontBold,
      color: TEXT_BODY,
    });
    const rFont = row.rightBold !== false ? ctx.fontBold : ctx.font;
    let rightColor = PRIMARY;
    if (row.right === "Oui") rightColor = PDF_SUCCESS;
    if (row.right === "Non") rightColor = TEXT_MUTED;
    ctx.page.drawText(row.right, {
      x: x0 + tw * 0.52,
      y: ty - 13,
      size: row.rightBold !== false ? 10 : 9,
      font: rFont,
      color: rightColor,
    });
    ty -= rowH;
  });

  ctx.y = ty - 8;
}

export async function generateBailPdfBuffer(params: GenerateBailPdfParams): Promise<Uint8Array> {
  const { bail, proprietaire, logement, locatairesOrdered, signatureImage } = params;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const typeMeuble = bail.type_bail === "meuble";
  const adresseLog =
    `${logement?.adresse ?? "—"}, ${logement?.code_postal ?? ""} ${logement?.ville ?? ""}`.trim();

  const colocChambreIdxRaw = bail.colocation_chambre_index;
  const colocChambreIdx =
    colocChambreIdxRaw != null && colocChambreIdxRaw !== ""
      ? Number(colocChambreIdxRaw)
      : NaN;
  const isColocIndividuel =
    Boolean(logement?.est_colocation) && Number.isFinite(colocChambreIdx) && colocChambreIdx >= 1;
  const chambreDetail = isColocIndividuel
    ? getChambreAt(parseChambresDetails(logement?.chambres_details), colocChambreIdx)
    : null;
  const surfaceChambreStr =
    chambreDetail != null && Number(chambreDetail.surface) > 0 ? String(chambreDetail.surface) : "—";
  const partiesCommunes =
    typeof bail.colocation_parties_communes === "string" ? bail.colocation_parties_communes.trim() : "";

  const bailleurNom = `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim();
  /** Ordre « nom prénom » pour signatures et pied de page */
  const bailleurNomPrenomOrder =
    `${String(proprietaire.nom ?? "").trim()} ${String(proprietaire.prenom ?? "").trim()}`.trim() || "—";
  const bailleurAddr = [
    proprietaire.adresse,
    [proprietaire.code_postal, proprietaire.ville].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const bailleurEmail = String(proprietaire.email ?? "").trim();
  const bailleurTel = String(proprietaire.telephone ?? "").trim();

  const preneurFooterName =
    locatairesOrdered
      .map((l) => `${String(l.nom ?? "").trim()} ${String(l.prenom ?? "").trim()}`.trim())
      .filter(Boolean)
      .join(", ") || "—";

  const logementEtage = typeof bail.logement_etage === "string" ? bail.logement_etage.trim() : "";
  const interphoneOui = Boolean(bail.interphone_digicode_oui);
  const interphoneCode =
    typeof bail.interphone_digicode_code === "string" ? bail.interphone_digicode_code.trim() : "";
  const parkingInclus = Boolean(bail.parking_inclus);
  const parkingNum = typeof bail.parking_numero === "string" ? bail.parking_numero.trim() : "";
  const caveInclus = Boolean(bail.cave_incluse);
  const caveNum = typeof bail.cave_numero === "string" ? bail.cave_numero.trim() : "";
  const garageInclus = Boolean(bail.garage_inclus);
  const garageNum = typeof bail.garage_numero === "string" ? bail.garage_numero.trim() : "";

  const diagnostics = (bail.diagnostics ?? {}) as Record<string, boolean>;
  const equipements: string[] = Array.isArray(bail.equipements)
    ? bail.equipements.filter((e: unknown): e is string => typeof e === "string")
    : [];
  const details = (bail.equipements_details ?? {}) as Record<string, { quantity?: number; rooms?: string }>;
  const clausesPart =
    typeof bail.clauses_particulieres === "string" ? bail.clauses_particulieres.trim() : "";

  const modePaiement =
    bail.mode_paiement_loyer === "cheque"
      ? "Chèque"
      : bail.mode_paiement_loyer === "prelevement"
        ? "Prélèvement"
        : "Virement bancaire";

  const loyerN = Number(bail.loyer ?? 0);
  const chargesN = Number(bail.charges ?? 0);
  const totalMensuel = loyerN + chargesN;
  const depotN = Number(bail.depot_garantie ?? 0);
  const dernierLoyer = Number(bail.dernier_loyer_precedent ?? 0);

  const dateDebutFr = formatDateFrLong(bail.date_debut ? String(bail.date_debut) : null);
  const dateFinFr = formatDateFrLong(bail.date_fin ? String(bail.date_fin) : null);
  const dureeM = Number(bail.duree_mois ?? 0);

  const bailRef = typeof bail.id === "string" && bail.id.length >= 8 ? bail.id.slice(0, 8).toUpperCase() : "—";
  const dateDocFr = formatDateFrLong(new Date());

  const page = doc.addPage([PAGE_W, PAGE_H]);
  drawLocavioPdfHeader(page, font, fontBold, BAIL_HEADER_TITLE);
  let y = pdfContentTopAfterHeader();

  const subLaw =
    "Conforme à la loi n° 89-462 du 6 juillet 1989 et à la loi Alur du 24 mars 2014";
  page.drawText(subLaw, {
    x: (PAGE_W - font.widthOfTextAtSize(subLaw, 8.5)) / 2,
    y,
    size: 8.5,
    font,
    color: TEXT_MUTED,
  });
  y -= 14;
  if (isColocIndividuel) {
    const colocLine = "Bail individuel — colocation";
    page.drawText(colocLine, {
      x: (PAGE_W - fontBold.widthOfTextAtSize(colocLine, 9)) / 2,
      y,
      size: 9,
      font: fontBold,
      color: TEXT_MUTED,
    });
    y -= 16;
  }

  y -= 8;
  const refLine = `Réf. ${bailRef}   ·   Établi le ${dateDocFr}`;
  page.drawText(refLine, {
    x: (PAGE_W - font.widthOfTextAtSize(refLine, 8)) / 2,
    y,
    size: 8,
    font,
    color: TEXT_MUTED,
  });
  y -= 14;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: SECONDARY,
  });
  y -= 20;

  const colGap = 14;
  const colW = (PAGE_W - MARGIN * 2 - colGap) / 2;
  const innerW = colW - 20;
  const padParty = 36 + 8;
  const bailleurLinesMeta: PartyLineMeta[] = [
    { text: bailleurNom || "—", bold: true },
    ...(bailleurAddr ? [{ text: bailleurAddr, bold: true } as PartyLineMeta] : []),
    ...(bailleurEmail ? [{ text: bailleurEmail, bold: true } as PartyLineMeta] : []),
    ...(bailleurTel ? [{ text: `Tél. ${bailleurTel}`, bold: true } as PartyLineMeta] : []),
  ];
  const locataireLinesMeta = buildLocatairePartyLines(locatairesOrdered);
  const hBailleur = padParty + partyBoxInnerHeight(bailleurLinesMeta, font, fontBold, innerW);
  const hLoc = padParty + partyBoxInnerHeight(locataireLinesMeta, font, fontBold, innerW);
  const boxH = Math.max(108, hBailleur, hLoc);
  const boxY = y - boxH;

  drawPartyBoxDetailed(page, MARGIN, boxY, boxH, colW, "LE BAILLEUR", bailleurLinesMeta, font, fontBold);
  drawPartyBoxDetailed(
    page,
    MARGIN + colW + colGap,
    boxY,
    boxH,
    colW,
    isColocIndividuel ? "LE LOCATAIRE" : "LE(S) LOCATAIRE(S)",
    locataireLinesMeta,
    font,
    fontBold,
  );

  y = boxY - 22;

  page.drawText("OBJET DU CONTRAT", {
    x: MARGIN,
    y,
    size: 12,
    font: fontBold,
    color: PRIMARY,
  });
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.8,
    color: SECONDARY,
  });
  y -= 16;

  const objetRows: { label: string; value: string; valueBold?: boolean }[] = [
    { label: "Adresse du logement", value: adresseLog, valueBold: true },
  ];
  if (isColocIndividuel && Number.isFinite(colocChambreIdx)) {
    objetRows.push({
      label: "Mention légale",
      value: `Le présent bail est consenti pour la chambre n°${colocChambreIdx} du logement situé ${adresseLog}, dans le cadre d'une colocation.`,
      valueBold: false,
    });
    objetRows.push({
      label: "Chambre louée",
      value: `Chambre n°${colocChambreIdx} (bail individuel)`,
      valueBold: true,
    });
    objetRows.push({
      label: "Surface de la chambre",
      value: `${surfaceChambreStr} m²`,
      valueBold: true,
    });
  }
  objetRows.push(
    { label: "Désignation", value: String(bail.designation_logement ?? "—") },
    {
      label: "Type de bail",
      value: typeMeuble ? "Location meublée" : "Location vide (nu)",
      valueBold: true,
    },
    { label: "Étage", value: logementEtage || "—" },
    {
      label: "Interphone / digicode",
      value: interphoneOui ? `Oui${interphoneCode ? ` — ${interphoneCode}` : ""}` : "Non",
    },
    {
      label: "Stationnement / annexes",
      value:
        [
          parkingInclus ? `Parking${parkingNum ? ` (place ${parkingNum})` : ""}` : null,
          caveInclus ? `Cave${caveNum ? ` (${caveNum})` : ""}` : null,
          garageInclus ? `Garage${garageNum ? ` (${garageNum})` : ""}` : null,
        ]
          .filter(Boolean)
          .join(" — ") || "—",
    },
    {
      label: "Surface et type (référence fiche logement)",
      value: `${logement?.type ?? "—"} — ${logement?.surface ?? "—"} m²`,
      valueBold: true,
    },
  );
  if (partiesCommunes) {
    objetRows.push({
      label: "Parties communes et équipements partagés",
      value: partiesCommunes,
    });
  }

  const ctx: PdfCtx = { doc, page, y, font, fontBold, fontOblique };

  for (const row of objetRows) {
    ensureSpaceMinLines(ctx, 3);
    ctx.page.drawText(`${row.label} :`, {
      x: MARGIN,
      y: ctx.y,
      size: 9,
      font: ctx.fontBold,
      color: PRIMARY,
    });
    ctx.y -= 11;
    const vFont = row.valueBold !== false ? ctx.fontBold : ctx.font;
    for (const line of wrapLines(row.value, vFont, BODY_PT, PAGE_W - MARGIN * 2 - 8)) {
      ensureSpace(ctx, BODY_GAP + 2);
      ctx.page.drawText(line, {
        x: MARGIN + 8,
        y: ctx.y,
        size: BODY_PT,
        font: vFont,
        color: row.valueBold !== false ? TEXT_BODY : TEXT_MUTED,
      });
      ctx.y -= BODY_GAP;
    }
    ctx.y -= 6;
  }

  drawArticleTitle(ctx, 1, "Désignation du logement");
  drawParagraph(
    ctx,
    "Les parties reconnaissent que le logement objet du présent bail est désigné comme indiqué ci-dessus (adresse, désignation, surfaces et annexes). " +
      "Le locataire déclare avoir visité les lieux et les accepter dans l'état où ils se trouvent, sauf réserves contradictoires annexées à l'état des lieux d'entrée.",
  );
  const travaux = String(bail.travaux_realises ?? "").trim();
  if (travaux) {
    ensureSpace(ctx, BODY_GAP * 2);
    ctx.page.drawText("Travaux réalisés depuis le dernier bail : ", {
      x: MARGIN,
      y: ctx.y,
      size: BODY_PT,
      font: ctx.fontBold,
      color: PRIMARY,
    });
    ctx.y -= BODY_GAP;
    drawParagraph(ctx, travaux);
  }
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 2, "Durée du bail");
  ensureSpace(ctx, 40);
  ctx.page.drawText("Date de prise d'effet : ", {
    x: MARGIN,
    y: ctx.y,
    size: BODY_PT,
    font: ctx.font,
    color: TEXT_BODY,
  });
  let tx = MARGIN + ctx.font.widthOfTextAtSize("Date de prise d'effet : ", BODY_PT);
  ctx.page.drawText(dateDebutFr, { x: tx, y: ctx.y, size: BODY_PT, font: ctx.fontBold, color: PRIMARY });
  ctx.y -= BODY_GAP;
  ctx.page.drawText("Date de fin : ", {
    x: MARGIN,
    y: ctx.y,
    size: BODY_PT,
    font: ctx.font,
    color: TEXT_BODY,
  });
  tx = MARGIN + ctx.font.widthOfTextAtSize("Date de fin : ", BODY_PT);
  ctx.page.drawText(dateFinFr, { x: tx, y: ctx.y, size: BODY_PT, font: ctx.fontBold, color: PRIMARY });
  ctx.y -= BODY_GAP;
  ctx.page.drawText("Durée : ", { x: MARGIN, y: ctx.y, size: BODY_PT, font: ctx.font, color: TEXT_BODY });
  tx = MARGIN + ctx.font.widthOfTextAtSize("Durée : ", BODY_PT);
  ctx.page.drawText(`${dureeM} mois`, { x: tx, y: ctx.y, size: BODY_PT, font: ctx.fontBold, color: PRIMARY });
  ctx.y -= BODY_GAP;
  drawParagraph(
    ctx,
    typeMeuble
      ? "Bail meublé : durée d'un an, renouvelable tacitement par périodes d'un an (article 10 de la loi du 6 juillet 1989)."
      : "Bail vide : durée de trois ans en résidence principale du locataire, renouvelable tacitement par périodes de trois ans (article 10 de la loi du 6 juillet 1989).",
    { oblique: true, size: LEGAL_PT },
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 3, "Loyer et charges");
  const loyerLabel = isColocIndividuel
    ? "Loyer mensuel hors charges (chambre)"
    : "Loyer mensuel hors charges";
  const chargesLabel = isColocIndividuel
    ? "Provision pour charges (chambre)"
    : "Provision pour charges";
  drawSinglePageTable(
    ctx,
    "Libellé",
    "Montant",
    [
      { left: loyerLabel, right: euroBold(loyerN), rightBold: true },
      { left: chargesLabel, right: euroBold(chargesN), rightBold: true },
      { left: "Total mensuel loyer + charges", right: euroBold(totalMensuel), rightBold: true },
      { left: "Mode de paiement du loyer", right: modePaiement, rightBold: false },
      {
        left: "Jour de paiement (chaque mois)",
        right: `Le ${Number(bail.jour_paiement ?? 1)} du mois`,
        rightBold: true,
      },
      { left: "Dernier loyer du précédent locataire", right: euroBold(dernierLoyer), rightBold: true },
    ],
    20,
  );
  drawParagraph(
    ctx,
    "Les charges locatives récupérables sont celles prévues par la loi du 6 juillet 1989 et le décret n° 87-712 du 26 août 1987. " +
      "Une régularisation annuelle sur justificatifs doit être communiquée au locataire.",
    { oblique: true, size: LEGAL_PT },
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 4, "Dépôt de garantie");
  ensureSpace(ctx, 36);
  ctx.page.drawText("Montant du dépôt de garantie : ", {
    x: MARGIN,
    y: ctx.y,
    size: BODY_PT,
    font: ctx.font,
    color: TEXT_BODY,
  });
  tx = MARGIN + ctx.font.widthOfTextAtSize("Montant du dépôt de garantie : ", BODY_PT);
  ctx.page.drawText(euroBold(depotN), { x: tx, y: ctx.y, size: BODY_PT, font: ctx.fontBold, color: PRIMARY });
  ctx.y -= BODY_GAP;
  drawParagraph(
    ctx,
    "Le dépôt de garantie ne peut excéder un mois du loyer hors charges (bail vide) ou deux mois (bail meublé), article 22 de la loi du 6 juillet 1989. " +
      "Il est restitué dans le délai d'un mois après la restitution des clés, déduction faite des sommes dues, sous réserve de justificatifs.",
    { oblique: true, size: LEGAL_PT },
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 5, "Révision du loyer");
  drawParagraph(
    ctx,
    String(
      bail.revision_loyer ||
        "Le loyer est révisable chaque année à la date anniversaire du bail selon l'indice de référence des loyers (IRL) publié par l'INSEE.",
    ),
  );
  drawParagraph(
    ctx,
    "Conformément aux articles 17-1 à 17-3 de la loi du 6 juillet 1989, la variation annuelle du loyer hors charges ne peut excéder la variation de l'IRL du trimestre de référence, sauf clause plus favorable au locataire. " +
      "Le bailleur informe le locataire au moins un mois avant la date de révision (LRAR ou remise en main propre contre récépissé).",
    { oblique: true, size: LEGAL_PT },
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 6, "Obligations du bailleur");
  drawBulletList(
    ctx,
    [
      "Délivrer un logement décent et conforme, et en assurer la jouissance paisible.",
      "Assurer les grosses réparations et l'entretien des équipements communs (articles 606 et 1720 du Code civil, loi du 6 juillet 1989).",
      "Remettre les diagnostics et documents réglementaires ; tenir les justificatifs de charges à disposition du locataire.",
      "Respecter la vie privée du locataire ; les visites doivent être annoncées selon la loi.",
    ],
    true,
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 7, "Obligations du locataire");
  drawBulletList(
    ctx,
    [
      "Payer le loyer et les charges aux échéances ; user paisiblement des locaux selon leur destination.",
      "Effectuer les menues réparations et l'entretien courant (décret n° 87-712 du 26 août 1987).",
      "Ne pas nuire au voisinage ; signaler sans délai les anomalies affectant le logement.",
      "Permettre les travaux nécessaires et les visites raisonnables ; restituer le logement en fin de bail.",
    ],
    true,
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 8, "Assurance");
  drawParagraph(
    ctx,
    "Le locataire doit souscrire une assurance habitation couvrant les risques locatifs (incendie, dégâts des eaux, responsabilité civile) et en justifier chaque année à la demande du bailleur (article 7-1 de la loi du 6 juillet 1989). " +
      "À défaut de justification après mise en demeure, le bail peut être résilié selon les modalités légales.",
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 9, "Préavis");
  drawParagraph(
    ctx,
    typeMeuble
      ? "En location meublée, le préavis du locataire est d'un mois (article 15 de la loi du 6 juillet 1989), sous réserve des dispositions plus favorables applicables."
      : "En location vide, le préavis du locataire est en principe de trois mois ; des réductions peuvent s'appliquer selon la zone et le motif (article 15). Le bailleur est tenu à un préavis de trois mois en cas de congé pour reprise ou vente, sauf disposition contraire.",
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 10, "Clause résolutoire");
  drawParagraph(
    ctx,
    "En cas de défaut de paiement du loyer ou des charges à l'échéance, et huit jours après une mise en demeure restée infructueuse selon la loi, le bailleur peut demander la résiliation du bail et l'expulsion devant le juge. " +
      "Les modalités de procédure relèvent du Code de la procédure civile et du décret n° 2006-1687 du 22 décembre 2006.",
    { oblique: true, size: LEGAL_PT },
  );
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 11, "Diagnostics techniques");
  const diagBody = DIAG_ROWS.map((row) => ({
    left: row.label,
    right: diagnostics[row.key] ? "Oui" : "Non",
    rightBold: true,
  }));
  drawSinglePageTable(ctx, "Diagnostic / document", "Déclaré / remis", diagBody, 18);

  const dpeE = String(bail.dpe_classe_energie ?? "").trim();
  const dpeGes = String(bail.dpe_classe_ges ?? "").trim();
  const dpeKwh = Number(bail.dpe_valeur_kwh ?? 0);
  drawLabelValueBlock(ctx, [
    { label: "Classe énergie (DPE)", value: dpeE || "—", valueBold: true },
    { label: "Valeur DPE (kWh/m²/an)", value: `${dpeKwh}`, valueBold: true },
    { label: "Classe GES", value: dpeGes || "—", valueBold: true },
  ]);
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 12, "Inventaire du mobilier");
  if (typeMeuble) {
    if (equipements.length === 0) {
      drawParagraph(ctx, "Aucun équipement n'a été déclaré dans le formulaire. Les parties peuvent compléter par avenant ou annexe signée.");
    } else {
      const invRowH = 20;
      const invHeaderH = invRowH;
      const rowHeights = equipements.map((item) => {
        const detail = details[item] ?? {};
        const rooms = detail.rooms?.trim() || "—";
        const itemLines = wrapLines(item, font, 9, PAGE_W * 0.42).length;
        const roomLines = wrapLines(rooms, font, 8, PAGE_W * 0.28).length;
        const lines = Math.max(itemLines, roomLines, 1);
        return Math.max(invRowH, lines * 11 + 12);
      });
      const tableInvH = invHeaderH + rowHeights.reduce((a, b) => a + b, 0) + 8;
      if (ctx.y < CONTENT_BOTTOM + tableInvH) {
        newPage(ctx);
      }
      const tw = PAGE_W - MARGIN * 2;
      const x0 = MARGIN;
      let iy = ctx.y;
      ctx.page.drawRectangle({
        x: x0,
        y: iy - invHeaderH,
        width: tw,
        height: invHeaderH,
        color: TABLE_HEADER,
      });
      ctx.page.drawText("Élément", { x: x0 + 8, y: iy - 14, size: 9, font: ctx.fontBold, color: WHITE });
      ctx.page.drawText("Qté", { x: x0 + tw * 0.52, y: iy - 14, size: 9, font: ctx.fontBold, color: WHITE });
      ctx.page.drawText("Pièce(s)", { x: x0 + tw * 0.66, y: iy - 14, size: 9, font: ctx.fontBold, color: WHITE });
      iy -= invHeaderH;
      equipements.forEach((item, index) => {
        const detail = details[item] ?? {};
        const quantity = detail.quantity && detail.quantity > 0 ? detail.quantity : 1;
        const rooms = detail.rooms?.trim() || "—";
        const rh = rowHeights[index] ?? invRowH;
        ctx.page.drawRectangle({
          x: x0,
          y: iy - rh,
          width: tw,
          height: rh,
          color: index % 2 === 0 ? WHITE : TABLE_ROW_ALT,
          borderColor: BORDER_LIGHT,
          borderWidth: 0.4,
        });
        let ty = iy - 12;
        for (const ln of wrapLines(item, font, 9, tw * 0.44)) {
          ctx.page.drawText(ln, { x: x0 + 8, y: ty, size: 9, font });
          ty -= 11;
        }
        ctx.page.drawText(String(quantity), {
          x: x0 + tw * 0.52,
          y: iy - 14,
          size: 10,
          font: ctx.fontBold,
          color: PRIMARY,
        });
        ty = iy - 12;
        for (const ln of wrapLines(rooms, font, 8, tw * 0.3)) {
          ctx.page.drawText(ln, { x: x0 + tw * 0.66, y: ty, size: 8, font });
          ty -= 11;
        }
        iy -= rh;
      });
      ctx.y = iy - 8;
    }
  } else {
    drawParagraph(
      ctx,
      "Le présent bail n'est pas un bail meublé au sens de la loi. Il n'y a pas d'inventaire mobilier obligatoire annexé aux présentes.",
      { oblique: true },
    );
  }
  drawArticleSeparator(ctx);

  drawArticleTitle(ctx, 13, "Clauses particulières");
  if (clausesPart) {
    drawParagraph(ctx, clausesPart);
  } else {
    drawParagraph(
      ctx,
      "Les parties déclarent ne pas avoir prévu de clauses particulières autres que celles figurant aux présentes. Toute modification devra faire l'objet d'un avenant signé des deux parties.",
      { oblique: true },
    );
  }
  drawArticleSeparator(ctx);

  const villeSign = String(proprietaire.ville ?? "").trim() || "…………………";
  const dateSignFr = formatDateFrLong(new Date());
  /** Espace signature + pied (points), aligné demande produit ~150 pt + marge basse page. */
  const SIG_AND_FOOTER_PTS = 150;
  const yMinAboveBand = PDF_MARGIN_Y + SIG_AND_FOOTER_PTS;
  /** Hauteur estimée du bloc « SIGNATURES » + paragraphe d’intro avant le bandeau fixe. */
  const sigIntroH = 88;
  const yBeforeSig = ctx.y;
  if (yBeforeSig < yMinAboveBand + sigIntroH) {
    newPage(ctx);
  }
  ctx.page.drawText("SIGNATURES", {
    x: MARGIN,
    y: ctx.y,
    size: 11,
    font: ctx.fontBold,
    color: PRIMARY,
  });
  ctx.y -= 18;
  drawParagraph(
    ctx,
    "Les parties apposent leurs signatures ci-dessous pour valider l'ensemble des articles du présent contrat.",
    { size: 9 },
  );

  let img: PDFImage | null = null;
  if (signatureImage) {
    try {
      img = signatureImage.isPng
        ? await doc.embedPng(signatureImage.bytes)
        : await doc.embedJpg(signatureImage.bytes);
    } catch {
      img = null;
    }
  }

  drawSignatureBlock(ctx.page, {
    font,
    fontBold,
    ville: villeSign,
    dateStr: dateSignFr,
    proprietaireNom: bailleurNomPrenomOrder,
    signatureImage: img,
    marginX: MARGIN,
    pageWidth: PAGE_W,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  ctx.y = PDF_FOOTER_HEIGHT;

  drawLocavioPdfFooterOnAllPages(doc, font, fontBold);

  return doc.save();
}
