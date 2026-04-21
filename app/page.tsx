import { PC } from "@/lib/proplio-colors";

/** Version minimale pour diagnostic Vercel (aucune requête Supabase). */
export default function Home() {
  return (
    <section className="proplio-page-wrap">
      <h1 className="text-2xl font-semibold" style={{ color: PC.text }}>
        Bonjour
      </h1>
    </section>
  );
}
