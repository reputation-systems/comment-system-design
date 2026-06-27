/**
 * Shared forum tool registry — the single source of truth for BOTH transports.
 *
 *   - mcp/server.mjs        imports TOOLS + HANDLERS to serve MCP over stdio.
 *   - .service/server-http.mjs imports the same to serve MCP over Streamable
 *     HTTP, and maps REST_ROUTES onto the same HANDLERS for a plain JSON API.
 *
 * Every read is delegated to core.mjs; every write goes through a Signer
 * (lib.mjs makeSigner, FORUM_SIGNER_MODE=seed|unsigned) and the
 * `reputation-system/node` `*_with_signer` builders. Writes return a submitted
 * txId (seed mode) or an unsigned EIP-12 tx (unsigned mode) via describeResult.
 */
import {
  create_opinion_with_signer,
  create_profile_with_signer
} from 'reputation-system/node';

import {
  EXPLORER_API,
  PROFILE_TYPE_NFT_ID,
  DISCUSSION_TYPE_NFT_ID,
  COMMENT_TYPE_NFT_ID,
  SPAM_FLAG_NFT_ID,
  PROFILE_TOTAL_SUPPLY,
  fetchComments,
  fetchCommentsByProfile,
  fetchSpamCount,
  scoreTopic,
  getTypeNfts,
  listProfiles,
  searchBoxesRaw,
  getBlockTimestamp
} from './core.mjs';

import { makeSigner, resolveMainBox, describeResult } from './lib.mjs';

// ── Tool definitions (MCP inputSchema) ──────────────────────────────────────

export const TOOLS = [
  // ----- Reads (no wallet needed) -----
  {
    name: 'get_contract_info',
    description: 'Return the forum Type NFT ids (profile/discussion/comment/spam-flag), the default profile supply, and the configured Ergo explorer.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'get_type_nfts',
    description: 'Fetch every Type NFT definition registered under the digital-public-good contract.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'fetch_comments',
    description: 'Fetch all comments for a topic. Top-level threads by default; set reply=true (with a parent comment box id as topicId) to fetch that comment\'s replies. Each comment includes its recursive reply tree, spam-flag count, sentiment, and timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: { type: 'string', description: 'Topic/discussion id (top level) or parent comment box id (when reply=true).' },
        reply: { type: 'boolean', description: 'Fetch replies (COMMENT type) instead of top-level threads. Default false.' }
      },
      required: ['topicId'],
      additionalProperties: false
    }
  },
  {
    name: 'fetch_comments_by_profile',
    description: 'Fetch every comment authored by a given reputation profile (token id).',
    inputSchema: {
      type: 'object',
      properties: { profileTokenId: { type: 'string', description: 'Reputation profile token id.' } },
      required: ['profileTokenId'],
      additionalProperties: false
    }
  },
  {
    name: 'fetch_spam_count',
    description: 'Count the spam flags targeting a given comment box id.',
    inputSchema: {
      type: 'object',
      properties: { commentId: { type: 'string', description: 'Comment box id.' } },
      required: ['commentId'],
      additionalProperties: false
    }
  },
  {
    name: 'score_topic',
    description: 'Fetch a topic\'s threads and compute each thread\'s reputation score plus the topic total, using the forum scoring rules.',
    inputSchema: {
      type: 'object',
      properties: { topicId: { type: 'string', description: 'Topic/discussion id.' } },
      required: ['topicId'],
      additionalProperties: false
    }
  },
  {
    name: 'list_profiles',
    description: 'List reputation profiles (global view). Optionally filter by Type NFT ids and self-defined flag.',
    inputSchema: {
      type: 'object',
      properties: {
        types: { type: 'array', items: { type: 'string' }, description: 'Optional Type NFT ids to filter by.' },
        isSelfDefined: { type: 'boolean', description: 'Only self-defined (SELF) profiles. Default true.' },
        limit: { type: 'number', description: 'Max profiles (default 50).' },
        offset: { type: 'number', description: 'Pagination offset (default 0).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'search_boxes',
    description: 'Raw reputation-proof box search over any combination of reputation token id, Type NFT id, object pointer, lock/polarization flags, owner address, or content.',
    inputSchema: {
      type: 'object',
      properties: {
        tokenId: { type: 'string', description: 'Reputation token id (asset filter).' },
        typeNftId: { type: 'string', description: 'Type NFT id (R4).' },
        objectPointer: { type: 'string', description: 'Object pointer (R5).' },
        isLocked: { type: 'boolean', description: 'Lock flag (R6).' },
        polarization: { type: 'boolean', description: 'Polarization flag (R8).' },
        content: { type: 'string', description: 'Content substring/JSON to match (R9).' },
        ownerAddress: { type: 'string', description: 'Owner P2PK address (base58, matched on R7).' },
        limit: { type: 'number', description: 'Max boxes (default 100).' },
        offset: { type: 'number', description: 'Pagination offset (default 0).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_block_timestamp',
    description: 'Return the unix timestamp (ms) for a given block id.',
    inputSchema: {
      type: 'object',
      properties: { blockId: { type: 'string', description: 'Hex block id.' } },
      required: ['blockId'],
      additionalProperties: false
    }
  },

  // ----- Writes (signer from env; seed submits, unsigned returns the tx) -----
  {
    name: 'create_profile',
    description: 'Mint a new reputation profile (a SELF box that mints the profile token). Required before posting. Signing per FORUM_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { description: 'Profile content (string or JSON object). Default {"name":"Anon"}.' },
        totalSupply: { type: 'number', description: `Total reputation tokens to mint (default ${PROFILE_TOTAL_SUPPLY}).` },
        typeNftId: { type: 'string', description: `Type NFT id for the profile (default the profile type ${PROFILE_TYPE_NFT_ID}).` },
        sacrificedErg: { type: 'string', description: 'Optional extra ERG (nanoErg, as string) to lock into the profile box.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'post_comment',
    description: 'Post a top-level comment on a topic. Creates a locked opinion against the DISCUSSION type pointing at topicId. Spends from the signer\'s profile box (auto-discovered, or pass mainBoxId). Signing per FORUM_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: { type: 'string', description: 'Topic/discussion id to comment on.' },
        text: { type: 'string', description: 'Comment text (markdown allowed).' },
        sentiment: { type: 'boolean', description: 'Positive (true) or negative (false). Default true.' },
        mainBoxId: { type: 'string', description: 'Profile box id to spend from. Auto-discovered if omitted.' },
        isLocked: { type: 'boolean', description: 'Lock the comment box (default true).' },
        tokenAmount: { type: 'number', description: 'Reputation tokens to allocate (default 1).' }
      },
      required: ['topicId', 'text'],
      additionalProperties: false
    }
  },
  {
    name: 'reply_to_comment',
    description: 'Reply to a comment. Creates a locked opinion against the COMMENT type pointing at the parent comment box id. Signing per FORUM_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: {
        parentCommentId: { type: 'string', description: 'Box id of the comment being replied to.' },
        text: { type: 'string', description: 'Reply text (markdown allowed).' },
        sentiment: { type: 'boolean', description: 'Positive (true) or negative (false). Default true.' },
        mainBoxId: { type: 'string', description: 'Profile box id to spend from. Auto-discovered if omitted.' },
        isLocked: { type: 'boolean', description: 'Lock the reply box (default true).' },
        tokenAmount: { type: 'number', description: 'Reputation tokens to allocate (default 1).' }
      },
      required: ['parentCommentId', 'text'],
      additionalProperties: false
    }
  },
  {
    name: 'flag_spam',
    description: 'Flag a comment as spam. Creates a locked opinion against the SPAM_FLAG type pointing at the target comment box id. Signing per FORUM_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: {
        targetCommentId: { type: 'string', description: 'Box id of the comment to flag as spam.' },
        mainBoxId: { type: 'string', description: 'Profile box id to spend from. Auto-discovered if omitted.' }
      },
      required: ['targetCommentId'],
      additionalProperties: false
    }
  },
  {
    name: 'create_opinion',
    description: 'Low-level: create a reputation opinion against any Type NFT, spending from a profile box. The generic primitive behind post_comment/reply_to_comment/flag_spam. Signing per FORUM_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: {
        typeNftId: { type: 'string', description: 'Type NFT id (category) for the opinion.' },
        objectPointer: { type: 'string', description: 'The object the opinion points at (box id, topic id, or URI).' },
        polarization: { type: 'boolean', description: 'Positive (true) or negative (false).' },
        content: { description: 'Opinion content (string or JSON object).' },
        mainBoxId: { type: 'string', description: 'Profile box id to spend from. Auto-discovered if omitted.' },
        isLocked: { type: 'boolean', description: 'Lock the opinion box (default true).' },
        tokenAmount: { type: 'number', description: 'Reputation tokens to allocate (default 1).' }
      },
      required: ['typeNftId', 'polarization'],
      additionalProperties: false
    }
  }
];

// ── Handlers (transport-agnostic) ───────────────────────────────────────────

async function opinion({ typeNftId, objectPointer = '', polarization, content = null, mainBoxId, isLocked = true, tokenAmount = 1 }) {
  const signer = makeSigner();
  const main_box = await resolveMainBox(signer, mainBoxId, EXPLORER_API);
  const result = await create_opinion_with_signer(
    signer, EXPLORER_API, tokenAmount, typeNftId, objectPointer, polarization, content, isLocked, main_box
  );
  return describeResult(result);
}

export const HANDLERS = {
  // Reads
  get_contract_info: async () => ({
    explorerUri: EXPLORER_API,
    profileTypeNftId: PROFILE_TYPE_NFT_ID,
    discussionTypeNftId: DISCUSSION_TYPE_NFT_ID,
    commentTypeNftId: COMMENT_TYPE_NFT_ID,
    spamFlagTypeNftId: SPAM_FLAG_NFT_ID,
    profileTotalSupply: PROFILE_TOTAL_SUPPLY
  }),
  get_type_nfts: async () => getTypeNfts(EXPLORER_API),
  fetch_comments: async ({ topicId, reply = false }) => fetchComments(topicId, reply, EXPLORER_API),
  fetch_comments_by_profile: async ({ profileTokenId }) => fetchCommentsByProfile(profileTokenId, EXPLORER_API),
  fetch_spam_count: async ({ commentId }) => ({ commentId, spamFlags: await fetchSpamCount(commentId, EXPLORER_API) }),
  score_topic: async ({ topicId }) => scoreTopic(topicId, EXPLORER_API),
  list_profiles: async (args = {}) => listProfiles(args, EXPLORER_API),
  search_boxes: async (args = {}) => searchBoxesRaw(args, EXPLORER_API),
  get_block_timestamp: async ({ blockId }) => getBlockTimestamp(blockId, EXPLORER_API),

  // Writes
  create_profile: async ({ content = null, totalSupply, typeNftId, sacrificedErg } = {}) => {
    const signer = makeSigner();
    const result = await create_profile_with_signer(
      signer,
      EXPLORER_API,
      totalSupply ?? PROFILE_TOTAL_SUPPLY,
      typeNftId ?? PROFILE_TYPE_NFT_ID,
      content ?? { name: 'Anon' },
      sacrificedErg ? BigInt(sacrificedErg) : 0n
    );
    return describeResult(result);
  },
  post_comment: async ({ topicId, text, sentiment = true, mainBoxId, isLocked = true, tokenAmount = 1 }) =>
    opinion({ typeNftId: DISCUSSION_TYPE_NFT_ID, objectPointer: topicId, polarization: sentiment, content: text, mainBoxId, isLocked, tokenAmount }),
  reply_to_comment: async ({ parentCommentId, text, sentiment = true, mainBoxId, isLocked = true, tokenAmount = 1 }) =>
    opinion({ typeNftId: COMMENT_TYPE_NFT_ID, objectPointer: parentCommentId, polarization: sentiment, content: text, mainBoxId, isLocked, tokenAmount }),
  flag_spam: async ({ targetCommentId, mainBoxId }) =>
    opinion({ typeNftId: SPAM_FLAG_NFT_ID, objectPointer: targetCommentId, polarization: true, content: null, mainBoxId, isLocked: true, tokenAmount: 1 }),
  create_opinion: async (args) => opinion(args)
};

// ── REST route table (used by the HTTP service) ─────────────────────────────
// Maps clean JSON routes onto the same handlers. `arg` extracts handler args
// from path params (p), query (q), and JSON body (b).

export const REST_ROUTES = [
  { method: 'GET', path: '/api/contract-info', handler: 'get_contract_info', arg: () => ({}) },
  { method: 'GET', path: '/api/type-nfts', handler: 'get_type_nfts', arg: () => ({}) },
  { method: 'GET', path: '/api/comments', handler: 'fetch_comments', arg: ({ q }) => ({ topicId: q.topicId, reply: q.reply === 'true' }) },
  { method: 'GET', path: '/api/profiles', handler: 'list_profiles', arg: ({ q }) => ({
      types: q.types ? q.types.split(',').filter(Boolean) : [],
      isSelfDefined: q.isSelfDefined === undefined ? true : q.isSelfDefined === 'true',
      limit: q.limit ? Number(q.limit) : 50,
      offset: q.offset ? Number(q.offset) : 0
    }) },
  { method: 'GET', path: '/api/profiles/:profileTokenId/comments', handler: 'fetch_comments_by_profile', arg: ({ p }) => ({ profileTokenId: p.profileTokenId }) },
  { method: 'GET', path: '/api/comments/:commentId/spam', handler: 'fetch_spam_count', arg: ({ p }) => ({ commentId: p.commentId }) },
  { method: 'GET', path: '/api/topics/:topicId/score', handler: 'score_topic', arg: ({ p }) => ({ topicId: p.topicId }) },
  { method: 'GET', path: '/api/boxes', handler: 'search_boxes', arg: ({ q }) => ({
      tokenId: q.tokenId, typeNftId: q.typeNftId, objectPointer: q.objectPointer,
      isLocked: q.isLocked === undefined ? undefined : q.isLocked === 'true',
      polarization: q.polarization === undefined ? undefined : q.polarization === 'true',
      content: q.content, ownerAddress: q.ownerAddress,
      limit: q.limit ? Number(q.limit) : 100, offset: q.offset ? Number(q.offset) : 0
    }) },
  { method: 'GET', path: '/api/blocks/:blockId/timestamp', handler: 'get_block_timestamp', arg: ({ p }) => ({ blockId: p.blockId }) },

  { method: 'POST', path: '/api/profile', handler: 'create_profile', arg: ({ b }) => b },
  { method: 'POST', path: '/api/comments', handler: 'post_comment', arg: ({ b }) => b },
  { method: 'POST', path: '/api/replies', handler: 'reply_to_comment', arg: ({ b }) => b },
  { method: 'POST', path: '/api/spam-flags', handler: 'flag_spam', arg: ({ b }) => b },
  { method: 'POST', path: '/api/opinions', handler: 'create_opinion', arg: ({ b }) => b }
];
