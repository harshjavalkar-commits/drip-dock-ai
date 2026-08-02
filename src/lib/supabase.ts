import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const DRIPDOCK_SUPABASE_URL = "https://sdkkoovlyrcwtuagftnj.supabase.co";
export const DRIPDOCK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_q3KWo6nb-5CNA8Y4Nh32_A_noXbeQLL";

export const supabase = createClient<Database>(
  DRIPDOCK_SUPABASE_URL,
  DRIPDOCK_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);