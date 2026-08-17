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
export declare const apiBaseUrls: Record<"production" | "preview", ApiBaseUrls>;
