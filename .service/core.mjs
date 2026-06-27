/**
 * Forum read core — framework-agnostic.
 *
 * A faithful port of the read surface in `src/lib/ergo/commentFetch.ts` and the
 * scoring logic in `src/lib/ergo/commentObject.ts`, with every Svelte dependency
 * removed (`svelte/store`, `$app/environment`, the persisted-store `get(...)`
 * calls). The on-chain transport is unchanged: it is delegated to the proven
 * `reputation-system/node` entry (`searchBoxes`, `getTimestampFromBlockId`,
 * `fetchTypeNfts`, `fetchAllProfiles`), so this core never re-implements the
 * Explorer query layer.
 *
 * One deliberate difference from the web app: comment `text` is returned as the
 * RAW on-chain UTF-8 (markdown source). The web app additionally pipes it
 * through `marked()` + `DOMPurify` to render sanitized HTML for the DOM; an
 * MCP/REST consumer wants the raw data, so HTML rendering (and its jsdom
 * dependency) is intentionally omitted here.
 */
import {
  searchBoxes,
  getTimestampFromBlockId,
  fetchTypeNfts,
  fetchAllProfiles,
  hexToUtf8
} from 'reputation-system/node';

import {
  EXPLORER_API,
  COMMENT_TYPE_NFT_ID,
  DISCUSSION_TYPE_NFT_ID,
  SPAM_FLAG_NFT_ID,
  SPAM_LIMIT
} from './envs.mjs';

/** Drain an async-generator of box batches into a flat array. */
async function collect(gen) {
  const all = [];
  for await (const batch of gen) all.push(...batch);
  return all;
}

/** Decode a comment box's R9 (Coll[Byte]) into its raw UTF-8 text. */
function decodeText(box) {
  const rendered = box?.additionalRegisters?.R9?.renderedValue;
  if (!rendered) return '';
  try {
    return hexToUtf8(rendered) ?? '';
  } catch {
    return '';
  }
}

/**
 * Count spam flags targeting a comment box id. Mirrors `fetchSpan`: spam flags
 * are locked opinion boxes against SPAM_FLAG_NFT_ID whose object_pointer (R5) is
 * the flagged comment's box id.
 */
export async function fetchSpamCount(commentId, explorerUri = EXPLORER_API) {
  let amount = 0;
  for await (const boxes of searchBoxes(explorerUri, undefined, SPAM_FLAG_NFT_ID, commentId, true)) {
    amount += boxes.length;
  }
  return amount;
}

/**
 * Fetch all comments for a topic/discussion. Top-level comments are opinions
 * against DISCUSSION_TYPE_NFT_ID pointing at `discussion`; replies are opinions
 * against COMMENT_TYPE_NFT_ID pointing at a parent comment box id. Replies are
 * fetched recursively (matching the web app) and sorted newest-first.
 *
 * @param {string} discussion  topic id (top level) or parent comment box id (replies)
 * @param {boolean} reply      true to fetch replies (COMMENT type) instead of threads
 */
export async function fetchComments(discussion, reply = false, explorerUri = EXPLORER_API, spamLimit = SPAM_LIMIT) {
  const typeNft = reply ? COMMENT_TYPE_NFT_ID : DISCUSSION_TYPE_NFT_ID;
  const boxes = await collect(searchBoxes(explorerUri, undefined, typeNft, discussion));
  const comments = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    const text = decodeText(box) || '[Empty content]';
    const spam = await fetchSpamCount(box.boxId, explorerUri);
    comments.push({
      id: box.boxId,
      discussion,
      authorProfileTokenId: box.assets[0].tokenId,
      text,
      timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
      isSpam: spam > spamLimit,
      spamFlags: spam,
      replies: await fetchComments(box.boxId, true, explorerUri, spamLimit),
      tx: box.transactionId,
      sentiment: box.additionalRegisters?.R8?.renderedValue === 'true'
    });
  }
  comments.sort((a, b) => b.timestamp - a.timestamp);
  return comments;
}

/**
 * Fetch every comment authored by a given reputation profile (token id). These
 * are COMMENT-type opinion boxes whose first asset is the profile token. Mirrors
 * `fetchCommentsByProfile` (replies are not expanded here, matching the source).
 */
export async function fetchCommentsByProfile(profileTokenId, explorerUri = EXPLORER_API, spamLimit = SPAM_LIMIT) {
  const boxes = await collect(searchBoxes(explorerUri, profileTokenId, COMMENT_TYPE_NFT_ID));
  const comments = [];
  for (const box of boxes) {
    if (!box.assets?.length) continue;
    if (box.assets[0].tokenId !== profileTokenId) continue;
    const text = decodeText(box);
    if (!text) continue;
    const discussionId = box.additionalRegisters?.R5?.renderedValue || 'Unknown';
    const spam = await fetchSpamCount(box.boxId, explorerUri);
    comments.push({
      id: box.boxId,
      discussion: discussionId,
      authorProfileTokenId: profileTokenId,
      text,
      timestamp: await getTimestampFromBlockId(explorerUri, box.blockId),
      isSpam: spam > spamLimit,
      spamFlags: spam,
      replies: [],
      tx: box.transactionId,
      sentiment: box.additionalRegisters?.R8?.renderedValue === 'true'
    });
  }
  comments.sort((a, b) => b.timestamp - a.timestamp);
  return comments;
}

// ── Scoring (verbatim port of src/lib/ergo/commentObject.ts) ────────────────

function getSentimentValue(comment) {
  if (comment.isSpam) return 0;
  return comment.sentiment ? 1 : -1;
}

/**
 * Score a comment from its reply tree. A leaf reply contributes its sentiment
 * value; a branch reply contributes its value ± its own recursive score
 * depending on the branch's sentiment. Spam replies contribute nothing.
 */
export function getScore(comment) {
  let total = 0;
  for (const reply of comment.replies || []) {
    const replyValue = getSentimentValue(reply);
    if (replyValue === 0) continue;
    if (!reply.replies || reply.replies.length === 0) {
      total += replyValue;
    } else {
      const replyScore = getScore(reply);
      if (replyValue === 1) total += replyValue + replyScore;
      else if (replyValue === -1) total += replyValue - replyScore;
    }
  }
  return total;
}

/**
 * Convenience aggregate: fetch a topic's threads and attach each thread's score
 * plus the topic total. Not in the original library, but the natural read-only
 * counterpart of the per-comment `getScore`.
 */
export async function scoreTopic(topicId, explorerUri = EXPLORER_API, spamLimit = SPAM_LIMIT) {
  const threads = await fetchComments(topicId, false, explorerUri, spamLimit);
  const scored = threads.map((c) => ({ id: c.id, sentiment: c.sentiment, isSpam: c.isSpam, score: getScore(c) }));
  const total = scored.reduce((sum, t) => sum + t.score, 0);
  return { topicId, threadCount: threads.length, total, threads: scored };
}

// ── Profiles / Type NFTs / raw box search ───────────────────────────────────

/** Every Type NFT definition registered under the digital-public-good contract. */
export async function getTypeNfts(explorerUri = EXPLORER_API) {
  const map = await fetchTypeNfts(explorerUri);
  return Array.from(map.values());
}

/**
 * Reputation profiles (global view). The web app's `fetchProfile` is scoped to
 * the connected wallet via the dApp connector's R7; in a keyless Node/HTTP
 * context there is no connector, so this exposes the global profile list with an
 * optional owner-address filter (passed through to `searchBoxes` R7).
 */
export async function listProfiles({ types = [], isSelfDefined = true, limit = 50, offset = 0 } = {}, explorerUri = EXPLORER_API) {
  const availableTypes = await fetchTypeNfts(explorerUri);
  return fetchAllProfiles(explorerUri, isSelfDefined, types, availableTypes, limit, offset);
}

/**
 * Raw reputation-proof box search — the full power of `reputation-system`'s
 * `searchBoxes` over any combination of filters. `ownerAddress` is a base58
 * P2PK address (matched on R7).
 */
export async function searchBoxesRaw(
  { tokenId, typeNftId, objectPointer, isLocked, polarization, content, ownerAddress, limit = 100, offset = 0 } = {},
  explorerUri = EXPLORER_API
) {
  return collect(
    searchBoxes(explorerUri, tokenId, typeNftId, objectPointer, isLocked, polarization, content, ownerAddress, limit, offset)
  );
}

/** Timestamp (ms) for a block id. */
export async function getBlockTimestamp(blockId, explorerUri = EXPLORER_API) {
  return { blockId, timestamp: await getTimestampFromBlockId(explorerUri, blockId) };
}
