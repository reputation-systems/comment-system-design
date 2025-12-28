<script>import { Dialog as DialogPrimitive } from "bits-ui";
import { cn } from "../../../utils.js";
let className = void 0;
export { className as class };
</script>

<DialogPrimitive.Description
	class={cn("text-muted-foreground text-sm", className)}
	{...$$restProps}
>
	<slot />
</DialogPrimitive.Description>
