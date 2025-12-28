import { type Comment } from './commentObject';
export declare function fetchThreadsAPI(projectId: string): Promise<Comment[]>;
export declare function createProfileBox(): Promise<string>;
export declare function postCommentAPI(projectId: string, text: string, sentiment: boolean): Promise<Comment>;
export declare function replyToCommentAPI(parentCommentId: string, projectId: string, text: string, sentiment: boolean): Promise<Comment>;
export declare function flagSpamAPI(targetCommentId: string): Promise<{
    targetCommentId: string;
}>;
export declare const threads: import("svelte/store").Writable<Comment[]>;
export declare const isLoading: import("svelte/store").Writable<boolean>;
export declare const error: import("svelte/store").Writable<string | null>;
export declare const currentProjectId: import("svelte/store").Writable<string>;
export declare function loadThreads(): Promise<void>;
export declare function postComment(text: string, sentiment: boolean): Promise<void>;
export declare function replyToComment(parentCommentId: string, text: string, sentiment: boolean): Promise<void>;
export declare function flagSpam(targetCommentId: string): Promise<void>;
