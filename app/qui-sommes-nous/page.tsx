import Link from "next/link";
import { LegalPageShell } from "@/components/legal-page-shell";

export default function QuiSommesNousPage() {
  return (
    <LegalPageShell title="Qui sommes-nous ?">
      <div className="space-y-6 text-base leading-relaxed">
        <p>Tout a commencé par une conversation.</p>

        <p>
          On est Tony et Léo, deux passionnés de technologie et d&apos;entrepreneuriat. À la sortie de notre Master, on
          avait une certitude : on voulait entreprendre. On passait nos journées à explorer des idées autour de
          l&apos;intelligence artificielle, convaincus que notre premier projet viendrait de là.
        </p>

        <p>Et puis Enzo est arrivé.</p>

        <p>
          Le frère de Tony venait de réaliser son premier investissement immobilier. Il gérait ses logements, découvrait
          les joies de la gestion locative... et ses galères. Il nous lance presque en passant :{" "}
          <em>&quot;Ce serait vraiment trop bien d&apos;avoir un truc qui automatise tout ça.&quot;</em>
        </p>

        <p>On s&apos;est regardés.</p>

        <p>
          Cette phrase toute simple a tout changé. On a commencé à creuser, à parler à d&apos;autres propriétaires, et on
          a réalisé que c&apos;était partout pareil : des heures perdues chaque mois sur des quittances, des baux, des
          relances — du temps précieux qui pourrait être investi ailleurs, à faire grandir leur patrimoine.
        </p>

        <p>
          On a décidé d&apos;y répondre sérieusement. Pas juste automatiser les quittances — construire la solution
          complète que tout propriétaire aurait voulu avoir dès le premier jour.
        </p>

        <p>
          C&apos;est comme ça que Proplio est né. D&apos;une phrase, d&apos;un problème réel, et de l&apos;envie de changer
          les choses.
        </p>

        <p>
          Notre ambition ? <strong style={{ color: "#7c3aed" }}>Devenir la référence de la gestion locative en France.</strong>{" "}
          On n&apos;en est qu&apos;au début, et on est impatients de la suite.
        </p>

        <p className="mt-10 text-center italic">— Tony &amp; Léo</p>

        <div className="pt-6 text-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-semibold"
            style={{ backgroundColor: "#7c3aed", color: "#ffffff" }}
          >
            Essayer Proplio gratuitement
          </Link>
        </div>
      </div>
    </LegalPageShell>
  );
}
