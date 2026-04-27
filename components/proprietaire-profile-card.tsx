import type { ProprietaireProfile } from "@/lib/proprietaire-profile";
import { PC } from "@/lib/locavio-colors";
import { panelCard } from "@/lib/locavio-field-styles";

type ProprietaireProfileCardProps = {
  profile: ProprietaireProfile | null;
  title: string;
};

export function ProprietaireProfileCard({ profile, title }: ProprietaireProfileCardProps) {
  return (
    <div className="mb-6 p-5" style={panelCard}>
      <h3 className="text-base font-semibold" style={{ color: PC.text }}>
        {title}
      </h3>
      {profile ? (
        <div className="mt-3 grid gap-1.5 text-sm" style={{ color: PC.muted }}>
          <p>
            <span className="font-medium" style={{ color: PC.text }}>
              Propriétaire :
            </span>{" "}
            {profile.prenom} {profile.nom}
          </p>
          <p>
            <span className="font-medium" style={{ color: PC.text }}>
              Email :
            </span>{" "}
            {profile.email}
          </p>
          <p>
            <span className="font-medium" style={{ color: PC.text }}>
              Téléphone :
            </span>{" "}
            {profile.telephone || "—"}
          </p>
          <p>
            <span className="font-medium" style={{ color: PC.text }}>
              Adresse :
            </span>{" "}
            {profile.adresse}, {profile.code_postal} {profile.ville}
          </p>
          <p>
            <span className="font-medium" style={{ color: PC.text }}>
              SIRET :
            </span>{" "}
            {profile.siret || "—"}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm" style={{ color: PC.warning }}>
          Complétez d&apos;abord &quot;Mon profil propriétaire&quot; dans Paramètres pour alimenter automatiquement les
          quittances et baux.
        </p>
      )}
    </div>
  );
}
