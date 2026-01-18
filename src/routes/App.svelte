<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import Theme from "./Theme.svelte";
	import { currentProjectId as currentTopicId } from "$lib/ergo/commentStore";
	import { address, connected, balance, network } from "$lib/ergo/store";
	import {
		explorer_uri,
		web_explorer_uri_tx,
		web_explorer_uri_addr,
		web_explorer_uri_tkn,
		SPAM_LIMIT,
	} from "$lib/ergo/envs";
	import { fetchProfile } from "$lib/ergo/commentFetch";
	import { type ReputationProof } from "$lib/ergo/object";
	import { User, Settings } from "lucide-svelte";
	import { get } from "svelte/store";
	import { Forum } from "$lib/index.js";
	import SettingsModal from "$lib/components/SettingsModal.svelte";
	import ProfileModal from "$lib/components/ProfileModal.svelte";

	export let connect_executed = false;

	let profile: ReputationProof | null = null;
	export let topic_id = get(currentTopicId);

	let profile_creation_tx = "";

	let current_height: number | null = null;
	let balanceUpdateInterval: any;

	let showProfileModal = false;
	let showSettingsModal = false;

	// Footer text
	const footerMessages = [
		"This is a decentralized chat running in your browser.",
		"Your identity (key) belongs to you. You're in control.",
		"Powered by Ergo for transparency and integrity.",
	];
	let activeMessageIndex = 0;
	let scrollingTextElement: HTMLElement;

	function handleAnimationIteration() {
		activeMessageIndex = (activeMessageIndex + 1) % footerMessages.length;
	}

	async function get_current_height(): Promise<number> {
		try {
			return await ergo.get_current_height();
		} catch {
			try {
				const response = await fetch(
					get(explorer_uri) + "/api/v1/networkState",
				);
				if (!response.ok)
					throw new Error(`API request failed: ${response.status}`);
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
		if (!addr)
			throw new Error("An address is required to get the balance.");

		const response = await fetch(
			get(explorer_uri) + `/api/v1/addresses/${addr}/balance/confirmed`,
		);
		const data = await response.json();
		balanceMap.set("ERG", data.nanoErgs);
		balance.set(data.nanoErgs);
		data.tokens.forEach((token: { tokenId: string; amount: number }) => {
			balanceMap.set(token.tokenId, token.amount);
		});
		return balanceMap;
	}

	async function connectWallet() {
		if (typeof ergoConnector !== "undefined" && !connect_executed) {
			connect_executed = true;
			console.log("Connect wallet");
			const nautilus = ergoConnector.nautilus;
			if (nautilus && (await nautilus.connect())) {
				address.set(await ergo.get_change_address());
				network.set("ergo-mainnet");
				await get_balance();
				connected.set(true);
			} else {
				alert("Wallet not connected or unavailable");
			}
		}
	}

	onMount(() => {
		if (!browser) return;

		const init = async () => {
			await connectWallet();
			profile = await fetchProfile(ergo);
		};
		init();

		balanceUpdateInterval = setInterval(updateWalletInfo, 30000);
		scrollingTextElement?.addEventListener(
			"animationiteration",
			handleAnimationIteration,
		);

		return () => {
			if (balanceUpdateInterval) clearInterval(balanceUpdateInterval);
			scrollingTextElement?.removeEventListener(
				"animationiteration",
				handleAnimationIteration,
			);
		};
	});

	connected.subscribe(async (isConnected) => {
		if (isConnected) await updateWalletInfo();
	});

	async function updateWalletInfo() {
		if (typeof ergo === "undefined" || !$connected) return;
		try {
			const walletBalance = await get_balance();
			balance.set(walletBalance.get("ERG") || 0);
			current_height = await get_current_height();
		} catch (error) {
			console.error("Error updating wallet information:", error);
		}
	}

	$: ergInErgs = $balance ? (Number($balance) / 1_000_000_000).toFixed(4) : 0;

	// URL Synchronization
	$: {
		const urlTopic = $page.url.searchParams.get("topic");
		if (urlTopic && urlTopic !== topic_id) {
			topic_id = urlTopic;
		}
	}

	$: {
		if (browser && topic_id) {
			const url = new URL(window.location.href);
			if (url.searchParams.get("topic") !== topic_id) {
				url.searchParams.set("topic", topic_id);
				goto(url.toString(), {
					keepFocus: true,
					replaceState: true,
					noScroll: true,
				});
			}
		}
	}
</script>

<!-- HEADER -->
<div class="navbar-container">
	<div class="navbar-content">
		<a href="/" class="logo-container">Topic Chat</a>
		<div class="flex-1"></div>

		<button
			class="user-icon"
			on:click={() => (showSettingsModal = true)}
			aria-label="Settings"
		>
			<Settings class="w-6 h-6" />
		</button>

		<button
			class="user-icon"
			on:click={() => (showProfileModal = true)}
			aria-label="Open profile"
		>
			<User class="w-6 h-6" />
		</button>
		<div class="theme-toggle"><Theme /></div>
	</div>
</div>

<SettingsModal bind:show={showSettingsModal} />
<ProfileModal
	bind:show={showProfileModal}
	bind:profile
	bind:profile_creation_tx
/>

<main class="container mx-auto px-4 py-8 pb-20">
	<div class="max-w-6xl mx-auto">
		{#if profile_creation_tx}
			<span class="text-muted-foreground">
				<a
					href={`${$web_explorer_uri_tx}${profile_creation_tx}`}
					target="_blank"
					>Profile creation tx: {profile_creation_tx}</a
				>
			</span>
		{:else if !profile}
			<!--Small-->
			<p class="text-sm">
				Tip: Create a profile on the header menu to build your
				reputation
			</p>
		{/if}

		<Forum
			bind:topic_id
			{profile}
			{connect_executed}
			spam_limit={SPAM_LIMIT}
			{web_explorer_uri_tx}
			{web_explorer_uri_addr}
			{web_explorer_uri_tkn}
			{explorer_uri}
			forum_explorer_url={$page.url.origin}
			connected={$connected}
			showTopicInput={true}
			maxWidth="100%"
		/>
	</div>
</main>

<footer class="page-footer">
	<div class="footer-center">
		<div bind:this={scrollingTextElement} class="scrolling-text-wrapper">
			{footerMessages[activeMessageIndex]}
		</div>
	</div>
</footer>

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

	.page-footer {
		@apply fixed bottom-0 left-0 right-0 z-40 flex items-center h-12 px-6 border-t text-sm text-muted-foreground;
		background-color: hsl(var(--background) / 0.8);
		backdrop-filter: blur(4px);
	}

	.footer-center {
		@apply flex-1 overflow-hidden;
		-webkit-mask-image: linear-gradient(
			to right,
			transparent,
			black 10%,
			black 90%,
			transparent
		);
		mask-image: linear-gradient(
			to right,
			transparent,
			black 10%,
			black 90%,
			transparent
		);
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
