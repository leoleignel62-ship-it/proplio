import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
    <div
      className="fixed inset-0 z-[150] overflow-y-auto"
      style={{ backgroundColor: "#f8f7ff", color: "#1a0533" }}
    >
      {children}
    </div>
  );
}
