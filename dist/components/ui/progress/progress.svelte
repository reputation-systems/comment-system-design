<script>import { Progress as ProgressPrimitive } from "bits-ui";
import { cn } from "../../../utils.js";
let className = void 0;
export let max = 100;
export let value;
export let color = "";
export { className as class };
$:
  percentage = (value ?? 0) / (max ?? 1) * 100;
$:
  innerStyle = `background-color: ${color ? color : "#3b82f6"}; transform: translateX(-${100 - percentage}%);`;
</script>

<ProgressPrimitive.Root
	class={cn("bg-secondary relative h-4 w-full overflow-hidden rounded-full", className)}
	{...$$restProps}
>
	<div
		class="h-full w-full flex-1 transition-all"
		style={innerStyle}
	></div>
</ProgressPrimitive.Root>