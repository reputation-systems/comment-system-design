// Node-safe stub for SvelteKit's `$app/environment`, aliased in by mcp/build.mjs.
// `src/lib/ergo/envs.ts` imports `{ browser }` here to decide whether to touch
// localStorage; outside the browser we are never in a browser context, so the
// persisted stores just hold their default (mainnet) values.
export const browser = false;
export const dev = false;
export const building = false;
export const version = '0.0.0';
