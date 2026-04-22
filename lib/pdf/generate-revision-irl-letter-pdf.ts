import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type RevisionIrlLetterPdfInput = {
  villeSignature: string;
  dateLettre: string;
  proprietaireNom: string;
  proprietaireAdresseLignes: string[];
  locataireNom: string;
  dateDebutBail: string;
  trimestreIrl: string;
  valeurIrl: string;
  irlReferenceBail: string;
  loyerAvant: string;
  loyerApres: string;
  dateEffetRevision: string;
  signaturePngBytes?: Uint8Array | null;
};

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function generateRevisionIrlLetterPdfBuffer(
  input: RevisionIrlLetterPdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const lineH = 14;
  let page = doc.addPage([595, 842]);
  let { width, height } = page.getSize();
  let y = height - margin;

  const bodyParts = [
    `${input.villeSignature}, le ${input.dateLettre}`,
    "",
    input.proprietaireNom,
    ...input.proprietaireAdresseLignes,
    "",
    `À l'attention de ${input.locataireNom}`,
    "Objet : Révision annuelle du loyer",
    "",
    "Madame, Monsieur,",
    "",
    `Conformément à l'article 17-1 de la loi du 6 juillet 1989 et à la clause de révision prévue au bail signé le ${input.dateDebutBail}, je vous informe de la révision annuelle de votre loyer.`,
    "",
    `Indice de référence des loyers (IRL) applicable : ${input.trimestreIrl} — ${input.valeurIrl}`,
    `Indice IRL de référence du bail : ${input.irlReferenceBail}`,
    "",
    `Ancien loyer mensuel hors charges : ${input.loyerAvant} €`,
    `Nouveau loyer mensuel hors charges : ${input.loyerApres} €`,
    "",
    `Cette révision prendra effet à compter du ${input.dateEffetRevision}.`,
    "",
    "Je reste à votre disposition pour tout renseignement complémentaire.",
    "",
    "Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
    "",
  ];

  const draw = (text: string, bold = false) => {
    const f = bold ? fontBold : font;
    for (const line of wrapLines(text, 85)) {
      if (y < margin + 80) {
        page = doc.addPage([595, 842]);
        ({ width, height } = page.getSize());
        y = height - margin;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: f,
        color: rgb(0, 0, 0),
      });
      y -= lineH;
    }
  };

  for (const p of bodyParts) {
    draw(p, false);
  }

  y -= lineH;
  if (input.signaturePngBytes?.length) {
    try {
      const img = await doc.embedPng(input.signaturePngBytes);
      const maxW = 120;
      const scale = maxW / img.width;
      const h = img.height * scale;
      if (y < margin + h + 40) {
        page = doc.addPage([595, 842]);
        ({ width, height } = page.getSize());
        y = height - margin;
      }
      page.drawImage(img, { x: margin, y: y - h, width: maxW, height: h });
      y -= h + 8;
    } catch {
      /* signature optionnelle */
    }
  }
  draw(input.proprietaireNom, true);

  return doc.save();
}
