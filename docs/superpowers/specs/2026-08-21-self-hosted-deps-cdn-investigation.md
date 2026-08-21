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

Two distinct classes, exactly matching the policy's runtime-value analysis:

1. **Standalone leaf libs** (luxon, zod, immer, xstate, libphonenumber-js,
   date-fns, validator, …): no shared runtime state. Add bare-name
   specifiers pointing at deps.ferry.rsvp as **MINOR additive** entries;
   slices migrate imports individually; retire the `@esm.sh/*` alias in a
   later major. Zero-risk, incremental, and a low-stakes production soak
   for the CDN itself. **Start here.**
2. **The React singleton cluster** (react, react-dom, and every `?deps=`
   peer: react-router, @tanstack/react-query, zustand, react-hook-form,
   @radix-ui/*, …): must cut over **atomically in one MAJOR**. Partial
   migration means two Reacts: esm.sh modules import React via absolute
   paths on the esm.sh origin (`/react@19.2.8/es2022/react.mjs`), which the
   import map cannot intercept, while self-hosted modules import bare
   `react` from deps.ferry.rsvp — hooks break at runtime. The repointed
   `@esm.sh/*` aliases + generated bare entries land in the same release.

## Open items and risks (beyond the PoC's 5 packages)

- **CSS-carrying packages**: `@radix-ui/themes` ships a stylesheet; the
  build must emit it as an asset with a stable URL and slices must load it
  (esm.sh has the same wrinkle — CSS is already handled out-of-band today;
  verify how web-static loads it before cutover).
- **Shared internal deps must be promoted to first-class entries.**
  `@tanstack/react-query` and `@tanstack/query-persist-client-core` both
  depend on `@tanstack/query-core`; unless query-core is added to
  `deps/package.json` (becoming an external + its own CDN entry), each
  bundles a private copy — code duplication and possible `instanceof`
  breakage. Same likely for `use-sync-external-store`. Rule: any package
  reachable from two CDN entries that carries classes or module state gets
  its own entry. (`scheduler` inside react-dom is fine bundled — single
  consumer.)
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
