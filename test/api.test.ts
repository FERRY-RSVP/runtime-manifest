import { describe, it, expect } from "vitest";
import { apiBaseUrls, resolveEnvironment, apiDefines } from "../src/index.js";

describe("apiBaseUrls", () => {
  it("pins the exact production URLs", () => {
    expect(apiBaseUrls.production).toEqual({
      booking: "https://api.ferry.rsvp/app/booking",
      payments: "https://api.ferry.rsvp/app/payments",
      discovery: "https://api.ferry.rsvp/app/discovery",
      catalog: "https://api.ferry.rsvp/v1",
      ask: "https://ask.ferry.rsvp",
    });
  });

  it("pins the exact preview URLs", () => {
    expect(apiBaseUrls.preview).toEqual({
      booking: "https://api.staging.ferry.rsvp/app/booking",
      payments: "https://api.staging.ferry.rsvp/app/payments",
      discovery: "https://api.staging.ferry.rsvp/app/discovery",
      catalog: "https://api.staging.ferry.rsvp/v1",
      ask: "https://ask.staging.ferry.rsvp",
    });
  });

  it("uses the same keys in both environments", () => {
    expect(Object.keys(apiBaseUrls.production).sort()).toEqual(
      Object.keys(apiBaseUrls.preview).sort(),
    );
  });

  it("never points a preview URL at a production host", () => {
    for (const url of Object.values(apiBaseUrls.preview)) {
      expect(url).toContain(".staging.ferry.rsvp");
    }
  });
});

describe("resolveEnvironment", () => {
  it("maps Cloudflare Pages main to production", () => {
    expect(resolveEnvironment({ CF_PAGES_BRANCH: "main" })).toBe("production");
  });

  it("maps any other Cloudflare Pages branch to preview", () => {
    expect(resolveEnvironment({ CF_PAGES_BRANCH: "staging" })).toBe("preview");
    expect(resolveEnvironment({ CF_PAGES_BRANCH: "feature/x" })).toBe("preview");
  });

  it("maps GitHub Actions main to production", () => {
    expect(resolveEnvironment({ GITHUB_REF_NAME: "main" })).toBe("production");
  });

  it("maps any other GitHub ref to preview", () => {
    expect(resolveEnvironment({ GITHUB_REF_NAME: "staging" })).toBe("preview");
    expect(resolveEnvironment({ GITHUB_REF_NAME: "feature/x" })).toBe("preview");
  });

  it("defaults to preview with no CI signal (local dev)", () => {
    expect(resolveEnvironment({})).toBe("preview");
  });

  it("prefers the Cloudflare signal when both are present", () => {
    expect(
      resolveEnvironment({ CF_PAGES_BRANCH: "main", GITHUB_REF_NAME: "staging" }),
    ).toBe("production");
  });
});

describe("apiDefines", () => {
  it("produces JSON-quoted import.meta.env keys", () => {
    expect(apiDefines("production")).toEqual({
      "import.meta.env.VITE_API_BOOKING": '"https://api.ferry.rsvp/app/booking"',
      "import.meta.env.VITE_API_PAYMENTS": '"https://api.ferry.rsvp/app/payments"',
      "import.meta.env.VITE_API_DISCOVERY": '"https://api.ferry.rsvp/app/discovery"',
      "import.meta.env.VITE_API_CATALOG": '"https://api.ferry.rsvp/v1"',
      "import.meta.env.VITE_API_ASK": '"https://ask.ferry.rsvp"',
    });
  });

  it("produces staging values for preview", () => {
    expect(apiDefines("preview")["import.meta.env.VITE_API_ASK"]).toBe(
      '"https://ask.staging.ferry.rsvp"',
    );
  });
});
