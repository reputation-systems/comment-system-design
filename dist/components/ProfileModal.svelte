<script>import { Button } from "./ui/button/index.js";
import { X, User, Copy, ExternalLink, Wallet } from "lucide-svelte";
import { createProfileBox } from "../ergo/commentStore";
import { fetchProfile } from "../ergo/commentFetch";
import { web_explorer_uri_tx } from "../ergo/envs";
import { address } from "../ergo/store";
export let show = false;
export let profile = null;
export let profile_creation_tx = "";
let isCreating = false;
async function handleCreateProfile() {
  if (!profile) {
    isCreating = true;
    try {
      profile_creation_tx = await createProfileBox();
      if (typeof ergo !== "undefined") {
        profile = await fetchProfile(ergo);
      }
      show = false;
    } catch (e) {
      console.error(e);
    } finally {
      isCreating = false;
    }
  }
}
function close() {
  show = false;
}
function copyToClipboard(text) {
  if (!text)
    return;
  navigator.clipboard.writeText(text);
}
</script>

{#if show}
    <button class="modal-backdrop" on:click={close} aria-label="Close profile"
    ></button>

    <div class="modal" role="dialog" aria-modal="true" aria-label="Profile">
        <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-2">
                <div class="p-2 bg-primary/10 rounded-full text-primary">
                    <User class="w-5 h-5" />
                </div>
                <h2 class="text-xl font-bold">Your Profile</h2>
            </div>
            <Button variant="ghost" size="icon" on:click={close}>
                <X class="w-5 h-5" />
            </Button>
        </div>

        {#if profile}
            <div class="space-y-6">
                <div class="space-y-3">
                    <div
                        class="p-4 bg-muted/50 rounded-lg border border-border"
                    >
                        <div class="flex justify-between items-start gap-4">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <Wallet
                                        class="w-3 h-3 text-muted-foreground"
                                    />
                                    <p
                                        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                                    >
                                        Connected Address
                                    </p>
                                </div>
                                <p class="font-mono text-sm break-all">
                                    {$address || "Not connected"}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8 shrink-0"
                                on:click={() => copyToClipboard($address || "")}
                                disabled={!$address}
                            >
                                <Copy class="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div
                        class="p-4 bg-muted/50 rounded-lg border border-border"
                    >
                        <div class="flex justify-between items-start gap-4">
                            <div class="min-w-0 flex-1">
                                <p
                                    class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                                >
                                    Reputation Token ID
                                </p>
                                <p class="font-mono text-sm mt-1 break-all">
                                    {profile.token_id}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8 shrink-0"
                                on:click={() =>
                                    copyToClipboard(profile?.token_id || "")}
                            >
                                <Copy class="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-sm font-semibold mb-3">Current State</h3>
                    {#if typeof profile.current_boxes?.[0]?.content === "object" && profile.current_boxes[0].content !== null}
                        <div
                            class="rounded-lg border border-border overflow-hidden"
                        >
                            <table class="w-full text-sm">
                                <thead class="bg-muted/50">
                                    <tr>
                                        <th
                                            class="px-4 py-2 text-left font-medium text-muted-foreground border-b border-border w-1/3"
                                            >Key</th
                                        >
                                        <th
                                            class="px-4 py-2 text-left font-medium text-muted-foreground border-b border-border"
                                            >Value</th
                                        >
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-border">
                                    {#each Object.entries(profile.current_boxes[0].content) as [key, value]}
                                        <tr
                                            class="bg-card hover:bg-muted/20 transition-colors"
                                        >
                                            <td
                                                class="px-4 py-3 font-mono text-xs text-muted-foreground align-top"
                                                >{key.toUpperCase()}</td
                                            >
                                            <td
                                                class="px-4 py-3 font-mono text-xs break-all"
                                            >
                                                {typeof value === "object"
                                                    ? JSON.stringify(
                                                          value,
                                                          null,
                                                          2,
                                                      )
                                                    : value}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {:else if profile.current_boxes?.[0]?.content}
                        <div
                            class="bg-muted p-4 rounded-lg text-sm font-mono break-all"
                        >
                            {profile.current_boxes[0].content}
                        </div>
                    {:else}
                        <p class="text-sm text-muted-foreground italic">
                            No content available in your reputation box.
                        </p>
                    {/if}
                </div>
            </div>
        {:else}
            <div class="text-center py-8 space-y-4">
                <div
                    class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4"
                >
                    <User class="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 class="text-lg font-semibold">No Profile Found</h3>

                <div class="max-w-xs mx-auto space-y-2">
                    <p class="text-muted-foreground text-sm">
                        Create a reputation profile to start posting comments.
                    </p>
                    {#if $address}
                        <div
                            class="bg-muted/50 px-3 py-1 rounded-md inline-block max-w-full"
                        >
                            <p
                                class="text-[10px] font-mono text-muted-foreground truncate max-w-[200px] mx-auto"
                            >
                                {$address}
                            </p>
                        </div>
                    {/if}
                </div>

                <Button
                    class="w-full max-w-xs"
                    on:click={handleCreateProfile}
                    disabled={isCreating}
                >
                    {isCreating
                        ? "Creating Profile..."
                        : "Create Reputation Profile"}
                </Button>
            </div>
        {/if}

        {#if profile_creation_tx}
            <div
                class="mt-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3"
            >
                <div class="flex-1 min-w-0">
                    <p
                        class="text-xs font-medium text-green-600 dark:text-green-400"
                    >
                        Profile Creation Transaction
                    </p>
                    <p class="text-xs text-muted-foreground truncate">
                        {profile_creation_tx}
                    </p>
                </div>
                <a
                    href={`${$web_explorer_uri_tx}${profile_creation_tx}`}
                    target="_blank"
                    class="p-2 hover:bg-green-500/10 rounded-full transition-colors"
                >
                    <ExternalLink
                        class="w-4 h-4 text-green-600 dark:text-green-400"
                    />
                </a>
            </div>
        {/if}
    </div>
{/if}

<style>
    .modal-backdrop {

    position: fixed;

    inset: 0px;

    z-index: 70;

    cursor: default;

    background-color: rgb(0 0 0 / 0.8);

    --tw-backdrop-blur: blur(4px);

    backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)
}

    .modal {

    position: fixed;

    top: 50%;

    left: 50%;

    z-index: 80;

    width: 100%;

    max-width: 42rem;

    --tw-translate-x: -50%;

    --tw-translate-y: -50%;

    transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));

    border-radius: 0.75rem;

    border-width: 1px;

    --tw-border-opacity: 1;

    border-color: hsl(var(--border) / var(--tw-border-opacity, 1));

    --tw-bg-opacity: 1;

    background-color: hsl(var(--background) / var(--tw-bg-opacity, 1));

    padding: 1.5rem;

    --tw-text-opacity: 1;

    color: hsl(var(--foreground) / var(--tw-text-opacity, 1));

    --tw-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);

    --tw-shadow-colored: 0 25px 50px -12px var(--tw-shadow-color);

    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)
}
</style>
