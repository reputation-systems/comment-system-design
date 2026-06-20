<script>import { Button } from "./ui/button/index.js";
import * as DropdownMenu from "./ui/dropdown-menu/index.js";
import { Check, ChevronDown, IdCard } from "lucide-svelte";
import { reputation_proof, user_profiles } from "../ergo/store";
function selectProfile(profile) {
  reputation_proof.set(profile);
}
function shortId(id) {
  return id.length > 12 ? `${id.substring(0, 8)}\u2026${id.substring(id.length - 4)}` : id;
}
function profileTypeLabel(profile) {
  if (!profile.types || profile.types.length === 0)
    return "Proof";
  return profile.types.map((t) => t.typeName).filter(Boolean).join(", ") || "Proof";
}
function ergBurned(profile) {
  const total = profile.current_boxes.reduce((sum, box) => {
    const v = box.value;
    const n = typeof v === "string" ? Number(v) : Number(v ?? 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  return (total / 1e9).toFixed(4);
}
</script>

{#if $user_profiles.length > 1}
    <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild let:builder>
            <Button
                builders={[builder]}
                variant="outline"
                size="sm"
                class="gap-2 max-w-[220px]"
                aria-label="Select profile"
            >
                <IdCard class="w-4 h-4 shrink-0" />
                <span class="truncate text-xs font-mono">
                    {$reputation_proof ? shortId($reputation_proof.token_id) : "Select profile"}
                </span>
                <ChevronDown class="w-3 h-3 shrink-0 opacity-60" />
            </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-[320px]">
            <DropdownMenu.Label>Select a Profile / Proof</DropdownMenu.Label>
            <DropdownMenu.Separator />
            {#each $user_profiles as profile (profile.token_id)}
                {@const active = $reputation_proof?.token_id === profile.token_id}
                <DropdownMenu.Item
                    on:click={() => selectProfile(profile)}
                    class="flex items-start gap-3 py-2 cursor-pointer"
                >
                    <div class="p-1.5 bg-primary/10 rounded-full text-primary shrink-0">
                        <IdCard class="w-4 h-4" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-xs font-medium truncate">
                                {profileTypeLabel(profile)}
                            </span>
                            <span class="text-[10px] font-mono text-muted-foreground shrink-0">
                                {shortId(profile.token_id)}
                            </span>
                        </div>
                        <div class="text-[10px] text-muted-foreground mt-0.5">
                            {ergBurned(profile)} ERG burned · {profile.number_of_boxes} box{profile.number_of_boxes === 1 ? "" : "es"}
                        </div>
                    </div>
                    {#if active}
                        <Check class="w-4 h-4 text-primary shrink-0 mt-1" />
                    {/if}
                </DropdownMenu.Item>
            {/each}
        </DropdownMenu.Content>
    </DropdownMenu.Root>
{/if}
