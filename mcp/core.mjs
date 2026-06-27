/**
 * Forum Application registry — THIN Node adapter over the library's own logic.
 *
 * There is NO re-implementation here (the old hand-ported core.mjs/envs.mjs are
 * gone). The forum read layer (recursive `fetchComments`, `fetchCommentsByProfile`,
 * the spam-flag count `fetchSpan`, the reply-tree `getScore`, the Type NFT ids)
 * lives ONCE in `src/lib/ergo/*` and is compiled to a single Node-loadable ESM
 * module — `_generated/lib.bundle.mjs` — by `mcp/build.mjs` (`npm run build:mcp`).
 * This file only:
 *
 *   1. re-exports the constants + forum reads verbatim from that bundle,
 *   2. points the bundle's `explorer_uri` / `SPAM_LIMIT` persisted stores at the
 *      configured endpoint (the src reads call `get(explorer_uri)` internally,
 *      so there is no explorerUri argument to thread through), and
 *   3. exposes a few GENERIC reputation-library passthroughs (type-NFT list,
 *      profile list, raw box search, block timestamp) directly over
 *      `reputation-system/node` — the SAME package the bundle + writes use. These
 *      are not forum logic, just a thin surface over the shared dependency.
 *
 * Reuse instead of duplication is the whole point: change a read in `src/` and a
 * rebuild flows it through here, the stdio server and the HTTP `.service` alike.
 */
import * as lib from './_generated/lib.bundle.mjs';
import {
  searchBoxes,
  getTimestampFromBlockId,
  fetchTypeNfts,
  fetchAllProfiles
} from 'reputation-system/node';

export const EXPLORER_API =
  (typeof process !== 'undefined' && process.env && process.env.FORUM_EXPLORER_API) ||
  'https://api.ergoplatform.com';

// Point the library's persisted stores (bundled from src/lib/ergo/envs.ts) at the
// configured environment. The bundled forum reads read these via `get(...)`, so
// setting them here is how the explorer endpoint / spam threshold are injected.
lib.explorer_uri.set(EXPLORER_API);
if (process.env.FORUM_SPAM_LIMIT !== undefined) {
  lib.SPAM_LIMIT.set(String(process.env.FORUM_SPAM_LIMIT));
}

// ── Type NFT ids + supply (verbatim, src/lib/ergo/envs.ts via the bundle) ────
export const PROFILE_TYPE_NFT_ID = lib.PROFILE_TYPE_NFT_ID;
export const DISCUSSION_TYPE_NFT_ID = lib.DISCUSSION_TYPE_NFT_ID;
export const COMMENT_TYPE_NFT_ID = lib.COMMENT_TYPE_NFT_ID;
export const SPAM_FLAG_NFT_ID = lib.SPAM_FLAG_NFT_ID;
export const PROFILE_TOTAL_SUPPLY = lib.PROFILE_TOTAL_SUPPLY;

// ── Pure scoring helper (verbatim, src/lib/ergo/commentObject.ts) ────────────
export const getScore = lib.getScore;

// ── Forum reads (verbatim src logic via the bundle) ──────────────────────────
// The `explorerUri` params are accepted for signature compatibility with the
// previous core, but the bundled reads use the `explorer_uri` store set above.
export const fetchComments = (topicId, reply = false) => lib.fetchComments(topicId, reply);
export const fetchCommentsByProfile = (profileTokenId) => lib.fetchCommentsByProfile(profileTokenId);
export const fetchSpamCount = (commentId) => lib.fetchSpan(commentId);

/**
 * Convenience aggregate: fetch a topic's threads and attach each thread's score
 * plus the topic total. The read-only counterpart of the per-comment `getScore`,
 * composed entirely from bundled src functions.
 */
export async function scoreTopic(topicId) {
  const threads = await lib.fetchComments(topicId, false);
  const scored = threads.map((c) => ({ id: c.id, sentiment: c.sentiment, isSpam: c.isSpam, score: lib.getScore(c) }));
  const total = scored.reduce((sum, t) => sum + t.score, 0);
  return { topicId, threadCount: threads.length, total, threads: scored };
}

// ── Generic reputation-library passthroughs (not forum logic) ────────────────
// Thin adapters over `reputation-system/node` — exposing the underlying library,
// not duplicating its logic. explorerUri defaults to the configured endpoint.

/** Every Type NFT definition registered under the digital-public-good contract. */
export async function getTypeNfts(explorerUri = EXPLORER_API) {
  const map = await fetchTypeNfts(explorerUri);
  return Array.from(map.values());
}

/**
 * Reputation profiles (global, keyless view). The web app's `fetchProfile` is
 * scoped to the connected wallet via the dApp connector; in a Node/HTTP context
 * there is no connector, so this exposes the global profile list (optionally
 * filtered by Type NFT ids) via the library's `fetchAllProfiles`.
 */
export async function listProfiles({ types = [], isSelfDefined = true, limit = 50, offset = 0 } = {}, explorerUri = EXPLORER_API) {
  const availableTypes = await fetchTypeNfts(explorerUri);
  return fetchAllProfiles(explorerUri, isSelfDefined, types, availableTypes, limit, offset);
}

/**
 * Raw reputation-proof box search — the full power of `searchBoxes` over any
 * combination of filters. `ownerAddress` is a base58 P2PK address (matched on R7).
 */
export async function searchBoxesRaw(
  { tokenId, typeNftId, objectPointer, isLocked, polarization, content, ownerAddress, limit = 100, offset = 0 } = {},
  explorerUri = EXPLORER_API
) {
  const all = [];
  for await (const batch of searchBoxes(
    explorerUri, tokenId, typeNftId, objectPointer, isLocked, polarization, content, ownerAddress, limit, offset
  )) {
    all.push(...batch);
  }
  return all;
}

/** Timestamp (ms) for a block id. */
export async function getBlockTimestamp(blockId, explorerUri = EXPLORER_API) {
  return { blockId, timestamp: await getTimestampFromBlockId(explorerUri, blockId) };
}
