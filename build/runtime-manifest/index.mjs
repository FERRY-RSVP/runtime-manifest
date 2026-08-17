import { defineManifest as $ } from "@rmc-toolkit/core";
import { createExternalMatcher as x, createImportMap as k } from "@rmc-toolkit/core";
const s = "19.2.8", e = "https://esm.sh", r = "https://assets.ferry.rsvp", i = `${r}/web-pages`, t = "https://assets.staging.ferry.rsvp", o = `${t}/web-pages`, b = $({
  namespace: "@ferryrsvp",
  // Slices are published as @ferryrsvp/web-<name>. slicePrefix lets
  // resolveRoute map a URL segment ("/booking") to the conventional specifier
  // (@ferryrsvp/web-booking/<entryFile>) by convention, without a route table.
  slicePrefix: "web-",
  // production catch-all; preview overrides via environments.preview.assetsOrigin.
  assetsOrigin: r,
  // Every esm.sh entry is version-pinned (frozen 2026-07-26 from the version
  // esm.sh served as "latest"). React and its ?deps= peers use the REACT
  // constant; bumping any library is a deliberate edit, caught by the parity test.
  exactImports: {
    // --- esm.sh: React singleton + React-dependent (react peer via ?deps=) ---
    "@esm.sh/react": `${e}/react@${s}`,
    "@esm.sh/react-dom/client": `${e}/react-dom@${s}/client`,
    "@esm.sh/react-router": `${e}/react-router@7.8.2?deps=react@${s}`,
    "@esm.sh/react-router-dom": `${e}/react-router-dom@7.8.2?deps=react@${s},react-dom@${s}`,
    "@esm.sh/@tanstack/react-query": `${e}/@tanstack/react-query@5.96.2?deps=react@${s}`,
    "react/jsx-runtime": `${e}/react@${s}/jsx-runtime`,
    "react/jsx-dev-runtime": `${e}/react@${s}/jsx-dev-runtime`,
    "@esm.sh/zustand": `${e}/zustand@5.0.14?deps=react@${s}`,
    "@esm.sh/react-responsive": `${e}/react-responsive@10.0.1?deps=react@${s}`,
    "@esm.sh/react-error-boundary": `${e}/react-error-boundary@6.1.2?deps=react@${s},react-dom@${s}`,
    "@esm.sh/react-hook-form": `${e}/react-hook-form@7.83.0?deps=react@${s}`,
    "@esm.sh/react-hook-form-persist": `${e}/react-hook-form-persist@3.0.0?deps=react@${s}`,
    "@esm.sh/@hookform/resolvers/zod": `${e}/@hookform/resolvers@5.5.3/zod?deps=react@${s},react-hook-form@7.83.0`,
    "@esm.sh/@vaadin/react-components/DatePicker": `${e}/@vaadin/react-components@24.9.17/DatePicker.js?deps=react@${s}`,
    "@esm.sh/@radix-ui/themes": `${e}/@radix-ui/themes@3.3.0?deps=react@${s},react-dom@${s}/client`,
    "@esm.sh/@radix-ui/react-icons": `${e}/@radix-ui/react-icons@1.3.2?deps=react@${s}`,
    // --- esm.sh: standalone leaf libs (no react peer) ---
    "@esm.sh/luxon": `${e}/luxon@3.7.2`,
    "@esm.sh/@tanstack/query-persist-client-core": `${e}/@tanstack/query-persist-client-core@5.96.2`,
    "@esm.sh/@tanstack/query-sync-storage-persister": `${e}/@tanstack/query-sync-storage-persister@5.96.2`,
    "@esm.sh/prop-types": `${e}/prop-types@15.8.1`,
    "@esm.sh/zod": `${e}/zod@4.4.3`,
    "@esm.sh/date-fns/parse": `${e}/date-fns@4.4.0/parse`,
    "@esm.sh/date-fns/format": `${e}/date-fns@4.4.0/format`,
    "@esm.sh/immer": `${e}/immer@11.1.15`,
    "@esm.sh/zustand/middleware": `${e}/zustand@5.0.14/middleware`,
    "@esm.sh/zustand/react/shallow": `${e}/zustand@5.0.14/react/shallow`,
    "@esm.sh/@auth0/auth0-react": `${e}/@auth0/auth0-react@2.22.0`,
    "@esm.sh/@capacitor/app": `${e}/@capacitor/app@8.1.1`,
    "@esm.sh/@capacitor/browser": `${e}/@capacitor/browser@8.0.4`,
    "@esm.sh/libphonenumber-js": `${e}/libphonenumber-js@1.13.9`,
    "@esm.sh/xstate": `${e}/xstate@5.28.0`,
    "@esm.sh/validator/lib/isEmail": `${e}/validator@13.15.35/lib/isEmail`,
    "@esm.sh/@chenglou/pretext": `${e}/@chenglou/pretext@0.0.3`,
    "@esm.sh/@openreplay/tracker": `${e}/@openreplay/tracker@18.1.0`,
    // --- ferry: exact module URLs (production + preview variants) ---
    "@ferryrsvp/liknoss-client": {
      url: `${r}/liknoss-client/index.mjs`,
      environments: { preview: `${t}/liknoss-client/index.mjs` }
    },
    // Ferry-RSVP conventions layer (booking-intent, buildTimetableRequest) — a
    // subpath of the same package, distinct from the raw API client above.
    "@ferryrsvp/liknoss-client/ferryrsvp": {
      url: `${r}/liknoss-client/ferryrsvp/index.mjs`,
      environments: { preview: `${t}/liknoss-client/ferryrsvp/index.mjs` }
    },
    "@ferryrsvp/localization": {
      url: `${r}/web-localization/index.mjs`,
      environments: { preview: `${t}/web-localization/index.mjs` }
    },
    "@ferryrsvp/localization/react": {
      url: `${r}/web-localization/react.mjs`,
      environments: { preview: `${t}/web-localization/react.mjs` }
    },
    "@ferryrsvp/web-ui": {
      url: `${r}/web-ui/index.mjs`,
      environments: { preview: `${t}/web-ui/index.mjs` }
    },
    "@ferryrsvp/web-ux": {
      url: `${r}/web-ux/index.mjs`,
      environments: { preview: `${t}/web-ux/index.mjs` }
    },
    "@ferryrsvp/web-auth": {
      url: `${r}/web-auth/build/index.mjs`,
      environments: { preview: `${t}/web-auth/build/index.mjs` }
    }
  },
  // Trailing-slash prefix mappings, per environment. createImportMap emits each
  // as "@ferryrsvp/<name>/" -> "<origin>/". The "@ferryrsvp/" catch-all comes
  // from assetsOrigin (production) / environments.preview.assetsOrigin (preview).
  environments: {
    production: {
      sliceOrigins: {
        localization: `${r}/web-localization`,
        "web-ui": `${r}/web-ui`,
        "web-ux": `${r}/web-ux`,
        "web-page": `${r}/web-page`,
        "web-home": i,
        "web-about": i,
        "web-support": i,
        "web-coming-soon": i
      }
    },
    preview: {
      assetsOrigin: t,
      sliceOrigins: {
        localization: `${t}/web-localization`,
        "web-ui": `${t}/web-ui`,
        "web-ux": `${t}/web-ux`,
        "web-page": `${t}/web-page`,
        "web-home": o,
        "web-about": o,
        "web-support": o,
        "web-coming-soon": o
      }
    }
  }
}), n = "https://api.ferry.rsvp", c = "https://api.staging.ferry.rsvp", l = "https://ask.ferry.rsvp", u = "https://ask.staging.ferry.rsvp", d = {
  production: {
    booking: `${n}/app/booking`,
    payments: `${n}/app/payments`,
    discovery: `${n}/app/discovery`,
    catalog: `${n}/v1`,
    ask: l
  },
  preview: {
    booking: `${c}/app/booking`,
    payments: `${c}/app/payments`,
    discovery: `${c}/app/discovery`,
    catalog: `${c}/v1`,
    ask: u
  }
};
function w(a) {
  return a.CF_PAGES_BRANCH ? a.CF_PAGES_BRANCH === "main" ? "production" : "preview" : a.GITHUB_REF_NAME && a.GITHUB_REF_NAME === "main" ? "production" : "preview";
}
function v(a) {
  return Object.fromEntries(
    Object.entries(d[a]).map(([p, m]) => [
      `import.meta.env.VITE_API_${p.toUpperCase()}`,
      JSON.stringify(m)
    ])
  );
}
export {
  d as apiBaseUrls,
  v as apiDefines,
  x as createExternalMatcher,
  k as createImportMap,
  b as manifest,
  w as resolveEnvironment
};
