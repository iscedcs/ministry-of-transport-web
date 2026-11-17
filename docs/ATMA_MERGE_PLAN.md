# ARTMA (atma-web) → Ministry of Transport: Frontend Merge Plan

**Scope:** move the ARTMA *frontend* (`govtech/atma-web`) into this repo. The ARTMA backend (DigitalOcean API) is **not** touched and stays where it is. One-time import; ARTMA is considered finished.

**Product intent (confirmed):** ARTMA is **a module of the Ministry of Transport platform, not a separate site.** There is one public address, `https://mot.anambrastate.gov.ng`; users reach ARTMA from inside it. No separate ARTMA URL or subdomain is ever shown to users.

## 1. What we found

| | ARTMA (`atma-web`) | MOT (this repo) |
|---|---|---|
| Framework | Next 16.2.9, React 19.2.4, Tailwind 4, Zod 4 | Next 16.2.4, React 19.2.4, Tailwind 4, Zod 4 |
| Data | **No DB.** Pure client of a remote REST API (`NEXT_PUBLIC_API_URL`) | Prisma 7 + Neon, own server actions |
| Auth | NextAuth v5 beta, JWT from the backend, refresh-token rotation, roles `OFFICER` / `SUPERVISOR` / `ADMIN` | Custom `jose` cookie `mot-session`, MOT roles in Prisma |
| Gatekeeper | root `proxy.ts` (NextAuth `auth()` wrapper; also **rewrites `/api/v1/*` to the backend and injects the Bearer token**) | `middleware.ts` |
| UI kit | shadcn "radix-vega" via unified `radix-ui` pkg, 55 files, only ~12 primitives actually used | Individual `@radix-ui/*` pkgs, own `components/ui` |
| Theme | shadcn tokens (`--primary`, `--background`…), light default | Own OKLCH tokens, dark-only, mapped onto the same `--color-primary` etc. names |
| Size | ~13.5k lines of real app code (+6.6k lines of generated shadcn) | — |

**Good news:** same Next/React/Tailwind/Zod majors; Atma has no database to merge; its primary colour (`#f8d332`) is essentially MOT's gold; Next 16's proxy runs on the **Node runtime by default**, so NextAuth + `jwt-decode` can live in the same proxy file as MOT's `jose` logic.

**The three real collisions:**
1. **Routes** — Atma owns `/`, `/login`, `/admin/*`, `/portal`; MOT already has `/`, `/login`, `/admin/*`.
2. **Auth/gatekeeper** — Next allows exactly **one** `proxy.ts`. MOT's `middleware.ts` and Atma's `proxy.ts` must become one file.
3. **Root layout / theme** — MOT's root layout brings `robots: noindex`, Lenis smooth-scroll, top loader, PWA banner and a dark-only theme; Atma's brings `SessionProvider`, `AuthWatcher`, Lato font and a light theme.

## 2. Decisions (open questions answered 2026-11-12; defaults below are now confirmed)

| # | Decision | Default |
|---|---|---|
| D1 | Mount point | **Confirmed — one domain, ARTMA under a path.** Everything under **`/atma/*`** (`/atma/login`, `/atma/officer/*`, `/atma/admin/*`, `/atma/portal`). Browser-facing backend proxy at **`/api/atma/v1/*`** → backend `/api/v1/*` (NextAuth lives at `/api/atma/auth/*`, so the two never collide). Route strings centralised in one `lib/atma/routes.ts`. |
| D2 | Auth | **Phase A (this merge): coexist, no unification.** NextAuth scoped to `/atma` with its own `basePath` and cookie names; MOT's `mot-session` untouched. SSO between the two would need backend work → later phase. **Because ARTMA is part of MOT, users will notice a second login — accepted for the first release, tracked as the follow-up in §6.** |
| D3 | UI kit | Copy only the **used** shadcn primitives into `components/atma/ui/` (button, input, dialog, card, badge, table, select, dropdown-menu, native-select, input-otp, field, sonner + their deps). **Do not modify MOT's `components/ui`.** Consolidate later, if ever. |
| D4 | Layout isolation | Start with a nested `app/atma/layout.tsx` (carries `SessionProvider`, `AuthWatcher`, `Toaster`, metadata override for robots). Theme bleed is no longer a concern (D5), so only Lenis smooth-scroll vs the camera scanner / long tables and the PWA banner need checking; escalate to separate root layouts via route groups only if those prove painful. |
| D5 | Theme | **Confirmed: ARTMA adopts MOT's screens/theme.** Atma components inherit MOT tokens (names already match). Add the missing `--color-sidebar-*` / chart tokens and fix the 25 hardcoded colours so nothing is unreadable on MOT's dark theme. No light-theme isolation scope needed. |
| D6 | Proxy | Rename `middleware.ts` → `proxy.ts`; one dispatcher: paths under `/atma` or `/api/atma` → Atma handler; everything else → existing MOT logic **unchanged** (including the enumerator/revalidation-queue carve-out we just added). |
| D7 | Secrets | Never copy `.env`. Rename `NEXT_PUBLIC_API_KEY` (a live Transpay key with a browser-exposed prefix) to a **server-only** `TRANSPAY_API_KEY`. All keys go in Vercel env. |
| D8 | Git history | Import as a fresh commit (no subtree). Archive the old repo after cutover. |
| D10 | Entry point | **Confirmed:** ARTMA is reached from MOT itself — a clearly labelled ARTMA entry on the MOT landing page and in the dashboard navigation for eligible staff, all pointing at `/atma/*` on the same host. |
| D11 | Indexing | **Confirmed: MOT should be indexable.** Remove the global `robots: { index: false }` from `app/layout.tsx`; add `app/robots.ts` + `app/sitemap.ts`. Keep `noindex` on authenticated areas (`/dashboard`, `/admin`, `/atma/officer`, `/atma/admin`, `/login`, API) so only public pages are crawled. |
| D12 | Subdomain | **Confirmed: none.** No host-based rewrite for ARTMA. |
| D9 | Next version | Bump MOT 16.2.4 → 16.2.9 (matches what Atma runs on) **as its own first commit**, so any regression is isolated. |

*Fallback if D2/D4 turn out worse than expected:* Next's **multi-zones** guide (`docs/01-app/02-guides/multi-zones.md`) lets Atma stay a separate Next app served under `/atma` on the same domain. Not the plan — you asked for the frontend to move — but it is the escape hatch.

## 3. Phases

**Phase 0 — Prep (½ day)**
- **Gate:** the Park Monitor photo work is committed and deployed first, so `git status` is clean.
- Branch `feat/atma-merge` off `dev`.
- Baseline: `tsc --noEmit`, `eslint`, `next build` green on MOT.
- Bump Next (D9), rebuild, smoke test login + dashboard. Commit.
- Pin the Atma source revision being imported (currently `c7073e7`).

**Phase 1 — Foundation (1 day) — ✅ DONE**
- Add deps: `next-auth@5.0.0-beta.31`, `jwt-decode`, `radix-ui`, `react-hook-form`, `@hookform/resolvers`, `input-otp`, `tw-animate-css`, `shadcn` (css import), `react-icons`; later only if used: `cmdk`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `vaul`, `next-themes` (already present).
- `globals.css`: add `tw-animate-css`, sidebar/chart tokens.
- `proxy.ts` consolidation per D6 with a **stub** Atma branch; verify MOT behaviour is byte-for-byte unchanged.
- NextAuth config (`basePath: /api/atma/auth`, distinct cookie names) + env vars: `ARTMA_API_URL` (server), `AUTH_SECRET` (distinct from MOT's session secret), `TRANSPAY_API_URL`, `TRANSPAY_API_KEY`.
- `lib/atma/routes.ts` + `lib/atma/api.ts` (one place that knows the backend URL).

**Phase 2 — Move non-route code (1 day)**
- `actions/*` → `app/actions/atma/*` (matches MOT's convention), `lib/*` → `lib/atma/*`, components → `components/atma/{forms,shared,tables,evidences,ui}`.
- Refactor the **64 hard-coded route strings** and **21 API/base-URL call sites** to the helpers. `lib/upload-client.ts` is the only direct browser `fetch('/api…')`.
- Delete dead code instead of porting it: `app/proxy.ts` (stale duplicate), empty root `route.ts`, README claims about Prisma/Tesseract (false).

**Phase 3 — Move routes (1–2 days)**
- `app/atma/(auth)`, `(officer)`, `(admin)`, `(public)` with their layouts; fix every `redirect()` / `router.push` / `callbackUrl`.
- Port the Atma proxy rules (role gates: `/atma/admin` needs `SUPERVISOR|ADMIN`, `/atma/officer` needs any of the three; camera `x-camera-key` M2M bypass; Bearer injection on the `/api/atma/*` rewrite).
- Fix the hardcoded `"16 Jun 2026, 05:29"` timestamp in `officer/dashboard/dashboard-client.tsx` rather than copying it.

**Phase 4 — Verification (1–2 days)**
- `tsc`, `eslint`, `next build`.
- ARTMA QA matrix: login + OTP, forgot-password, token refresh (let a session age past expiry), role redirects (an OFFICER must be bounced from `/atma/admin`), offense logging, **QR/plate scanner on a real phone over HTTPS**, geolocation guard, evidence presign → upload → finalize, admin tables (filters, CSV export, audit cursor pagination), public portal lookup, payment-verify page.
- **MOT regression:** MOT login, every role's dashboard, enumerator restrictions, the revalidation-queue carve-out, ID-card print CSS, sticker verify pages. MOT must be indistinguishable after the merge.
- Resolve one open question in Atma itself: the *dead* `app/proxy.ts` rewrites `/evidence/*` to the backend, the *live* root `proxy.ts` does not (so those URLs likely 404 today). Decide which is intended.

**Phase 5 — Preview / pilot (1 day)**
- Vercel preview deploy with env vars set; run the QA matrix against the real ARTMA backend.
- Pilot with a few real officer + admin accounts before anyone is switched over.

**Phase 6 — Cutover (½ day + soak week)**
- Keep the **old Atma deployment alive** and turn it into path-mapped 301/302 redirects to `https://mot.anambrastate.gov.ng/atma/*` (see §4).
- Update the inbound URLs listed below as the backend owner allows; retire the old host only when logs show no remaining traffic.

Rough total: **~5–8 focused working days**, dominated by Phase 4 verification.

## 4. Cutover risk: URLs outside this repo that point at the old Atma host

**Owner of these callers: TBD (to be decided later).** The plan does not block on it until Phase 6.

The backend and external systems almost certainly hold the old Atma frontend URL. We do **not** control these, and changing the path structure (`/portal` → `/atma/portal`) will break them unless the old host keeps redirecting:
- **Paystack callback** → lands on `/portal/verify-payment[/<trxref>]`. Configured in the backend/Paystack dashboard.
- **Password-reset / OTP emails** built by the backend from its own `FRONTEND_URL`.
- **Evidence share links** (`/evidence/…`) if the backend or officers distribute them.
- **Camera devices** calling `/api/v1/cameras` with `x-camera-key` — their configured endpoint is the old host.
- Any bookmarks / printed QR codes pointing at the ARTMA portal.

Mitigation: old host stays up and redirects (or keep identical legacy paths via rewrites on the new host); get the backend owner to repoint callback/email base URL when convenient. **We need the list of callers before Phase 6** (not before Phases 0–5).

## 5. Other risks

- **Two sessions in one browser** (MOT cookie + NextAuth cookie): a staff member logged into both. Distinct cookie names and `basePath` (D2) prevent clashes; test explicitly.
- **MOT root layout bleed** into ARTMA pages: Lenis smooth-scroll vs the camera scanner and long tables; PWA install banner; `robots` metadata (now resolved globally by D11 — verify the Atma public portal is indexable but officer/admin areas are not).
- **`next-auth@5` is still beta**; pinned to the exact version Atma already runs.
- **Zero tests exist in Atma.** Phase 4 is manual; this is the main reason not to rush Phase 6.
- **Rename of `middleware.ts` → `proxy.ts`** touches every MOT request. Do it in Phase 1 with the Atma branch stubbed so it can be verified in isolation.

## 6. Product-owner answers & remaining items

| # | Question | Answer |
|---|---|---|
| 1 | Look and feel | **Adopt MOT screens** (D5). |
| 2 | Entry point | **Inside MOT at one URL**, `mot.anambrastate.gov.ng`; reach ARTMA from there (D1, D10). |
| 3 | Inbound callers of the old host | **TBD later** (§4). Needed before Phase 6 only. |
| 4 | Indexability | **MOT in general is indexable** (D11). |
| 5 | Own subdomain | **No** — single URL (D12). |

**Follow-up after the first release (needs backend work, not in this merge):** single sign-on so an MOT-logged-in officer does not log in again to ARTMA. Requires the ARTMA backend to accept an MOT-issued identity (or MOT users to be provisioned there).

## 7. Phase 1 status (done)

Built and smoke-tested against a fake backend on a production build:
- Deps added; `globals.css` gained `tw-animate-css`, `shadcn/tailwind.css`, sidebar/chart tokens mapped onto MOT's tokens.
- `middleware.ts` → `proxy.ts` (git rename). `proxy()` dispatches `/atma/*` + `/api/atma/*` to `lib/atma/proxy.ts`; the MOT logic is untouched (now `motProxy`). MOT checks after the change: `/` 200, `/dashboard` and `/admin/*` → `/login`, `/login` 200, verify pages unchanged.
- `lib/atma/{routes,api,auth,auth.config,proxy}.ts`, `app/api/atma/auth/[...nextauth]/route.ts`, `types/atma-next-auth.d.ts`.
- Verified: path mapping `/api/atma/v1/x` → backend `/api/v1/x`; Bearer injected from the ARTMA session cookie; camera `x-camera-key` pass-through; anonymous → 401; OFFICER bounced from `/atma/admin`; landing redirects by role.
- **Behaviour change vs. old Atma:** `/atma/forgot-password` is now public. The old app's allow-list omitted it, so an anonymous user was bounced to login before they could reset a password (looks like a bug).
- Env vars added to `.env.example` (placeholders only): `ARTMA_API_URL`, `ATMA_AUTH_SECRET`, `TRANSPAY_API_URL`, `TRANSPAY_API_KEY`. **These must be set in Vercel before Phase 5.**
