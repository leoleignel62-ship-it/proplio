import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createInitialPiecesData } from "@/lib/etat-des-lieux/defaults";
import { generateBailPdfBuffer, type BailPdfLocataire } from "@/lib/pdf/generate-bail-pdf";
import { generateContratSejourPdfBuffer } from "@/lib/pdf/generate-contrat-sejour-pdf";
import { generateEdlPdfBuffer } from "@/lib/pdf/generate-edl-pdf";
import { generateQuittancePdfBuffer } from "@/lib/pdf/generate-quittance-pdf";

export const runtime = "nodejs";

type ExampleType = "quittance" | "bail" | "etat-des-lieux" | "contrat-sejour";
type SendBody = { email?: string; type?: ExampleType };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_HOUR = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const resend = new Resend(process.env.RESEND_API_KEY);

const ipRateStore = new Map<string, number[]>();

const SUBJECT_BY_TYPE: Record<ExampleType, string> = {
  quittance: "Voici votre exemple de quittance Locavio 🏠",
  bail: "Voici votre exemple de bail Locavio 📄",
  "etat-des-lieux": "Voici votre exemple d'état des lieux Locavio 🔑",
  "contrat-sejour": "Voici votre exemple de contrat saisonnier Locavio 🌊",
};

const FICTIVE_OWNER = {
  prenom: "Marie",
  nom: "Dupont",
  email: "marie.dupont@example.com",
  telephone: "06 12 34 56 78",
  adresse: "18 avenue Parmentier",
  code_postal: "75011",
  ville: "Paris",
};

const FICTIVE_TENANT = {
  prenom: "Thomas",
  nom: "Martin",
  email: "thomas.martin@example.com",
  telephone: "06 98 76 54 32",
  adresse: "Appartement 3ème étage, 12 rue des Lilas",
  code_postal: "75011",
  ville: "Paris",
};

const FICTIVE_HOME = {
  nom: "Appartement 3ème étage",
  adresse: "12 rue des Lilas",
  code_postal: "75011",
  ville: "Paris",
  type: "Appartement",
  surface: 48,
  capacite_max: 4,
  equipements_saisonnier: ["Wi-Fi", "Cuisine équipée", "Lave-linge", "Draps fournis"],
};

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown-ip";
  }
  const xRealIp = request.headers.get("x-real-ip");
  return xRealIp?.trim() || "unknown-ip";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = ipRateStore.get(ip) ?? [];
  const freshAttempts = attempts.filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (freshAttempts.length >= MAX_PER_HOUR) {
    ipRateStore.set(ip, freshAttempts);
    return false;
  }
  freshAttempts.push(now);
  ipRateStore.set(ip, freshAttempts);
  return true;
}

async function buildPdfBuffer(type: ExampleType): Promise<Uint8Array> {
  if (type === "quittance") {
    return generateQuittancePdfBuffer({
      proprietaire: FICTIVE_OWNER,
      locataire: FICTIVE_TENANT,
      logement: FICTIVE_HOME,
      quittance: {
        id: "EXQ-2026-04",
        mois: 4,
        annee: 2026,
        loyer: 1260,
        charges: 140,
        total: 1400,
      },
    });
  }

  if (type === "bail") {
    const locatairesOrdered: BailPdfLocataire[] = [
      {
        prenom: FICTIVE_TENANT.prenom,
        nom: FICTIVE_TENANT.nom,
        email: FICTIVE_TENANT.email,
        telephone: FICTIVE_TENANT.telephone,
        adresse: FICTIVE_TENANT.adresse,
        code_postal: FICTIVE_TENANT.code_postal,
        ville: FICTIVE_TENANT.ville,
        date_naissance: "1991-05-14",
      },
    ];
    return generateBailPdfBuffer({
      bail: {
        id: "EXB-2026-001",
        type_bail: "meuble",
        date_debut: "2026-04-01",
        date_fin: "2027-03-31",
        duree_mois: 12,
        designation_logement: "Appartement T2 meublé",
        logement_etage: "3ème étage",
        interphone_digicode_oui: true,
        interphone_digicode_code: "A315",
        parking_inclus: false,
        cave_incluse: true,
        cave_numero: "C12",
        garage_inclus: false,
        diagnostics: {
          dpe: true,
          amiante: true,
          plomb: false,
          electricite: true,
          gaz: true,
          erp: true,
          bruit: true,
        },
        equipements: ["canape", "table_basse", "lit", "refrigerateur", "lave_vaisselle"],
        equipements_details: {},
        clauses_particulieres:
          "Le logement est loué à usage d'habitation principale. Les animaux de petite taille sont autorisés.",
        mode_paiement_loyer: "virement",
        loyer: 1260,
        charges: 140,
        jour_paiement: 5,
        depot_garantie: 2520,
        dernier_loyer_precedent: 1240,
        revision_loyer:
          "Le loyer est révisable chaque année à la date anniversaire selon l'IRL du 1er trimestre publié par l'INSEE.",
      },
      proprietaire: FICTIVE_OWNER,
      logement: {
        ...FICTIVE_HOME,
        est_colocation: false,
      },
      locatairesOrdered,
    });
  }

  if (type === "etat-des-lieux") {
    const pieces = createInitialPiecesData(true, 1);
    pieces.clesRemises = 2;
    pieces.badgesRemis = 1;
    pieces.observationsGenerales =
      "Appartement propre, fraîchement repeint, équipements de cuisine fonctionnels, aucune anomalie majeure constatée.";
    return generateEdlPdfBuffer({
      typeEtat: "entree",
      dateEtat: "2026-04-02",
      typeLogement: "meuble",
      bailleurNom: `${FICTIVE_OWNER.prenom} ${FICTIVE_OWNER.nom}`,
      preneurNom: `${FICTIVE_TENANT.prenom} ${FICTIVE_TENANT.nom}`,
      logementAdresse: "Appartement 3ème étage, 12 rue des Lilas, 75011 Paris",
      piecesJson: pieces,
      compteursExtra: {
        clesRemises: 2,
        badgesRemis: 1,
        observationsGenerales: pieces.observationsGenerales,
      },
      photoFiles: new Map<string, Uint8Array>(),
    });
  }

  return generateContratSejourPdfBuffer({
    proprietaire: FICTIVE_OWNER,
    voyageur: {
      ...FICTIVE_TENANT,
      nationalite: "Française",
    },
    logement: {
      ...FICTIVE_HOME,
      reglement_interieur:
        "Merci de respecter le voisinage après 22h et de laisser l'appartement rangé au départ.",
    },
    reservation: {
      date_arrivee: "2026-07-12",
      date_depart: "2026-07-19",
      heure_arrivee: "16:00",
      heure_depart: "10:00",
      nb_voyageurs: 2,
      nb_nuits: 7,
      tarif_nuit: 145,
      tarif_total: 1015,
      tarif_menage: 65,
      menage_inclus: true,
      tarif_caution: 500,
      taxe_sejour_total: 24.5,
      montant_acompte: 312,
    },
  });
}

function fileNameForType(type: ExampleType): string {
  if (type === "quittance") return "exemple-quittance-locavio.pdf";
  if (type === "bail") return "exemple-bail-locavio.pdf";
  if (type === "etat-des-lieux") return "exemple-etat-des-lieux-locavio.pdf";
  return "exemple-contrat-saisonnier-locavio.pdf";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez dans une heure." },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => null)) as SendBody | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const type = body?.type;

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }
    if (!type || !Object.hasOwn(SUBJECT_BY_TYPE, type)) {
      return NextResponse.json({ error: "Type d'exemple invalide." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY manquant." }, { status: 500 });
    }

    const pdfBytes = await buildPdfBuffer(type);
    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: [email],
      subject: SUBJECT_BY_TYPE[type],
      html: `<p>Bonjour,</p><p>Voici votre exemple de document Locavio en pièce jointe.</p><p>Bonne découverte 👋</p>`,
      attachments: [
        {
          filename: fileNameForType(type),
          content: Buffer.from(pdfBytes).toString("base64"),
        },
      ],
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
