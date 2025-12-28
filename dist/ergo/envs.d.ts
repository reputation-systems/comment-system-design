export declare const network_id: "mainnet" | "testnet";
export declare const explorer_uri: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (this: void, value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
export declare const web_explorer_uri_tx: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (this: void, value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
export declare const web_explorer_uri_addr: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (this: void, value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
export declare const web_explorer_uri_tkn: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (this: void, value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
export declare const PROFILE_TYPE_NFT_ID = "1820fd428a0b92d61ce3f86cd98240fdeeee8a392900f0b19a2e017d66f79926";
export declare const DISCUSSION_TYPE_NFT_ID = "273f60541e8869216ee6aed5552e522d9bea29a69d88e567d089dc834da227cf";
export declare const COMMENT_TYPE_NFT_ID = "6c1ec833dc4aff98458b60e278fc9a0161274671d6a0c36a7429216ca99c3267";
export declare const SPAM_FLAG_NFT_ID = "89505ed416ad43f2dc4b3c8d0eb949e6ba9993436ceb154a58645f1484e1437a";
export declare const PROFILE_TOTAL_SUPPLY = 99999999;
export declare const SPAM_LIMIT: {
    subscribe: (this: void, run: import("svelte/store").Subscriber<string>, invalidate?: import("svelte/store").Invalidator<string> | undefined) => import("svelte/store").Unsubscriber;
    set: (this: void, value: string) => void;
    update: (this: void, updater: import("svelte/store").Updater<string>) => void;
};
