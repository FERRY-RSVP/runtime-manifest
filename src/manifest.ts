import { defineManifest } from "@rmc-toolkit/core";

// Single source of truth for the React version — bump here to bump everywhere.
const REACT = "19.2.8";
const ESM = "https://esm.sh";

// Production origins.
const ASSETS = "https://assets.ferry.rsvp";
const SITE = "https://ferry.rsvp";
const PAGES = `${ASSETS}/web-pages`;

// Preview (staging) origins.
const STAGING_ASSETS = "https://assets.staging.ferry.rsvp";
const STAGING_SITE = "https://staging.ferry.rsvp";
const STAGING_PAGES = `${STAGING_ASSETS}/web-pages`;

export const manifest = defineManifest({
  namespace: "@ferryrsvp",
  // Slices are published as @ferryrsvp/web-<name>. slicePrefix lets
  // resolveRoute map a URL segment ("/booking") to the conventional specifier
  // (@ferryrsvp/web-booking/<entryFile>) by convention, without a route table.
  slicePrefix: "web-",
  // production catch-all; preview overrides via environments.preview.assetsOrigin.
  assetsOrigin: ASSETS,

  // Every esm.sh entry is version-pinned (frozen 2026-07-26 from the version
  // esm.sh served as "latest"). React and its ?deps= peers use the REACT
  // constant; bumping any library is a deliberate edit, caught by the parity test.
  exactImports: {
    // --- esm.sh: React singleton + React-dependent (react peer via ?deps=) ---
    "@esm.sh/react": `${ESM}/react@${REACT}`,
    "@esm.sh/react-dom/client": `${ESM}/react-dom@${REACT}/client`,
    "@esm.sh/react-router": `${ESM}/react-router@7.8.2?deps=react@${REACT}`,
    "@esm.sh/react-router-dom": `${ESM}/react-router-dom@7.8.2?deps=react@${REACT},react-dom@${REACT}`,
    "@esm.sh/@tanstack/react-query": `${ESM}/@tanstack/react-query@5.96.2?deps=react@${REACT}`,
    "react/jsx-runtime": `${ESM}/react@${REACT}/jsx-runtime`,
    "react/jsx-dev-runtime": `${ESM}/react@${REACT}/jsx-dev-runtime`,
    "@esm.sh/zustand": `${ESM}/zustand@5.0.14?deps=react@${REACT}`,
    "@esm.sh/react-responsive": `${ESM}/react-responsive@10.0.1?deps=react@${REACT}`,
    "@esm.sh/react-error-boundary": `${ESM}/react-error-boundary@6.1.2?deps=react@${REACT},react-dom@${REACT}`,
    "@esm.sh/react-hook-form": `${ESM}/react-hook-form@7.83.0?deps=react@${REACT}`,
    "@esm.sh/react-hook-form-persist": `${ESM}/react-hook-form-persist@3.0.0?deps=react@${REACT}`,
    "@esm.sh/@hookform/resolvers/zod": `${ESM}/@hookform/resolvers@5.5.3/zod?deps=react@${REACT},react-hook-form@7.83.0`,
    "@esm.sh/@vaadin/react-components/DatePicker": `${ESM}/@vaadin/react-components@24.9.17/DatePicker.js?deps=react@${REACT}`,
    "@esm.sh/@radix-ui/themes": `${ESM}/@radix-ui/themes@3.3.0?deps=react@${REACT},react-dom@${REACT}/client`,
    "@esm.sh/@radix-ui/react-icons": `${ESM}/@radix-ui/react-icons@1.3.2?deps=react@${REACT}`,

    // --- esm.sh: standalone leaf libs (no react peer) ---
    "@esm.sh/luxon": `${ESM}/luxon@3.7.2`,
    "@esm.sh/@tanstack/query-persist-client-core": `${ESM}/@tanstack/query-persist-client-core@5.96.2`,
    "@esm.sh/@tanstack/query-sync-storage-persister": `${ESM}/@tanstack/query-sync-storage-persister@5.96.2`,
    "@esm.sh/prop-types": `${ESM}/prop-types@15.8.1`,
    "@esm.sh/zod": `${ESM}/zod@4.4.3`,
    "@esm.sh/date-fns/parse": `${ESM}/date-fns@4.4.0/parse`,
    "@esm.sh/date-fns/format": `${ESM}/date-fns@4.4.0/format`,
    "@esm.sh/immer": `${ESM}/immer@11.1.15`,
    "@esm.sh/zustand/middleware": `${ESM}/zustand@5.0.14/middleware`,
    "@esm.sh/zustand/react/shallow": `${ESM}/zustand@5.0.14/react/shallow`,
    "@esm.sh/@auth0/auth0-react": `${ESM}/@auth0/auth0-react@2.22.0`,
    "@esm.sh/@capacitor/app": `${ESM}/@capacitor/app@8.1.1`,
    "@esm.sh/@capacitor/browser": `${ESM}/@capacitor/browser@8.0.4`,
    "@esm.sh/libphonenumber-js": `${ESM}/libphonenumber-js@1.13.9`,
    "@esm.sh/xstate": `${ESM}/xstate@5.28.0`,
    "@esm.sh/validator/lib/isEmail": `${ESM}/validator@13.15.35/lib/isEmail`,
    "@esm.sh/@chenglou/pretext": `${ESM}/@chenglou/pretext@0.0.3`,
    "@esm.sh/@openreplay/tracker": `${ESM}/@openreplay/tracker@18.1.0`,

    // --- ferry: exact module URLs (production + preview variants) ---
    "@ferryrsvp/liknoss-client": {
      url: `${ASSETS}/liknoss-client/index.mjs`,
      environments: { preview: `${STAGING_ASSETS}/liknoss-client/index.mjs` },
    },
    // Ferry-RSVP conventions layer (booking-intent, buildTimetableRequest) — a
    // subpath of the same package, distinct from the raw API client above.
    "@ferryrsvp/liknoss-client/ferryrsvp": {
      url: `${ASSETS}/liknoss-client/ferryrsvp/index.mjs`,
      environments: { preview: `${STAGING_ASSETS}/liknoss-client/ferryrsvp/index.mjs` },
    },
    "@ferryrsvp/localization": {
      url: `${ASSETS}/web-localization/index.mjs`,
      environments: { preview: `${STAGING_ASSETS}/web-localization/index.mjs` },
    },
    "@ferryrsvp/localization/react": {
      url: `${ASSETS}/web-localization/react.mjs`,
      environments: { preview: `${STAGING_ASSETS}/web-localization/react.mjs` },
    },
    "@ferryrsvp/web-ui": {
      url: `${ASSETS}/web-ui/index.mjs`,
      environments: { preview: `${STAGING_ASSETS}/web-ui/index.mjs` },
    },
    "@ferryrsvp/web-ux": {
      url: `${ASSETS}/web-ux/index.mjs`,
      environments: { preview: `${STAGING_ASSETS}/web-ux/index.mjs` },
    },
    "@ferryrsvp/web-auth": {
      url: `${ASSETS}/web-auth/build/index.mjs`,
      environments: { preview: `${STAGING_ASSETS}/web-auth/build/index.mjs` },
    },
  },

  // Trailing-slash prefix mappings, per environment. createImportMap emits each
  // as "@ferryrsvp/<name>/" -> "<origin>/". The "@ferryrsvp/" catch-all comes
  // from assetsOrigin (production) / environments.preview.assetsOrigin (preview).
  environments: {
    production: {
      sliceOrigins: {
        "localization": `${ASSETS}/web-localization`,
        "web-ui": `${ASSETS}/web-ui`,
        "web-ux": `${ASSETS}/web-ux`,
        "web-page": `${ASSETS}/web-page`,
        "web-home": PAGES,
        "web-about": PAGES,
        "web-support": PAGES,
        "web-coming-soon": PAGES,
      },
    },
    preview: {
      assetsOrigin: STAGING_ASSETS,
      sliceOrigins: {
        "localization": `${STAGING_ASSETS}/web-localization`,
        "web-ui": `${STAGING_ASSETS}/web-ui`,
        "web-ux": `${STAGING_ASSETS}/web-ux`,
        "web-page": `${STAGING_ASSETS}/web-page`,
        "web-home": STAGING_PAGES,
        "web-about": STAGING_PAGES,
        "web-support": STAGING_PAGES,
        "web-coming-soon": STAGING_PAGES,
      },
    },
  },
});
