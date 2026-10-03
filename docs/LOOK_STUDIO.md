# DripDock Look Studio

A mobile-first capture → compose → save → share loop, built on the existing Lovable/TanStack Start and Supabase app.

## Shipped behavior

- `/upload`: camera, multi-image device upload (up to 12), pasted images and drag/drop. A review queue requires only name and category.
- Original bytes remain in the private wardrobe bucket. A separate PNG is the approved styling image; transparent input stays transparent.
- Optional plain-background lift and an erase brush with six undo states. These are local image tools, not an AI garment reconstruction service. Selfies with overlapping clothes are not automatically separated.
- `/looks`: six-piece editable boards, category/search drawer, pin-and-shuffle, three editorial themes, saved looks and optional MiniYou signature. Shuffle is local random selection by clothing slot, not an AI fashion score. Occasion labels do not influence shuffle.
- Export a 1080×1350 PNG. A second explicit action invokes native sharing when file sharing is supported; download remains available. No photo or signed storage URL is made public.
- Mobile navigation is reduced to Looks, Dock, Add and MiniYou. Existing tools remain in the desktop sidebar and on the mobile Profile page.
- Auth success goes to Looks. No account creation or real user data mutation is needed for browser tests.

## Google Photos setup

The integration uses **Google Photos Picker**, not an undocumented Google Wardrobe endpoint. It imports user-selected source photos; it cannot enumerate or synchronize Google's internal wardrobe or request Google's clothing extraction.

1. In the project's Google Cloud console, enable Google Photos Picker API.
2. Configure the OAuth consent screen with the actual product domain, privacy policy and required support information. Add test users while the OAuth app is in testing, and complete Google's verification requirements before a public rollout.
3. Create a Web application OAuth client. Add the exact Lovable preview/production origins where this feature will run. Add `http://localhost:5173` (or the exact chosen local origin) for development if needed.
4. Configure `VITE_GOOGLE_PHOTOS_CLIENT_ID` with that client ID in the Lovable build environment. This is a public client ID, not a client secret. Rebuild.
5. Exercise consent, denial, popup cancellation, picker selection, timeout, expired token, multiple images and iPhone Safari with a test account.

Only scope: `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`.
Tokens are held in component memory, used by authenticated server functions, and cleared when the selection ends. Never store them in local storage, database, logs or analytics. Sessions are deleted on completion/cancellation. The server limits image downloads to approved Google image hosts, fixed API paths, a 30-second timeout and 15 MB. Redirects are rejected to avoid forwarding tokens to another host.

Without the client ID, the app offers the working device-import path and instructions for saved Google cutouts. It does not display a connect button that cannot work. Google OAuth was not exercised against a real account in this implementation session: no client ID was available.

## Prerequisites

The existing `clothing_items`, `outfits`, private `wardrobe` bucket, owner-scoped RLS/storage policies and Atelier image columns must already exist. These were prerequisites of the prior app; see `migrations/atelier_images.sql` and `migrations/atelier_refinement.sql`. No new schema migration is required for the studio. Optional MiniYou uses the existing profile table; its absence must not block styling.

## Verification

```
npm ci
npm run build
npx tsc --noEmit
npx playwright install chromium
npm run dev -- --host 127.0.0.1 --port 5173
# In a separate terminal:
npm run test:browser
```

The browser suite intercepts every Supabase request and uses synthetic transparent image fixtures. It verifies mobile layout, locked remix, outfit persistence, PNG dimensions, batch uploads, original/sticker separation, alpha preservation and undo. Screenshots go to `/tmp/dripdock-test-artifacts` (override with `DRIPDOCK_TEST_ARTIFACTS`). Set `DRIPDOCK_TEST_URL` to use another local server. Real OAuth, iOS system clipboard/share sheets and production RLS require deployment-device verification.

## Longer-term architecture

Keep capture sources separate from processing: device/clipboard/Google → original → approved sticker → outfit. Add a processing adapter only after testing it against real dark fabrics, logos, fine straps, jewellery and worn clothing. Native Apple Vision is a future iOS adapter, not a browser dependency. A controlled MiniYou rendering experiment can consume the same originals and garment IDs without changing ingestion. No realistic try-on, cloth simulation or autonomous avatar generation is introduced here.
