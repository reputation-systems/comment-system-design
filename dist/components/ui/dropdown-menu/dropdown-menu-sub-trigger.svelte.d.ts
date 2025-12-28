import { SvelteComponent } from "svelte";
import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
declare const __propDef: {
    props: {
        disabled?: boolean | undefined | undefined;
        asChild?: boolean | undefined | undefined;
        el?: HTMLDivElement | undefined;
    } & import("node_modules/bits-ui/dist/internal").HTMLDivAttributes & {
        inset?: boolean;
    };
    slots: {
        default: {};
    };
    events: DropdownMenuPrimitive.SubTriggerEvents;
};
export type DropdownMenuSubTriggerProps = typeof __propDef.props;
export type DropdownMenuSubTriggerEvents = typeof __propDef.events;
export type DropdownMenuSubTriggerSlots = typeof __propDef.slots;
export default class DropdownMenuSubTrigger extends SvelteComponent<DropdownMenuSubTriggerProps, DropdownMenuSubTriggerEvents, DropdownMenuSubTriggerSlots> {
}
export {};
