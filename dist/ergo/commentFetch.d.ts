import { type Comment } from './commentObject';
import { type ReputationProof } from './object';
/**
 * Searches the blockchain for all spam alerts targeting a comment.
 */
export declare function fetchSpan(comment_id: string): Promise<number>;
/**
 * Searches the blockchain for all top-level comments (threads)
 * for a given discussion (project).
 */
export declare function fetchComments(discussion: string, reply?: boolean): Promise<Comment[]>;
/**
 * Fetches the full ReputationProof object for the connected user.
 * @param ergo The connected wallet object (e.g., dApp Connector)
 */
export declare function fetchProfile(ergo: any): Promise<ReputationProof | null>;
