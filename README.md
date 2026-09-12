# Rahigh Khabar (رحیق خبر) — frontend

Public Next.js 15 App Router frontend for the Rahigh Khabar news platform.
Persian, RTL, server-rendered, talking to the Fastify backend from stages 1–5.

**Stage 8 scope:** the three public pages from stage 7, behaviour unchanged,
plus the admin panel — login, dashboard, news editor. The SEO infrastructure
(sitemap, robots.txt, JSON-LD, Open Graph) is still stage 9 and is not here; the
one exception is `noindex, nofollow` on `/admin`, which is a security setting,
not a deferred optimisation.

**Read ["Stage 8 — the admin panel"](#stage-8--the-admin-panel) before deploying.**
It documents five places where the backend does not do what an admin panel
normally assumes, including one that blocks the review workflow for ordinary
admins, and one hard deployment constraint on domains.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then point NEXT_PUBLIC_API_URL at your backend
npm run dev
```

| Script          | Purpose                        |
| --------------- | ------------------------------ |
| `npm run dev`   | Development server             |
| `npm run build` | Production build               |
| `npm start`     | Serve the build (honours PORT) |
| `npm run lint`  | ESLint (next/core-web-vitals)  |

`NEXT_PUBLIC_API_URL` must be set **at build time as well as at runtime** — see
`.env.example` for why.

---

## Routes

| Route                          | Content                                    |
| ------------------------------ | ------------------------------------------ |
| `/`                            | Hero, latest list, recent rail, one category section |
| `/news/[slug]`                 | Article detail                             |
| `/category/[slug]`             | Category listing, page 1 (canonical)       |
| `/category/[slug]/page/[page]` | Category listing, pages 2+                 |

| Admin route              | Content                                              |
| ------------------------ | ---------------------------------------------------- |
| `/admin/login`           | Email + password form. No registration, by design.   |
| `/admin`                 | Dashboard: article list, status filter, pagination   |
| `/admin/news/new`        | Editor, create mode (always saves as a draft)        |
| `/admin/news/[id]/edit`  | Editor, update mode, plus the status actions         |

Admin routes are keyed by `id`, not `slug`, because that is what the admin
endpoints accept — the public payloads do not even include an `id`.

---

## How it is put together

```
app/(site)/        public routes; every page is a Server Component
app/admin/         admin panel; server shells that render client screens
components/        public presentation components
components/admin/  admin-only UI; never imported by a public page
lib/               api client, data reads, caching policy, auth, formatting
types/             hand-written mirrors of the backend response schemas
```

`(site)` and `(protected)` are route groups: they add no URL segment. `(site)`
exists so the public header/footer chrome can wrap exactly the public pages and
nothing else — `app/layout.tsx` is now only `<html>`, fonts and site metadata.
`(protected)` exists so `/admin/login` can inherit the admin `noindex` metadata
without being wrapped in the session gate that would redirect it to itself.

Every backend read goes through `apiFetch` in `lib/api.ts`. There is no bare
`fetch` anywhere in the app, so the origin pinning and error shape that stage 6
established still hold.

On the public site the only client components are `HeaderBar` (mobile menu +
search panel) and `NewsTime` (relative timestamps). Everything else renders on
the server.

The admin panel is the opposite: its screens are client components, because the
session cookie never reaches the Next.js server (see below). The route files
under `app/admin/` are thin server shells that fetch nothing.

---

## Decisions worth knowing

### Caching: ISR at 60 seconds, applied on two layers

`lib/cache.ts` holds the single value. It is applied both as
`export const revalidate` on each page and as `next: { revalidate }` on each
backend read.

The second one is not redundant. The backend answers every public news route
with `Cache-Control: no-store`; without an explicit `next: { revalidate }`,
Next.js 15 would treat those responses as uncacheable and the ISR story would
quietly stop working. **This is a deliberate frontend override of a backend
header.** If the backend ever needs those responses to be genuinely uncacheable
(personalised content, for example), this is the thing that has to change.

### Pagination lives in the path, not the query string

`/category/x/page/2`, not `/category/x?page=2`. Reading `searchParams` opts a
route into dynamic rendering, which would disable static generation and the
60-second revalidation for every category listing. Both routes are thin
wrappers over one shared implementation in
`app/category/[slug]/_category-page.tsx`. `/page/1` redirects to the canonical
URL so a listing never exists at two addresses.

### Timestamps: absolute on the server, relative in the browser

A relative label ("۴۵ دقیقه پیش") baked into statically cached HTML keeps
claiming the same thing for as long as that HTML is reused. So the server
renders the absolute Jalali date — stable, cacheable, and identical on the
client's first paint, so there is no hydration mismatch — and `NewsTime`
upgrades it in the browser where "now" is real. Anything older than a week keeps
the absolute date.

All dates are formatted in `Asia/Tehran` with `Intl` in the `fa-IR` locale,
which already means the Solar Hijri calendar and Persian digits. No date library
was added.

### Article bodies are rendered as text

`body` is a plain `String @db.Text` with no declared markup format and no
server-side sanitisation. It is split into paragraphs on blank lines and
rendered as text. `dangerouslySetInnerHTML` is never used — trusting that column
would be a stored-XSS hole the moment an editor account is compromised. If rich
text is wanted later, the backend needs a declared, sanitised format first.

### Images

Covers use `next/image`. The remote allow-list in `next.config.ts` is derived
from `NEXT_PUBLIC_API_URL` and pinned to `/uploads/**`, because the backend
serves media from `${PUBLIC_API_URL}/uploads/<uuid>.<ext>`. Nothing is
hardcoded, and the optimiser cannot be pointed at arbitrary backend routes.

`altText` is nullable. When it is missing the image is marked decorative
(`alt=""`) rather than given a fabricated description; the headline beside it
already carries the meaning.

### Fonts

Vazirmatn (UI) and Amiri Quran (the verse banner only) are both self-hosted
through `next/font/google`, so nothing is fetched from a third-party CDN at
runtime. The mockup loaded Amiri Quran from the Google Fonts CDN; that was not
carried over.

If a build environment blocks network access, `next/font/google` cannot download
the files. Swap `app/fonts.ts` to `next/font/local` with the woff2 files
committed — the exported `.variable` contracts stay the same, so nothing else
changes.

### Failure states are kept distinct

- Unknown slug, or a page past the end of a listing → **404**.
- A category that exists but has nothing published → **200** with an
  explanatory panel. An empty category is a normal state, not a broken URL.
- Backend unreachable or 5xx → the route's **error boundary**, never an empty
  page that a reader would interpret as "nothing has been published".
- The header's category fetch is the one exception: it degrades to an empty nav
  instead of throwing, because the header lives in the root layout and a failed
  nav request must not replace every page in the site with an error screen.

---

## Where the mockup and the backend disagree

The mockup was signed off before the API surface was final. These gaps are real
and are handled honestly rather than faked. Each one is a product decision to
revisit, not a bug.

| Mockup element | Backend reality | What was built |
| --- | --- | --- |
| "پربازدیدترین‌ها" side list | No view counter, no popularity ordering, and `GET /news` can only sort by date | Same layout, filled with the next newest articles and retitled "تازه‌ترین خبرها". The numbers are list positions, not ranks. **Needs a view-count column and a sort option to be real.** |
| "منبع: …" source line on cards | No source/attribution field exists on the News model | Omitted. Author name and publication date are shown instead. **Needs a `source` field.** |
| Red "فوری" breaking-news ticker | No breaking/urgent flag and no ticker content anywhere in the schema | Omitted entirely rather than filled with recycled headlines. **Needs a boolean flag or a dedicated endpoint.** |
| Search box in the header | No search endpoint. `GET /news` takes only `page`, `pageSize`, `categorySlug` and rejects anything else with a 400 | The button and panel exist, the field is disabled, and the panel says search is not available yet. No fake results, no dead control. **Needs a search endpoint.** |
| "مشاهده همه" beside "آخرین اخبار" | There is no global archive route in this stage | Link omitted. The same link inside a category section is kept, because that destination exists. |
| Footer "درباره" column and social icons | Those pages and accounts do not exist | Omitted. Links to 404s and empty placeholder circles are worse than their absence. |

Two more contract details that shaped the code:

- **Public news payloads carry no `id`.** `slug` is the public identifier and the
  only thing `GET /news/:slug` accepts, so it is used for every link and every
  React key. `types/news.ts` deliberately does not declare an `id`.
- **There is no `GET /categories/:slug`.** Resolving a slug means fetching the
  full category list and matching locally. Cheap here, because the list is small
  and shared with the header and footer through one cache entry, but it is the
  first thing to fix if the category count ever grows.

---

## Design tokens

Colours, spacing and typography come from `tailwind.config.ts` — `bg-paper`,
`text-ink`, `text-accent`, `border-border`, `max-w-shell`, `h-header` and so on.
No raw hex values in components. Stage 7 added two tokens: `font-quran` for the
verse banner and `tracking-headline`, which reproduces the mockup's
`.headline-font` helper.

There is no RTL plugin, by design. `<html dir="rtl">` plus Tailwind's logical
utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`)
already mirror correctly. **The physical utilities (`ml-*`, `pr-*`, `left-*`,
`text-left`) do not flip** — avoid them unless a value must stay physically
fixed.

---

## Stage 8 — the admin panel

### The authentication model, and why the gate is in the browser

`POST /auth/login` answers with the user object and sets an **httpOnly** cookie
(`__Host-rk_auth` in production, `rk_auth` otherwise, `SameSite=Lax`). The
frontend never reads it — it cannot, and it does not try. No token is written to
`localStorage`, `sessionStorage` or a JS-readable cookie; there is no "is logged
in" flag anywhere. The only way this app knows who you are is by asking the
backend: `GET /auth/me`.

`components/admin/session.tsx` (`AdminGate`) makes that call on mount and
renders the panel only if the backend answers with a user. A 401 sends you to
`/admin/login?next=…`; any other failure shows "session check failed" with a
retry button, because a dead backend is not a credentials problem and pretending
otherwise would send you to a login form that cannot work either.

**Why not `middleware.ts` or a Server Component check?** Because the cookie is
set host-only to the API origin. The browser sends it to the API and never to
the Next.js origin, so server-side code here has no cookie to verify and could
only *pretend* to check. A middleware that always sees "no cookie" would lock
everyone out; one that trusted a readable hint would be theatre. The check is
made where the credential actually exists — in the browser.

The consequence, stated plainly: **the client-side gate is a UX device, not a
security boundary.** It decides what to render. Anyone can edit that state in
DevTools and reach an admin shell whose every request then fails with 401/403.
**Server-side enforcement in the backend — `authenticate`, `requireRole`,
`newsPolicy` — is the real and only boundary.** Role-based UI in this panel
(hiding the publish buttons from a non-`SUPER_ADMIN`, for example) is likewise
cosmetic; the backend rejects the call regardless of what the UI showed.

The HTML shell of an admin route is therefore reachable before the check
resolves. It contains no data: every admin request in the panel is issued after
the gate resolves, and nothing under `app/admin/` is cached, prerendered or
revalidated (`export const dynamic = "force-dynamic"`, and every admin read uses
`cache: "no-store"`).

### What is real, end to end

- **Login** — real `POST /auth/login`. Backend messages are shown verbatim in
  Persian ("ایمیل یا رمز عبور نادرست است"), which is deliberately identical
  whether the email exists or not, so the form cannot be used to enumerate
  accounts. Rate limiting (429) gets its own "try again later" wording. There is
  **no registration UI**, because the backend has no public registration
  endpoint — accounts are seeded.
- **Dashboard** — real `GET /admin/news`, uncached, with a status filter, a
  refresh button and pagination straight from the backend's
  `{ items, pagination }` envelope. An `ADMIN` sees their own articles and a
  `SUPER_ADMIN` sees everything, because that is how the backend scopes the
  query; the frontend adds no filtering of its own.
- **Editor** — real `POST /admin/news` and `PATCH /admin/news/:id`, with every
  field of the backend schema (title, slug, summary, lead, body, categories,
  cover image, SEO title, meta description), the same limits mirrored
  client-side so you see a length error before a 400, and multi-select
  categories from `GET /admin/categories`. The PATCH sends only the fields you
  actually changed.
- **Cover images** — the real two-phase flow: `POST /admin/media` (multipart)
  returns a media record, and only then is its `id` attached as `coverImageId`.
  If phase 1 succeeds and phase 2 fails, the UI says the file was uploaded but
  **not** attached; it never reports success it cannot verify. The picker
  enforces the backend's real rules (JPEG/PNG/WebP, 5 MiB) before sending, not
  just an `accept` attribute, and still surfaces the backend's 413/415 verbatim.
- **Logout** — real `POST /auth/logout`, then redirect. The cookie is cleared by
  the backend, so the next visit to an admin route hits `/auth/me`, gets 401 and
  lands on the login form. It is a real session end, not a client-side
  "looks logged out".

### Five gaps between what an admin panel assumes and what this backend does

These are backend realities, surfaced rather than papered over. The backend was
not modified.

1. **An ordinary `ADMIN` cannot move an article at all.**
   `POST /admin/news/:id/status` is `requireRole('SUPER_ADMIN')`. There is no
   separate "submit for review" endpoint, so an `ADMIN` can write and edit
   drafts but cannot even send one to review — a `SUPER_ADMIN` has to do it. The
   panel shows status actions only to a `SUPER_ADMIN` and tells an `ADMIN`, in
   the editor, that transitions are performed by a senior editor. **If the
   intended workflow is "authors submit, editors approve", the backend needs an
   author-accessible `DRAFT → IN_REVIEW` transition.**
2. **No concurrency control.** `PATCH` carries no version, `If-Match` or
   `updatedAt` precondition, and the service does no comparison. Two people
   editing the same article means **last write wins, silently**. The editor
   warns about this where it matters; it cannot prevent it. **Needs an optimistic
   concurrency check on the backend.**
3. **Logout clears the cookie but does not revoke the JWT.** The backend's own
   comment says revocation is not implied. A token copied before logout stays
   valid until it expires (`JWT_EXPIRES_IN`, default 1 hour). For a stolen-token
   scenario, logout is not a remedy. **Needs a deny-list or short-lived tokens
   with rotation.**
4. **Server-side route protection is impossible from this frontend** — the
   host-only cookie, explained above. The gate is UX; the backend is the
   boundary.
5. **The frontend and backend must share a registrable domain.** With
   `SameSite=Lax` and a host-only cookie, a frontend on one domain calling an API
   on an unrelated domain will log in successfully in Postman and fail in a
   browser, because the cookie is never sent. Pair the Railway services under one
   domain (`www.example.com` + `api.example.com`). This is a deployment
   constraint, not a code bug.

### Judgment calls

- **Create always saves a draft**, then redirects to the edit URL. The backend
  ignores any `status` in a create body, so offering a status choice there would
  be a lie.
- **Status actions live in the editor**, not the dashboard, and only the
  transitions the backend's own table allows are offered
  (`DRAFT → IN_REVIEW | PUBLISHED | REJECTED | ARCHIVED`,
  `IN_REVIEW → PUBLISHED | REJECTED | ARCHIVED`, `PUBLISHED → ARCHIVED`,
  `REJECTED → DRAFT`, `ARCHIVED → PUBLISHED`). Rejected attempts still show the
  backend's message.
- **A 401 during editing does not redirect.** You keep your typed text and get a
  "session expired, log in again" state, because throwing away unsaved work is
  worse than an extra click. Elsewhere in the panel a 401 does redirect.
- **Unsaved-changes protection is `beforeunload` only** — it catches closing the
  tab and reloading, but in-app navigation via the nav links is not intercepted.
- **No delete UI.** `DELETE /admin/news/:id` exists and is `SUPER_ADMIN`-only,
  but permanent deletion with no undo was out of the requested scope;
  `ARCHIVED` covers "take it down".
- **No slug auto-generation.** Slugs must match `^[a-z0-9]+(-[a-z0-9]+)*$`, and
  transliterating Persian titles into Latin slugs is a product decision (and an
  SEO one) that should not be guessed. The field is manual, with live validation.
- **Responsive down to 768px is the target.** The dashboard switches from a table
  to cards below `md`, and the editor is usable on a phone, but phone-width
  polish was deprioritised in favour of correctness, as the brief allowed.

### Not run here

`next build`, `tsc --noEmit` and `next lint` could **not** be executed in this
environment: `npm install` has no network access, so `next` is not installed.
Instead, every source file was parsed and transformed with esbuild (TS + TSX, 58
files, no errors), all 104 `@/` imports were checked to resolve to real files,
and the public stage-7 route files were byte-compared against the stage-7
baseline to prove they were moved, not modified. **Run `npm install && npm run
build && npm run lint` once before deploying.**

## Stage 9 — the SEO layer

Canonical URLs, Open Graph, Twitter cards, JSON-LD, `/sitemap.xml` and
`/robots.txt`. All of it is driven from one module, `lib/seo.ts`, so the pages,
the sitemap and the structured data cannot disagree about the site's origin or
about what a URL looks like.

### Files

Added:

- `lib/seo.ts` — site strings, the origin, the path helpers (`newsPath`,
  `categoryPath`), share images, the metadata builders and the JSON-LD builder.
- `lib/sitemap-data.ts` — walks the paginated `GET /news`, and reads `<lastmod>`
  values out of the backend's own sitemap.
- `app/sitemap.ts` — `/sitemap.xml`.
- `app/robots.ts` — `/robots.txt`.
- `public/og-default.png` — the 1200×630 default share card.

Changed:

- `app/layout.tsx` — `metadataBase`, plus the title template and description,
  now imported from `lib/seo.ts`.
- `app/(site)/layout.tsx` — Open Graph and Twitter defaults for the public
  pages. They are deliberately not in the root layout, because `/admin` shares
  that root and must not advertise share cards.
- `app/(site)/page.tsx` — homepage title, description and canonical.
- `app/(site)/news/[slug]/page.tsx` — article metadata and `NewsArticle`
  JSON-LD.
- `app/(site)/category/[slug]/_category-page.tsx` and
  `app/(site)/category/[slug]/page/[page]/page.tsx` — listing metadata.
- `lib/news.ts` — `getNewsSeoDates()`, the only new backend read.
- `.env.example` — `NEXT_PUBLIC_SITE_URL`.

`app/admin/layout.tsx` is untouched: it already sends `noindex, nofollow`.

### One new environment variable

`NEXT_PUBLIC_SITE_URL` is the public origin of this frontend — origin only, no
trailing slash, e.g. `https://example.com`.

It is needed at build time as well as at runtime, and **a production build fails
without it**. That is deliberate. Every canonical, `og:url` and `<loc>` is an
absolute URL, so the alternatives were to guess an origin or to ship canonical
tags pointing at `localhost` — which quietly tells Google that the real site is
a copy of a machine it cannot reach. `next dev` falls back to
`http://localhost:3000` with a one-time warning, so local development needs no
setup; set it to `http://localhost:3001` if you want the real thing locally,
since the backend takes port 3000.

### What each route emits

| Route | Title | Canonical | Extras |
| --- | --- | --- | --- |
| `/` | the full site title | `/` | `og:type=website`, default card |
| `/news/[slug]` | `seoTitle` or the headline | `/news/<slug>` | `og:type=article`, cover image, published/modified times, `NewsArticle` JSON-LD |
| `/category/[slug]` | category name | itself | `og:type=website` |
| `/category/[slug]/page/N` | `… — صفحهٔ ۲` | itself | — |
| anything not found | `… پیدا نشد` | none | `noindex, follow` |
| `/sitemap.xml` | — | — | homepage + every category + every article |
| `/robots.txt` | — | — | `Allow: /`, `Disallow: /admin`, `Sitemap:` |

### Decisions worth knowing

- **Each paginated page is canonical to itself.** Pointing page 2 at page 1
  would declare two different lists of articles to be the same document, and the
  articles that only appear on page 2 would stop being discovered.
- **`rel=prev` / `rel=next` are not emitted.** Google announced in 2019 that it
  no longer uses them, and the pages are already reachable through real links.
- **Paginated pages are not in the sitemap.** A sitemap is for discovery, and
  those pages are found by crawling page 1. They stay indexable — they are just
  not advertised.
- **`lastModified` is only ever a real timestamp.** The public payloads carry no
  `updatedAt`, so modification times are read from the backend's own sitemap
  (which does expose them) and fall back to `publishedAt`. Using "now" would
  tell crawlers that every URL changed on every rebuild, which trains them to
  ignore the field.
- **`dateModified` comes from `GET /news/:slug/structured-data`**, the only
  public endpoint that exposes it. It is emitted only when it differs from
  publication, and if that call fails the page still renders — it just loses one
  timestamp.
- **JSON-LD `headline` is the visible headline**, trimmed to Google's 110
  characters — not `seoTitle`, even though `seoTitle` drives `<title>`.
  Structured data that contradicts the visible `<h1>` is a spam signal.
- **JSON-LD is escaped, not trusted.** Headlines are editor-supplied, so `<`,
  `>`, `&`, U+2028 and U+2029 are written as `\uXXXX`: a JSON parser reads the
  original characters back, while the HTML tokeniser can no longer find a
  `</script>` inside the block.
- **`image` is omitted from the JSON-LD when an article has no cover.** An
  `ImageObject` pointing at the site logo would claim the logo depicts the story.
- **The share card is a committed PNG, not `next/og`.** Rendering it per request
  would mean shipping a Persian font to the edge runtime and laying out RTL text
  in Satori, for a card that carries no per-article text.
- **robots.txt is served by this app, not proxied from the backend.** The
  backend's copy points at the backend's sitemap, built from the backend's own
  `PUBLIC_SITE_URL`; robots.txt is per-origin, so this origin states its own
  rules.
- **The length limits (160 / 100 / 110) are where the text is actually cut off**
  in a search snippet, on a share card and in `headline` — not protocol limits.

### Where the backend still gets in the way

- **No `updatedAt` on the public payloads.** Worked around by reading the
  backend's sitemap; a real field on `GET /news` would remove that extra
  request.
- **No `GET /categories/:slug`.** A category page still fetches the whole list
  and matches the slug in memory, exactly as in Stage 7.
- **The backend's sitemap spells categories `/categories/<slug>`** while this
  frontend serves `/category/<slug>`. Only the timestamps are borrowed from it —
  every URL in `/sitemap.xml` is built from this app's own path helpers — and
  both spellings are accepted when reading, so a backend rename cannot silently
  drop every timestamp.
- **The backend's own `/sitemap.xml` and `/robots.txt` use its
  `PUBLIC_SITE_URL`**, so they must not be exposed on the public domain. This
  app serves its own.

### Verified / not run here

`npm install` has no network access in this environment, so `next` is not
installed and `next build` / `next lint` could **not** be run. What was run:

- Every `.ts` / `.tsx` file parsed and transformed with esbuild: 64 files, no
  errors, and every `@/…` import resolved to a real file.
- `tsc --noEmit` in strict mode over `lib/**`, `types/**`, `app/sitemap.ts`,
  `app/robots.ts` and the test harness, against a hand-written stub of the
  `next` metadata types.
- Runtime assertions against a fake backend that mirrors the stage 1–5
  contracts: origin validation and the production throw, canonicals matching
  `og:url` on every page type, cover images resolved onto the API origin, the
  404 `noindex, follow` block, JSON-LD escaping of a headline containing
  `</script>`, `dateModified` suppressed when it equals publication, the
  paginated news walk, and the sitemap's contents, ordering and timestamps.
- The generated sitemap written out as XML and validated with `xmllint`.
- The archive unpacked again and re-checked: byte-identical to the build
  output, `app/admin/layout.tsx` and the other Stage 8 files byte-compared
  against the Stage 8 baseline, and the five literal `export const
  revalidate = 60` exports confirmed intact.

**Run `npm install && npm run build && npm run lint` once before deploying**,
with `NEXT_PUBLIC_SITE_URL` set — the build is expected to fail without it.
