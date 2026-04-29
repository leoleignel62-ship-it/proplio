import type { CandidatureSituation, CandidatureTypeContrat, CandidatureTypeGarant } from "@/lib/candidature";

export type CandidatureScoreInput = {
  loyer_reference: number;
  revenus_nets_mensuels: number;
  type_contrat: CandidatureTypeContrat;
  anciennete_mois: number;
  a_garant?: boolean;
  type_garant?: CandidatureTypeGarant | null;
  situation: CandidatureSituation;
};

export type CandidatureScoreResult = {
  score: number;
  note: "A" | "B" | "C" | "D" | "E";
  details: {
    ratio_loyer: { points: number; max: 40; ratio: number };
    contrat: { points: number; max: 25 };
    anciennete: { points: number; max: 15 };
    garant: { points: number; max: 15 };
    situation: { points: number; max: 5 };
    message: string;
  };
};

function getRatioPoints(ratio: number): number {
  if (ratio >= 3) return 40;
  if (ratio >= 2.5) return 32;
  if (ratio >= 2) return 20;
  if (ratio >= 1.5) return 10;
  return 0;
}

function getContratPoints(typeContrat: CandidatureTypeContrat): number {
  if (typeContrat === "CDI" || typeContrat === "retraite" || typeContrat === "fonctionnaire") return 25;
  if (typeContrat === "CDD_long") return 18;
  if (typeContrat === "independant") return 15;
  if (typeContrat === "interimaire") return 10;
  if (typeContrat === "etudiant") return 8;
  if (typeContrat === "CDD_court") return 5;
  return 0;
}

function getAnciennetePoints(ancienneteMois: number): number {
  if (ancienneteMois > 24) return 15;
  if (ancienneteMois >= 12) return 10;
  if (ancienneteMois >= 6) return 5;
  return 2;
}

function getGarantPoints(hasGarant: boolean, typeGarant?: CandidatureTypeGarant | null): number {
  if (!hasGarant || !typeGarant) return 0;
  if (typeGarant === "bancaire" || typeGarant === "visale") return 15;
  if (typeGarant === "personnel_solvable") return 12;
  if (typeGarant === "personnel_moins_solvable") return 6;
  return 0;
}

function getSituationPoints(situation: CandidatureSituation): number {
  if (situation === "seul" || situation === "couple") return 5;
  return 3;
}

function getNote(score: number): { note: "A" | "B" | "C" | "D" | "E"; message: string } {
  if (score >= 85) return { note: "A", message: "Dossier excellent" };
  if (score >= 70) return { note: "B", message: "Dossier solide" };
  if (score >= 55) return { note: "C", message: "Dossier correct" };
  if (score >= 40) return { note: "D", message: "Dossier limite" };
  return { note: "E", message: "Dossier insuffisant" };
}

export function calculateScore(data: CandidatureScoreInput): CandidatureScoreResult {
  const loyer = Math.max(1, Number(data.loyer_reference || 0));
  const revenus = Math.max(0, Number(data.revenus_nets_mensuels || 0));
  const ratio = revenus / loyer;

  const ratioPoints = getRatioPoints(ratio);
  const contratPoints = getContratPoints(data.type_contrat);
  const anciennetePoints = getAnciennetePoints(Math.max(0, Number(data.anciennete_mois || 0)));
  const garantPoints = getGarantPoints(Boolean(data.a_garant), data.type_garant);
  const situationPoints = getSituationPoints(data.situation);

  const score = Math.max(0, Math.min(100, ratioPoints + contratPoints + anciennetePoints + garantPoints + situationPoints));
  const { note, message } = getNote(score);

  return {
    score,
    note,
    details: {
      ratio_loyer: { points: ratioPoints, max: 40, ratio: Number(ratio.toFixed(2)) },
      contrat: { points: contratPoints, max: 25 },
      anciennete: { points: anciennetePoints, max: 15 },
      garant: { points: garantPoints, max: 15 },
      situation: { points: situationPoints, max: 5 },
      message,
    },
  };
}
