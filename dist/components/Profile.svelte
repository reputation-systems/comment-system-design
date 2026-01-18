<script>import { onMount } from "svelte";
import { fetchCommentsByProfileAPI } from "../ergo/commentStore";
import { Button } from "./ui/button/index.js";
import * as jdenticon from "jdenticon";
import {
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  ThumbsDown
} from "lucide-svelte";
export let profile_id;
export let forum_explorer_url = null;
export let web_explorer_uri_tx = "https://sigmaspace.io/en/transaction/";
let comments = [];
let isLoading = true;
let error = null;
$:
  groupedComments = comments.reduce(
    (acc, comment) => {
      const topic = comment.discussion || "Unknown Topic";
      if (!acc[topic]) {
        acc[topic] = [];
      }
      acc[topic].push(comment);
      return acc;
    },
    {}
  );
$:
  sortedTopics = Object.keys(groupedComments).sort((a, b) => {
    const lastCommentA = groupedComments[a][0];
    const lastCommentB = groupedComments[b][0];
    return lastCommentB.timestamp - lastCommentA.timestamp;
  });
function getAvatarSvg(tokenId, size = 64) {
  return jdenticon.toSvg(tokenId, size);
}
async function loadProfileComments() {
  if (!profile_id)
    return;
  isLoading = true;
  error = null;
  try {
    comments = await fetchCommentsByProfileAPI(profile_id);
  } catch (err) {
    console.error("Error loading profile comments:", err);
    error = err.message || "Failed to load profile activity";
  } finally {
    isLoading = false;
  }
}
onMount(() => {
  loadProfileComments();
});
</script>

<div class="w-full max-w-4xl mx-auto p-4">
    <!-- Profile Header -->
    <div
        class="bg-card border rounded-lg p-6 mb-8 flex flex-col sm:flex-row items-center gap-6"
    >
        <div class="flex-shrink-0 bg-muted rounded-full p-1">
            {@html getAvatarSvg(profile_id, 80)}
        </div>

        <div class="flex-1 text-center sm:text-left">
            <h1 class="text-2xl font-bold mb-2">User Profile</h1>
            <div
                class="font-mono text-sm bg-muted/50 px-3 py-1 rounded inline-block mb-4 break-all"
            >
                {profile_id}
            </div>

            <div
                class="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-muted-foreground"
            >
                <div class="flex items-center gap-1">
                    <MessageSquare class="w-4 h-4" />
                    <span>{comments.length} contributions</span>
                </div>
                <div class="flex items-center gap-1">
                    <span
                        >{Object.keys(groupedComments).length} topics participated</span
                    >
                </div>
            </div>
        </div>
    </div>

    <!-- Activity Feed -->
    <h2 class="text-xl font-semibold mb-4">Activity by Topic</h2>

    {#if isLoading}
        <div class="text-center py-12">
            <div
                class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
            ></div>
            <p class="text-muted-foreground">Loading activity...</p>
        </div>
    {:else if error}
        <div
            class="bg-destructive/10 border border-destructive/20 p-4 rounded-lg text-center text-destructive"
        >
            <p>{error}</p>
            <Button
                variant="outline"
                size="sm"
                class="mt-2"
                on:click={loadProfileComments}>Try Again</Button
            >
        </div>
    {:else if comments.length === 0}
        <div
            class="text-center py-12 bg-muted/30 rounded-lg border border-dashed"
        >
            <p class="text-muted-foreground">
                No activity found for this profile.
            </p>
        </div>
    {:else}
        <div class="space-y-6">
            {#each sortedTopics as topicId}
                <div class="bg-card border rounded-lg overflow-hidden">
                    <div
                        class="bg-muted/30 p-4 border-b flex justify-between items-center"
                    >
                        <div class="flex items-center gap-2 overflow-hidden">
                            <span class="font-semibold truncate"
                                >Topic: {topicId}</span
                            >
                        </div>
                        {#if forum_explorer_url}
                            <Button
                                variant="ghost"
                                size="sm"
                                href={`${forum_explorer_url}/?topic=${topicId}`}
                                target="_blank"
                                class="shrink-0"
                            >
                                View Topic <ExternalLink class="w-3 h-3 ml-1" />
                            </Button>
                        {/if}
                    </div>

                    <div class="divide-y">
                        {#each groupedComments[topicId] as comment}
                            <div
                                class="p-4 hover:bg-muted/10 transition-colors"
                            >
                                <div
                                    class="flex justify-between items-start mb-2"
                                >
                                    <div
                                        class="flex items-center gap-2 text-xs text-muted-foreground"
                                    >
                                        <span
                                            >{new Date(
                                                comment.timestamp,
                                            ).toLocaleString()}</span
                                        >
                                        {#if comment.sentiment}
                                            <span
                                                class="flex items-center text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded"
                                            >
                                                <ThumbsUp
                                                    class="w-3 h-3 mr-1"
                                                /> Positive
                                            </span>
                                        {:else}
                                            <span
                                                class="flex items-center text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded"
                                            >
                                                <ThumbsDown
                                                    class="w-3 h-3 mr-1"
                                                /> Negative
                                            </span>
                                        {/if}
                                    </div>

                                    <a
                                        href={`${web_explorer_uri_tx}${comment.tx}`}
                                        target="_blank"
                                        class="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                    >
                                        Tx <ExternalLink class="w-3 h-3" />
                                    </a>
                                </div>

                                <div
                                    class="prose prose-sm max-w-none text-foreground"
                                >
                                    {@html comment.text}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
