import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type ProfileSelectorProps = typeof __propDef.props;
export type ProfileSelectorEvents = typeof __propDef.events;
export type ProfileSelectorSlots = typeof __propDef.slots;
export default class ProfileSelector extends SvelteComponent<ProfileSelectorProps, ProfileSelectorEvents, ProfileSelectorSlots> {
}
export {};
