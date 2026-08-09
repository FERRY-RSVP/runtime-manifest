# runtime-manifest Versioning Strategy — track-latest, backwards-compatible

Date: 2026-08-08
Status: Design (approved: "keep manifest as per recommendation")
Repos: `runtime-manifest` (policy + CI + moving major tag), all consumers (switch pin)

## Problem

Consumers pin the manifest at **exact git tags** (`git+https://…#v1.5.0`). Today
they're fragmented: 10 repos on `v1.3.1`, 1 on `v1.4.0`, 3 on `v1.5.0`. The host
(web-static) is one of these pins — it sat on `v1.2.0`, which predates the
`@ferryrsvp/web-ux` entry, so the site's import map never learned about web-ux
and prod search/discovery 404'd on their dependency. Every manifest addition
requires a **manual per-repo bump**, and forgetting the host breaks prod.

Goal: additive manifest changes flow to consumers with minimal per-repo work,
breaking changes stay gated, and "track latest" is **safe by construction**.

## The manifest is two contracts

1. **Slice registry** — `exactImports` + `sliceOrigins` for `@ferryrsvp/*`.
   Changes are naturally **additive** (new slice appears, existing untouched).
2. **Shared esm.sh singleton lockfile** — `react`, `react-hook-form`, `zustand`,
   `@radix-ui/themes`, … resolved once for the whole site. Bumping a version
   here can break a slice built against the old one, **even with no slice code
   change**. This is the only genuinely breaking surface.

## Semver policy (the backwards-compatibility guarantee)

`MAJOR.MINOR.PATCH`, enforced by review + CI:

- **PATCH** — no import-map change (docs, build tooling).
- **MINOR** — **additive only**: new `@ferryrsvp/*` slice or new esm.sh leaf
  entry. Never removes, renames, or repoints an existing specifier.
- **MAJOR** — anything that can break an unchanged consumer: remove/rename a
  specifier, repoint a slice origin/path incompatibly, or **bump a shared esm.sh
  singleton version**.

Contract: **within a major, any release is safe to adopt with no code change.**

### CI guard (mechanical enforcement)

A workflow compares the release's import-map keys against the previous release on
the same major and **fails if any specifier was removed or repointed** without a
major bump. This makes "backwards compatible within a major" a checked invariant,
not a promise.

## Mechanism: moving major tag (git-native `^1`)

npm can't apply semver **ranges** to a `git+https#tag` dependency, and a registry
(below) adds per-consumer auth friction. So on the current transport we get the
`^1` behaviour with a **moving major tag**:

- Maintain a `v1` tag that always points at the latest `v1.x.y` release.
- Consumers pin **`git+https://…/runtime-manifest.git#v1`** instead of `#v1.x.y`.
- CI moves `v1` on every `vX.Y.Z` push (built-in `GITHUB_TOKEN`, no secret).
- **Determinism is preserved:** committed lockfiles still pin the resolved commit
  SHA, so `npm ci` builds are reproducible. Consumers advance within v1 via
  `npm update @ferryrsvp/runtime-manifest` (or Dependabot). A host that builds
  without a committed lockfile picks up the latest `v1.x` each build.
- A **major bump** publishes `v2`; consumers stay on `v1` until they deliberately
  change the pin to `#v2` — that's the gate.

Optional: **Dependabot** in consumers to auto-open (and auto-merge) manifest ref
bumps, so additive releases flow without manual `npm update`.

## Alternative considered: package registry + `^1` (deferred)

Publishing to a registry enables real `^1` ranges:
- **GitHub Packages** requires a read token in **every** consumer's Cloudflare
  Pages build (GH Packages npm needs auth even for public packages) — friction
  across ~14 repos.
- **Public npm** avoids install auth but publishes internal slice origins
  publicly and needs an `NPM_TOKEN` to publish.

The moving-tag mechanism delivers the same intent (track latest, gated breaks)
with **zero new secrets**, so registry publishing is deferred. Revisit if we want
range resolution without a moving tag.

## Rollout (sequenced — must not collide with the in-flight prod promotion)

1. **runtime-manifest**: add `VERSIONING.md`, the major-tag CI, and the
   backwards-compat CI guard; create `v1` → current `v1.5.0` release.
2. **After prod is stable**: switch each consumer `#v1.x.y` → `#v1` (one PR per
   repo), refresh lockfiles. web-static first (it's the host that matters at
   runtime), then the apps.
3. **Optional**: add Dependabot config to consumers.

## Out of scope

- Registry publishing (deferred, above).
- The current `<Page>`/web-ux prod promotion (separate, in flight).
- Retiring the legacy malformed `@radix-ui/themes` entry (fix in a future minor).
