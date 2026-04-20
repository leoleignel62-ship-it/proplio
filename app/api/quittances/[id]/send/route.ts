import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

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

function getLastDayOfMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function formatFrenchDate(date: Date) {
  return date.toLocaleDateString("fr-FR");
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }

    const { data: proprietaire, error: proprietaireError } = await supabase
      .from("proprietaires")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const { data: quittance, error: quittanceError } = await supabase
      .from("quittances")
      .select("*")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();

    if (quittanceError || !quittance) {
      return NextResponse.json({ error: "Quittance introuvable." }, { status: 404 });
    }

    const [{ data: locataire, error: locataireError }, { data: logement, error: logementError }] =
      await Promise.all([
        supabase
          .from("locataires")
          .select("*")
          .eq("id", quittance.locataire_id)
          .eq("proprietaire_id", proprietaire.id)
          .maybeSingle(),
        supabase
          .from("logements")
          .select("*")
          .eq("id", quittance.logement_id)
          .eq("proprietaire_id", proprietaire.id)
          .maybeSingle(),
      ]);

    if (locataireError || !locataire || logementError || !logement) {
      return NextResponse.json(
        { error: "Impossible de charger les données locataire/logement." },
        { status: 400 },
      );
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const darkBlue = rgb(30 / 255, 58 / 255, 95 / 255);
    const lightBlue = rgb(232 / 255, 240 / 255, 254 / 255);
    const sectionColor = rgb(0.17, 0.27, 0.42);
    const lineColor = rgb(0.85, 0.88, 0.92);
    const lightGray = rgb(0.95, 0.96, 0.98);
    const veryLightGray = rgb(0.98, 0.98, 0.99);

    let y = 800;
    const left = 50;
    const right = pageWidth - 50;
    const lineHeight = 18;
    const pageBottom = 40;
    const monthLabel = MONTHS_FR[Number(quittance.mois) - 1] ?? String(quittance.mois);
    const lastDay = getLastDayOfMonth(Number(quittance.mois), Number(quittance.annee));
    const quittanceNumber = quittance.id?.slice(0, 8).toUpperCase() ?? "N/A";

    const drawSectionTitle = (title: string, x: number, yPos: number) => {
      page.drawText(title, {
        x,
        y: yPos,
        size: 12,
        font: fontBold,
        color: sectionColor,
      });
    };

    page.drawRectangle({
      x: 0,
      y: pageHeight - 86,
      width: pageWidth,
      height: 86,
      color: darkBlue,
    });
    page.drawText("QUITTANCE DE LOYER", {
      x: pageWidth / 2 - fontBold.widthOfTextAtSize("QUITTANCE DE LOYER", 20) / 2,
      y: pageHeight - 52,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawRectangle({
      x: 0,
      y: pageHeight - 118,
      width: pageWidth,
      height: 32,
      color: lightBlue,
    });
    const subtitle = `N° ${quittanceNumber} • Période ${monthLabel} ${quittance.annee}`;
    page.drawText(subtitle, {
      x: pageWidth / 2 - font.widthOfTextAtSize(subtitle, 10) / 2,
      y: pageHeight - 106,
      size: 10,
      font,
      color: sectionColor,
    });

    // Deux colonnes proprietaire / locataire
    const colsTop = pageHeight - 150;
    const colsHeight = 138;
    const gap = 12;
    const colWidth = (right - left - gap) / 2;
    const leftColX = left;
    const rightColX = left + colWidth + gap;

    page.drawRectangle({
      x: leftColX,
      y: colsTop - colsHeight,
      width: colWidth,
      height: colsHeight,
      color: veryLightGray,
      borderColor: lineColor,
      borderWidth: 1,
    });
    page.drawRectangle({
      x: rightColX,
      y: colsTop - colsHeight,
      width: colWidth,
      height: colsHeight,
      color: veryLightGray,
      borderColor: lineColor,
      borderWidth: 1,
    });
    page.drawLine({
      start: { x: left + colWidth + gap / 2, y: colsTop - colsHeight + 8 },
      end: { x: left + colWidth + gap / 2, y: colsTop - 8 },
      thickness: 1,
      color: lineColor,
    });

    let leftY = colsTop - 20;
    drawSectionTitle("Propriétaire", leftColX + 12, leftY);
    leftY -= lineHeight;
    page.drawText(`${proprietaire.prenom || ""} ${proprietaire.nom || ""}`.trim(), {
      x: leftColX + 12,
      y: leftY,
      size: 10.5,
      font,
    });
    leftY -= lineHeight;
    page.drawText(
      `${proprietaire.adresse || ""}`.trim(),
      {
        x: leftColX + 12,
        y: leftY,
        size: 10,
        font,
      },
    );
    leftY -= 14;
    page.drawText(`${proprietaire.code_postal || ""} ${proprietaire.ville || ""}`.trim(), {
      x: leftColX + 12,
      y: leftY,
      size: 10,
      font,
    });
    leftY -= 16;
    page.drawText(`Email: ${proprietaire.email || "—"}`, { x: leftColX + 12, y: leftY, size: 9.5, font });
    leftY -= 13;
    page.drawText(`Tél: ${proprietaire.telephone || "—"}`, { x: leftColX + 12, y: leftY, size: 9.5, font });

    let rightY = colsTop - 20;
    drawSectionTitle("Locataire", rightColX + 12, rightY);
    rightY -= lineHeight;
    page.drawText(`${locataire.prenom || ""} ${locataire.nom || ""}`.trim(), {
      x: rightColX + 12,
      y: rightY,
      size: 10.5,
      font,
    });
    rightY -= lineHeight;
    page.drawText(`Email: ${locataire.email || "—"}`, { x: rightColX + 12, y: rightY, size: 9.5, font });
    rightY -= 13;
    page.drawText(`Tél: ${locataire.telephone || "—"}`, { x: rightColX + 12, y: rightY, size: 9.5, font });

    y = colsTop - colsHeight - 24;
    const homeTitle = "Logement";
    page.drawText(homeTitle, {
      x: pageWidth / 2 - fontBold.widthOfTextAtSize(homeTitle, 12) / 2,
      y,
      size: 12,
      font: fontBold,
      color: sectionColor,
    });
    y -= lineHeight;
    const logementLine = `${logement.nom || ""} - ${logement.adresse || ""}`.trim();
    page.drawText(logementLine, {
      x: pageWidth / 2 - font.widthOfTextAtSize(logementLine, 10.5) / 2,
      y,
      size: 10.5,
      font,
    });
    y -= 14;
    const logementCity = `${logement.code_postal || ""} ${logement.ville || ""}`.trim();
    page.drawText(logementCity, {
      x: pageWidth / 2 - font.widthOfTextAtSize(logementCity, 10) / 2,
      y,
      size: 10,
      font,
    });
    y -= 20;
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 1,
      color: lineColor,
    });
    y -= 16;

    page.drawText(`Période: ${monthLabel} ${quittance.annee}`, {
      x: left,
      y,
      size: 12,
      font: fontBold,
      color: sectionColor,
    });
    y -= lineHeight + 6;

    // Tableau recapitulatif
    const tableX = left;
    const tableW = right - left;
    const tableHeaderH = 22;
    const tableRowH = 22;
    const tableColSplit = tableX + tableW * 0.72;

    page.drawRectangle({ x: tableX, y: y - tableHeaderH, width: tableW, height: tableHeaderH, color: rgb(0.27, 0.45, 0.71) });
    page.drawText("Désignation", { x: tableX + 10, y: y - 15, size: 10.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("Montant", { x: tableColSplit + 10, y: y - 15, size: 10.5, font: fontBold, color: rgb(1, 1, 1) });
    y -= tableHeaderH;

    page.drawRectangle({
      x: tableX,
      y: y - tableRowH,
      width: tableW,
      height: tableRowH,
      color: rgb(1, 1, 1),
      borderColor: lineColor,
      borderWidth: 1,
    });
    page.drawText("Loyer nu", { x: tableX + 10, y: y - 15, size: 10.5, font });
    page.drawText(`${Number(quittance.loyer).toFixed(2)} €`, { x: tableColSplit + 10, y: y - 15, size: 10.5, font });
    y -= tableRowH;

    page.drawRectangle({
      x: tableX,
      y: y - tableRowH,
      width: tableW,
      height: tableRowH,
      color: lightGray,
      borderColor: lineColor,
      borderWidth: 1,
    });
    page.drawText("Charges", { x: tableX + 10, y: y - 15, size: 10.5, font });
    page.drawText(`${Number(quittance.charges).toFixed(2)} €`, { x: tableColSplit + 10, y: y - 15, size: 10.5, font });
    y -= tableRowH;

    page.drawRectangle({
      x: tableX,
      y: y - tableRowH,
      width: tableW,
      height: tableRowH,
      color: darkBlue,
    });
    page.drawText("Total", { x: tableX + 10, y: y - 15, size: 11.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(`${Number(quittance.total).toFixed(2)} €`, {
      x: tableColSplit + 10,
      y: y - 15,
      size: 11.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    y -= tableRowH + 16;

    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 1,
      color: lineColor,
    });
    y -= 20;

    const legalText = `Je soussigné ${proprietaire.nom || ""}, bailleur, déclare avoir reçu de ${
      `${locataire.prenom || ""} ${locataire.nom || ""}`.trim()
    }, locataire, la somme de ${Number(quittance.total).toFixed(
      2,
    )} € au titre du loyer et des charges du logement situé ${logement.adresse || ""} pour la période du 1er ${monthLabel} ${
      quittance.annee
    } au ${lastDay} ${monthLabel} ${quittance.annee}.`;

    const legalLines = legalText.match(/.{1,95}(\s|$)/g) ?? [legalText];
    const legalBoxTop = y;
    const legalBoxHeight = 86;
    page.drawRectangle({
      x: left,
      y: legalBoxTop - legalBoxHeight,
      width: right - left,
      height: legalBoxHeight,
      color: rgb(1, 1, 1),
      borderColor: lineColor,
      borderWidth: 1,
    });
    page.drawRectangle({
      x: left,
      y: legalBoxTop - legalBoxHeight,
      width: 4,
      height: legalBoxHeight,
      color: rgb(0.27, 0.45, 0.71),
    });
    page.drawText("Mention légale", { x: left + 10, y: legalBoxTop - 16, size: 11, font: fontBold, color: sectionColor });
    let legalY = legalBoxTop - 32;
    legalLines.slice(0, 4).forEach((line) => {
      page.drawText(line.trim(), {
        x: left + 10,
        y: legalY,
        size: 8.8,
        font: fontItalic,
        color: rgb(0.35, 0.35, 0.35),
      });
      legalY -= 12;
    });

    const doneText = `Fait le ${formatFrenchDate(new Date())} à ${proprietaire.ville || "—"}`;
    const rightBlockX = right - 190;
    let signatureCursorY = pageBottom + 130;

    // 1) Mention "Fait le..."
    page.drawText(doneText, { x: rightBlockX, y: signatureCursorY, size: 10.5, font });
    signatureCursorY -= 18;

    // 2) Label signature
    page.drawText(`Signature du propriétaire`, {
      x: rightBlockX,
      y: signatureCursorY,
      size: 11,
      font: fontBold,
    });
    signatureCursorY -= 12;

    // 3) Image signature (avec espace avant/après)
    if (proprietaire.signature_path) {
      const { data: signatureBlob, error: signatureError } = await supabaseAdmin.storage
        .from("signatures")
        .download(proprietaire.signature_path);

      if (!signatureError && signatureBlob) {
        const bytes = await signatureBlob.arrayBuffer();
        const isPng =
          signatureBlob.type === "image/png" || proprietaire.signature_path.toLowerCase().endsWith(".png");
        const image = isPng
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);

        const maxWidth = 150;
        const maxHeight = 80;
        const widthRatio = maxWidth / image.width;
        const heightRatio = maxHeight / image.height;
        const ratio = Math.min(widthRatio, heightRatio, 1);
        const dims = image.scale(ratio);
        const signatureImageY = signatureCursorY - dims.height;

        page.drawImage(image, {
          x: rightBlockX,
          y: signatureImageY,
          width: dims.width,
          height: dims.height,
        });
        signatureCursorY = signatureImageY - 12;
      } else {
        signatureCursorY -= 80;
      }
    } else {
      signatureCursorY -= 80;
    }

    // 4) Nom sous la signature
    page.drawText(`${proprietaire.prenom || ""} ${proprietaire.nom || ""}`.trim(), {
      x: rightBlockX,
      y: signatureCursorY,
      size: 11,
      font,
    });

    page.drawLine({
      start: { x: left, y: pageBottom - 2 },
      end: { x: right, y: pageBottom - 2 },
      thickness: 0.8,
      color: lineColor,
    });
    const footerText = "Document généré automatiquement - valeur légale";
    page.drawText(footerText, {
      x: pageWidth / 2 - font.widthOfTextAtSize(footerText, 8.5) / 2,
      y: pageBottom - 16,
      size: 8.5,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: [locataire.email],
      subject: `Quittance de loyer - ${monthLabel} ${quittance.annee}`,
      html: `<p>Bonjour ${locataire.prenom || ""},</p>
<p>Veuillez trouver en pièce jointe votre quittance de loyer pour ${monthLabel} ${quittance.annee}.</p>
<p>Cordialement,<br/>${proprietaire.prenom || ""} ${proprietaire.nom || ""}</p>`,
      attachments: [
        {
          filename: `quittance-${monthLabel}-${quittance.annee}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("quittances")
      .update({
        envoyee: true,
        date_envoi: nowIso,
      })
      .eq("id", quittance.id)
      .eq("proprietaire_id", proprietaire.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
