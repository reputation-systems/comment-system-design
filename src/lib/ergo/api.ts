export async function postComment(
  projectId: string,
  authorKey: string,
  text: string
): Promise<string>;

export async function replyToComment(
  parentTokenId: string,
  authorKey: string,
  text: string
): Promise<string>;

export async function flagSpam(
  targetTokenId: string,
  authorKey: string
): Promise<string>;

export async function fetchThreads(
  projectId: string
): Promise<any[]>;