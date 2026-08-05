# DripDock Atelier — Fully Automated Refinement Architecture

Status: design document. No paid API is wired up. This describes how the
existing Atelier structure evolves into a zero-touch pipeline.

## Product rule

The user's only image action is **choose photo**. There is no manual upload of
a refined image, no external editor, no second file picker. Upload → automatic
processing → archive-ready garment → confirm details → save.

## Current structure (already shipped)

| Piece | Role |
| --- | --- |
| `src/lib/atelier.ts` | Staged pipeline: decode-upright → extract → refine → upload |
| `src/components/AtelierStudio.tsx` | Stage rail, frames, before/after, status cards |
| `clothing_items.*_image_url` | `original` / `extracted` / `refined` asset paths |
| `image_processing_status` / `_stage` | Per-run progress for resumable UI |
| `refinement_status` | `not_started → refining → refined → approved` |
| `wardrobe/<user>/<asset>/…` | Immutable, owner-scoped asset folder per garment |

Every automation stage below writes into these same columns and paths. No
schema migration is required to swap the refine step for a model call.

## Target pipeline

```
upload → orient → segment → color-lock → relight/compose → QA gate → archive
```

1. **Orient** (on-device, shipped). EXIF-baked decode, max edge 1600, JPEG 0.92
   written to `original.jpg`. The original is never mutated — it is the identity
   reference for every later check.
2. **Segment** (replaces the flood-fill). A matting model produces an alpha
   matte instead of a hard key: candidates are `RMBG-1.4` / `BiRefNet` /
   `MODNet` in ONNX, run in-browser through `onnxruntime-web` (WASM + WebGPU)
   or in a server function on WASM. Output stays `extracted.png` (RGBA).
   Matting, not generation — the garment pixels are preserved bit-for-bit
   inside the matte, which is what guarantees logos, prints and weave detail
   survive.
3. **Color-lock**. Before compositing, sample the garment's dominant Lab colour
   from the original and store it on the asset. After compose, resample; if
   ΔE00 > 3, re-run compose with the tone curve disabled. This is the numeric
   guard against "the refined image looks like a different garment".
4. **Relight / compose**. Deterministic today: cut-out on a 1000×1333 ivory
   backdrop, radial spotlight, contact shadow, mild contrast/saturation lift.
   The AI variant replaces only the *backdrop and lighting*, never the garment:
   the matte is composited back over the generated plate at full opacity, so
   the model can never redraw a logo. Written to `refined.jpg`.
5. **QA gate**. Automatic accept/reject before the user ever sees it:
   - silhouette IoU (refined alpha vs extracted alpha) ≥ 0.97
   - ΔE00 of dominant colour ≤ 3
   - garment fill ratio between 0.35 and 0.85 of frame
   - no alpha holes > 1% inside the convex hull (guards blown-out whites)
   Fail → fall back to the previous good stage, set
   `image_processing_status = 'failed'`, and surface the original as primary.
   The user is never asked to fix it manually.
6. **Archive**. On pass, `refinement_status = 'refined'` and the refined path
   becomes the Dock image. `approved` is set implicitly on save.

## Identity-preservation contract

| Requirement | Mechanism |
| --- | --- |
| Exact garment identity | Matting only; garment pixels come from the original raster |
| Logos & graphics | Never regenerated — composite the matte *over* any generated plate |
| Colour | Lab ΔE00 ≤ 3 gate, tone curve disabled on failure |
| Silhouette | Alpha IoU ≥ 0.97 between extracted and refined mattes |

The rule that makes all four hold: **generative models may only touch pixels
outside the alpha matte.** Any architecture that sends the whole garment to an
image model and takes back its output violates the contract and is out of scope.

## Where the model call goes

Only step 2 (and optionally the backdrop plate in step 4) becomes a model call.
It lands in a server function, e.g. `src/lib/atelier.functions.ts`:

```ts
export const segmentGarment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { originalPath: string }) => d)
  .handler(async ({ data, context }) => { /* signed URL → matte → storage */ });
```

Signed URLs from the private `wardrobe` bucket are handed to the model; the
matte is written back to the same asset folder. The client keeps calling
`runAtelierPipeline` and keeps rendering the same stage rail — only the
`extracting` implementation changes.

## Rollout

1. Swap flood-fill → ONNX matting behind a `VITE_ATELIER_MATTING` flag, keeping
   the current extractor as the fallback path.
2. Add the QA gate and colour-lock metrics; log pass rates per stage.
3. Add a generated backdrop plate only after the gate is stable at ≥ 95% pass.
4. Move segmentation server-side if device WASM latency exceeds ~4s on mid-tier
   phones.

## Non-goals

- Manual refined uploads (removed by design).
- Any paid image API today.
- Full-garment generative redraw, at any point.
