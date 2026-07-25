import { describe, it, expect } from "vitest";
import { createImportMap } from "@rmc-toolkit/core";
import { manifest } from "../src/manifest.js";
import { expectedImportMap } from "./expected-import-map.js";

describe("runtime-manifest import-map parity", () => {
  const actual = createImportMap(manifest, { environment: "production" }).imports;

  it("has exactly the expected specifier keys", () => {
    expect(Object.keys(actual).sort()).toEqual(
      Object.keys(expectedImportMap).sort(),
    );
  });

  it("resolves every specifier to the expected URL", () => {
    const mismatches: string[] = [];
    for (const [specifier, url] of Object.entries(expectedImportMap)) {
      if (actual[specifier] !== url) {
        mismatches.push(`${specifier}\n  expected: ${url}\n  actual:   ${actual[specifier]}`);
      }
    }
    expect(mismatches, `\n${mismatches.join("\n")}`).toHaveLength(0);
  });

  it("adds no unexpected keys", () => {
    const extra = Object.keys(actual).filter((k) => !(k in expectedImportMap));
    expect(extra, `unexpected keys: ${extra.join(", ")}`).toHaveLength(0);
  });
});
