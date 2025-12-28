<script>import { cn } from "../../../utils.js";
let className = void 0;
export { className as class };
</script>

<p class={cn("text-muted-foreground text-sm", className)} {...$$restProps}>
	<slot />
</p>
