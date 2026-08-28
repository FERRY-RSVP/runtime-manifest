# FERRY-RSVP — agent instructions

## What this system is

FERRY-RSVP is a microfrontend ferry-booking platform on Cloudflare. The browser
composes the application **at runtime from native import maps** built with
[rmc-toolkit](https://github.com/runtime-module-composition/rmc-toolkit) — not
at build time. Each feature ("slice") is a separate GitHub repository that
builds to ESM, uploads to R2, and is resolved by specifier in the browser.

`runtime-manifest` is the single source of truth for the import map.
`web-static` is the host that generates it.

## What you will get wrong by default

This architecture is unusual. These are the specific wrong assumptions:

| You will assume | The reality here |
|---|---|
| A bundler or Module Federation stitches this together | Native browser import maps, resolved at runtime. Nothing bundles across repo boundaries. |
| Dependencies belong in this repo's `package.json` | Runtime deps are import-map owned, declared once in `runtime-manifest`. Only dev/build tooling is local. |
| Deploy works the same everywhere | Split by shape. **Slices**: CI-only, no deploy script — pushing to `staging`/`main` is the trigger. **Workers**: have `npm run deploy` / `deploy:staging` (wrangler) and can also be deployed from a machine. |
| Environments are `dev` / `staging` / `prod` | The manifest defines `production` and `preview` only. There is no `development`. |
| `http://localhost:3000` | `https://ferryrsvp.local:<port>` — custom host, HTTPS, unique port per slice. |
| A route table maps URLs to features | Convention: `slicePrefix: "web-"` means `/booking` resolves to `@ferryrsvp/web-booking/<entry>`. |
| One worker per repository | `ferry-intelligence` holds five workers; `ferry-authentication` holds four packages. |
| Slices import each other via `package.json` | Slices never depend on each other that way. They resolve by specifier at runtime. |

## Hard invariants

1. **No runtime dependencies in this repo's `package.json`** — they are import-map
   owned. Dev/build tooling as `devDependencies` is fine.
2. **React is a singleton**, pinned once as `REACT` in
   `runtime-manifest/src/manifest.ts`. Never pin React in a slice.
3. **Bumping a shared dependency is a host-only change** — regenerate the import
   map, redeploy `web-static`. Slices are untouched.
4. **Slices deploy CI-only** — no slice has a deploy script, and pushing to `staging` or `main`
   is the trigger. **Workers differ**: they carry `npm run deploy` / `deploy:staging` (wrangler)
   and can be deployed from a machine as well as by CI on push.
5. **Dev servers bind `ferryrsvp.local` over HTTPS**, one unique port each. Never
   `localhost`. Requires `127.0.0.1 ferryrsvp.local` in `/etc/hosts`.
6. **Worker CORS allowlists are exact-match, never wildcards.**

## This repository

**This is the single source of truth for Ferry RSVP's import map, and the
most architecturally important repo in the platform** — a change here can
affect every slice. Expressed as an `rmc-toolkit` manifest, it defines
the namespace `@ferryrsvp`, `slicePrefix: "web-"` (so a URL segment like
`/booking` maps by convention to `@ferryrsvp/web-booking/<entryFile>`
with no route table), the single pinned React version (`19.2.8`, bumped
in one constant), and every `esm.sh`-served dependency pin (react-router,
TanStack Query, zustand, Radix, zod, luxon, xstate, and more — each
frozen and only bumped as a deliberate edit).

It also defines production (`assets.ferry.rsvp`, `ferry.rsvp`) and
preview/staging (`assets.staging.ferry.rsvp`, `staging.ferry.rsvp`)
origins, including exact per-package URLs for runtime modules like
`@ferryrsvp/liknoss-client` and `@ferryrsvp/ferry-authentication-react`.
It's consumed as a private git dependency pinned by semver tag
(`github:FERRY-RSVP/runtime-manifest#vN`, or `#semver:*`): `web-static`
consumes the full manifest to actually generate the import map, while
slices only externalize by the prefix convention and don't bump this
package for routine version changes. Promote a release by pushing a new
`vX.Y.Z` git tag.

## Before you trust a document

Dated files under `docs/superpowers/`, `documentation/plans/`, and
`documentation/specs/` are **historical records**. They were accurate when
written and are frequently not accurate now. Do not treat them as current state.

Current architecture facts live in the `agent-docs` repository:

| Question | Read |
|---|---|
| How does composition work? | `docs/architecture.md` |
| What is each repository? | `docs/repos.md` |
| Where does it deploy? | `docs/environments.md` |
| How do I run it locally? | `docs/local-development.md` |
| Which worker serves this path? | `docs/api-topology.md` |
| What must I not break? | `docs/invariants.md` |
