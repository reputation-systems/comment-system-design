<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Theme from './Theme.svelte';
	import { Button } from "$lib/components/ui/button/index.js";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Label } from "$lib/components/ui/label/index.js";
	import {
		threads,
		isLoading,
		error,
		currentProjectId as currentTopicId,
		loadThreads,
		postComment,
		replyToComment,
		flagSpam,
        createProfileBox

	} from '$lib/ergo/commentStore';
	import { address, connected, balance, network, viewMode } from "$lib/ergo/store";
	import { explorer_uri, web_explorer_uri_tx } from '$lib/ergo/envs';
	import { fetchProfile } from '$lib/ergo/commentFetch';
	import { type ReputationProof } from '$lib/ergo/object';
	import { getScore, type Comment } from "$lib/ergo/commentObject";
	import { User, ThumbsUp, ThumbsDown, X } from "lucide-svelte";
    import { get } from 'svelte/store';

	export let connect_executed = false;
	export let comment: Comment | null = null;
	export let _parentId: string | undefined = undefined;

	let profile: ReputationProof | null = null;

	export let topic_id = get(currentTopicId);

	let profile_creation_tx = "";
	let newCommentText = "";
	let isPostingComment = false;
	let replyText = "";
	let isReplying = false;
	let isFlagging = false;
	let commentError: string | null = null;
	let showReplyForm = false;
	let sentiment: boolean | null = null;
	let replySentiment: boolean | null = null;

	let current_height: number | null = null;
	let balanceUpdateInterval: number;

	// Footer text
	const footerMessages = [
		"This is a decentralized chat running in your browser.",
		"Your identity (key) belongs to you. You're in control.",
		"Powered by Ergo for transparency and integrity."
	];
	let activeMessageIndex = 0;
	let scrollingTextElement: HTMLElement;

	function handleAnimationIteration() {
		activeMessageIndex = (activeMessageIndex + 1) % footerMessages.length;
	}

    type FlatComment = Comment & { _parentId?: string };

    function flattenComments(comments: Comment[], parentId: string | undefined = undefined): FlatComment[] {
        return comments.reduce((acc, comment) => {
            const flatComment: FlatComment = { ...comment, _parentId: parentId };
            acc.push(flatComment);
            if (comment.replies) {
                acc.push(...flattenComments(comment.replies, comment.id));
            }
            return acc;
        }, [] as FlatComment[]);
    }

    $: allCommentsFlat = flattenComments($threads).sort((a, b) => a.timestamp - b.timestamp);
	$: allCommentsFlatProfilesMap = allCommentsFlat.reduce((acc, comment) => {
			acc[comment.id] = comment.authorProfileTokenId;
			return acc;
		}, {} as Record<string, string>);

	// show spam toggle
	export let showAllComments = false;

	async function handleLoadThreads() {
		try {
			currentTopicId.set(topic_id);
			await loadThreads();
		} catch (err) {
			console.error("Error loading threads for topic:", err);
		}
	}

	async function handleToggleShowAll(e: Event) {
		const input = e.target as HTMLInputElement;
		showAllComments = input.checked;
		// Force a reload of threads after toggling so backend/store can return correct set
		// use tick to ensure DOM/reactivity has updated before reloading if needed
		await tick();
		try {
			await loadThreads();
		} catch (err) {
			console.error("Failed to reload threads after toggling showAllComments:", err);
		}
	}

	async function handlePostComment() {
		if (!newCommentText.trim() || sentiment === null) return;
		isPostingComment = true;
		await postComment(newCommentText, sentiment);
		newCommentText = "";
		sentiment = null;
		isPostingComment = false;
	}

	async function handleReply() {
		if (!replyText.trim() || !comment || replySentiment === null) return;

		isReplying = true;
		commentError = null;
		try {
			await replyToComment(comment.id, replyText, replySentiment);
			replyText = "";
			replySentiment = null;
			showReplyForm = false;
		} catch (err: any) {
			commentError = err.message || "Error sending reply.";
		} finally {
			isReplying = false;
		}
	}

	async function handleFlag() {
		if (!comment) return;
		isFlagging = true;
		await flagSpam(comment.id);
		isFlagging = false;
	}

	async function handleCreateProfile() {
		if (!profile) {
			profile_creation_tx = await createProfileBox();
			profile = await fetchProfile(ergo);
			showProfileModal = false;
		}
	}

	currentTopicId.subscribe((topicId) => {
		if (browser && comment === null) {
			loadThreads();
		}
	});

	async function get_current_height(): Promise<number> {
		try {
			return await ergo.get_current_height();
		} catch {
			try {
				const response = await fetch(explorer_uri + '/api/v1/networkState');
				if (!response.ok) throw new Error(`API request failed: ${response.status}`);
				const data = await response.json();
				return data.height;
			} catch (error) {
				console.error("Could not get network height from API:", error);
				throw new Error("Cannot get current height.");
			}
		}
	}

	async function get_balance(): Promise<Map<string, number>> {
		const balanceMap = new Map<string, number>();
		const addr = await ergo.get_change_address();
		if (!addr) throw new Error("An address is required to get the balance.");

		const response = await fetch(explorer_uri + `/api/v1/addresses/${addr}/balance/confirmed`);
		const data = await response.json();
		balanceMap.set("ERG", data.nanoErgs);
		balance.set(data.nanoErgs);
		data.tokens.forEach((token: { tokenId: string; amount: number }) => {
			balanceMap.set(token.tokenId, token.amount);
		});
		return balanceMap;
	}

	async function connectWallet() {
		if (typeof ergoConnector !== 'undefined' && !connect_executed) {
			connect_executed = true;
			console.log("Connect wallet");
			const nautilus = ergoConnector.nautilus;
			if (nautilus && await nautilus.connect()) {
				address.set(await ergo.get_change_address());
				network.set("ergo-mainnet");
				await get_balance();
				connected.set(true);
			} else {
				alert('Wallet not connected or unavailable');
			}
		}
	}

	let showProfileModal = false;

	onMount(async () => {
		if (!browser) return;

		await connectWallet();
		profile = await fetchProfile(ergo);

		balanceUpdateInterval = setInterval(updateWalletInfo, 30000);
		scrollingTextElement?.addEventListener('animationiteration', handleAnimationIteration);

		return () => {
			if (balanceUpdateInterval) clearInterval(balanceUpdateInterval);
			scrollingTextElement?.removeEventListener('animationiteration', handleAnimationIteration);
		};
	});

	connected.subscribe(async (isConnected) => {
		if (isConnected) await updateWalletInfo();
	});

	async function updateWalletInfo() {
		if (typeof ergo === 'undefined' || !$connected) return;
		try {
			const walletBalance = await get_balance();
			balance.set(walletBalance.get("ERG") || 0);
			current_height = await get_current_height();
		} catch (error) {
			console.error("Error updating wallet information:", error);
		}
	}

	$: ergInErgs = $balance ? (Number($balance) / 1_000_000_000).toFixed(4) : 0;
</script>

{#if comment === null}
	<!-- HEADER -->
	<div class="navbar-container">
		<div class="navbar-content">
			<a href="#" class="logo-container">Topic Chat</a>
			<div class="flex-1"></div>
			<button class="user-icon" on:click={() => showProfileModal = true} aria-label="Open profile">
				<User class="w-6 h-6" />
			</button>
			<div class="theme-toggle"><Theme /></div>
		</div>
	</div>

	<!-- PROFILE MODAL -->
	{#if showProfileModal}
		<!-- Darker backdrop (less transparent) -->
		<div class="modal-backdrop" on:click={() => showProfileModal = false}></div>

		<div class="modal" role="dialog" aria-modal="true" aria-label="Profile">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-lg font-semibold">Profile</h2>
				<Button variant="ghost" size="icon" on:click={() => showProfileModal = false}><X /></Button>
			</div>

			{#if profile}

                <p class="mb-4 text-sm text-muted-foreground">
                Reputation proof token ID:
                <span class="font-mono text-foreground">{profile.token_id}</span>
                </p>

                {#if typeof profile.current_boxes?.[0]?.content === 'object' && profile.current_boxes[0].content !== null}
                <div class="overflow-x-auto max-h-64">
                    <table class="min-w-full border border-border rounded-md text-sm">
                    <thead class="bg-muted/50">
                        <tr>
                        <th class="px-3 py-2 text-left font-semibold border-b border-border">Key</th>
                        <th class="px-3 py-2 text-left font-semibold border-b border-border">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each Object.entries(profile.current_boxes[0].content) as [key, value]}
                        <tr class="odd:bg-muted/20 even:bg-transparent">
                            <td class="px-3 py-2 font-mono text-xs text-muted-foreground border-b border-border align-top">
                            {key.toUpperCase()}
                            </td>
                            <td class="px-3 py-2 font-mono text-xs text-foreground border-b border-border break-all align-top">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                            </td>
                        </tr>
                        {/each}
                    </tbody>
                    </table>
                </div>
                {:else if profile.current_boxes?.[0]?.content}
                <div class="bg-muted p-3 rounded-md text-sm text-foreground">
                    {profile.current_boxes[0].content}
                </div>
                {:else}
                <p class="text-muted-foreground text-sm italic">
                    No content available.
                </p>
                {/if}

			{:else}
				<p class="mb-4 text-sm text-muted-foreground">No profile found. Create one to build your reputation.</p>
				<Button on:click={handleCreateProfile} disabled={isPostingComment}>
					{isPostingComment ? "Creating..." : "Create Profile"}
				</Button>
			{/if}
		</div>
	{/if}

	<main class="container mx-auto px-4 py-8 pb-20">
		
		<div class="max-w-6xl mx-auto">

			{#if profile_creation_tx}
				<span class="text-muted-foreground">
					<a
					href={`${web_explorer_uri_tx}${profile_creation_tx}`}
					target="_blank"
					>Profile creation tx: {profile_creation_tx}</a>
				</span>
			{:else}
				{#if !profile}
				<!--Small-->
					<a class="text-sm">Tip: Create a profile on the header menu to build your reputation</a>
				{/if}
			{/if}

		<div class="mb-8 flex items-end space-x-2" style="margin-top: 2rem;">
			<div class="flex-1">
				<label for="topic-id-input" class="text-lg font-semibold">Topic ID</label>
				<input
				type="text"
				id="topic-id-input"
				bind:value={topic_id}
				class="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 sm:text-sm"
				placeholder="Topic/Project/Discussion ID"
				/>
			</div>
			<Button
				on:click={handleLoadThreads}
				class="mt-2 h-5 rounded-md px-3 text-sm"
			>
				Load
			</Button>
		</div>

			<h1 class="text-3xl font-bold mb-6">Comments</h1>

			<form on:submit|preventDefault={handlePostComment} class="space-y-4 mb-8">
				<div>
					<Label for="newComment">Your Comment</Label>
					<Textarea
						id="newComment"
						bind:value={newCommentText}
						placeholder="Write your comment..."
						rows={4}
						required
					/>
				</div>
				<div class="flex gap-4 items-center">
					<Button variant={sentiment === true ? "default" : "outline"} size="icon" on:click={() => sentiment = true}><ThumbsUp /></Button>
					<Button variant={sentiment === false ? "default" : "outline"} size="icon" on:click={() => sentiment = false}><ThumbsDown /></Button>
					<Button type="submit" disabled={isPostingComment || !newCommentText.trim() || !profile}>
						{isPostingComment ? "Posting..." : "Post Comment"}
					</Button>
				</div>
			</form>

			<div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
				<div class="flex items-center">
					<input
						id="showAll"
						type="checkbox"
						checked={showAllComments}
						on:change={handleToggleShowAll}
						class="mr-2"
					/>
					<Label for="showAll">Show all comments (including spam)</Label>
				</div>

				<div class="flex items-center">
					<input
						id="forumView"
						type="checkbox"
						on:change={() => $viewMode = ($viewMode === 'nested' ? 'forum' : 'nested')}
						checked={$viewMode === 'forum'}
						class="mr-2"
					/>
					<Label for="forumView">Forum view</Label>
				</div>
			</div>
			
			{#if $isLoading}
				<p class="text-muted-foreground">Loading comments...</p>
			{:else if $error}
				<div class="p-4 bg-red-100 dark:bg-red-900 border border-red-400 rounded-md text-red-800 dark:text-red-200">
					{$error}
				</div>
			{:else if $threads.length === 0}
				<p class="text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
			{:else}
				{#if $viewMode === 'nested'}
					<div class="space-y-6">
						{#each $threads as thread (thread.id)}
							{#if showAllComments || !thread.isSpam}
								<svelte:self comment={thread} {showAllComments} {topic_id} {connect_executed}/>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="forum-container flex flex-col">
                        {#each allCommentsFlat as flatComment (flatComment.id)}
							{#if showAllComments || !flatComment.isSpam}
                                <div class="forum-comment-wrapper border-t border-border first:border-t-0 py-4">
                                    <svelte:self 
                                        comment={flatComment} 
                                        _parentId={flatComment._parentId} {showAllComments} 
                                        {topic_id} 
                                        {connect_executed}
                                    />
                                </div>
                            {/if}
                        {/each}
                    </div>
				{/if}
			{/if}
		</div>
	</main>

	<footer class="page-footer">
		<div class="footer-center">
			<div bind:this={scrollingTextElement} class="scrolling-text-wrapper">
				{footerMessages[activeMessageIndex]}
			</div>
		</div>
	</footer>

{:else}
    <div 
        class="comment-container"
        class:border={$viewMode === 'nested'}
        class:rounded-md={$viewMode === 'nested'}
        class:p-4={$viewMode === 'nested'}
        class:bg-card={$viewMode === 'nested'}
        id="comment-{comment.id}"
    >
        <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
                <span class="font-semibold text-sm">@{comment.authorProfileTokenId.slice(0, 6)}</span>

				{#if $viewMode === 'forum'}
					<span class="text-xs text-muted-foreground">#{comment.id.slice(0, 6)}</span>
				{/if}

                {#if $viewMode === 'nested'}
                    {#if comment.sentiment === true}
                        <ThumbsUp class="h-4 w-4 text-green-500" />
                    {:else if comment.sentiment === false}
                        <ThumbsDown class="h-4 w-4 text-red-500" />
                    {/if}
                    <span
                        class="text-sm font-medium"
                        class:text-green-600={getScore(comment) > 0}
                        class:text-red-600={getScore(comment) < 0}
                        class:text-gray-500={getScore(comment) === 0}
                    >
                        {getScore(comment)}
                    </span>
                {/if}
            </div>

            <div class="flex items-center gap-3 text-xs text-muted-foreground">
                {#if $viewMode === 'forum' && _parentId}
                    <span class="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-reply"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
						<!-- svelte-ignore a11y-missing-attribute -->
						<a class="hover:text-primary">
                            
                            {#if allCommentsFlatProfilesMap && allCommentsFlatProfilesMap[_parentId]}
                                <span class="font-semibold">@{allCommentsFlatProfilesMap[_parentId].slice(0, 6)}</span>
                            {/if}

                            <span class="ml-1 opacity-80">#{_parentId.slice(0, 6)}</span>

                        </a>
                    </span>
                {/if}

                <span class="flex-shrink-0">
                {#if comment.submitting_tx}
                    <a
                    href={`${web_explorer_uri_tx}${comment.submitting_tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline hover:text-primary"
                    >
                    Posting...
                    </a>
                {:else}
                    {new Date(comment.timestamp).toLocaleString()}
                {/if}
                </span>
            </div>
        </div>

        <p class="text-base mb-3">{comment.text}</p>
        
        <div class="flex justify-between items-center flex-wrap gap-x-4 gap-y-2">
            <div class="flex items-center gap-4">
                <Button variant="ghost" size="sm" on:click={() => showReplyForm = !showReplyForm} disabled={!profile}>
                    {showReplyForm ? 'Cancel' : 'Reply'}
                </Button>
                {#if !comment.isSpam}
                    <Button variant="ghost" size="sm" class="text-red-500" on:click={handleFlag} disabled={isFlagging || !profile}>
                        {isFlagging ? 'Flagging...' : 'Mark Spam'}
                    </Button>
                {:else}
                    <span class="text-xs text-muted-foreground">Spam</span>
                {/if}
            </div>

            {#if $viewMode === 'forum'}
                <div class="flex items-center gap-2">
                    {#if comment.sentiment === true}
                        <ThumbsUp class="h-4 w-4 text-green-500" />
                    {:else if comment.sentiment === false}
                        <ThumbsDown class="h-4 w-4 text-red-500" />
                    {/if}
                    <span
                        class="text-sm font-medium"
                        class:text-green-600={getScore(comment) > 0}
                        class:text-red-600={getScore(comment) < 0}
                        class:text-gray-500={getScore(comment) === 0}
                    >
                        {getScore(comment)}
                    </span>
                </div>
            {/if}
        </div>

        {#if commentError}
            <p class="text-red-500 text-sm mt-2">{commentError}</p>
        {/if}

        {#if showReplyForm}
            <form on:submit|preventDefault={handleReply} class="space-y-3 mt-4">
                <Label for="reply-{comment.id}" class="sr-only">Your Reply</Label>
                <Textarea
                    id="reply-{comment.id}"
                    bind:value={replyText}
                    placeholder="Write your reply..."
                    rows={3}
                    required
                />
                <div class="flex gap-2">
                    <Button variant={replySentiment === true ? "default" : "outline"} size="icon" on:click={() => replySentiment = true}><ThumbsUp /></Button>
                    <Button variant={replySentiment === false ? "default" : "outline"} size="icon" on:click={() => replySentiment = false}><ThumbsDown /></Button>
                    <Button type="submit" size="sm" disabled={isReplying || !replyText.trim() || replySentiment === null}>
                        {isReplying ? 'Sending...' : 'Send Reply'}
                    </Button>
                </div>
            </form>
        {/if}

        {#if $viewMode === 'nested'}
            {#if comment.replies && comment.replies.length > 0}
                <div class="replies-container mt-4 space-y-4">
                    {#each comment.replies as reply (reply.id)}
                        {#if showAllComments || !reply.isSpam}
                            <svelte:self comment={reply} {showAllComments} {topic_id} {connect_executed}/>
                        {/if}
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
{/if}

<style lang="postcss">
	.navbar-container {
		@apply sticky top-0 z-50 w-full border-b backdrop-blur-lg;
		background-color: hsl(var(--background) / 0.8);
		border-bottom-color: hsl(var(--border));
	}

	.navbar-content {
		@apply container flex h-16 items-center gap-4;
	}

	.user-icon {
		@apply p-2 rounded-full hover:bg-accent;
	}

	.modal-backdrop {
		@apply fixed inset-0 bg-black/80 z-50;
	}

    .modal {
        @apply fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        bg-card border border-border rounded-2xl p-6 w-[36rem] z-[60] shadow-lg;
        background-color: var(--card);
    }

	.replies-container {
		@apply pl-6 border-l-2 border-border;
	}

	.page-footer {
		@apply fixed bottom-0 left-0 right-0 z-40 flex items-center h-12 px-6 border-t text-sm text-muted-foreground;
		background-color: hsl(var(--background) / 0.8);
		backdrop-filter: blur(4px);
	}

	.footer-center {
		@apply flex-1 overflow-hidden;
		-webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
		mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
	}

	.scrolling-text-wrapper {
		@apply inline-block whitespace-nowrap;
		animation: scroll-left 15s linear infinite;
	}

	@keyframes scroll-left {
		from {
			transform: translateX(100vw);
		}
		to {
			transform: translateX(-100%);
		}
	}
</style>
