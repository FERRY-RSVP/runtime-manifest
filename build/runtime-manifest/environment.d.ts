export type Environment = "production" | "preview";
/**
 * One rule for both pipelines: web-static builds on Cloudflare Pages
 * (CF_PAGES_BRANCH), slices build in GitHub Actions (GITHUB_REF_NAME).
 *
 * Fail-safe by construction: production requires an explicit "main". Any
 * unrecognised branch, and local development, resolve to preview. The
 * dangerous direction is a non-production build emitting production URLs —
 * that would point staging browsers at production Liknoss and Stripe — so it
 * is made unrepresentable rather than asserted against.
 */
export declare function resolveEnvironment(env: Record<string, string | undefined>): Environment;
/**
 * Vite `define` block. Values are JSON-encoded because Vite substitutes them
 * as raw source text, so an unquoted URL would be parsed as a bare identifier.
 */
export declare function apiDefines(environment: Environment): Record<string, string>;
