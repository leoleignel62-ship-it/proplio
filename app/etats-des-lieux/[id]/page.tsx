import { EdlEditor } from "@/components/etat-des-lieux/EdlEditor";

export default async function EtatDesLieuxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <section className="proplio-page-wrap space-y-8">
      <EdlEditor edlId={id} />
    </section>
  );
}
