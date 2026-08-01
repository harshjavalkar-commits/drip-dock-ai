# Moving DripDock to your own Supabase project

Target project ref: `sdkkoovlyrcwtuagftnj`

## Why this can't be done in-place

This project runs on **Lovable Cloud**. Its `.env` (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) and everything in
`src/integrations/supabase/` are generated and rewritten by the platform on
every build. Hand-editing them is reverted, and Cloud cannot be detached from a
project once enabled.

The supported path is a **new Lovable project** with the Supabase connector
pointed at your own project from the start.

---

## Steps

### 1. Prepare your Supabase project

1. Open your Supabase dashboard → project `sdkkoovlyrcwtuagftnj`.
2. **SQL Editor → New query** → paste the entire contents of
   [`dripdock_full_schema.sql`](./dripdock_full_schema.sql) → **Run**.
   This creates all 7 tables, RLS policies, grants, indexes, the
   `set_updated_at` / `handle_new_user` triggers, and the private `wardrobe`
   storage bucket with owner-scoped policies.
3. Verify: **Table Editor** should list `profiles`, `clothing_items`,
   `wear_logs`, `outfits`, `calendar_plans`, `wishlist_items`, `packing_lists`.
   **Storage** should list a private `wardrobe` bucket.

### 2. Configure authentication

In **Authentication → Providers**:

- **Email**: enabled. Leave "Confirm email" ON (the app's signup flow already
  renders a "check your inbox" state). Turn it OFF only if you want signup to
  log the user straight in.
- **Google**: enable it and paste your Google OAuth client ID + secret from the
  Google Cloud console. Add Supabase's callback URL
  (`https://sdkkoovlyrcwtuagftnj.supabase.co/auth/v1/callback`) as an
  authorized redirect URI in Google Cloud.
  > Note: the current app calls Google sign-in through Lovable's managed OAuth
  > broker (`src/integrations/lovable`). On your own Supabase you'd swap that
  > single call for `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- **Password policy**: enable *Leaked password protection* (HIBP) under Email
  settings — recommended, matches the current setup.

In **Authentication → URL Configuration**:

- **Site URL**: your app's URL.
- **Redirect URLs**: add your app origin and `<origin>/reset-password`
  (the password-reset screen redirects there).

### 3. Create the new Lovable project

1. New project → **Connectors → Supabase → Connect**, and authorize the
   Supabase account that owns `sdkkoovlyrcwtuagftnj`.
2. Choose that project when prompted. Lovable writes the correct
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / project ref for you —
   don't set them by hand.
3. Ask the agent to rebuild DripDock (or copy this repo's `src/` across). The
   only code that needs changing against your own Supabase is:
   - `src/routes/auth.tsx` — replace the `lovable.auth.signInWithOAuth("google", …)`
     call with `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })`.
   - `src/lib/ai.server.ts` — the AI Stylist currently uses `LOVABLE_API_KEY`
     via the Lovable AI Gateway. On your own backend, supply your own model
     provider key (e.g. `OPENAI_API_KEY`) as a secret and point the client at it.

   Everything else (`src/lib/queries.ts`, `ItemImage` signed URLs, all routes)
   works unchanged, because the schema above is identical.

### 4. Verify

| Check | How |
| --- | --- |
| **Sign up** | Create an account on `/auth`. A row should appear in `auth.users` **and** in `public.profiles` (proves `handle_new_user` fired). |
| **Sign in** | Sign out, sign back in with the same credentials → lands on `/dock`. |
| **Password reset** | `/auth` → "Forgot your password?" → click the emailed link → `/reset-password` accepts a new password → redirects to `/dock`. |
| **Session persistence** | Hard-refresh a protected route (`/dock`). You should stay signed in — the session lives in `localStorage` under `sb-sdkkoovlyrcwtuagftnj-auth-token`. |
| **Storage** | Upload an item image on `/upload`. The object should land in `wardrobe/<your-user-id>/…` and render via a signed URL. |
| **RLS isolation** | Create a second account; it must see an empty Dock. |

### 5. Migrating existing data (optional)

Data currently lives in the Lovable Cloud database, which you can't reach
directly. If you need it, request an export through Lovable support, then load
it into your project — insert in this order so foreign keys resolve:
`profiles → clothing_items → outfits → wear_logs → calendar_plans →
wishlist_items → packing_lists`. Storage objects must be copied separately,
preserving the `<user-id>/<filename>` path layout.

Note that `auth.users` IDs must be preserved for the data to line up; that
generally means importing users via the Auth Admin API with their original UUIDs
before loading the tables above.
