/** Skeleton affiché pendant le chargement des segments (Next.js `loading.tsx`). */
export function PageSkeleton() {
  return (
    <div className="proplio-page-wrap animate-pulse space-y-6 p-4 md:p-8">
      <div className="space-y-2">
        <div className="h-8 w-56 max-w-full rounded-lg bg-proplio-card" />
        <div className="h-4 w-72 max-w-full rounded bg-proplio-card/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-xl bg-proplio-card" />
        <div className="h-28 rounded-xl bg-proplio-card" />
        <div className="h-28 rounded-xl bg-proplio-card sm:col-span-2 lg:col-span-1" />
      </div>
      <div className="h-48 rounded-xl bg-proplio-card" />
      <div className="h-36 rounded-xl bg-proplio-card" />
    </div>
  );
}
