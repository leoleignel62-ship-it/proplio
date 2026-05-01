export type ArticleCategory =
  | "Documents & modèles"
  | "Calculs & chiffres"
  | "Saisonnier"
  | "Guide pratique"
  | "Comparatifs";

export type Article = {
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  readTime: number;
  publishedAt: string;
  content: string;
};

const quittanceHtml = `<h2>Qu'est-ce qu'une quittance de loyer ?</h2>
<p>La quittance de loyer est un document officiel remis par le bailleur au locataire pour attester du paiement du loyer et des charges. Elle constitue une preuve de paiement et peut être exigée par le locataire à tout moment.</p>
<p>Contrairement à ce que beaucoup pensent, le bailleur n'est pas obligé de fournir une quittance spontanément — mais il doit obligatoirement en délivrer une si le locataire en fait la demande, et ce gratuitement (article 21 de la loi du 6 juillet 1989).</p>

<h2>Les mentions obligatoires d'une quittance de loyer</h2>
<p>Une quittance de loyer valide doit impérativement mentionner :</p>
<ul>
<li>Le nom et l'adresse du bailleur</li>
<li>Le nom du ou des locataires</li>
<li>L'adresse du logement concerné</li>
<li>La période couverte (mois et année)</li>
<li>Le montant du loyer hors charges</li>
<li>Le montant des charges</li>
<li>Le montant total acquitté</li>
<li>La date de paiement</li>
<li>La signature du bailleur (ou mention "reçu le paiement")</li>
</ul>
<p>L'absence de l'une de ces mentions peut rendre la quittance contestable devant un tribunal.</p>

<h2>La différence entre quittance et reçu de loyer</h2>
<p>Beaucoup confondent ces deux documents. Le reçu de loyer est délivré dès réception du paiement, même partiel. La quittance, elle, atteste d'un paiement complet. Si le locataire ne paie qu'une partie du loyer, vous devez émettre un reçu — jamais une quittance, qui pourrait être interprétée comme une renonciation au solde restant dû.</p>

<h2>Peut-on envoyer une quittance par email ?</h2>
<p>Oui, absolument. La loi ALUR de 2014 a modernisé les pratiques : une quittance envoyée par email a la même valeur légale qu'une quittance papier, à condition que le locataire ait accepté ce mode de transmission. En pratique, la quasi-totalité des locataires préfèrent recevoir leurs quittances par email — c'est plus rapide et plus pratique.</p>

<h2>Combien de temps conserver ses quittances ?</h2>
<p>En tant que bailleur, vous devez conserver vos quittances pendant au moins 3 ans après la fin du bail — durée du délai de prescription en matière locative. En cas de litige (loyers impayés, dégradations), ces documents constituent des preuves essentielles.</p>
<p>Le locataire, de son côté, a intérêt à les conserver pendant toute la durée du bail et au-delà — certaines administrations (CAF, banques, employeurs) peuvent les demander pour justifier d'un domicile stable.</p>

<h2>Les erreurs les plus fréquentes des propriétaires</h2>
<ul>
<li><strong>Émettre une quittance avant d'avoir reçu le paiement</strong> : risque juridique en cas d'impayé ultérieur.</li>
<li><strong>Oublier de distinguer loyer et charges</strong> : la loi impose que les deux montants soient indiqués séparément.</li>
<li><strong>Ne pas dater la quittance</strong> : une quittance sans date est difficilement opposable.</li>
<li><strong>Confondre quittance et reçu en cas de paiement partiel</strong> : voir ci-dessus.</li>
<li><strong>Ne pas conserver de copie</strong> : en cas de litige, c'est votre protection.</li>
</ul>

<h2>Comment générer une quittance conforme automatiquement ?</h2>
<p>Générer une quittance à la main chaque mois prend du temps et expose à des erreurs. Avec Locavio, vous générez et envoyez vos quittances en un seul clic dès réception du loyer. Le PDF est conforme aux exigences légales, toutes les mentions obligatoires sont automatiquement remplies, et le locataire reçoit sa quittance par email instantanément.</p>
<p>Plus besoin de Word, d'Excel ou d'imprimer quoi que ce soit. Tout est centralisé, archivé et accessible à tout moment.</p>`;

const irlHtml = `<h2>Qu'est-ce que l'IRL et pourquoi est-il obligatoire ?</h2>
<p>L'Indice de Référence des Loyers (IRL) est un indice publié chaque trimestre par l'INSEE. Il sert de base légale pour calculer la révision annuelle des loyers en location vide et meublée. Son utilisation est encadrée par la loi du 6 juillet 1989 : un bailleur ne peut pas réviser son loyer au-delà de l'IRL, sous peine de voir la clause de révision déclarée nulle.</p>
<p>En 2026, l'IRL continue de jouer un rôle central dans la relation bailleur-locataire, notamment dans un contexte où l'inflation reste surveillée de près.</p>

<h2>Comment fonctionne le calcul de révision ?</h2>
<p>La formule légale est la suivante :</p>
<p><strong>Nouveau loyer = Loyer actuel × (IRL du trimestre de référence ÷ IRL du même trimestre de l'année précédente)</strong></p>
<p>Le trimestre de référence est celui mentionné dans votre bail. Si rien n'est précisé, on prend le dernier IRL publié à la date anniversaire du bail.</p>

<h2>Exemple concret de calcul IRL 2026</h2>
<p>Prenons un exemple simple :</p>
<ul>
<li>Loyer actuel : 850 €</li>
<li>IRL Q1 2026 : 145,28 (valeur indicative)</li>
<li>IRL Q1 2025 : 140,36</li>
</ul>
<p>Nouveau loyer = 850 × (145,28 ÷ 140,36) = 850 × 1,035 = <strong>879,75 €</strong></p>
<p>L'augmentation est donc de 29,75 € par mois, soit +3,5%.</p>

<h2>Quand peut-on réviser le loyer ?</h2>
<p>La révision n'est possible que si une clause de révision figure dans le bail. Elle ne peut intervenir qu'une fois par an, à la date anniversaire du bail ou à la date prévue dans le contrat. Si le bailleur oublie de réviser à la bonne date, il ne peut pas rattraper les mois perdus — la révision ne s'applique qu'à partir de la demande.</p>
<p>Attention : si vous oubliez plusieurs années de suite, vous perdez définitivement la possibilité de récupérer ces augmentations.</p>

<h2>Quelles locations sont concernées ?</h2>
<ul>
<li>Locations vides (résidence principale) : OUI</li>
<li>Locations meublées (résidence principale) : OUI</li>
<li>Locations saisonnières : NON (pas de révision IRL)</li>
<li>Locations commerciales : NON (autre indice)</li>
</ul>

<h2>La lettre de révision : est-elle obligatoire ?</h2>
<p>Oui. Pour que la révision soit opposable au locataire, vous devez lui envoyer une lettre de révision — par courrier recommandé ou par email si le locataire a accepté ce mode de communication. Cette lettre doit mentionner : le nouveau loyer, la date d'application, l'IRL utilisé et sa source (INSEE).</p>
<p>Sans cette notification, la révision ne peut pas être exigée.</p>

<h2>Comment ne plus rater une révision ?</h2>
<p>Avec Locavio, le logiciel détecte automatiquement les baux éligibles à la révision et calcule le nouveau loyer selon l'indice IRL publié par l'INSEE. En un clic, vous validez le nouveau montant et envoyez la lettre officielle par email à votre locataire. Plus aucune révision manquée, plus aucun calcul à faire à la main.</p>`;

const saisonnierHtml = `<h2>Le contrat de location saisonnière est-il obligatoire ?</h2>
<p>Oui. Depuis la loi du 2 janvier 1970 et les articles L.324-1 et suivants du Code du tourisme, tout contrat de location saisonnière doit être formalisé par écrit. Il n'existe pas de dérogation à cette obligation, quelle que soit la durée du séjour.</p>
<p>L'absence de contrat écrit vous expose à des risques juridiques importants : impossibilité de réclamer l'acompte, difficulté à prouver les conditions du séjour, et vulnérabilité en cas de litige avec le voyageur.</p>

<h2>Quelle est la durée maximale d'une location saisonnière ?</h2>
<p>La loi fixe une durée maximale de 90 jours consécutifs pour une même personne. Au-delà, la location ne peut plus être qualifiée de saisonnière et tombe sous le régime de la location meublée classique, avec toutes les protections locataires qui en découlent.</p>

<h2>Les mentions obligatoires du contrat</h2>
<p>Un contrat de location saisonnière conforme doit impérativement mentionner :</p>
<ul>
<li>L'identité complète du bailleur et du preneur</li>
<li>L'adresse et la description précise du logement</li>
<li>La superficie habitable</li>
<li>La capacité d'accueil maximale</li>
<li>Les dates précises d'arrivée et de départ (heures incluses)</li>
<li>Le prix total du séjour (hors taxe de séjour)</li>
<li>Le montant de la taxe de séjour applicable</li>
<li>Le montant de l'acompte et ses conditions</li>
<li>Le montant et les conditions de restitution de la caution</li>
<li>Les conditions d'annulation</li>
<li>Le règlement intérieur (si applicable)</li>
</ul>

<h2>Acompte, solde et caution : comment les structurer ?</h2>
<p>La pratique courante est de demander un acompte de 25 à 30% à la réservation, avec le solde dû 30 à 60 jours avant l'arrivée. La caution, elle, est remise à l'entrée et restituée sous 7 à 10 jours après le départ, déduction faite des éventuelles dégradations constatées.</p>
<p>Ces conditions doivent impérativement figurer dans le contrat pour être opposables au voyageur.</p>

<h2>Que se passe-t-il en cas d'annulation ?</h2>
<p>La loi ne fixe pas de règles précises sur les annulations en location saisonnière — c'est votre contrat qui fait foi. Il est donc crucial de rédiger des conditions d'annulation claires :</p>
<ul>
<li>Annulation par le voyageur : l'acompte est-il remboursable ? Sous quelles conditions ?</li>
<li>Annulation par le bailleur : remboursement intégral des sommes versées, plus éventuelle indemnisation.</li>
</ul>

<h2>Location via Airbnb ou Booking : le contrat est-il quand même obligatoire ?</h2>
<p>Oui. Les CGU d'Airbnb ou Booking ne remplacent pas le contrat de location saisonnière. Ces plateformes gèrent la transaction financière, mais la relation juridique entre vous et le voyageur doit être formalisée par votre propre contrat.</p>
<p>En pratique, peu de propriétaires le font — ce qui les expose inutilement à des risques en cas de litige.</p>

<h2>Comment générer un contrat conforme en quelques minutes ?</h2>
<p>Avec Locavio, vous générez automatiquement un contrat de location saisonnière conforme aux articles L.324-1 du Code du tourisme. Toutes les informations de réservation sont injectées automatiquement, et le contrat est envoyé au voyageur par email en PDF, prêt à être signé.</p>`;

const dossierHtml = `<h2>Ce que dit la loi sur le dossier locataire</h2>
<p>Le décret du 5 novembre 2015 (dit décret Alur) fixe la liste limitative des documents qu'un bailleur peut exiger d'un candidat locataire. Demander des documents non listés est interdit et peut exposer le bailleur à des sanctions.</p>
<p>Cette liste s'applique à la fois aux locations vides et meublées constituant la résidence principale du locataire.</p>

<h2>Documents d'identité autorisés</h2>
<p>Vous pouvez demander UNE SEULE pièce d'identité parmi :</p>
<ul>
<li>Carte nationale d'identité française ou étrangère</li>
<li>Passeport français ou étranger</li>
<li>Permis de conduire français ou étranger</li>
<li>Document justifiant du droit au séjour en France (pour les ressortissants étrangers non européens)</li>
</ul>
<p>Vous ne pouvez pas demander deux pièces d'identité cumulativement.</p>

<h2>Justificatifs de domicile autorisés</h2>
<ul>
<li>3 dernières quittances de loyer (ou attestation de l'hébergeur)</li>
<li>Dernier avis de taxe foncière ou titre de propriété</li>
<li>Dernière quittance d'assurance habitation</li>
</ul>

<h2>Justificatifs de situation professionnelle</h2>
<ul>
<li>Contrat de travail ou promesse d'embauche</li>
<li>3 derniers bulletins de salaire</li>
<li>Attestation de l'employeur (moins de 3 mois)</li>
<li>Justificatif d'activité pour les indépendants (Kbis, URSSAF)</li>
<li>2 derniers bilans pour les professions libérales</li>
<li>Justificatif de bourse ou de revenus pour les étudiants</li>
</ul>

<h2>Justificatifs de ressources financières</h2>
<ul>
<li>3 derniers bulletins de salaire</li>
<li>Dernier ou avant-dernier avis d'imposition</li>
<li>Titre de pension ou retraite</li>
<li>Justificatif de prestations CAF (APL, AAH...)</li>
<li>3 dernières quittances de loyer pour évaluer le comportement payeur</li>
</ul>

<h2>Ce qu'il est INTERDIT de demander</h2>
<p>Le décret interdit explicitement de demander :</p>
<ul>
<li>Un relevé de compte bancaire ou postal</li>
<li>Une autorisation de prélèvement automatique</li>
<li>Des informations sur la santé ou la grossesse</li>
<li>Un extrait de casier judiciaire</li>
<li>Une photo d'identité</li>
<li>Le contrat de mariage ou livret de famille</li>
<li>Un chèque de réservation</li>
<li>Plus d'une pièce d'identité</li>
</ul>
<p>Toute clause du bail imposant ces documents est réputée non écrite.</p>

<h2>Le garant : quels documents demander ?</h2>
<p>Si vous acceptez un garant (personne physique), vous pouvez lui demander les mêmes justificatifs qu'au locataire : pièce d'identité, justificatif de domicile, situation professionnelle et ressources. La garantie doit être formalisée par un acte de cautionnement écrit.</p>

<h2>Comment évaluer la solvabilité d'un candidat ?</h2>
<p>La règle empirique la plus utilisée est le ratio loyer/revenus : les revenus du candidat doivent représenter au moins 3 fois le montant du loyer charges comprises. Mais ce critère seul est insuffisant — un CDI récent peut être plus risqué qu'un CDD de longue date avec un historique de paiement impeccable.</p>
<p>Locavio automatise cette évaluation : les candidats remplissent un questionnaire en ligne, et le logiciel calcule automatiquement un score de solvabilité sur 100, en tenant compte des revenus, du type de contrat, de l'ancienneté et de la présence d'un garant. Vous obtenez une note claire pour comparer vos candidats objectivement.</p>`;

const excelHtml = `<h2>Pourquoi autant de propriétaires utilisent encore Excel ?</h2>
<p>La réponse est simple : l'habitude et la gratuité apparente. Excel est déjà installé sur l'ordinateur, on sait s'en servir (plus ou moins), et ça "marche" — au sens où ça permet de noter les informations quelque part.</p>
<p>Mais "marcher" n'est pas la même chose qu'"être adapté". Et c'est là que le bât blesse.</p>

<h2>Ce qu'Excel fait bien (soyons honnêtes)</h2>
<ul>
<li>Stocker des données structurées simplement</li>
<li>Faire des calculs basiques (sommes, moyennes)</li>
<li>Créer des tableaux de suivi personnalisés</li>
<li>Coût : 0€ si déjà dans un pack Office</li>
</ul>
<p>Pour un propriétaire avec un seul logement et un locataire stable depuis 10 ans, Excel peut suffire. Mais dès que la situation se complexifie, les limites apparaissent rapidement.</p>

<h2>Les vraies limites d'Excel pour la gestion locative</h2>

<h3>1. La génération de documents légaux</h3>
<p>Excel ne génère pas de quittances de loyer conformes, ni de baux ALUR, ni de lettres de révision IRL officielles. Vous devez utiliser un autre outil (Word, modèle en ligne) et copier-coller les informations manuellement. Résultat : 30 à 45 minutes par quittance, des erreurs fréquentes, et des documents qui ne sont pas toujours conformes.</p>

<h3>2. Le suivi des révisions IRL</h3>
<p>Excel ne vous alerte pas quand une révision de loyer est due. Vous devez vous souvenir vous-même de la date anniversaire de chaque bail, consulter l'INSEE pour le dernier indice IRL, faire le calcul, et envoyer la lettre. Si vous l'oubliez (et c'est fréquent), vous perdez définitivement la possibilité de réviser pour cette année.</p>

<h3>3. La gestion des états des lieux</h3>
<p>Un état des lieux complet avec photos sur Excel ? Impossible. Au mieux, vous avez un tableau de notes sans photos, sans comparaison entrée/sortie, et sans PDF présentable à envoyer au locataire.</p>

<h3>4. L'accès mobile</h3>
<p>Réaliser un état des lieux depuis votre smartphone sur Excel est une expérience douloureuse. Les tableaux ne sont pas adaptés au mobile, la saisie est laborieuse, et les photos restent sur votre téléphone sans être liées aux données.</p>

<h3>5. La sécurité et la sauvegarde</h3>
<p>Un fichier Excel sur votre bureau, c'est une panne de disque dur loin de perdre des années de données. Pas de sauvegarde automatique, pas de chiffrement, pas de contrôle d'accès.</p>

<h2>Le vrai coût d'Excel (que personne ne calcule)</h2>
<p>Faisons le calcul pour un propriétaire avec 3 logements et 3 locataires :</p>
<ul>
<li>Quittances : 3 quittances × 12 mois × 30 min = <strong>18 heures/an</strong></li>
<li>Révisions IRL : 3 baux × 1h = <strong>3 heures/an</strong></li>
<li>États des lieux : 1 rotation/an × 3h = <strong>3 heures/an</strong></li>
<li>Suivi financier : 2h/mois = <strong>24 heures/an</strong></li>
</ul>
<p>Total : environ <strong>48 heures par an</strong> passées sur de l'administratif pur. À un taux horaire de 30€ (valeur conservatrice), c'est 1 440€ de "coût caché" annuel.</p>
<p>Le plan Pro de Locavio coûte 99€/an. La différence parle d'elle-même.</p>

<h2>Que gagne-t-on concrètement avec un logiciel dédié ?</h2>
<ul>
<li><strong>Quittances</strong> : générées et envoyées en 1 clic — 2 minutes au lieu de 30</li>
<li><strong>Baux</strong> : conformes ALUR, générés automatiquement avec les données du locataire</li>
<li><strong>Révisions IRL</strong> : détectées et calculées automatiquement, lettre envoyée en 1 clic</li>
<li><strong>États des lieux</strong> : réalisés depuis le smartphone avec photos, PDF automatique</li>
<li><strong>Solvabilité</strong> : score automatique sur 100 pour chaque candidat locataire</li>
<li><strong>Données sécurisées</strong> : hébergées en Europe, sauvegardées quotidiennement</li>
</ul>

<h2>Excel ou logiciel : que choisir selon votre situation ?</h2>
<p><strong>Excel peut suffire si :</strong> vous avez 1 logement, 1 locataire stable, peu de rotation, et que vous êtes à l'aise avec les outils bureautiques.</p>
<p><strong>Un logiciel dédié s'impose si :</strong> vous avez plusieurs logements, des rotations régulières, des locations saisonnières, ou si vous valorisez votre temps et voulez des documents toujours conformes.</p>
<p>Locavio est gratuit pour commencer — sans carte bancaire. Le meilleur moyen de voir ce que ça change, c'est de l'essayer.</p>`;

export const articles: Article[] = [
  {
    slug: "quittance-loyer-modele-gratuit-2026",
    title: "Quittance de loyer : modèle gratuit + comment la remplir en 2026",
    description:
      "Tout ce qu'il faut savoir pour établir une quittance de loyer conforme en 2026 : mentions obligatoires, erreurs à éviter et modèle gratuit à utiliser.",
    category: "Documents & modèles",
    readTime: 6,
    publishedAt: "2026-05-01",
    content: quittanceHtml,
  },
  {
    slug: "revision-loyer-irl-2026-calcul-simulateur",
    title: "Révision de loyer IRL 2026 : calcul, simulateur et lettre officielle",
    description:
      "Comment calculer la révision annuelle de votre loyer selon l'indice IRL de l'INSEE en 2026 ? Formule, exemple chiffré et lettre officielle à envoyer.",
    category: "Calculs & chiffres",
    readTime: 7,
    publishedAt: "2026-05-01",
    content: irlHtml,
  },
  {
    slug: "contrat-location-saisonniere-obligatoire-2026",
    title: "Contrat de location saisonnière : obligations légales et mentions obligatoires en 2026",
    description:
      "Le contrat de location saisonnière est-il obligatoire en 2026 ? Quelles clauses doit-il contenir ? Guide complet pour les propriétaires loueurs.",
    category: "Saisonnier",
    readTime: 8,
    publishedAt: "2026-05-01",
    content: saisonnierHtml,
  },
  {
    slug: "dossier-location-documents-demander-locataire-2026",
    title: "Dossier de location : quels documents demander à un locataire en 2026 ?",
    description:
      "Quels documents pouvez-vous légalement demander à un candidat locataire en 2026 ? Liste complète, ce qui est interdit, et comment évaluer la solvabilité.",
    category: "Guide pratique",
    readTime: 7,
    publishedAt: "2026-05-01",
    content: dossierHtml,
  },
  {
    slug: "gestion-locative-excel-vs-logiciel-dedie",
    title: "Gérer ses locations avec Excel vs un logiciel dédié : ce que ça change vraiment",
    description:
      "Excel ou logiciel de gestion locative ? Comparaison honnête des deux approches, chiffres à l'appui. Ce que ça coûte vraiment de rester sur Excel.",
    category: "Comparatifs",
    readTime: 8,
    publishedAt: "2026-05-01",
    content: excelHtml,
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
