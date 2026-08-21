# Self-hosted dependency CDN — investigation + proof of concept

Date: 2026-08-21
Status: Investigation (working PoC in `deps/`, not wired into the live manifest)
Repos: `runtime-manifest` (build + generated manifest fragment), future: a
Cloudflare deploy target for `deps.ferry.rsvp`

## Objective

Replace the esm.sh origin with a self-hosted dependency CDN:

1. Third-party runtime deps (react, zod, …) are declared in a `package.json`
   and installed with npm — **package.json becomes the version source of truth**.
2. A Vite build compiles every declared package into browser ESM, one
   directory per package, replicating the esm.sh layout
   (`/react@19.2.8/index.mjs` + an unversioned `/react` stub).
3. The build output deploys to Cloudflare and serves from
   `https://deps.ferry.rsvp/...`.
4. **The same build generates the third-party section of the runtime
   manifest**, so the import map can never drift from what is actually
   deployed.

## Verdict

**Feasible, and structurally simpler than esm.sh itself.** The PoC in
`deps/` builds 5 representative packages (10 entrypoints) covering every
hard case, passes full export-parity against the npm originals, and passes
runtime smoke tests with React resolved as a shared singleton through a
simulated import map. The one genuinely novel risk is **version retention
on the CDN** (esm.sh keeps every version forever; our deploy must too) and
the one hard migration constraint is that **the React-peer cluster must cut
over atomically** (see Migration).

## What the PoC proves

`deps/package.json` pins the exact versions the manifest already serves
(react 19.2.8, react-dom 19.2.8, zod 4.4.3, zustand 5.0.14, prop-types
15.8.1 — a test enforces this parity). `deps/build.mjs` (Vite programmatic
API) builds each package with every other CDN package externalized as its
**bare specifier**, then `deps/verify.mjs` checks the output:

| Case | Package | Result |
|---|---|---|
| CJS-only package → ESM | react, prop-types | ok — 45 / 1 exports, full parity |
| Subpath entrypoints | react/jsx-runtime, react-dom/client, zustand/react/shallow | ok |
| React-peer externalization | react-dom/client, zustand | ok — emits `import … from "react"`, no bundled copy |
| Pure ESM pass-through | zod (240 exports), zustand | ok |
| Runtime behavior | createElement, jsx(), zustand store, zod parse, createRoot surface | ok |

Output sizes are on par with esm.sh: react 3.4 KB gz, react-dom/client
56 KB gz, zod 64 KB gz.

Two non-obvious findings the PoC surfaced (both now handled in `build.mjs`):

- **`preserveEntrySignatures: "strict"` is mandatory.** Vite's app-build
  default tree-shakes "unused" exports, collapsing pure-ESM packages to
  empty files.
- **CJS packages need generated re-export shims.** Rollup's commonjs interop
  only wires up named exports something statically asks for; building the
  bare CJS entry yields a default-only module. The build therefore imports
  each entrypoint in node first (cjs-module-lexer enumerates CJS exports —
  the same trick esm.sh uses), writes a shim with explicit named
  re-exports, and builds the shim.

## Architecture

```
deps/package.json          exact version pins — THE source of truth
deps/entrypoints.json      subpaths per package (react-dom/client, …)
        │  npm ci && node build.mjs (Vite, per package)
        ▼
build/deps/
  react@19.2.8/index.mjs        versioned, immutable
  react@19.2.8/jsx-runtime.mjs
  react-dom@19.2.8/client.mjs   imports bare "react" — import map resolves
  react                         esm.sh-style unversioned stub (convenience)
  _headers                      content-type for stubs, immutable caching
  import-map.deps.json          specifier -> https://deps.ferry.rsvp/... 
deps/generated/deps-imports.ts  the manifest's third-party section, generated
```

Bump a version in `deps/package.json` → `npm install && npm run build` →
modules, CDN layout, and manifest entries all move together.
`test/deps-build-sync.test.ts` makes the lockstep a checked invariant.

## The key simplification: the import map replaces `?deps=`

esm.sh threads `?deps=react@19.2.8` through every React-dependent URL
because each esm.sh URL is an isolated module graph — the query string is
how it dedupes React. **We don't need any of that.** The site already ships
an import map, so dependent packages are built with bare externals
(`import "react"`), and the import map — not URL threading — guarantees one
React per page. This is strictly stronger: it is impossible for two entries
to disagree about the React version, because there is exactly one `react`
mapping. The 16 `?deps=` annotations in today's manifest simply disappear.

Corollary: the import map must gain **bare-name entries** (`react`,
`react-dom`, `zustand`, …) alongside today's `@esm.sh/*` aliases, because
module-to-module imports inside the built output use bare names. The
generated fragment provides exactly these.

## Wiring the generated fragment into the manifest

`deps/build.mjs` emits `deps/generated/deps-imports.ts`:

```ts
export const depImports = {
  "react": "https://deps.ferry.rsvp/react@19.2.8/index.mjs",
  "react-dom/client": "https://deps.ferry.rsvp/react-dom@19.2.8/client.mjs",
  ...
} as const;
```

At cutover, `src/manifest.ts` replaces the hand-maintained esm.sh block with:

```ts
import { depImports } from "../deps/generated/deps-imports.js";

exactImports: {
  ...depImports,                                   // bare names, generated
  "@esm.sh/react": depImports["react"],            // legacy aliases repointed
  "@esm.sh/react-dom/client": depImports["react-dom/client"],
  ...
}
```

Keeping the `@esm.sh/*` aliases (repointed) avoids forcing every slice to
rewrite imports in the same release; slices migrate to bare specifiers at
their own pace, and the aliases are dropped in a later major.

## Cloudflare deployment — retention is the hard requirement

The versioning policy assumes old URLs live forever: a slice built last
month against `react@19.2.8` must keep loading it even after the manifest
moves to 19.3.x, because slices rebuild on their own schedules. esm.sh gives
this for free; self-hosting must reproduce it.

- **Cloudflare Pages is a poor fit alone**: each deploy is an atomic
  snapshot — files absent from the new build vanish from the domain. Old
  versions would 404 the moment a bump deploys, unless the repo commits
  every historical version into `build/deps/` forever (deterministic, in
  the repo's committed-build idiom, but the repo grows without bound and
  vendor blobs pollute review).
- **Recommended: R2 bucket + custom domain (`deps.ferry.rsvp`)**, deploys
  are **additive uploads** (`wrangler r2 object put`, or `rclone copy
  --ignore-existing`). Nothing is ever deleted; a version bump only adds
  `react@19.3.0/`. Cache-Control from object metadata:
  `public, max-age=31536000, immutable` for versioned paths, short TTL for
  the unversioned stubs. The generated `_headers` file documents the same
  policy for a Pages-based fallback.
- The unversioned stubs (`/react` → re-export of the current pin) replicate
  esm.sh's URL surface but are a **debug/convenience surface only** — the
  import map always points at versioned URLs. They are the only mutable
  objects in the bucket.

CI shape: on tag push, `cd deps && npm ci && npm run build && node
verify.mjs`, upload `build/deps/` to R2 additively, then the existing
release flow (manifest build, parity tests, moving major tag) proceeds —
ordering matters: **CDN upload must complete before a manifest release that
references it** (same discipline as deploying a slice before registering it).

## Migration under VERSIONING.md

### Why partial migration of the React cluster means two Reacts

An import map only intercepts what a module *asks for by name*. There are
two different kinds of "ask" in play:

- **Bare specifier** — `import { useState } from "react"`. The browser has
  no way to resolve this on its own; it consults the import map. This is
  what our self-hosted builds emit, so the map controls where React comes
  from.
- **URL path** — `import … from "/react@19.2.8/es2022/react.mjs"`. This is
  what esm.sh's files contain internally (the public URL
  `https://esm.sh/react-router@…?deps=react@19.2.8` is a one-line stub
  that re-exports from a build file, and that build file imports React by
  root-relative path). The browser resolves it against the importing
  module's own URL — i.e. against **esm.sh's origin** — and never consults
  the import map at all. Remapping it would require enumerating esm.sh's
  private, build-hashed internal file layout in the map, which is not a
  real option.

Now walk a partial migration. Suppose the manifest repoints `react` and
`@esm.sh/react` to deps.ferry.rsvp but leaves `@esm.sh/react-router` on
esm.sh:

```
slice ── "@esm.sh/react" ──▶ import map ──▶ deps.ferry.rsvp/react@19.2.8/index.mjs   = React A
slice ── "@esm.sh/react-router" ──▶ import map ──▶ esm.sh/react-router@7.8.2?deps=…
              └─▶ internally: import "/react@19.2.8/es2022/react.mjs"
                  resolves on esm.sh's origin, bypassing the map           = React B
```

Same version, two module instances. React's hooks work through a
module-level "current dispatcher" singleton inside the react instance:
react-dom (instance A) sets the dispatcher on A while rendering, but
react-router's `useContext` reads the dispatcher on B — which is unset.
Result: "Invalid hook call" / null-context crashes at runtime, with
everything loading and type-checking fine.

Today the singleton invariant is enforced by esm.sh's `?deps=` threading:
every React-dependent URL converges on the same
`/react@19.2.8/es2022/react.mjs` file, so one origin serves one instance.
After full migration the invariant is enforced by the single bare `react`
entry in the import map. **During a mix, both regimes are live and resolve
to different origins** — that is the two-React state. So react, react-dom,
and every entry carrying `?deps=react` (react-router, react-router-dom,
@tanstack/react-query, zustand, react-responsive, react-error-boundary,
react-hook-form, react-hook-form-persist, @hookform/resolvers,
@vaadin/react-components, @radix-ui/themes, @radix-ui/react-icons) must
repoint in the **same import-map release** — which is a MAJOR under the
policy regardless, since it repoints existing specifiers.

### Why leaf libs are exempt, and migrate additively

A leaf lib (luxon, zod, immer, xstate, libphonenumber-js, date-fns,
validator, …) has no peer relationship: nothing else in the import map
imports it, and its objects don't cross between differently-sourced module
instances. If slice A temporarily loads zod from deps.ferry.rsvp while
slice B still loads it from esm.sh, the page carries two copies of zod —
wasted bytes, but nothing breaks, because a zod schema is created and
consumed inside one slice's module graph.

That tolerance for duplication is what unlocks the additive path (the same
pattern `@ferryrsvp/ferry-authentication-*` used):

1. **MINOR**: add the bare-name specifier (`"zod" → deps.ferry.rsvp/…`) as
   a *new* entry; `@esm.sh/zod` stays untouched.
2. Slices switch `@esm.sh/zod` → `zod` individually, as they rebuild.
3. A later MAJOR removes the unused `@esm.sh/zod` alias.

One lib at a time, each step reversible, and the CDN gets a production
soak with trivial blast radius before the React cluster ever moves.
**Start here.**

## Open items and risks (beyond the PoC's 5 packages)

- **CSS-carrying packages**: `@radix-ui/themes` ships a stylesheet; the
  build must emit it as an asset with a stable URL and slices must load it
  (esm.sh has the same wrinkle — CSS is already handled out-of-band today;
  verify how web-static loads it before cutover).
- **Shared internal deps must be promoted to first-class entries.**
  The build bundles everything *except* the packages listed in
  `deps/package.json` (those become bare-specifier externals). A package
  that two CDN entries depend on internally therefore gets bundled twice —
  once into each — unless it is promoted onto the list.

  Worked example: `@tanstack/react-query` is React bindings around
  `@tanstack/query-core`, where `QueryClient`, the caches, and the
  module-level `focusManager`/`onlineManager` singletons actually live.
  `@tanstack/query-persist-client-core` also operates on query-core's
  `QueryClient`. The three resolution regimes compare like this:

  - **npm** dedupes: both packages get the one copy in `node_modules` —
    same classes, same singletons.
  - **esm.sh** dedupes implicitly: both packages' files import the same
    absolute URL (`/@tanstack/query-core@5.96.2/…`), and the browser's
    module cache makes one instance of it.
  - **Our build, naively**: query-core is not in `deps/package.json`, so
    react-query's bundle inlines private copy 1 and persist-client-core's
    bundle inlines private copy 2. The app then creates a `QueryClient`
    from copy 1 and hands it to `persistQueryClient` compiled against
    copy 2: `instanceof` checks fail, `#private` fields (per class
    *declaration*, not per class name) throw, and copy 2's
    `focusManager`/`onlineManager` singletons never see the events copy 1
    is wiring up. Plus query-core ships twice.

  Fix: add `@tanstack/query-core` to `deps/package.json`. It then becomes
  its own CDN entry *and* an external everywhere else, so both dependents
  emit bare `import … from "@tanstack/query-core"` and the import map
  makes it a singleton again — restoring exactly what npm and esm.sh give.
  No slice ever imports it directly; it exists purely so the import map
  can dedupe it.

  Rule: an internal dep bundled into a *single* CDN entry is fine
  (`scheduler` inside react-dom). One reachable from **two or more** CDN
  entries must be promoted if it carries identity or state — classes,
  module-level singletons, registries, context objects
  (`@tanstack/query-core`, `use-sync-external-store`, likely several
  `@vaadin/*` internals). `deps/build.mjs` now audits this mechanically:
  it walks the lockfile's dependency graph and warns for every package
  reachable from ≥2 CDN entries that is not itself on the list. (The PoC's
  five packages share nothing, so it is currently silent; adding the
  TanStack trio will trip it.)
- **Heavyweight/exotic packages**: `@vaadin/react-components` (web
  components, large internal graph), `@openreplay/tracker` (may spawn
  workers), `@capacitor/*` (runtime plugin registry). Each needs the same
  parity + smoke treatment before cutover; expect per-package tuning.
- **Dev builds**: esm.sh serves `?dev`; the PoC builds
  `NODE_ENV=production` only. If slices want dev React locally, either
  build a parallel `*/dev/` tree or keep esm.sh for local development
  (import maps make this a per-environment choice — the manifest already
  has the environments mechanism).
- **Determinism**: the repo gitignores `package-lock.json` globally.
  `deps/` pins exact direct versions, but transitive deps float —
  `deps/package-lock.json` should be force-added (`git add -f`) before this
  ships, and CI should build from `npm ci`.
- **We own bundler correctness now.** esm.sh absorbs a long tail of
  packaging edge cases; `verify.mjs`'s export-parity + smoke gate is the
  defense and must run in CI for every package added. Budget real soak time
  via the leaf-lib phase before touching the React cluster.

## Suggested next steps

1. Land the PoC as-is (inert: nothing references it at runtime; parity
   tests pin it to the manifest's versions).
2. Stand up the R2 bucket + `deps.ferry.rsvp` domain; wire the CI job;
   soak with one leaf lib (zod) as an additive MINOR manifest entry and one
   volunteer slice.
3. Extend `deps/package.json` to the full leaf-lib set; migrate slices.
4. Rehearse the React-cluster cutover on preview (the manifest's
   `environments` mechanism allows preview-only repointing); ship as the
   next MAJOR alongside the repointed `@esm.sh/*` aliases.
