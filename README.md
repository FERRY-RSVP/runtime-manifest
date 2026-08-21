# @ferryrsvp/runtime-manifest

The single source of truth for Ferry RSVP's import map, expressed as an
[rmc-toolkit](https://github.com/runtime-module-composition/rmc-toolkit) manifest.

## Usage

```ts
import { manifest, createImportMap } from "@ferryrsvp/runtime-manifest";

const importMap = createImportMap(manifest, { environment: "production" });
```

## Consumption model

- **Host (web-static)** consumes the full manifest to generate the import map.
  All version/URL churn is absorbed here — bump a dependency, regenerate the
  map, redeploy the host only.
- **Slices** externalize by the prefix convention and resolve specifiers at
  runtime from the host's import map. They do not pin or bump this package for
  routine version changes.

## Distribution

Consumed as a private git dependency (ships prebuilt ESM — no build on install):

```json
"@ferryrsvp/runtime-manifest": "github:FERRY-RSVP/runtime-manifest#semver:*"
```

Promote a release by pushing a new `vX.Y.Z` git tag.

## Development

```bash
npm install
npm test      # import-map parity gate
npm run build # regenerate build/runtime-manifest
```

Rebuild and commit `build/` whenever `src/` changes.

## Self-hosted dependency CDN (investigation)

`deps/` holds a working proof of concept for serving third-party deps from
`https://deps.ferry.rsvp` instead of esm.sh: `deps/package.json` pins the
versions, a Vite build emits esm.sh-style versioned ESM into `build/deps/`,
and the same build generates the manifest's third-party import-map entries
(`deps/generated/deps-imports.ts`). Not wired into the live manifest. See
`docs/superpowers/specs/2026-08-21-self-hosted-deps-cdn-investigation.md`.

```bash
cd deps
npm install
npm run build     # build/deps/ + generated manifest fragment
node verify.mjs   # export parity vs npm originals + runtime smoke tests
```
