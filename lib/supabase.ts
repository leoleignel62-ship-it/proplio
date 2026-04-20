import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Client navigateur singleton ; auth : `lib/supabase/auth-options.ts` + `lib/supabase/client.ts`. */
export const supabase = createSupabaseBrowserClient();