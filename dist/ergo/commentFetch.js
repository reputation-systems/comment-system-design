import { get } from 'svelte/store';
import { hexToUtf8 } from './utils';
import { COMMENT_TYPE_NFT_ID, DISCUSSION_TYPE_NFT_ID, explorer_uri, PROFILE_TYPE_NFT_ID, SPAM_FLAG_NFT_ID, SPAM_LIMIT } from './envs';
import { reputation_proof } from './store';
import { marked } from 'marked';
import DOMPurify from "dompurify";
import { getTimestampFromBlockId, searchBoxes, fetchAllProfiles } from "ergo-reputation-system";
// Constants
const LIMIT_PER_PAGE = 100;
/**
 * Searches the blockchain for all spam alerts targeting a comment.
 */
export async function fetchSpan(comment_id) {
    let amount = 0;
    try {
        const boxesGenerator = searchBoxes(get(explorer_uri), undefined, SPAM_FLAG_NFT_ID, comment_id, true // is_locked
        );
        for await (const boxes of boxesGenerator) {
            for (const box of boxes) {
                // In the reputation system, R9 usually contains the content.
                // For spam flags, we just count the boxes.
                amount += 1;
            }
        }
        return amount;
    }
    catch (error) {
        console.error('Error while searching spam flags:', error);
        return 0;
    }
}
/**
 * Searches the blockchain for all top-level comments (threads)
 * for a given discussion (project).
 */
export async function fetchComments(discussion, reply = false) {
    console.log("fetchComments", { discussion }, reply);
    let comments = [];
    try {
        const boxesGenerator = searchBoxes(get(explorer_uri), undefined, reply ? COMMENT_TYPE_NFT_ID : DISCUSSION_TYPE_NFT_ID, discussion);
        for await (const boxes of boxesGenerator) {
            console.log("boxes", boxes);
            for (const box of boxes) {
                if (!box.assets?.length)
                    continue;
                const authorProfileTokenId = box.assets[0].tokenId;
                let textContent = "[Unreadable content]";
                try {
                    const rawValue = box.additionalRegisters.R9?.renderedValue;
                    if (rawValue) {
                        textContent = hexToUtf8(rawValue) ?? "[Empty content]";
                    }
                }
                catch (e) {
                    console.warn(`Error decoding R9 for box ${box.boxId}`, e);
                }
                const number_of_spans = await fetchSpan(box.boxId);
                const isSpam = number_of_spans > Number(get(SPAM_LIMIT));
                textContent = await marked(textContent);
                textContent = DOMPurify.sanitize(textContent);
                const comment = {
                    id: box.boxId,
                    discussion: discussion,
                    authorProfileTokenId: authorProfileTokenId,
                    text: textContent,
                    timestamp: await getTimestampFromBlockId(get(explorer_uri), box.blockId),
                    isSpam: isSpam,
                    replies: await fetchComments(box.boxId, true),
                    tx: box.transactionId,
                    posting: false,
                    sentiment: box.additionalRegisters.R8?.renderedValue === 'true'
                };
                comments.push(comment);
            }
        }
        comments.sort((a, b) => b.timestamp - a.timestamp);
        return comments;
    }
    catch (error) {
        console.error('Error while fetching comments:', error);
        return [];
    }
}
/**
 * Fetches the full ReputationProof object for the connected user.
 * @param ergo The connected wallet object (e.g., dApp Connector)
 */
export async function fetchProfile(ergo) {
    try {
        const changeAddress = await ergo.get_change_address();
        if (!changeAddress) {
            reputation_proof.set(null);
            return null;
        }
        // fetchAllProfiles(explorerUri, is_self_defined, types, availableTypes)
        // We pass an empty map for availableTypes for now as we don't have them yet.
        const profiles = await fetchAllProfiles(get(explorer_uri), true, // is_self_defined
        [PROFILE_TYPE_NFT_ID], new Map());
        if (profiles.length === 0) {
            console.log('No profile boxes found for this user.');
            reputation_proof.set(null);
            return null;
        }
        const proof = profiles[0];
        console.log(`Profile found: ${proof.token_id}`, proof);
        reputation_proof.set(proof);
        return proof;
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        reputation_proof.set(null);
        return null;
    }
}
