<script>import { cn } from "../../../utils.js";
let className = void 0;
export { className as class };
</script>

<div
	class={cn("bg-card text-card-foreground rounded-lg border shadow-sm", className)}
	{...$$restProps}
>
	<slot />
</div>
