export interface Comment {
    id: string;
    discussion: string;
    authorProfileTokenId: string;
    text: string;
    timestamp: number;
    isSpam: boolean;
    replies: Comment[];
    tx: string | null;
    posting: boolean;
    sentiment: boolean;
}
/**
 * Calculates the score of a comment based on your specific rules.
 *
 * The score of a comment 'C' is the sum of the "contributions"
 * from each of its replies 'R'.
 *
 * - If 'R' has no replies (it's a leaf node, N2): Its contribution is V(R).
 * - If 'R' has replies (it's a branch, N1): Its contribution is V(R) + Score(R)
 * or V(R) - Score(R), depending on the sentiment of R.
 */
export declare function getScore(comment: Comment): number;
