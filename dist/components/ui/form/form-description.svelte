<script>import * as FormPrimitive from "formsnap";
import { cn } from "../../../utils.js";
let className = void 0;
export { className as class };
</script>

<FormPrimitive.Description
	class={cn("text-muted-foreground text-sm", className)}
	{...$$restProps}
	let:descriptionAttrs
>
	<slot {descriptionAttrs} />
</FormPrimitive.Description>
