import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        href?: string | undefined | undefined;
        variant?: "default" | "destructive" | "outline" | "secondary" | undefined;
        class?: string | undefined | null | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
    exports?: undefined;
    bindings?: undefined;
};
export type BadgeProps = typeof __propDef.props;
export type BadgeEvents = typeof __propDef.events;
export type BadgeSlots = typeof __propDef.slots;
export default class Badge extends SvelteComponent<BadgeProps, BadgeEvents, BadgeSlots> {
}
export {};
