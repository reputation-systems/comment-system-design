/**
 * Forum write helpers: signer selection from environment, profile-box shaping,
 * and result normalization. Modeled directly on
 * `reputation-system/mcp/lib.mjs` — forum writes ARE reputation opinions, so the
 * signer abstraction is identical; only the env var prefix differs (FORUM_*).
 *
 * The browser app signs forum writes through the Nautilus `ergo` connector
 * (`src/lib/ergo/submit.ts`). Here there is no connector: writes are built (and,
 * in seed mode, submitted) via `reputation-system/node`'s `*_with_signer`
 * functions backed by a Signer selected below.
 */
import { SeedSigner, UnsignedSigner, searchBoxes } from 'reputation-system/node';
import { EXPLORER_API, PROFILE_TYPE_NFT_ID } from './envs.mjs';

/**
 * Build the configured Signer from environment.
 *
 *   FORUM_SIGNER_MODE=seed     – sign + submit autonomously with a mnemonic.
 *     FORUM_MNEMONIC   (required)  BIP-39 mnemonic of the publishing wallet.
 *     FORUM_MNEMONIC_PASSWORD     optional BIP-39 passphrase.
 *     FORUM_NODE_URI              Ergo node for submission (default :9053).
 *     FORUM_ADDRESS_INDEX         change-path index (default 0).
 *
 *   FORUM_SIGNER_MODE=unsigned – build only; return the unsigned EIP-12 tx for an
 *                                external wallet to sign. No key in the agent. (default)
 *     FORUM_ADDRESS    (required)  the P2PK address whose UTXOs fund the tx.
 */
export function makeSigner() {
  const mode = (process.env.FORUM_SIGNER_MODE || 'unsigned').toLowerCase();
  if (mode === 'seed') {
    const mnemonic = process.env.FORUM_MNEMONIC;
    if (!mnemonic) throw new Error('FORUM_SIGNER_MODE=seed requires FORUM_MNEMONIC.');
    return new SeedSigner({
      mnemonic,
      password: process.env.FORUM_MNEMONIC_PASSWORD,
      addressIndex: process.env.FORUM_ADDRESS_INDEX ? Number(process.env.FORUM_ADDRESS_INDEX) : 0,
      explorerUri: EXPLORER_API,
      nodeUri: process.env.FORUM_NODE_URI
    });
  }
  if (mode === 'unsigned') {
    const address = process.env.FORUM_ADDRESS;
    if (!address) throw new Error('FORUM_SIGNER_MODE=unsigned requires FORUM_ADDRESS.');
    return new UnsignedSigner({ address, explorerUri: EXPLORER_API });
  }
  throw new Error(`Unknown FORUM_SIGNER_MODE: ${mode} (expected 'seed' or 'unsigned').`);
}

/**
 * Fetch a reputation-proof (profile) box by id and shape it into the RPBox
 * `main_box` that `create_opinion_with_signer` consumes. R4 (rendered) is its
 * Type NFT id, required by the contract as a data input.
 */
export async function fetchMainBox(mainBoxId, explorerUri = EXPLORER_API) {
  if (!/^[0-9a-fA-F]{64}$/.test(mainBoxId || '')) {
    throw new Error(`mainBoxId must be a 64-char hex box id (got: ${mainBoxId}).`);
  }
  const res = await fetch(`${explorerUri}/api/v1/boxes/${mainBoxId}`);
  if (!res.ok) throw new Error(`Failed to fetch main box ${mainBoxId}: HTTP ${res.status}`);
  const box = await res.json();

  const reputationTokenId = box?.assets?.[0]?.tokenId;
  if (!reputationTokenId) {
    throw new Error(`Box ${mainBoxId} holds no reputation token; not a valid profile box.`);
  }

  return {
    box: {
      boxId: box.boxId,
      value: box.value.toString(),
      assets: (box.assets ?? []).map((a) => ({ tokenId: a.tokenId, amount: a.amount.toString() })),
      ergoTree: box.ergoTree,
      creationHeight: box.creationHeight,
      additionalRegisters: Object.entries(box.additionalRegisters ?? {}).reduce((acc, [k, v]) => {
        acc[k] = v.serializedValue;
        return acc;
      }, {}),
      index: box.index ?? 0,
      transactionId: box.transactionId
    },
    box_id: box.boxId,
    type: { tokenId: box?.additionalRegisters?.R4?.renderedValue || '' },
    token_id: reputationTokenId,
    token_amount: Number(box.assets[0].amount),
    object_pointer: box?.additionalRegisters?.R5?.renderedValue || '',
    is_locked: box?.additionalRegisters?.R6?.renderedValue === 'true',
    polarization: box?.additionalRegisters?.R8?.renderedValue === 'true',
    content: {}
  };
}

/**
 * Resolve the profile box to spend from for a forum write. If `mainBoxId` is
 * given, shape it directly. Otherwise auto-discover the signer's own profile:
 * search unspent PROFILE-type boxes owned by the signer's change address and
 * pick the first unlocked one with tokens. This mirrors the web app's
 * `getOrCreateProfileBox`, minus the create branch (callers create a profile
 * explicitly via `create_profile`).
 */
export async function resolveMainBox(signer, mainBoxId, explorerUri = EXPLORER_API) {
  if (mainBoxId) return fetchMainBox(mainBoxId, explorerUri);

  const address = await signer.getChangeAddress();
  if (!address) {
    throw new Error('No mainBoxId given and signer has no address to auto-discover a profile box.');
  }
  for await (const boxes of searchBoxes(
    explorerUri, undefined, PROFILE_TYPE_NFT_ID, undefined, false, undefined, undefined, address, 100
  )) {
    for (const box of boxes) {
      if (!box.assets?.length) continue;
      return fetchMainBox(box.boxId, explorerUri);
    }
  }
  throw new Error(
    `No unlocked PROFILE box found for ${address}. Create one first with create_profile, or pass mainBoxId explicitly.`
  );
}

/** Normalize a SignerResult into an MCP/REST-friendly payload. */
export function describeResult(result) {
  if (result.kind === 'submitted') {
    return { submitted: true, txId: result.txId };
  }
  return {
    submitted: false,
    unsignedTransaction: result.transaction,
    note: 'Transaction built but not signed. Sign + submit with an external wallet (Nautilus/ErgoPay).'
  };
}
