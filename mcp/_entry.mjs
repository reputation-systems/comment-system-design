/**
 * Bundle ENTRY for the Forum Application MCP read surface.
 *
 * This file re-exports the forum library's OWN TypeScript logic straight from
 * `src/lib/ergo/*`. `mcp/build.mjs` runs esbuild over this entry to emit a single
 * Node-loadable ESM module (`mcp/_generated/lib.bundle.mjs`) with the browser-only
 * bits aliased away (`$app/environment`, `dompurify`, `marked`) and
 * `reputation-system` redirected to its Node entry (`reputation-system/node`,
 * kept external).
 *
 * The point: the forum read business logic (recursive comment fetch, the
 * spam-flag count, the reply-tree scoring, the Type NFT ids) lives ONCE, in
 * `src/`. Nothing here is a re-implementation — every symbol below is the real
 * `src` function/constant, the exact code the web app runs.
 */

// Reads (Explorer box queries + R9 decode) — src/lib/ergo/commentFetch.ts.
// Note: these read `explorer_uri` / `SPAM_LIMIT` from the persisted stores below
// (core.mjs points them at the configured endpoint), so they take no explorer arg.
export {
  fetchComments,
  fetchCommentsByProfile,
  fetchSpan
} from '../src/lib/ergo/commentFetch.ts';

// Pure reply-tree scoring + the Comment shape — src/lib/ergo/commentObject.ts.
export { getScore } from '../src/lib/ergo/commentObject.ts';

// Type NFT ids, default supply, and the explorer/spam persisted stores —
// src/lib/ergo/envs.ts.
export {
  PROFILE_TYPE_NFT_ID,
  DISCUSSION_TYPE_NFT_ID,
  COMMENT_TYPE_NFT_ID,
  SPAM_FLAG_NFT_ID,
  PROFILE_TOTAL_SUPPLY,
  explorer_uri,
  SPAM_LIMIT
} from '../src/lib/ergo/envs.ts';

// Byte/hex helper — src/lib/ergo/utils.ts.
export { hexToUtf8 } from '../src/lib/ergo/utils.ts';
