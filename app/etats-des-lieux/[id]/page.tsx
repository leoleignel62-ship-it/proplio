import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const EdlEditorLazy = dynamic(
  () => import("@/components/etat-des-lieux/EdlEditor").then((mod) => ({ default: mod.EdlEditor })),
  { loading: () => <PageSkeleton /> },
);

export default async function EtatDesLieuxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <section className="proplio-page-wrap space-y-8">
      <EdlEditorLazy edlId={id} />
    </section>
  );
}
