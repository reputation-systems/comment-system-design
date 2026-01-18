import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        profile_id: string;
        forum_explorer_url?: string | null;
        web_explorer_uri_tx?: string;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ProfileProps = typeof __propDef.props;
export type ProfileEvents = typeof __propDef.events;
export type ProfileSlots = typeof __propDef.slots;
export default class Profile extends SvelteComponent<ProfileProps, ProfileEvents, ProfileSlots> {
}
export {};
