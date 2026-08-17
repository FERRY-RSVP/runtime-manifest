// Build-time values. Unlike the import map, these bind when each app builds,
// so a change reaches only apps rebuilt since — which is why they are MINOR
// under VERSIONING.md while runtime singletons are MAJOR.

const API = "https://api.ferry.rsvp";
const STAGING_API = "https://api.staging.ferry.rsvp";
const ASK = "https://ask.ferry.rsvp";
const STAGING_ASK = "https://ask.staging.ferry.rsvp";

export interface ApiBaseUrls {
  /** Browser booking tier. Note paths nest: `${booking}/booking/identifier`. */
  booking: string;
  payments: string;
  discovery: string;
  /** Documented /v1 tier — distinct from the /app/* browser tier. */
  catalog: string;
  /** The one API not on api.ferry.rsvp: it has its own host. */
  ask: string;
}

export const apiBaseUrls: Record<"production" | "preview", ApiBaseUrls> = {
  production: {
    booking: `${API}/app/booking`,
    payments: `${API}/app/payments`,
    discovery: `${API}/app/discovery`,
    catalog: `${API}/v1`,
    ask: ASK,
  },
  preview: {
    booking: `${STAGING_API}/app/booking`,
    payments: `${STAGING_API}/app/payments`,
    discovery: `${STAGING_API}/app/discovery`,
    catalog: `${STAGING_API}/v1`,
    ask: STAGING_ASK,
  },
};
