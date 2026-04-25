import {
  PDFDocument,
  StandardFonts,
  rgb,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle as pdfRectangle,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { ELEMENT_LABELS } from "@/lib/etat-des-lieux/defaults";
import type { PiecesEdlData, RoomEdl } from "@/lib/etat-des-lieux/types";
import {
  ETAT_LABELS,
  etatRank,
  formatEtatLabel,
  normalizeEtatNiveau,
} from "@/lib/etat-des-lieux/types";
import {
  PDF_BORDER as BORDER,
  PDF_MARGIN_X as MARGIN,
  PDF_PAGE_H as PAGE_H,
  PDF_PAGE_W as PAGE_W,
  PDF_TABLE_ALT as ROW_ALT_BG,
  PDF_TEXT_MAIN as BODY,
  PDF_TEXT_SECONDARY as MUTED,
  PDF_VIOLET_LIGHT,
  PDF_VIOLET as PRIMARY,
  PDF_WHITE as WHITE,
  drawProplioPdfFooterOnAllPages,
  drawProplioPdfHeader,
  pdfContentMinY,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/proplio-pdf-theme";
import {
  PDF_FOOTER_HEIGHT,
  PDF_SIGNATURE_FOOTER_RESERVE,
  drawSignatureBlock,
} from "@/lib/pdf/pdf-utils";

/** Deux colonnes égales (largeur utile = page − marges), séparateur fin au milieu */
const USABLE_W = PAGE_W - 2 * MARGIN;
const COL_SEP = 1;
const COL_W = (USABLE_W - COL_SEP) / 2;
const ROW_FIX_H = 70;
const CELL_PHOTO_W = 80;
const CELL_PHOTO_H = 60;
const CELL_PAD = 4;
const EMPTY_PHOTO_BG = rgb(0.96, 0.96, 0.98);
const PHOTO_BORDER_W = 0.5;
const PHOTO_BORDER_COLOR = BORDER;
/** Bandeau titre de pièce (léger violet) */
const BAR_BG = PDF_VIOLET_LIGHT;

function hexToRgb01(hex: string) {
  const h = hex.replace("#", "").slice(0, 6);
  return rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Image recadrée type object-fit: cover, puis bordure fine.
 * (x, y) = coin inférieur gauche du cadre.
 */
function drawImageCoverInBox(
  p: PDFPage,
  img: PDFImage,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
) {
  const iw = img.width;
  const ih = img.height;
  const sc = Math.max(boxW / iw, boxH / ih);
  const drawW = iw * sc;
  const drawH = ih * sc;
  const ix = x + (boxW - drawW) / 2;
  const iy = y + (boxH - drawH) / 2;

  p.pushOperators(
    pushGraphicsState(),
    pdfRectangle(x, y, boxW, boxH),
    clip(),
    endPath(),
  );
  p.drawImage(img, { x: ix, y: iy, width: drawW, height: drawH });
  p.pushOperators(popGraphicsState());

  p.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    borderColor: PHOTO_BORDER_COLOR,
    borderWidth: PHOTO_BORDER_W,
  });
}


function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(tryLine, size) <= maxW) line = tryLine;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function truncateToWidth(text: string, f: PDFFont, size: number, maxW: number): string {
  const ell = "…";
  if (f.widthOfTextAtSize(text, size) <= maxW) return text;
  let s = text;
  while (s.length > 0 && f.widthOfTextAtSize(s + ell, size) > maxW) {
    s = s.slice(0, -1);
  }
  return s ? s + ell : ell;
}

function formatEtatPdf(e: string): string {
  return formatEtatLabel(e);
}

function parsePieces(raw: unknown): PiecesEdlData | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as PiecesEdlData;
  if (p.version !== 1 || !Array.isArray(p.rooms)) return null;
  return p;
}

export type EdlPdfParams = {
  typeEtat: "entree" | "sortie";
  dateEtat: string;
  typeLogement: "meuble" | "vide";
  bailleurNom: string;
  preneurNom: string;
  logementAdresse: string;
  piecesJson: unknown;
  compteursExtra: {
    clesRemises: number;
    badgesRemis: number;
    observationsGenerales: string;
  };
  entryPiecesJson?: unknown | null;
  signatureImage?: { bytes: Uint8Array; isPng: boolean } | null;
  /** storage_path -> embedded image bytes */
  photoFiles: Map<string, Uint8Array>;
  documentTitle?: string;
  stayInfoLine?: string;
};

export async function generateEdlPdfBuffer(params: EdlPdfParams): Promise<Uint8Array> {
  const pieces = parsePieces(params.piecesJson);
  if (!pieces) throw new Error("Données pièces invalides");

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const photoImages = new Map<string, PDFImage>();
  for (const [path, bytes] of params.photoFiles) {
    try {
      let img: PDFImage;
      const lower = path.toLowerCase();
      if (lower.endsWith(".png")) img = await doc.embedPng(bytes);
      else img = await doc.embedJpg(bytes);
      photoImages.set(path, img);
    } catch {
      /* skip bad image */
    }
  }

  const edlHeaderTitle =
    params.documentTitle ??
    ("ÉTAT DES LIEUX\n" + (params.typeEtat === "entree" ? "ENTRÉE" : "SORTIE"));

  let page = doc.addPage([PAGE_W, PAGE_H]);
  drawProplioPdfHeader(page, font, fontBold, edlHeaderTitle);
  let y = pdfContentTopAfterHeader();
  /** À partir des compteurs : réserver le bas de page pour les signatures (pas de page vide dédiée). */
  let reserveForSig = false;
  /**
   * Limite basse (y PDF) au-dessus de laquelle le contenu ne doit pas s’étendre :
   * le bloc signatures occupe tout en dessous jusqu’au pied de page.
   */
  const SIG_BLOCK_PEAK_Y = pdfContentMinY() + PDF_SIGNATURE_FOOTER_RESERVE - 20;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    drawProplioPdfHeader(page, font, fontBold, edlHeaderTitle);
    y = pdfContentTopAfterHeader();
  };

  const contentBreakFloor = () => (reserveForSig ? SIG_BLOCK_PEAK_Y + ROW_FIX_H : pdfContentMinY() + 28);

  y -= 6;

  const line = (label: string, value: string) => {
    const t = `${label} : ${value}`;
    const gap = reserveForSig && y < SIG_BLOCK_PEAK_Y + 100 ? 9 : 13;
    for (const ln of wrapLines(t, font, 10, PAGE_W - 2 * MARGIN)) {
      if (y < contentBreakFloor()) newPage();
      page.drawText(ln, { x: MARGIN, y, size: 10, font, color: BODY });
      y -= gap;
    }
  };

  line("Date", params.dateEtat || "—");
  line("Type de logement", params.typeLogement === "meuble" ? "Meublé" : "Vide");
  line("Bailleur", params.bailleurNom);
  line("Preneur", params.preneurNom);
  line("Adresse du logement", params.logementAdresse);
  if (params.stayInfoLine) line("Séjour", params.stayInfoLine);
  y -= 10;

  type StateCol =
    | { kind: "badge"; hex: string; label: string }
    | { kind: "dash" };

  type CellPayload = {
    nameLines: string[];
    commLine: string;
    stateCol: StateCol;
    photoImg: PDFImage | null;
  };

  const textW = COL_W - CELL_PHOTO_W - CELL_PAD * 2;
  const nameSize = 8;
  const commSize = 6.5;
  const badgeSize = 6;
  const nameLineH = 10;

  const drawTwoColHeader = () => {
    const headerH = 16;
    while (true) {
      const rowBottom = y - headerH;
      const need =
        reserveForSig ? rowBottom <= SIG_BLOCK_PEAK_Y : rowBottom < pdfContentMinY() + 24;
      if (!need) break;
      newPage();
    }
    const rowTop = y;
    const rowBottom = rowTop - headerH;
    page.drawRectangle({
      x: MARGIN,
      y: rowBottom,
      width: USABLE_W,
      height: headerH,
      color: PRIMARY,
      borderColor: BORDER,
      borderWidth: 0.4,
    });
    const hdr = "Élément · État · Commentaire · Photo";
    page.drawText(hdr, {
      x: MARGIN + CELL_PAD,
      y: rowTop - 11,
      size: 7,
      font: fontBold,
      color: WHITE,
    });
    page.drawText(hdr, {
      x: MARGIN + COL_W + COL_SEP + CELL_PAD,
      y: rowTop - 11,
      size: 7,
      font: fontBold,
      color: WHITE,
    });
    page.drawLine({
      start: { x: MARGIN + COL_W, y: rowBottom },
      end: { x: MARGIN + COL_W, y: rowTop },
      thickness: 0.35,
      color: BORDER,
    });
    y = rowBottom - 2;
  };

  const drawElementCell = (
    cellX: number,
    rowTop: number,
    rowBottom: number,
    cellW: number,
    payload: CellPayload,
  ) => {
    const twInner = cellW - CELL_PHOTO_W - CELL_PAD * 2;
    const innerTop = rowTop - CELL_PAD;
    let ny = innerTop - nameSize * 0.85;
    for (const ln of payload.nameLines) {
      page.drawText(ln, { x: cellX + CELL_PAD, y: ny, size: nameSize, font, color: BODY });
      ny -= nameLineH;
    }
    const afterNamesY = ny;

    if (payload.stateCol.kind === "badge") {
      const sc = payload.stateCol;
      const hh = sc.hex.replace("#", "").slice(0, 6);
      const r8 = parseInt(hh.slice(0, 2), 16) / 255;
      const g8 = parseInt(hh.slice(2, 4), 16) / 255;
      const b8 = parseInt(hh.slice(4, 6), 16) / 255;
      const fillRgb = hexToRgb01(sc.hex);
      const lum = relativeLuminance(r8, g8, b8);
      let badgeTextColor = lum > 0.65 ? BODY : rgb(1, 1, 1);
      if (/bon/i.test(sc.label)) badgeTextColor = rgb(22 / 255, 101 / 255, 52 / 255);
      if (/moyen/i.test(sc.label)) badgeTextColor = rgb(194 / 255, 65 / 255, 12 / 255);
      if (/mauvais/i.test(sc.label)) badgeTextColor = rgb(185 / 255, 28 / 255, 28 / 255);
      let labelW = font.widthOfTextAtSize(sc.label, badgeSize);
      const maxBadgeW = twInner - 4;
      let displayLabel = sc.label;
      while (labelW > maxBadgeW && displayLabel.length > 3) {
        displayLabel = `${displayLabel.slice(0, -2)}…`;
        labelW = font.widthOfTextAtSize(displayLabel, badgeSize);
      }
      const bw = Math.min(maxBadgeW, labelW + 6);
      const bh = 11;
      const bx = cellX + CELL_PAD;
      const by = afterNamesY - 4 - bh;
      page.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: fillRgb });
      page.drawText(displayLabel, {
        x: bx + (bw - labelW) / 2,
        y: by + 2.5,
        size: badgeSize,
        font,
        color: badgeTextColor,
      });
    } else {
      const dash = "—";
      page.drawText(dash, {
        x: cellX + CELL_PAD,
        y: afterNamesY - 4 - 5,
        size: 7,
        font,
        color: MUTED,
      });
    }

    const commTrunc = truncateToWidth(payload.commLine, fontItalic, commSize, twInner);
    page.drawText(commTrunc, {
      x: cellX + CELL_PAD,
      y: rowBottom + CELL_PAD + 1,
      size: commSize,
      font: fontItalic,
      color: MUTED,
    });

    const photoX = cellX + cellW - CELL_PHOTO_W - CELL_PAD;
    const photoY = rowBottom + (ROW_FIX_H - CELL_PHOTO_H) / 2;
    if (payload.photoImg) {
      drawImageCoverInBox(page, payload.photoImg, photoX, photoY, CELL_PHOTO_W, CELL_PHOTO_H);
    } else {
      page.drawRectangle({
        x: photoX,
        y: photoY,
        width: CELL_PHOTO_W,
        height: CELL_PHOTO_H,
        color: EMPTY_PHOTO_BG,
        borderColor: PHOTO_BORDER_COLOR,
        borderWidth: PHOTO_BORDER_W,
      });
    }
  };

  const drawTwoColPairRow = (
    dataRowIdx: number,
    left: CellPayload | null,
    right: CellPayload | null,
  ) => {
    while (true) {
      const rowBottom = y - ROW_FIX_H;
      const need =
        reserveForSig ? rowBottom <= SIG_BLOCK_PEAK_Y : rowBottom < pdfContentMinY() + 16;
      if (!need) break;
      newPage();
    }
    const rowTop = y;
    const rowBottom = rowTop - ROW_FIX_H;
    const bg = dataRowIdx % 2 === 0 ? rgb(1, 1, 1) : ROW_ALT_BG;

    page.drawRectangle({
      x: MARGIN,
      y: rowBottom,
      width: COL_W,
      height: ROW_FIX_H,
      color: bg,
      borderColor: BORDER,
      borderWidth: 0.35,
    });
    page.drawRectangle({
      x: MARGIN + COL_W + COL_SEP,
      y: rowBottom,
      width: COL_W,
      height: ROW_FIX_H,
      color: bg,
      borderColor: BORDER,
      borderWidth: 0.35,
    });

    page.drawLine({
      start: { x: MARGIN + COL_W, y: rowBottom },
      end: { x: MARGIN + COL_W, y: rowTop },
      thickness: 0.35,
      color: BORDER,
    });

    if (left) drawElementCell(MARGIN, rowTop, rowBottom, COL_W, left);
    if (right) drawElementCell(MARGIN + COL_W + COL_SEP, rowTop, rowBottom, COL_W, right);

    y = rowBottom - 2;
  };

  const drawRoom = (room: RoomEdl) => {
    if (room.enabled === false) return;
    if (y < pdfContentMinY() + 96) newPage();
    page.drawRectangle({
      x: MARGIN,
      y: y - 22,
      width: PAGE_W - 2 * MARGIN,
      height: 22,
      color: BAR_BG,
      borderColor: BORDER,
      borderWidth: 0.8,
    });
    page.drawRectangle({
      x: MARGIN,
      y: y - 22,
      width: 3,
      height: 22,
      color: PRIMARY,
    });
    page.drawText(room.label, {
      x: MARGIN + 8,
      y: y - 15,
      size: 11,
      font: fontBold,
      color: PRIMARY,
    });
    y -= 30;

    drawTwoColHeader();

    const entries: CellPayload[] = [];
    for (const [key, el] of Object.entries(room.elements)) {
      const label = ELEMENT_LABELS[key] ?? key;
      const nameLines = wrapLines(label, font, nameSize, textW).slice(0, 2);
      const commRaw = el.comment?.trim() || "";
      const commLine = commRaw ? commRaw.replace(/\s+/g, " ") : "—";

      const nEtat = normalizeEtatNiveau(el.state);
      const meta = ETAT_LABELS[nEtat];
      const badgeLabel = meta.label.toLowerCase();
      const badgeBg = badgeLabel.includes("bon")
        ? "#dcfce7"
        : badgeLabel.includes("moyen")
          ? "#ffedd5"
          : "#fee2e2";
      const img =
        el.photoPath && photoImages.has(el.photoPath) ? photoImages.get(el.photoPath)! : null;

      entries.push({
        nameLines: nameLines.length ? nameLines : [""],
        commLine,
        stateCol: { kind: "badge", hex: badgeBg, label: meta.label },
        photoImg: img,
      });
    }

    for (let i = 0; i < entries.length; i += 2) {
      const left = entries[i] ?? null;
      const right = entries[i + 1] ?? null;
      drawTwoColPairRow(Math.floor(i / 2), left, right);
    }

    y -= 6;
  };

  for (const room of pieces.rooms) {
    if (room.id === "compteurs") continue;
    drawRoom(room);
  }

  /* Compteurs */
  reserveForSig = true;
  if (y < pdfContentMinY() + 72) newPage();
  page.drawText("Compteurs & remises", {
    x: MARGIN,
    y,
    size: 12,
    font: fontBold,
    color: PRIMARY,
  });
  y -= 20;

  const c = pieces.compteurs;
  drawTwoColHeader();
  const compteurDefs: { label: string; k: keyof PiecesEdlData["compteurs"] }[] = [
    { label: "Compteur électricité", k: "electricite" },
    { label: "Compteur eau froide", k: "eauFroide" },
    { label: "Compteur eau chaude", k: "eauChaude" },
    { label: "Compteur gaz", k: "gaz" },
  ];
  const compteurEntries: CellPayload[] = [];
  for (const { label, k } of compteurDefs) {
    const m = c[k];
    const idx = m?.index?.trim() || "—";
    const path = m?.photoPath ?? null;
    const img = path && photoImages.has(path) ? photoImages.get(path)! : null;
    compteurEntries.push({
      nameLines: wrapLines(label, font, nameSize, textW).slice(0, 2),
      commLine: idx,
      stateCol: { kind: "dash" },
      photoImg: img,
    });
  }
  for (let i = 0; i < compteurEntries.length; i += 2) {
    drawTwoColPairRow(Math.floor(i / 2), compteurEntries[i] ?? null, compteurEntries[i + 1] ?? null);
  }

  y -= 8;
  line("Clés remises", String(params.compteursExtra.clesRemises));
  line("Badges / télécommandes", String(params.compteursExtra.badgesRemis));
  if (params.compteursExtra.observationsGenerales.trim()) {
    y -= reserveForSig && y < SIG_BLOCK_PEAK_Y + 80 ? 3 : 6;
    page.drawText("Observations générales", { x: MARGIN, y, size: 10, font: fontBold, color: BODY });
    y -= reserveForSig && y < SIG_BLOCK_PEAK_Y + 80 ? 9 : 12;
    const obsStep = reserveForSig && y < SIG_BLOCK_PEAK_Y + 100 ? 8 : 11;
    for (const ln of wrapLines(params.compteursExtra.observationsGenerales, font, 9, PAGE_W - 2 * MARGIN)) {
      if (y < (reserveForSig ? SIG_BLOCK_PEAK_Y + 50 : pdfContentMinY() + 12)) newPage();
      page.drawText(ln, { x: MARGIN, y, size: 9, font, color: MUTED });
      y -= obsStep;
    }
  }

  /* Comparaison entrée / sortie */
  const entry = params.entryPiecesJson ? parsePieces(params.entryPiecesJson) : null;
  if (params.typeEtat === "sortie" && entry) {
    newPage();
    page.drawText("Comparatif avec l'état d'entrée (éléments dégradés)", {
      x: MARGIN,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.9, 0.3, 0.3),
    });
    y -= 28;
    for (const room of pieces.rooms) {
      if (room.enabled === false) continue;
      const er = entry.rooms.find((r) => r.id === room.id);
      if (!er) continue;
      for (const [key, sEl] of Object.entries(room.elements)) {
        const eEl = er.elements[key];
        if (!eEl) continue;
        if (etatRank(sEl.state) <= etatRank(eEl.state)) continue;
        const label = ELEMENT_LABELS[key] ?? key;
        const txt = `${room.label} — ${label} : entrée ${formatEtatPdf(eEl.state)} → sortie ${formatEtatPdf(sEl.state)}`;
        const cmpStep = reserveForSig && y < SIG_BLOCK_PEAK_Y + 100 ? 8 : 11;
        for (const ln of wrapLines(txt, font, 9, PAGE_W - 2 * MARGIN)) {
          if (y < (reserveForSig ? SIG_BLOCK_PEAK_Y + 45 : pdfContentMinY() + 8)) newPage();
          page.drawText(ln, { x: MARGIN, y, size: 9, font, color: rgb(0.95, 0.35, 0.35) });
          y -= cmpStep;
        }
      }
    }
  }

  /* Signatures — bloc standardisé, même page que le contenu (réserve déjà gérée par SIG_BLOCK_PEAK_Y) */
  const villeEdl =
    params.logementAdresse
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .pop() || "—";
  const dateEtatFr = (() => {
    const x = new Date(
      params.dateEtat.includes("T") ? params.dateEtat : `${params.dateEtat}T12:00:00`,
    );
    if (Number.isNaN(x.getTime())) return params.dateEtat || "—";
    return x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  })();

  let sigImg: PDFImage | null = null;
  if (params.signatureImage?.bytes?.length) {
    try {
      sigImg = params.signatureImage.isPng
        ? await doc.embedPng(params.signatureImage.bytes)
        : await doc.embedJpg(params.signatureImage.bytes);
    } catch {
      sigImg = null;
    }
  }

  if (y < PDF_SIGNATURE_FOOTER_RESERVE + 24) {
    newPage();
    page.drawText("Signatures", {
      x: MARGIN,
      y,
      size: 11,
      font: fontBold,
      color: PRIMARY,
    });
    y -= 22;
  }

  drawSignatureBlock(page, {
    font,
    fontBold,
    ville: villeEdl,
    dateStr: dateEtatFr,
    proprietaireNom: params.bailleurNom,
    signatureImage: sigImg,
    marginX: MARGIN,
    pageWidth: PAGE_W,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawProplioPdfFooterOnAllPages(doc, font, fontBold);

  return doc.save();
}

function collectPhotoPathsFromPieces(p: PiecesEdlData): string[] {
  const paths: string[] = [];
  for (const room of p.rooms) {
    for (const el of Object.values(room.elements)) {
      if (el.photoPath) paths.push(el.photoPath);
    }
  }
  for (const k of Object.keys(p.compteurs) as (keyof typeof p.compteurs)[]) {
    const ph = p.compteurs[k]?.photoPath;
    if (ph) paths.push(ph);
  }
  return [...new Set(paths)];
}

export { collectPhotoPathsFromPieces };
