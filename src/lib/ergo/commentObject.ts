export interface Comment {
    id: string; // Box ID of the comment.
    discussion: string;  // Discussion ID  (any invented ID, in case of Bounty or Bene, is the project ID)
    authorProfileTokenId: string; // Reputation proof token ID (profile ID)
    text: string;
    timestamp: number;  // Timestamp of the height of the box.
    isSpam: boolean;
    replies: Comment[];
}