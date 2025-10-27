<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import Theme from './Theme.svelte';
    import { Button } from "$lib/components/ui/button/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Label } from "$lib/components/ui/label/index.js";
    import {
        threads,
        isLoading,
        error,
        currentProjectId,
        loadThreads,
        postComment,
        replyToComment,
        flagSpam,
        getOrCreateProfileBox
    } from '$lib/ergo/commentStore';
    import { address, connected, balance, network } from "$lib/ergo/store";
    import { explorer_uri } from '$lib/ergo/envs';
    import { fetchProfile } from '$lib/ergo/commentFetch';
    import { type ReputationProof } from '$lib/ergo/object';

    // --- Lógica del Componente de Chat ---
    
    /**
     * Prop: 'comment'.
     * Si 'comment' es 'null', este componente actúa como el contenedor raíz.
     * Si 'comment' es un objeto, renderiza ese comentario y sus respuestas.
     */
    export let comment: any | null = null;

    let profile: ReputationProof | null = null;
    
    // Proyectos simulados
    const projects = [
        { id: "716f6e863f744b9ac22c97ec7b76ea5f5908bc5b2f67c61510bfc4751384ea7a", name: "Proyecto Alpha" },
        { id: "c94a63ec4e9ae8700c671a908bd2121d4c049cec75a40f1309e09ab59d0bbc71", name: "Proyecto Beta" }
    ];

    // Estado local para los formularios
    let newCommentText = "";
    let isPostingComment = false;
    let replyText = "";
    let isReplying = false;
    let isFlagging = false;
    let commentError: string | null = null;
    let showReplyForm = false;

        // --- Estado de la UI ---
    let showWalletInfo = false;
    let current_height: number | null = null;
    let balanceUpdateInterval: number;
    
    // --- Lógica del Footer (Restaurada) ---
    const footerMessages = [
        "Este es un chat descentralizado. Se ejecuta localmente en tu navegador.",
        "Tu identidad (clave) es tuya. Estás en control.",
        "Desarrollado sobre Ergo, asegurando transparencia."
    ];
    let activeMessageIndex = 0;
    let scrollingTextElement: HTMLElement;

    function handleAnimationIteration() {
        activeMessageIndex = (activeMessageIndex + 1) % footerMessages.length;
    }

    // --- Manejadores de Eventos (usan el store) ---

    async function handlePostComment() {
        if (!newCommentText.trim()) return;
        
        isPostingComment = true;
        await postComment(newCommentText); // <-- Llama al store
        newCommentText = ""; // Limpiar formulario
        isPostingComment = false;
    }

    async function handleReply() {
        if (!replyText.trim() || !comment) return;

        isReplying = true;
        commentError = null;
        try {
            await replyToComment(comment.tokenId, replyText); // <-- Llama al store
            replyText = "";
            showReplyForm = false;
        } catch (err: any) {
            commentError = err.message || "Error al enviar la respuesta.";
        } finally {
            isReplying = false;
        }
    }

    async function handleFlag() {
        if (!comment) return;
        isFlagging = true;
        await flagSpam(comment.tokenId); // <-- Llama al store
        isFlagging = false;
    }

    async function handleCreateProfile() {
        if (!profile) {
            getOrCreateProfileBox();
        }
    }
    
    // Reacciona a cambios en el selector de proyecto
    currentProjectId.subscribe((projectId) => {
        if (browser && comment === null) { // Solo la raíz debe cargar hilos
            loadThreads();
        }
    });

    /* function checkKyaScroll(e: Event) {
        const element = e.target as HTMLDivElement;
        if (Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) < 5) {
            isKyaButtonEnabled = true;
        }
    } */

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
                console.error("Could not get network height from the API:", error);
                throw new Error("Cannot get current height.");
            }
        }
    }

    async function get_balance(id?: string): Promise<Map<string, number>> {
        const balanceMap = new Map<string, number>();
        const addr = await ergo.get_change_address();
        if (!addr) throw new Error("An address is required to get the balance.");

        try {
            const response = await fetch(explorer_uri + `/api/v1/addresses/${addr}/balance/confirmed`);
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            const data = await response.json();
            balanceMap.set("ERG", data.nanoErgs);
            balance.set(data.nanoErgs);
            data.tokens.forEach((token: { tokenId: string; amount: number }) => {
                balanceMap.set(token.tokenId, token.amount);
            });
        } catch (error) {
            console.error(`Could not get balance for address ${addr}:`, error);
            throw new Error("Cannot get balance.");
        }
        return balanceMap;
    }

    /* function handleOpenKyaModal() {
        showKyaModal = true;
        isKyaButtonEnabled = false; 
        setTimeout(() => {
            if (kyaContentDiv && kyaContentDiv.scrollHeight <= kyaContentDiv.clientHeight) {
                isKyaButtonEnabled = true;
            }
        }, 0);
    }

    function handleCloseKyaModal() {
        showKyaModal = false;
        localStorage.setItem('acceptedTokenMinterKYA', 'true'); 
    } */

    async function connectWallet() {
        if (typeof ergoConnector !== 'undefined') {
            const nautilus = ergoConnector.nautilus;
            if (nautilus) {
                if (await nautilus.connect()) {
                    console.log('Connected!');
                    address.set(await ergo.get_change_address());
                    network.set("ergo-mainnet");
                    await get_balance();
                    connected.set(true);
                } else {
                    alert('Not connected');
                }
            } else {
                alert('Nautilus wallet is not active');
            }
        }
    }

    onMount(async () => {
        if (!browser) return;

        /*const alreadyAccepted = localStorage.getItem('acceptedTokenMinterKYA') === 'true';
        if (!alreadyAccepted) {
            handleOpenKyaModal();
        } */
        
        await connectWallet();

        profile = await fetchProfile(ergo);
        
        balanceUpdateInterval = setInterval(updateWalletInfo, 30000);
        
        scrollingTextElement?.addEventListener('animationiteration', handleAnimationIteration);

        return () => {
            if (balanceUpdateInterval) clearInterval(balanceUpdateInterval);
            scrollingTextElement?.removeEventListener('animationiteration', handleAnimationIteration);
        }
    });

    connected.subscribe(async (isConnected) => {
        if (isConnected) {
            await updateWalletInfo();
        }
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
    <div class="navbar-container">
        <div class="navbar-content">
            <a href="#" class="logo-container">
                Chat de Proyectos
            </a>
            <div class="flex-1"></div>
            <div class="theme-toggle">
                <Theme />
            </div>
        </div>
    </div>

    <main class="container mx-auto px-4 py-8 pb-20">
        <div class="max-w-3xl mx-auto">

            <div class="mb-8">
                <Label for="project-select" class="text-lg font-semibold">Seleccionar Proyecto</Label>
                <select 
                    id="project-select"
                    bind:value={$currentProjectId}
                    class="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 sm:text-sm"
                >
                    {#each projects as project}
                        <option value={project.id}>{project.name}</option>
                    {/each}
                </select>
            </div>
            
            <h1 class="text-3xl font-bold mb-6">Comentarios del Proyecto</h1>

            {#if profile !== null}
                <div class="mb-6 p-4 bg-green-100 dark:bg-green-900 border border-green-400 rounded-md text-green-800 dark:text-green-200">
                    Your profile id: {profile?.token_id}.
                </div>
            {:else}
                <div class="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 rounded-md text-yellow-800 dark:text-yellow-200">
                    You don't have a reputation profile yet. Participate in the community to earn one!
                </div>

                <form on:submit|preventDefault={handleCreateProfile} class="space-y-4 mb-8">
                    <Button type="submit" class="w-full sm:w-auto">
                        {isPostingComment ? "Creando..." : "Crear Perfil"}
                    </Button>
                </form>
            {/if}

            <form on:submit|preventDefault={handlePostComment} class="space-y-4 mb-8">
                <div>
                    <Label for="newComment">Tu Comentario</Label>
                    <Textarea 
                        id="newComment" 
                        bind:value={newCommentText} 
                        placeholder="Escribe tu comentario aquí..." 
                        rows={4}
                        required 
                    />
                </div>
                <Button type="submit" class="w-full sm:w-auto" disabled={isPostingComment || !newCommentText.trim()}>
                    {isPostingComment ? "Publicando..." : "Publicar Comentario"}
                </Button>
            </form>

            {#if $isLoading}
                <p class="text-muted-foreground">Cargando comentarios...</p>
            {:else if $error}
                <div class="p-4 bg-red-100 dark:bg-red-900 border border-red-400 rounded-md text-red-800 dark:text-red-200">
                    {$error}
                </div>
            {:else if $threads.length === 0}
                <p class="text-muted-foreground text-center py-4">No hay comentarios aún. ¡Sé el primero!</p>
            {:else}
                <div class="space-y-6">
                    {#each $threads as thread (thread.id)}
                        <svelte:self comment={thread} />
                    {/each}
                </div>
            {/if}

        </div>
    </main>

    <footer class="page-footer">
        <div class="footer-left"></div>
        <div class="footer-center">
            <div bind:this={scrollingTextElement} class="scrolling-text-wrapper">
                {footerMessages[activeMessageIndex]}
            </div>
        </div>
        <div class="footer-right"></div>
    </footer>

{:else}
    <div class="comment-container border rounded-md p-4 bg-card">
        <div class="flex justify-between items-center mb-2">
            <span class="font-semibold text-sm">@{comment.authorKey}</span>
            <span class="text-xs text-muted-foreground">
                {new Date(comment.timestamp).toLocaleString()}
            </span>
        </div>
        
        <p class="text-base mb-3">{comment.text}</p>
        
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="sm" on:click={() => showReplyForm = !showReplyForm}>
                {showReplyForm ? 'Cancelar' : 'Responder'}
            </Button>
            <Button variant="ghost" size="sm" class="text-red-500" on:click={handleFlag} disabled={isFlagging}>
                {isFlagging ? 'Marcando...' : 'Marcar Spam'}
            </Button>
        </div>

        {#if commentError}
            <p class_="text-red-500 text-sm mt-2">{commentError}</p>
        {/if}

        {#if showReplyForm}
            <form on:submit|preventDefault={handleReply} class="space-y-3 mt-4">
                <Label for="reply-{comment.tokenId}" class="sr-only">Tu Respuesta</Label>
                <Textarea 
                    id="reply-{comment.tokenId}" 
                    bind:value={replyText}
                    placeholder="Escribe tu respuesta..." 
                    rows={3}
                    required
                />
                <Button type="submit" size="sm" disabled={isReplying || !replyText.trim()}>
                    {isReplying ? 'Enviando...' : 'Enviar Respuesta'}
                </Button>
            </form>
        {/if}

        {#if comment.replies && comment.replies.length > 0}
            <div class="replies-container mt-4 space-y-4">
                {#each comment.replies as reply (reply.tokenId)}
                    <svelte:self comment={reply} />
                {/each}
            </div>
        {/if}
    </div>
{/if}


<style lang="postcss">
    :global(body) {
        background-color: hsl(var(--background));
        /* El padding-bottom se mueve al <main> para mejor control */
    }
    
    .navbar-container {
        @apply sticky top-0 z-50 w-full border-b backdrop-blur-lg;
        background-color: hsl(var(--background) / 0.8);
        border-bottom-color: hsl(var(--border));
    }

    .navbar-content {
        @apply container flex h-16 items-center;
    }

    .logo-container {
        @apply mr-4 flex items-center;
    }

    /* Estilos de Comentarios */
    .comment-container {
        /* Estilos base ya aplicados con clases de Tailwind */
    }

    .replies-container {
        @apply pl-6 border-l-2 border-border;
    }
    
    /* Estilos del Footer (Restaurados) */
    .page-footer {
        @apply fixed bottom-0 left-0 right-0 z-40;
        @apply flex items-center;
        @apply h-12 px-6 gap-6;
        @apply border-t text-sm text-muted-foreground;
        background-color: hsl(var(--background) / 0.8);
        border-top-color: hsl(var(--border));
        backdrop-filter: blur(4px);
    }

    .footer-left,
    .footer-right {
        @apply flex items-center gap-2 flex-shrink-0;
        @apply w-16; 
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