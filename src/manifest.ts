import { defineManifest } from "@rmc-toolkit/core";

// Single source of truth for the React version — bump here to bump everywhere.
const REACT = "19.2.8";
const ESM = "https://esm.sh";
const ASSETS = "https://assets.ferry.rsvp";
const SITE = "https://ferry.rsvp";
const PAGES = `${ASSETS}/web-pages`;

export const manifest = defineManifest({
  namespace: "@ferryrsvp",
  // Emits the "@ferryrsvp/" -> "https://assets.ferry.rsvp/" catch-all.
  assetsOrigin: ASSETS,

  // Faithful-first: every esm.sh + ferry entry is a verbatim exact import.
  // externalDeps/version-pinning is deferred to step 1.5.
  exactImports: {
    // --- esm.sh: React singleton + React-dependent (pinned) ---
    "@esm.sh/react": `${ESM}/react@${REACT}`,
    "@esm.sh/react-dom/client": `${ESM}/react-dom@${REACT}/client`,
    "@esm.sh/react-router": `${ESM}/react-router@7.8.2?deps=react@${REACT}`,
    "@esm.sh/react-router-dom": `${ESM}/react-router-dom@7.8.2?deps=react@${REACT},react-dom@${REACT}`,
    "@esm.sh/@tanstack/react-query": `${ESM}/@tanstack/react-query@5.96.2?deps=react@${REACT}`,
    "react/jsx-runtime": `${ESM}/react@${REACT}/jsx-runtime`,
    "react/jsx-dev-runtime": `${ESM}/react@${REACT}/jsx-dev-runtime`,

    // --- esm.sh: React-dependent (unpinned) ---
    "@esm.sh/zustand": `${ESM}/zustand?deps=react@${REACT}`,
    "@esm.sh/react-responsive": `${ESM}/react-responsive?deps=react@${REACT}`,
    "@esm.sh/react-error-boundary": `${ESM}/react-error-boundary?deps=react@${REACT},react-dom@${REACT}`,
    "@esm.sh/react-hook-form": `${ESM}/react-hook-form?deps=react@${REACT}`,
    "@esm.sh/react-hook-form-persist": `${ESM}/react-hook-form-persist?deps=react@${REACT}`,
    "@esm.sh/@hookform/resolvers/zod": `${ESM}/@hookform/resolvers/zod?deps=react@${REACT},react-hook-form@7.58.1`,
    "@esm.sh/@vaadin/react-components/DatePicker": `${ESM}/@vaadin/react-components/DatePicker.js?deps=react@${REACT}`,
    "@esm.sh/@radix-ui/themes": `${ESM}/@radix-ui/themes?deps=react@${REACT},react-dom@${REACT}/client`,
    "@esm.sh/@radix-ui/react-icons": `${ESM}/@radix-ui/react-icons?deps=react@${REACT}`,

    // --- esm.sh: standalone / pinned / @latest leaf libs ---
    "@esm.sh/luxon": `${ESM}/luxon`,
    "@esm.sh/@tanstack/query-persist-client-core": `${ESM}/@tanstack/query-persist-client-core@5.96.2`,
    "@esm.sh/@tanstack/query-sync-storage-persister": `${ESM}/@tanstack/query-sync-storage-persister@5.96.2`,
    "@esm.sh/prop-types": `${ESM}/prop-types`,
    "@esm.sh/zod": `${ESM}/zod`,
    "@esm.sh/date-fns/parse": `${ESM}/date-fns/parse`,
    "@esm.sh/date-fns/format": `${ESM}/date-fns/format`,
    "@esm.sh/immer": `${ESM}/immer`,
    "@esm.sh/zustand/middleware": `${ESM}/zustand/middleware`,
    "@esm.sh/zustand/react/shallow": `${ESM}/zustand/react/shallow`,
    "@esm.sh/@auth0/auth0-react": `${ESM}/@auth0/auth0-react@latest`,
    "@esm.sh/@capacitor/app": `${ESM}/@capacitor/app@latest`,
    "@esm.sh/@capacitor/browser": `${ESM}/@capacitor/browser@latest`,
    "@esm.sh/libphonenumber-js": `${ESM}/libphonenumber-js@latest`,
    "@esm.sh/xstate": `${ESM}/xstate@5.28.0`,
    "@esm.sh/validator/lib/isEmail": `${ESM}/validator@13.15.35/lib/isEmail`,
    "@esm.sh/@chenglou/pretext": `${ESM}/@chenglou/pretext@0.0.3`,
    "@esm.sh/@openreplay/tracker": `${ESM}/@openreplay/tracker@latest`,

    // --- ferry: exact module URLs ---
    "@ferryrsvp/liknoss-client": `${ASSETS}/liknoss-client/index.mjs`,
    "@ferryrsvp/web-runtime": `${ASSETS}/web-runtime/index.mjs`,
    "@ferryrsvp/web-ui": `${ASSETS}/web-ui/index.mjs`,
    "@ferryrsvp/web-auth": `${ASSETS}/web-auth/build/index.mjs`,
    "@ferryrsvp/language": `${SITE}/js/language.js`,
  },

  // Trailing-slash prefix mappings. createImportMap emits each as
  // "@ferryrsvp/<name>/" -> "<origin>/".
  environments: {
    production: {
      sliceOrigins: {
        "web-runtime": `${ASSETS}/web-runtime`,
        "web-ui": `${ASSETS}/web-ui`,
        "web-page": `${ASSETS}/web-page`,
        "web-home": PAGES,
        "web-about": PAGES,
        "web-support": PAGES,
        "web-coming-soon": PAGES,
      },
    },
  },
});
