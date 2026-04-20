import type { ProprietaireProfile } from "@/lib/proprietaire-profile";

type ProprietaireProfileCardProps = {
  profile: ProprietaireProfile | null;
  title: string;
};

export function ProprietaireProfileCard({ profile, title }: ProprietaireProfileCardProps) {
  return (
    <div className="proplio-card mb-6 p-5">
      <h3 className="text-base font-semibold text-proplio-text">{title}</h3>
      {profile ? (
        <div className="mt-3 grid gap-1.5 text-sm text-proplio-muted">
          <p>
            <span className="font-medium text-proplio-text">Propriétaire :</span> {profile.prenom} {profile.nom}
          </p>
          <p>
            <span className="font-medium text-proplio-text">Email :</span> {profile.email}
          </p>
          <p>
            <span className="font-medium text-proplio-text">Téléphone :</span> {profile.telephone || "—"}
          </p>
          <p>
            <span className="font-medium text-proplio-text">Adresse :</span> {profile.adresse}, {profile.code_postal}{" "}
            {profile.ville}
          </p>
          <p>
            <span className="font-medium text-proplio-text">SIRET :</span> {profile.siret || "—"}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-proplio-warning">
          Complétez d&apos;abord &quot;Mon profil propriétaire&quot; dans Paramètres pour alimenter automatiquement les
          quittances et baux.
        </p>
      )}
    </div>
  );
}
