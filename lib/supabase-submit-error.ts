/**
 * Messages lisibles pour les erreurs réseau / Supabase / Auth côté client.
 * Évite d'afficher « TypeError: Load failed » ou « Failed to fetch » bruts.
 */
export function formatSubmitError(error: unknown): string {
  if (error === null || error === undefined) {
    return "Une erreur inattendue s'est produite. Réessayez dans quelques instants.";
  }

  if (typeof error === "string") {
    const t = error.trim();
    return t ? mapKnownMessage(t) : "Une erreur inattendue s'est produite. Réessayez dans quelques instants.";
  }

  if (typeof error === "object") {
    const o = error as { message?: string; code?: string; details?: string; hint?: string };
    const raw = String(o.message ?? "").trim();
    const code = o.code ? String(o.code) : "";
    const details = o.details ? String(o.details).trim() : "";

    if (code === "42501" || /permission denied|row-level security|rls/i.test(raw + details)) {
      return "Enregistrement refusé : droits insuffisants ou règles de sécurité (RLS) sur Supabase. Vérifiez les politiques pour cette table.";
    }
    if (code === "PGRST301" || /jwt|session|not authenticated|invalid token/i.test(raw)) {
      return "Session expirée ou invalide. Déconnectez-vous puis reconnectez-vous.";
    }
    if (/duplicate key|unique constraint/i.test(raw + details)) {
      return "Cette donnée existe déjà (contrainte d'unicité). Modifiez ou supprimez l'existant.";
    }
    if (/foreign key|violates foreign key/i.test(raw + details)) {
      return "Référence invalide : le logement, le locataire ou le propriétaire lié n'existe pas ou a été supprimé.";
    }
    if (/null value|not null violation/i.test(raw + details)) {
      return "Champ obligatoire manquant côté base de données. Vérifiez que tous les champs requis sont remplis.";
    }

    if (raw) {
      return mapKnownMessage(raw);
    }
  }

  return "Une erreur inattendue s'est produite. Réessayez dans quelques instants.";
}

function mapKnownMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("load failed") ||
    lower === "failed to fetch" ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("err_network") ||
    lower.includes("loadfailed")
  ) {
    return "Connexion au serveur impossible (réseau, pare-feu ou configuration). Vérifiez votre connexion internet et les variables d'environnement Supabase (URL et clé anon) pour cette application.";
  }
  return raw;
}

/** Email simple pour validation formulaire */
export function isValidEmail(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
