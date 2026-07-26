import { defineManifest as o } from "@rmc-toolkit/core";
import { createExternalMatcher as h, createImportMap as d } from "@rmc-toolkit/core";
const s = "19.2.8", e = "https://esm.sh", r = "https://assets.ferry.rsvp", i = "https://ferry.rsvp", a = `${r}/web-pages`, t = "https://assets.staging.ferry.rsvp", c = "https://staging.ferry.rsvp", n = `${t}/web-pages`, p = o({
  namespace: "@ferryrsvp",
  // production catch-all; preview overrides via environments.preview.assetsOrigin.
  assetsOrigin: r,
  // Faithful-first: esm.sh entries are environment-independent strings; the
  // ferry module URLs carry a `preview` variant. externalDeps/version-pinning
  // is still deferred to step 1.5.
  exactImports: {
    // --- esm.sh: React singleton + React-dependent (pinned) ---
    "@esm.sh/react": `${e}/react@${s}`,
    "@esm.sh/react-dom/client": `${e}/react-dom@${s}/client`,
    "@esm.sh/react-router": `${e}/react-router@7.8.2?deps=react@${s}`,
    "@esm.sh/react-router-dom": `${e}/react-router-dom@7.8.2?deps=react@${s},react-dom@${s}`,
    "@esm.sh/@tanstack/react-query": `${e}/@tanstack/react-query@5.96.2?deps=react@${s}`,
    "react/jsx-runtime": `${e}/react@${s}/jsx-runtime`,
    "react/jsx-dev-runtime": `${e}/react@${s}/jsx-dev-runtime`,
    // --- esm.sh: React-dependent (unpinned) ---
    "@esm.sh/zustand": `${e}/zustand?deps=react@${s}`,
    "@esm.sh/react-responsive": `${e}/react-responsive?deps=react@${s}`,
    "@esm.sh/react-error-boundary": `${e}/react-error-boundary?deps=react@${s},react-dom@${s}`,
    "@esm.sh/react-hook-form": `${e}/react-hook-form?deps=react@${s}`,
    "@esm.sh/react-hook-form-persist": `${e}/react-hook-form-persist?deps=react@${s}`,
    "@esm.sh/@hookform/resolvers/zod": `${e}/@hookform/resolvers/zod?deps=react@${s},react-hook-form@7.58.1`,
    "@esm.sh/@vaadin/react-components/DatePicker": `${e}/@vaadin/react-components/DatePicker.js?deps=react@${s}`,
    "@esm.sh/@radix-ui/themes": `${e}/@radix-ui/themes?deps=react@${s},react-dom@${s}/client`,
    "@esm.sh/@radix-ui/react-icons": `${e}/@radix-ui/react-icons?deps=react@${s}`,
    // --- esm.sh: standalone / pinned / @latest leaf libs ---
    "@esm.sh/luxon": `${e}/luxon`,
    "@esm.sh/@tanstack/query-persist-client-core": `${e}/@tanstack/query-persist-client-core@5.96.2`,
    "@esm.sh/@tanstack/query-sync-storage-persister": `${e}/@tanstack/query-sync-storage-persister@5.96.2`,
    "@esm.sh/prop-types": `${e}/prop-types`,
    "@esm.sh/zod": `${e}/zod`,
    "@esm.sh/date-fns/parse": `${e}/date-fns/parse`,
    "@esm.sh/date-fns/format": `${e}/date-fns/format`,
    "@esm.sh/immer": `${e}/immer`,
    "@esm.sh/zustand/middleware": `${e}/zustand/middleware`,
    "@esm.sh/zustand/react/shallow": `${e}/zustand/react/shallow`,
    "@esm.sh/@auth0/auth0-react": `${e}/@auth0/auth0-react@latest`,
    "@esm.sh/@capacitor/app": `${e}/@capacitor/app@latest`,
    "@esm.sh/@capacitor/browser": `${e}/@capacitor/browser@latest`,
    "@esm.sh/libphonenumber-js": `${e}/libphonenumber-js@latest`,
    "@esm.sh/xstate": `${e}/xstate@5.28.0`,
    "@esm.sh/validator/lib/isEmail": `${e}/validator@13.15.35/lib/isEmail`,
    "@esm.sh/@chenglou/pretext": `${e}/@chenglou/pretext@0.0.3`,
    "@esm.sh/@openreplay/tracker": `${e}/@openreplay/tracker@latest`,
    // --- ferry: exact module URLs (production + preview variants) ---
    "@ferryrsvp/liknoss-client": {
      url: `${r}/liknoss-client/index.mjs`,
      environments: { preview: `${t}/liknoss-client/index.mjs` }
    },
    "@ferryrsvp/web-runtime": {
      url: `${r}/web-runtime/index.mjs`,
      environments: { preview: `${t}/web-runtime/index.mjs` }
    },
    "@ferryrsvp/web-ui": {
      url: `${r}/web-ui/index.mjs`,
      environments: { preview: `${t}/web-ui/index.mjs` }
    },
    "@ferryrsvp/web-auth": {
      url: `${r}/web-auth/build/index.mjs`,
      environments: { preview: `${t}/web-auth/build/index.mjs` }
    },
    "@ferryrsvp/language": {
      url: `${i}/js/language.js`,
      environments: { preview: `${c}/js/language.js` }
    }
  },
  // Trailing-slash prefix mappings, per environment. createImportMap emits each
  // as "@ferryrsvp/<name>/" -> "<origin>/". The "@ferryrsvp/" catch-all comes
  // from assetsOrigin (production) / environments.preview.assetsOrigin (preview).
  environments: {
    production: {
      sliceOrigins: {
        "web-runtime": `${r}/web-runtime`,
        "web-ui": `${r}/web-ui`,
        "web-page": `${r}/web-page`,
        "web-home": a,
        "web-about": a,
        "web-support": a,
        "web-coming-soon": a
      }
    },
    preview: {
      assetsOrigin: t,
      sliceOrigins: {
        "web-runtime": `${t}/web-runtime`,
        "web-ui": `${t}/web-ui`,
        "web-page": `${t}/web-page`,
        "web-home": n,
        "web-about": n,
        "web-support": n,
        "web-coming-soon": n
      }
    }
  }
});
export {
  h as createExternalMatcher,
  d as createImportMap,
  p as manifest
};
