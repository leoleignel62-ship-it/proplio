"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const DashboardContent = dynamic(
  () => import("@/components/dashboard-content").then((mod) => ({ default: mod.DashboardContent })),
  {
    ssr: false,
    loading: () => <PageSkeleton />,
  },
);

export default function Home() {
  return (
    <section className="locavio-page-wrap space-y-10">
      <DashboardContent />
    </section>
  );
}
