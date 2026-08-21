// Drift gate for the self-hosted dependency CDN PoC (deps/).
//
// The whole point of generating the manifest's third-party section from the
// dependency build is that versions can never drift between (a) what npm
// installed, (b) what was built and deployed to deps.ferry.rsvp, and (c) what
// the import map serves. This test makes that a checked invariant:
//
//   deps/package.json  ==  deps/generated/deps-imports.ts  ==  manifest esm.sh pins
//
// While esm.sh remains live in the manifest, the third check pins the PoC to
// the exact versions the site already serves, so a future cutover is a pure
// origin swap, not a version bump.

import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { createImportMap } from "@rmc-toolkit/core";
import { manifest } from "../src/manifest.js";
import { depImports, depVersions } from "../deps/generated/deps-imports.js";

const CDN = "https://deps.ferry.rsvp";

const depsPkg = JSON.parse(
  await readFile(new URL("../deps/package.json", import.meta.url), "utf8"),
) as { dependencies: Record<string, string> };
const entrypoints = JSON.parse(
  await readFile(new URL("../deps/entrypoints.json", import.meta.url), "utf8"),
) as Record<string, string[]>;
delete entrypoints["//"];

describe("deps build ↔ generated manifest fragment", () => {
  it("covers exactly the packages in deps/package.json, at their pinned versions", () => {
    expect(Object.keys(depVersions).sort()).toEqual(
      Object.keys(depsPkg.dependencies).sort(),
    );
    for (const [pkg, version] of Object.entries(depVersions)) {
      expect(version, pkg).toBe(depsPkg.dependencies[pkg]);
    }
  });

  it("has one specifier per entrypoint, pointing into the versioned CDN path", () => {
    const expected = Object.entries(entrypoints).flatMap(([pkg, subs]) =>
      subs.map((sub) => (sub === "" ? pkg : `${pkg}/${sub}`)),
    );
    expect(Object.keys(depImports).sort()).toEqual(expected.sort());
    for (const [spec, url] of Object.entries(depImports)) {
      const pkg = Object.keys(depVersions).find(
        (p) => spec === p || spec.startsWith(`${p}/`),
      )!;
      expect(url, spec).toMatch(
        new RegExp(`^${CDN}/${pkg}@${depVersions[pkg as keyof typeof depVersions]}/.+\\.mjs$`),
      );
    }
  });
});

describe("deps build ↔ live manifest esm.sh pins", () => {
  // Same version must be pinned on both origins for every package the PoC
  // covers, so cutting over is an origin swap with zero version movement.
  const imports = createImportMap(manifest, { environment: "production" }).imports;
  const esmVersionOf = (pkg: string): string | undefined => {
    for (const url of Object.values(imports)) {
      const m = url.match(
        new RegExp(`^https://esm\\.sh/${pkg}@(\\d+\\.\\d+\\.\\d+[^/?]*)`),
      );
      if (m) return m[1];
    }
    return undefined;
  };

  it("pins the same version as the esm.sh entry for every package built", () => {
    for (const [pkg, version] of Object.entries(depVersions)) {
      const esmVersion = esmVersionOf(pkg);
      if (esmVersion !== undefined) {
        expect(esmVersion, `${pkg}: deps/package.json vs manifest esm.sh pin`).toBe(version);
      }
    }
  });
});
