import { ErgoAddress, Network, SByte, SColl } from '@fleet-sdk/core';
import { get } from 'svelte/store';
import { type Comment } from './commentObject';
import { hexToBytes, hexToUtf8, serializedToRendered } from './utils';
import { COMMENT_TYPE_NFT_ID, DISCUSSION_TYPE_NFT_ID, explorer_uri, SPAM_FLAG_NFT_ID, SPAM_LIMIT } from './envs';
import { type TypeNFT, type ReputationProof, type RPBox } from './object';
import { reputation_proof } from './store';
import { marked } from 'marked';
import DOMPurify from "dompurify";
import {
  getTimestampFromBlockId,
  searchBoxes,
  fetchAllUserProfiles
} from "reputation-system";

// Minimal definition of the Explorer API response for a box
interface ApiBox {
  boxId: string;
  value: string | number;
  ergoTree: string;
  assets: { tokenId: string; amount: string | number; }[];
  creationHeight: number;
  blockId: string;
  additionalRegisters: {
    [key: string]: {
      serializedValue: string;
      renderedValue?: string;
    };
  };
  index: number;
  transactionId: string;
}

// Constants
const LIMIT_PER_PAGE = 100;

// Interface for search body
interface SearchBody {
  registers: { [key: string]: string };
}


/**
 * Searches the blockchain for all spam alerts targeting a comment.
 */
export async function fetchSpan(comment_id: string): Promise<number> {
  let amount: number = 0;

  try {
    const boxesGenerator = searchBoxes(
      get(explorer_uri),
      undefined,
      SPAM_FLAG_NFT_ID,
      comment_id,
      true // is_locked
    );

    for await (const boxes of boxesGenerator) {
      for (const box of boxes) {
        // In the reputation system, R9 usually contains the content.
        // For spam flags, we just count the boxes.
        amount += 1;
      }
    }

    return amount;

  } catch (error) {
    console.error('Error while searching spam flags:', error);
    return 0;
  }
}

/**
 * Searches the blockchain for all top-level comments (threads)
 * for a given discussion (project).
 */
export async function fetchComments(discussion: string, reply: boolean = false): Promise<Comment[]> {
  console.log("fetchComments", { discussion }, reply)
  let comments: Comment[] = [];

  try {
    const boxesGenerator = searchBoxes(
      get(explorer_uri),
      undefined,
      reply ? COMMENT_TYPE_NFT_ID : DISCUSSION_TYPE_NFT_ID,
      discussion
    );

    for await (const boxes of boxesGenerator) {
      console.log("boxes", boxes)
      for (const box of boxes) {
        if (!box.assets?.length) continue;

        const authorProfileTokenId = box.assets[0].tokenId;

        let textContent: string = "[Unreadable content]";
        try {
          const rawValue = box.additionalRegisters.R9?.renderedValue;
          if (rawValue) {
            textContent = hexToUtf8(rawValue) ?? "[Empty content]";
          }
        } catch (e) {
          console.warn(`Error decoding R9 for box ${box.boxId}`, e);
        }

        const number_of_spans = await fetchSpan(box.boxId);
        const isSpam = number_of_spans > Number(get(SPAM_LIMIT));

        textContent = await marked(textContent);
        textContent = DOMPurify.sanitize(textContent);

        const comment: Comment = {
          id: box.boxId,
          discussion: discussion,
          authorProfileTokenId: authorProfileTokenId,
          text: textContent,
          timestamp: await getTimestampFromBlockId(get(explorer_uri), (box as any).blockId),
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

  } catch (error) {
    console.error('Error while fetching comments:', error);
    return [];
  }
}

/**
 * Searches the blockchain for all comments made by a specific profile.
 */
export async function fetchCommentsByProfile(profileTokenId: string): Promise<Comment[]> {
  console.log("fetchCommentsByProfile", { profileTokenId });
  let comments: Comment[] = [];

  try {
    const boxesGenerator = searchBoxes(
      get(explorer_uri),
      profileTokenId,
      COMMENT_TYPE_NFT_ID
    );

    for await (const boxes of boxesGenerator) {
      for (const box of boxes) {
        console.log("box", box)
        if (!box.assets?.length) {
          console.log("No assets", box)
          continue;
        }

        if (box.assets[0].tokenId !== profileTokenId) {
          console.log("Not the profile token", box.assets[0].tokenId, profileTokenId)
          continue;
        }

        let textContent: string = "";
        try {
          const rawValue = box.additionalRegisters.R9?.renderedValue;
          if (rawValue) {
            textContent = hexToUtf8(rawValue) ?? "";
          }
        } catch (e) {
          console.log("Error decoding R9", e)
          continue;
        }

        if (!textContent) {
          console.log("No text content", box)
          continue;
        }

        let discussionId = "Unknown";
        if (box.additionalRegisters.R5?.renderedValue) {
          discussionId = box.additionalRegisters.R5.renderedValue;
        }

        const number_of_spans = await fetchSpan(box.boxId);
        const isSpam = number_of_spans > Number(get(SPAM_LIMIT));

        textContent = await marked(textContent);
        textContent = DOMPurify.sanitize(textContent);

        const comment: Comment = {
          id: box.boxId,
          discussion: discussionId,
          authorProfileTokenId: profileTokenId,
          text: textContent,
          timestamp: await getTimestampFromBlockId(get(explorer_uri), (box as any).blockId),
          isSpam: isSpam,
          replies: [],
          tx: box.transactionId,
          posting: false,
          sentiment: box.additionalRegisters.R8?.renderedValue === 'true'
        };

        comments.push(comment);
      }
    }

    comments.sort((a, b) => b.timestamp - a.timestamp);
    return comments;

  } catch (error) {
    console.error('Error while fetching profile comments:', error);
    return [];
  }
}

/**
 * Fetches the full ReputationProof object for the connected user.
 * @param ergo The connected wallet object (e.g., dApp Connector)
 */
export async function fetchProfile(ergo: any): Promise<ReputationProof | null> {
  try {
    const changeAddress = await ergo.get_change_address();
    if (!changeAddress) {
      reputation_proof.set(null);
      return null;
    }

    // fetchAllUserProfiles(explorerUri, is_self_defined, types, availableTypes)
    // We pass an empty map for availableTypes for now as we don't have them yet.
    const profiles = await fetchAllUserProfiles(
      get(explorer_uri),
      true, // is_self_defined
      [],
      new Map()
    );

    if (profiles.length === 0) {
      console.log('No profile boxes found for this user.');
      reputation_proof.set(null);
      return null;
    }

    const proof = profiles[0];
    console.log(`Profile found: ${proof.token_id}`, proof);
    reputation_proof.set(proof);

    return proof;

  } catch (error) {
    console.error('Error fetching profile:', error);
    reputation_proof.set(null);
    return null;
  }
}
