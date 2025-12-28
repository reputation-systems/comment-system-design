import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        show?: boolean;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type SettingsModalProps = typeof __propDef.props;
export type SettingsModalEvents = typeof __propDef.events;
export type SettingsModalSlots = typeof __propDef.slots;
export default class SettingsModal extends SvelteComponent<SettingsModalProps, SettingsModalEvents, SettingsModalSlots> {
}
export {};
