import { describe, it, expect } from "vitest";
import { defineManifest, validateManifest } from "@rmc-toolkit/core";
import { manifest } from "../src/manifest.js";

// CI guard: a malformed exactImports URL (including a per-environment
// override) must fail here, at build time, instead of surfacing as a dynamic
// import failure in the browser. rmc-toolkit 0.5.2's validateManifest checks
// that every entry resolves to an absolute HTTP(S) URL.

describe("validateManifest(manifest)", () => {
  it("reports no error-level diagnostics", () => {
    const errors = validateManifest(manifest).filter(
      (diagnostic) => diagnostic.level === "error",
    );
    expect(
      errors,
      errors
        .map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`)
        .join("\n"),
    ).toEqual([]);
  });

  it("reports no warnings either — the manifest should be fully clean", () => {
    const warnings = validateManifest(manifest).filter(
      (diagnostic) => diagnostic.level === "warning",
    );
    expect(
      warnings,
      warnings
        .map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`)
        .join("\n"),
    ).toEqual([]);
  });

  // Guards the guard: if a toolkit upgrade ever stops flagging relative URLs,
  // this fails and the suite above is known to be vacuous.
  it("flags non-HTTP(S) exactImports URLs, env overrides included", () => {
    const broken = defineManifest({
      namespace: "@ferryrsvp",
      assetsOrigin: "https://assets.ferry.rsvp",
      exactImports: {
        "@ferryrsvp/relative": "/not-absolute/index.mjs",
        "@ferryrsvp/bad-override": {
          url: "https://assets.ferry.rsvp/ok/index.mjs",
          environments: { preview: "assets.staging.ferry.rsvp/no-scheme.mjs" },
        },
      },
    });
    const errorCodes = validateManifest(broken)
      .filter((diagnostic) => diagnostic.level === "error")
      .map((diagnostic) => diagnostic.code);
    expect(errorCodes).toEqual(["exact-import-url", "exact-import-url"]);
  });
});
