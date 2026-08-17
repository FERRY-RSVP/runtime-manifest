# Versioning policy

`@ferryrsvp/runtime-manifest` is the single source of truth for the site import
map. It follows **semver**, and consumers track the **moving major tag** so
backwards-compatible releases flow automatically while breaking changes stay
gated. See `docs/superpowers/specs/2026-08-08-manifest-versioning-strategy-design.md`.

## Two kinds of value

The manifest holds two kinds of value, distinguished by **when they bind**:

| | Binds | Blast radius | Caught by staging? |
|---|---|---|---|
| **Runtime** — esm.sh entries, slice URLs | When `web-static` deploys its import map | Every slice at once, whenever it was built | **No** for shared singletons |
| **Build-time** — `apiBaseUrls` | At each app's own build | Only apps rebuilt since | **Yes** |

A shared esm.sh singleton (React and its `?deps=` peers) is what versioning
genuinely protects: the import map serves one React to every slice at runtime,
so a bump can pair a slice built against the old version with a map serving the
new one. Whether that breaks depends on which slices have rebuilt since, which
differs between staging and production — staging cannot reliably catch it.

Build-time values carry no such hazard: each app's staging build exercises its
own combination before production sees it. **Changing `apiBaseUrls` is
therefore MINOR, never MAJOR.**

## What each bump means

| Bump | When | Safe to adopt without code change? |
|---|---|---|
| **PATCH** (`1.5.0→1.5.1`) | No import-map change (docs, tooling) | Yes |
| **MINOR** (`1.5.0→1.6.0`) | **Additive only** — a new `@ferryrsvp/*` slice or a new esm.sh leaf entry. Never removes, renames, or repoints an existing specifier. | Yes |
| **MAJOR** (`1.x→2.0.0`) | Removes/renames a specifier, repoints a slice origin/path incompatibly, **or bumps a shared esm.sh singleton version** (react, react-hook-form, zustand, @radix-ui/themes, …) | **No — opt-in** |

**Invariant:** within a major, every release is backwards compatible. A shared
esm.sh dependency version bump is a **major** change — it's a site-wide singleton
and can break a slice built against the old version even if no slice code changed.

## How consumers pin

Track the moving major tag, not an exact version:

```jsonc
// package.json
"@ferryrsvp/runtime-manifest": "git+https://github.com/FERRY-RSVP/runtime-manifest.git#v1"
```

- New `v1.x` releases flow in on the next `npm install` / `npm update` (the CI
  moves the `v1` tag to each release). Committed lockfiles keep `npm ci` builds
  deterministic; run `npm update @ferryrsvp/runtime-manifest` (or let Dependabot
  PR it) to advance within v1.
- A `v2` release does **not** reach `#v1` consumers — bump the pin to `#v2`
  deliberately when you're ready.

## Releasing

1. Make the change; bump `version` in `package.json` per the table above.
2. `npm run build && npm test` (the build output in `build/` is committed —
   `git+https` installs use it directly, there is no `prepare` step).
3. Commit, then push an annotated tag `vX.Y.Z`.
4. CI (`.github/workflows/major-tag.yml`) moves the `vMAJOR` tag to the release.
