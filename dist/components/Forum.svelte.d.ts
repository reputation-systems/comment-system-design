import { SvelteComponent } from "svelte";
import { type Writable } from "svelte/store";
declare const __propDef: {
    props: {
        topic_id: string;
        spam_limit?: Writable<string> | null;
        web_explorer_uri_tx?: Writable<string> | null;
        web_explorer_uri_addr?: Writable<string> | null;
        web_explorer_uri_tkn?: Writable<string> | null;
        explorer_uri?: Writable<string> | null;
        maxWidth?: string;
        showTopicInput?: boolean;
        showSpamToggle?: boolean;
        showTopicScore?: boolean;
        profile?: any;
        connect_executed?: boolean;
        connected?: boolean;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ForumProps = typeof __propDef.props;
export type ForumEvents = typeof __propDef.events;
export type ForumSlots = typeof __propDef.slots;
export default class Forum extends SvelteComponent<ForumProps, ForumEvents, ForumSlots> {
}
export {};
