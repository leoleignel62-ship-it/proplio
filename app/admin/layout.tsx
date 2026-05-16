import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminSidebar } from "@/app/admin/components/admin-sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: proprietaire } = await supabaseAdmin
    .from("proprietaires")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!proprietaire?.is_admin) {
    redirect("/");
  }

  return (
    <div className="fixed inset-0 z-[150] flex overflow-hidden" style={{ color: "#1a0533" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "#f8f7ff" }}>
        {children}
      </main>
    </div>
  );
}
