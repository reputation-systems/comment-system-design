import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        asChild?: boolean | undefined | undefined;
        el?: HTMLDivElement | undefined;
    } & import("node_modules/bits-ui/dist/internal").HTMLDivAttributes & {
        inset?: boolean;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
    exports?: {} | undefined;
    bindings?: string | undefined;
};
export type MenubarLabelProps = typeof __propDef.props;
export type MenubarLabelEvents = typeof __propDef.events;
export type MenubarLabelSlots = typeof __propDef.slots;
export default class MenubarLabel extends SvelteComponent<MenubarLabelProps, MenubarLabelEvents, MenubarLabelSlots> {
}
export {};
