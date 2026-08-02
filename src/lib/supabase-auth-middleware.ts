import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import {
  DRIPDOCK_SUPABASE_PUBLISHABLE_KEY,
  DRIPDOCK_SUPABASE_URL,
  supabase,
} from "@/lib/supabase";

export const attachDripDockAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);

export const requireDripDockAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No valid authorization header provided");
    }

    const token = authHeader.slice("Bearer ".length);
    const authenticatedClient = createClient<Database>(
      DRIPDOCK_SUPABASE_URL,
      DRIPDOCK_SUPABASE_PUBLISHABLE_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data, error } = await authenticatedClient.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Unauthorized: Invalid token");
    }

    return next({
      context: {
        supabase: authenticatedClient,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  },
);