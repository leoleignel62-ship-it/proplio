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
import type { InventaireStatut, SaisonnierEtatPiece } from "@/lib/etat-des-lieux/saisonnier-edl-data";
import {
  PDF_BORDER as BORDER,
  PDF_MARGIN_X as MARGIN,
  PDF_PAGE_H as PAGE_H,
  PDF_PAGE_W as PAGE_W,
  PDF_VIOLET_LIGHT,
  PDF_TABLE_ALT as ROW_ALT,
  PDF_TEXT_MAIN as BODY,
  PDF_TEXT_SECONDARY as MUTED,
  PDF_VIOLET as PRIMARY,
  PDF_WHITE as WHITE,
  drawLocavioPdfFooterOnAllPages,
  drawLocavioPdfHeader,
  pdfContentMinY,
  pdfContentTopAfterHeader,
} from "@/lib/pdf/locavio-pdf-theme";
import {
  PDF_FOOTER_HEIGHT,
  PDF_SIGNATURE_FOOTER_RESERVE,
  drawSignatureBlock,
} from "@/lib/pdf/pdf-utils";

/** Helvetica StandardFonts = WinAnsi : pas de ✓ ✗ ⚠️ etc. */
function sanitizePdfText(text: string): string {
  return text
    .replace(/✓/g, "OK")
    .replace(/✗/g, "Non")
    .replace(/⚠️/g, "!")
    .replace(/⚠/g, "!")
    .replace(/✅/g, "OK")
    .replace(/❌/g, "Non")
    .replace(/\u2713/g, "OK")
    .replace(/\u2717/g, "Non")
    .replace(/\u26a0/g, "!")
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u2019/g, "'")
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-");
}

const USABLE_W = PAGE_W - 2 * MARGIN;
const PHOTO_BOX = 52;
const PHOTO_GAP = 4;
const MENTION_LEGALE_DEF =
  "Document établi dans le cadre d'une location saisonnière. Il ne relève pas du régime des baux d'habitation soumis à la loi du 6 juillet 1989 (loi ALUR). Les parties reconnaissent l'état des lieux conforme à la réalité au jour de sa signature.";

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
  p.pushOperators(pushGraphicsState(), pdfRectangle(x, y, boxW, boxH), clip(), endPath());
  p.drawImage(img, { x: ix, y: iy, width: drawW, height: drawH });
  p.pushOperators(popGraphicsState());
  p.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    borderColor: BORDER,
    borderWidth: 0.5,
  });
}

function etatIcon(e: SaisonnierEtatPiece): string {
  if (e === "bon") return "Bon état";
  if (e === "moyen") return "État moyen";
  return "Mauvais état";
}

export type SaisonnierEdlPdfParams = {
  typeEtat: "entree" | "sortie";
  dateEtatIso: string;
  bailleur: {
    nom: string;
    adresseLignes: string[];
    email: string;
    telephone: string;
  };
  preneur: {
    nom: string;
    email: string;
    nationalite: string;
  };
  logementAdresse: string;
  sejourDebut: string;
  sejourFin: string;
  clesRemises: number;
  compteurEau: string;
  compteurElec: string;
  rooms: Array<{
    label: string;
    etat: SaisonnierEtatPiece;
    observations: string;
    photoFiles: Uint8Array[];
  }>;
  inventory: Array<{ zone: string; label: string; status: InventaireStatut }>;
  signatureImage: { bytes: Uint8Array; isPng: boolean } | null;
  mentionLegale?: string;
};

export async function generateEdlSaisonnierPdfBuffer(params: SaisonnierEdlPdfParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

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

  const headerTitle =
    "ÉTAT DES LIEUX - LOCATION SAISONNIÈRE\n" + (params.typeEtat === "entree" ? "ENTRÉE" : "SORTIE");

  let page = doc.addPage([PAGE_W, PAGE_H]);
  drawLocavioPdfHeader(page, font, fontBold, sanitizePdfText(headerTitle));
  let y = pdfContentTopAfterHeader();
  const reserveSig = { on: false };
  const sigFloor = () =>
    reserveSig.on ? pdfContentMinY() + PDF_SIGNATURE_FOOTER_RESERVE - 20 : pdfContentMinY() + 24;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    drawLocavioPdfHeader(page, font, fontBold, sanitizePdfText(headerTitle));
    y = pdfContentTopAfterHeader();
  };

  const drawParagraph = (text: string, size: number, color = BODY, bold = false) => {
    const f = bold ? fontBold : font;
    for (const ln of wrapLines(sanitizePdfText(text), f, size, USABLE_W)) {
      if (y < sigFloor()) newPage();
      page.drawText(sanitizePdfText(ln), { x: MARGIN, y, size, font: f, color });
      y -= size + 3;
    }
  };

  y -= 4;
  drawParagraph(params.mentionLegale ?? MENTION_LEGALE_DEF, 8, MUTED, false);
  y -= 8;

  const dateFr = (() => {
    const d = new Date(
      params.dateEtatIso.includes("T") ? params.dateEtatIso : `${params.dateEtatIso}T12:00:00`,
    );
    if (Number.isNaN(d.getTime())) return params.dateEtatIso || "—";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  })();

  drawParagraph(`Date de l'état des lieux : ${dateFr}`, 10, BODY, true);
  y -= 4;

  /** Bloc deux colonnes bailleur / preneur */
  const blockTop = y;
  const colW2 = (USABLE_W - 12) / 2;
  const blockH = 78;
  const blockBottom = blockTop - blockH;
  if (blockBottom < sigFloor()) newPage();
  const y0 = y;
  page.drawRectangle({
    x: MARGIN + 3,
    y: blockBottom,
    width: colW2 - 3,
    height: blockH,
    color: PDF_VIOLET_LIGHT,
    borderColor: BORDER,
    borderWidth: 0.5,
  });
  page.drawRectangle({
    x: MARGIN,
    y: blockBottom,
    width: 3,
    height: blockH,
    color: PRIMARY,
  });
  page.drawRectangle({
    x: MARGIN + colW2 + 12 + 3,
    y: blockBottom,
    width: colW2 - 3,
    height: blockH,
    color: PDF_VIOLET_LIGHT,
    borderColor: BORDER,
    borderWidth: 0.5,
  });
  page.drawRectangle({
    x: MARGIN + colW2 + 12,
    y: blockBottom,
    width: 3,
    height: blockH,
    color: PRIMARY,
  });
  let ty = y0 - 12;
  page.drawText(sanitizePdfText("Bailleur"), { x: MARGIN + 6, y: ty, size: 9, font: fontBold, color: PRIMARY });
  ty -= 12;
  for (const ln of wrapLines(sanitizePdfText(params.bailleur.nom), fontBold, 9, colW2 - 12)) {
    page.drawText(sanitizePdfText(ln), { x: MARGIN + 6, y: ty, size: 9, font: fontBold, color: BODY });
    ty -= 10;
  }
  for (const ad of params.bailleur.adresseLignes) {
    for (const ln of wrapLines(sanitizePdfText(ad), font, 8, colW2 - 12)) {
      page.drawText(sanitizePdfText(ln), { x: MARGIN + 6, y: ty, size: 8, font, color: MUTED });
      ty -= 9;
    }
  }
  if (params.bailleur.email) {
    page.drawText(sanitizePdfText(`Email : ${params.bailleur.email}`), {
      x: MARGIN + 6,
      y: ty,
      size: 8,
      font,
      color: MUTED,
    });
    ty -= 9;
  }
  if (params.bailleur.telephone) {
    page.drawText(sanitizePdfText(`Tél. : ${params.bailleur.telephone}`), {
      x: MARGIN + 6,
      y: ty,
      size: 8,
      font,
      color: MUTED,
    });
  }

  let ty2 = y0 - 12;
  const xR = MARGIN + colW2 + 18;
  page.drawText(sanitizePdfText("Preneur (voyageur)"), {
    x: xR,
    y: ty2,
    size: 9,
    font: fontBold,
    color: PRIMARY,
  });
  ty2 -= 12;
  page.drawText(sanitizePdfText(params.preneur.nom || "—"), {
    x: xR,
    y: ty2,
    size: 9,
    font: fontBold,
    color: BODY,
  });
  ty2 -= 11;
  page.drawText(sanitizePdfText(`Email : ${params.preneur.email || "—"}`), {
    x: xR,
    y: ty2,
    size: 8,
    font,
    color: MUTED,
  });
  ty2 -= 10;
  page.drawText(sanitizePdfText(`Nationalité : ${params.preneur.nationalite || "—"}`), {
    x: xR,
    y: ty2,
    size: 8,
    font,
    color: MUTED,
  });

  y = blockBottom - 16;
  drawParagraph(`Logement : ${sanitizePdfText(params.logementAdresse)}`, 10);
  drawParagraph(
    `Séjour : du ${sanitizePdfText(params.sejourDebut)} au ${sanitizePdfText(params.sejourFin)}`,
    10,
  );
  drawParagraph(`Type : ${params.typeEtat === "entree" ? "Entrée" : "Sortie"}`, 10);
  drawParagraph(`Clés remises : ${params.clesRemises}`, 10);
  if (params.compteurEau.trim()) drawParagraph(`Relevé compteur eau : ${params.compteurEau}`, 10);
  if (params.compteurElec.trim()) drawParagraph(`Relevé compteur électricité : ${params.compteurElec}`, 10);
  y -= 10;

  /** Pièces */
  drawParagraph("État des pièces", 12, PRIMARY, true);
  y -= 4;

  const roomPhotoImages: PDFImage[][] = [];
  for (const room of params.rooms) {
    const rowImgs: PDFImage[] = [];
    for (const bytes of room.photoFiles) {
      try {
        const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50;
        rowImgs.push(isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes));
      } catch {
        try {
          rowImgs.push(await doc.embedPng(bytes));
        } catch {
          /* skip */
        }
      }
    }
    roomPhotoImages.push(rowImgs);
  }

  params.rooms.forEach((room, idx) => {
    const imgs = roomPhotoImages[idx] ?? [];
    const obsLines = wrapLines(sanitizePdfText(room.observations || "—"), font, 8, USABLE_W * 0.45);
    const rowH = Math.max(36, 14 + obsLines.length * 9 + 8, PHOTO_BOX + 8);
    if (y - rowH < sigFloor()) newPage();

    page.drawRectangle({
      x: MARGIN,
      y: y - rowH,
      width: USABLE_W,
      height: rowH,
      color: idx % 2 === 0 ? rgb(1, 1, 1) : ROW_ALT,
      borderColor: BORDER,
      borderWidth: 0.3,
    });
    const topL = y - 10;
    page.drawText(sanitizePdfText(room.label), {
      x: MARGIN + 6,
      y: topL,
      size: 10,
      font: fontBold,
      color: BODY,
    });
    let badgeBg = rgb(220 / 255, 252 / 255, 231 / 255);
    let badgeFg = rgb(22 / 255, 101 / 255, 52 / 255);
    if (room.etat === "moyen") {
      badgeBg = rgb(255 / 255, 237 / 255, 213 / 255);
      badgeFg = rgb(194 / 255, 65 / 255, 12 / 255);
    }
    if (room.etat === "mauvais") {
      badgeBg = rgb(254 / 255, 226 / 255, 226 / 255);
      badgeFg = rgb(185 / 255, 28 / 255, 28 / 255);
    }
    const badgeText = sanitizePdfText(etatIcon(room.etat));
    const badgeW = fontBold.widthOfTextAtSize(badgeText, 8.5) + 10;
    page.drawRectangle({
      x: MARGIN + USABLE_W * 0.38 - 4,
      y: topL - 11,
      width: badgeW,
      height: 12,
      color: badgeBg,
      borderColor: BORDER,
      borderWidth: 0.25,
    });
    page.drawText(badgeText, {
      x: MARGIN + USABLE_W * 0.38,
      y: topL,
      size: 8.5,
      font: fontBold,
      color: badgeFg,
    });
    let oy = topL - 14;
    for (const ln of obsLines) {
      page.drawText(sanitizePdfText(ln), { x: MARGIN + 6, y: oy, size: 8, font, color: MUTED });
      oy -= 9;
    }
    let px = MARGIN + USABLE_W - 6 - PHOTO_BOX;
    const py = y - rowH + 8;
    const list = imgs.slice(0, 4);
    for (let i = list.length - 1; i >= 0; i--) {
      drawImageCoverInBox(page, list[i]!, px, py, PHOTO_BOX, PHOTO_BOX);
      px -= PHOTO_BOX + PHOTO_GAP;
    }
    if (list.length === 0) {
      page.drawRectangle({
        x: MARGIN + USABLE_W - 6 - PHOTO_BOX,
        y: py,
        width: PHOTO_BOX,
        height: PHOTO_BOX,
        color: rgb(0.96, 0.96, 0.98),
        borderColor: BORDER,
        borderWidth: 0.5,
      });
    }
    y -= rowH + 4;
  });

  y -= 8;
  drawParagraph("Inventaire (état rapide)", 12, PRIMARY, true);
  y -= 4;

  const invHeaderH = 18;
  const invRowH = 16;
  const invCols = [0.45, 0.28, 0.27] as const;
  const cw0 = USABLE_W * invCols[0];
  const cw1 = USABLE_W * invCols[1];
  const cw2 = USABLE_W * invCols[2];

  const drawInvHeader = () => {
    if (y - invHeaderH < sigFloor()) newPage();
    page.drawRectangle({
      x: MARGIN,
      y: y - invHeaderH,
      width: USABLE_W,
      height: invHeaderH,
      color: PRIMARY,
      borderColor: BORDER,
      borderWidth: 0.4,
    });
    page.drawText(sanitizePdfText("Élément"), { x: MARGIN + 4, y: y - 12, size: 8, font: fontBold, color: WHITE });
    page.drawText(sanitizePdfText("Zone"), {
      x: MARGIN + cw0 + 4,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: WHITE,
    });
    page.drawText(sanitizePdfText("État"), {
      x: MARGIN + cw0 + cw1 + 4,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: WHITE,
    });
    y -= invHeaderH;
  };

  drawInvHeader();
  params.inventory.forEach((row, i) => {
    if (y - invRowH < sigFloor()) {
      newPage();
      drawInvHeader();
    }
    const bot = y - invRowH;
    page.drawRectangle({
      x: MARGIN,
      y: bot,
      width: USABLE_W,
      height: invRowH,
      color: i % 2 === 0 ? rgb(1, 1, 1) : ROW_ALT,
      borderColor: BORDER,
      borderWidth: 0.25,
    });
    page.drawText(sanitizePdfText(row.label), {
      x: MARGIN + 4,
      y: y - 12,
      size: 8,
      font,
      color: BODY,
    });
    page.drawText(sanitizePdfText(row.zone), {
      x: MARGIN + cw0 + 4,
      y: y - 12,
      size: 8,
      font,
      color: MUTED,
    });
    const st =
      row.status === "present" ? "Présent ✓" : row.status === "absent" ? "Absent ✗" : "Endommagé ⚠";
    page.drawText(sanitizePdfText(st), {
      x: MARGIN + cw0 + cw1 + 4,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: BODY,
    });
    y -= invRowH;
  });

  reserveSig.on = true;
  if (y < PDF_SIGNATURE_FOOTER_RESERVE + 40) newPage();

  const villeSig =
    params.logementAdresse
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .pop() || "—";

  drawSignatureBlock(page, {
    font,
    fontBold,
    ville: villeSig,
    dateStr: dateFr,
    proprietaireNom: params.bailleur.nom,
    signatureImage: sigImg,
    marginX: MARGIN,
    pageWidth: PAGE_W,
    blockBottomY: PDF_FOOTER_HEIGHT,
  });

  drawLocavioPdfFooterOnAllPages(doc, font, fontBold);
  return doc.save();
}
