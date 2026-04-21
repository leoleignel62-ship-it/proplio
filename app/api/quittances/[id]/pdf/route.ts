import { PDFDocument, StandardFonts } from "pdf-lib";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });

    const { data: proprietaire } = await supabase
      .from("proprietaires")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!proprietaire?.id) return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });

    const { data: quittance } = await supabase
      .from("quittances")
      .select("id, mois, annee, loyer, charges, total, locataire_id, logement_id")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();
    if (!quittance) return NextResponse.json({ error: "Quittance introuvable." }, { status: 404 });

    const [{ data: locataire }, { data: logement }] = await Promise.all([
      supabase.from("locataires").select("prenom, nom").eq("id", quittance.locataire_id).maybeSingle(),
      supabase.from("logements").select("nom, adresse").eq("id", quittance.logement_id).maybeSingle(),
    ]);

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const draw = (text: string, y: number, bold = false, size = 12) =>
      page.drawText(text, { x: 50, y, size, font: bold ? fontBold : font });

    draw("Quittance de loyer", 790, true, 20);
    draw(`Locataire: ${`${locataire?.prenom ?? ""} ${locataire?.nom ?? ""}`.trim() || "—"}`, 750);
    draw(`Logement: ${(logement?.nom || logement?.adresse || "—").toString()}`, 728);
    draw(`Période: ${quittance.mois}/${quittance.annee}`, 706);
    draw(`Loyer: ${Number(quittance.loyer).toFixed(2)} €`, 674);
    draw(`Charges: ${Number(quittance.charges).toFixed(2)} €`, 652);
    draw(`Total: ${Number(quittance.total).toFixed(2)} €`, 630, true);

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quittance-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
