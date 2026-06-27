/**
 * Forum constants + environment, framework-agnostic.
 *
 * This is the plain-ESM, Svelte-free twin of `src/lib/ergo/envs.ts`. The web app
 * keeps these values inside Svelte persisted stores (localStorage-backed); here
 * they are plain constants and process.env reads so the same Type NFT ids and
 * explorer endpoint drive the MCP server, the HTTP service, and any Node script
 * without ever importing `svelte/store` or `$app/environment`.
 *
 * Every forum write is a reputation opinion against one of these Type NFTs:
 *   - DISCUSSION_TYPE_NFT_ID  top-level comment on a topic (object_pointer = topicId)
 *   - COMMENT_TYPE_NFT_ID     reply to a comment        (object_pointer = parent box id)
 *   - SPAM_FLAG_NFT_ID        spam flag on a comment    (object_pointer = target box id)
 *   - PROFILE_TYPE_NFT_ID     a reputation profile (SELF box) that mints the token
 */
export const NETWORK_ID = 'mainnet';

export const EXPLORER_API =
  process.env.FORUM_EXPLORER_API ||
  (NETWORK_ID === 'mainnet'
    ? 'https://api.ergoplatform.com'
    : 'https://api-testnet.ergoplatform.com');

// Type NFT ids — must stay in lock-step with src/lib/ergo/envs.ts.
export const PROFILE_TYPE_NFT_ID = '1820fd428a0b92d61ce3f86cd98240fdeeee8a392900f0b19a2e017d66f79926';
export const DISCUSSION_TYPE_NFT_ID = '273f60541e8869216ee6aed5552e522d9bea29a69d88e567d089dc834da227cf';
export const COMMENT_TYPE_NFT_ID = '6c1ec833dc4aff98458b60e278fc9a0161274671d6a0c36a7429216ca99c3267';
export const SPAM_FLAG_NFT_ID = '89505ed416ad43f2dc4b3c8d0eb949e6ba9993436ceb154a58645f1484e1437a';

export const PROFILE_TOTAL_SUPPLY = 99999999;

// A comment is treated as spam once it accumulates strictly MORE than this many
// spam flags. Mirrors the web app's default "0" SPAM_LIMIT store.
export const SPAM_LIMIT = Number(process.env.FORUM_SPAM_LIMIT ?? 0);
