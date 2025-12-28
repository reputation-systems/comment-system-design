import { SvelteComponent } from "svelte";
declare const __propDef: {
    props: {
        type?: import("@melt-ui/svelte").ScrollAreaType | undefined;
        dir?: import("@melt-ui/svelte/internal/types").TextDirection | undefined;
        hideDelay?: number | undefined;
    } & {
        asChild?: boolean | undefined | undefined;
        el?: HTMLDivElement | undefined;
    } & import("node_modules/bits-ui/dist/internal/types.js").HTMLDivAttributes & {
        orientation?: "vertical" | "horizontal" | "both";
        scrollbarXClasses?: string;
        scrollbarYClasses?: string;
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
export type ScrollAreaProps = typeof __propDef.props;
export type ScrollAreaEvents = typeof __propDef.events;
export type ScrollAreaSlots = typeof __propDef.slots;
export default class ScrollArea extends SvelteComponent<ScrollAreaProps, ScrollAreaEvents, ScrollAreaSlots> {
}
export {};
