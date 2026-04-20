import { PC } from "@/lib/proplio-colors";

/** Skeleton affiché pendant le chargement des segments (Next.js `loading.tsx`). */
export function PageSkeleton() {
  return (
    <div className="proplio-page-wrap animate-pulse space-y-6 p-4 md:p-8">
      <div className="space-y-2">
        <div className="h-8 w-56 max-w-full rounded-lg" style={{ backgroundColor: PC.card }} />
        <div
          className="h-4 w-72 max-w-full rounded-lg"
          style={{ backgroundColor: "rgba(26, 26, 36, 0.7)" }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-xl" style={{ backgroundColor: PC.card }} />
        <div className="h-28 rounded-xl" style={{ backgroundColor: PC.card }} />
        <div
          className="h-28 rounded-xl sm:col-span-2 lg:col-span-1"
          style={{ backgroundColor: PC.card }}
        />
      </div>
      <div className="h-48 rounded-xl" style={{ backgroundColor: PC.card }} />
      <div className="h-36 rounded-xl" style={{ backgroundColor: PC.card }} />
    </div>
  );
}
