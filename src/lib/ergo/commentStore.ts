// $lib/commentStore.ts
import { writable, get } from 'svelte/store';
import { reputation_proof } from './store';
import { generate_reputation_proof } from './submit';
import { type RPBox } from '$lib/ergo/object';

// --- API (Simulada) ---
// ... (fetchThreadsAPI se mantiene igual)
async function fetchThreadsAPI(projectId: string): Promise<any[]> {
    console.log("API: fetchThreads", { projectId });
    await new Promise(r => setTimeout(r, 700));
    
    if (projectId === 'project_b') {
        return [
            {
                tokenId: "comment_b1",
                authorKey: "user_dev",
                text: "Este es un comentario sobre el Proyecto B.",
                timestamp: Date.now() - 10000,
                replies: [],
                isSpam: false,
            }
        ];
    }
    return [
        {
            tokenId: "comment_a1",
            authorKey: "user_abc",
            text: "Este es el primer comentario (Proyecto A).",
            timestamp: Date.now() - 200000,
            replies: [
                {
                    tokenId: "comment_a3",
                    authorKey: "user_xyz",
                    text: "¡Me parece genial!",
                    timestamp: Date.now() - 150000,
                    replies: [],
                    isSpam: false,
                }
            ],
            isSpam: false,
        },
        {
            tokenId: "comment_a2",
            authorKey: "user_123",
            text: "Tengo una pregunta.",
            timestamp: Date.now() - 50000,
            replies: [],
            isSpam: false,
        }
    ];
}

// --- Constantes de Prueba de Reputación de Perfil ---
// (Valores de ejemplo)
const PROFILE_TYPE_NFT_ID = "1820fd428a0b92d61ce3f86cd98240fdeeee8a392900f0b19a2e017d66f79926";
const PROFILE_TOTAL_SUPPLY = 99999999;

/**
 * Obtiene la caja principal (con más tokens) del 'reputation_proof' store.
 * Si el store está vacío, intenta crear la prueba de perfil inicial.
 */
async function getOrCreateProfileBox(): Promise<RPBox> {
    const proof = get(reputation_proof);

    // --- Caso 1: La prueba de perfil NO existe ---
    if (!proof || proof.current_boxes.length === 0) {
        console.log("No se encontró una prueba de reputación de usuario. Creando prueba de perfil...");

        // Llama a generate_reputation_proof para MINTAR la prueba de perfil
        const profileTxId = await generate_reputation_proof(
            PROFILE_TOTAL_SUPPLY,
            PROFILE_TOTAL_SUPPLY,
            PROFILE_TYPE_NFT_ID,  // Forum Profile Type NFT ID
            undefined, // Se apuntará a sí mismo por defecto
            true,  // polarization
            JSON.stringify({ name: "Anon" }), // Contenido del perfil
            false, // La caja de perfil NO debe estar bloqueada para poder gastarla
            undefined  // Una nueva prueba
        );

        if (!profileTxId) {
            throw new Error("Error fatal: La transacción de creación de perfil falló al enviarse.");
        }

        // --- PROBLEMA DE SIMULACIÓN ---
        // En una app real, acabamos de enviar la Tx. No tenemos la caja resultante.
        // Debemos esperar a que se confirme y luego poblar el 'reputation_proof' store.
        // Por ahora, lanzamos un error al usuario pidiéndole que espere.
        throw new Error("Perfil de usuario no encontrado. Se ha creado uno nuevo. Por favor, espera ~2 minutos a que la transacción se confirme e inténtalo de nuevo.");
    }

    // --- Caso 2: La prueba de perfil SÍ existe ---
    // Buscamos la caja principal (la que tiene más tokens, que es la que se gasta)
    const mainBox = proof.current_boxes.sort((a, b) => b.token_amount - a.token_amount)[0];

    if (mainBox.is_locked) {
        throw new Error("Error: La caja de tu perfil principal está bloqueada (is_locked=true) y no se puede gastar.");
    }
    if (mainBox.token_amount < 1) {
        throw new Error("Error: No te quedan tokens de reputación en tu caja principal para realizar esta acción.");
    }
    
    console.log("Usando la caja de perfil existente como input:", mainBox.box_id);
    return mainBox;
}


// --- APIs Modificadas ---

async function postCommentAPI(projectId: string, authorKey: string, text: string): Promise<any> {
    console.log("API: postComment", { projectId, authorKey, text });

    // 1. Obtener la caja de perfil principal para gastar
    const inputProofBox = await getOrCreateProfileBox();

    // 2. Generar la prueba de comentario usando la caja de perfil como input
    const tx = await generate_reputation_proof(
        1,  // 1 token para este comentario
        PROFILE_TOTAL_SUPPLY, // (Ignorado por submit.ts cuando input_proof existe)
        "273f60541e8869216ee6aed5552e522d9bea29a69d88e567d089dc834da227cf",  // Ex: Discussion Type NFT ID
        projectId,
        true,  // polarization
        text,
        true, // is_locked (la caja de comentario SÍ puede estar bloqueada)
        inputProofBox  // <-- La caja de perfil se pasa como input
    );

    if (!tx) throw new Error("La transacción de comentario falló.");
    console.log("Transacción de comentario enviada, ID:", tx);

    // 4. Simular el nuevo comentario
    const newComment = {
        tokenId: `comment_${Math.random().toString(36).substring(2, 10)}`,
        authorKey: authorKey,
        text: text,
        timestamp: Date.now(),
        replies: [],
        isSpam: false
    };
    return newComment;
}

async function replyToCommentAPI(parentTokenId: string, authorKey: string, text: string): Promise<any> {
    console.log("API: replyToComment", { parentTokenId, authorKey, text });
    
    // 1. Obtener la caja de perfil principal para gastar
    const inputProofBox = await getOrCreateProfileBox();

    // 2. Generar la prueba de respuesta usando la caja de perfil como input
    const tx = await generate_reputation_proof(
        1, // 1 token para esta respuesta
        PROFILE_TOTAL_SUPPLY,
        "6c1ec833dc4aff98458b60e278fc9a0161274671d6a0c36a7429216ca99c3267",  // Ex: Comment Type NFT ID
        parentTokenId,
        true,  // polarization
        text,
        true, // is_locked
        inputProofBox // <-- La caja de perfil se pasa como input
    );

    if (!tx) throw new Error("La transacción de respuesta falló.");
    console.log("Transacción de respuesta enviada, ID:", tx);
    
    // 4. Simular la nueva respuesta
    const newReply = {
        tokenId: `comment_${Math.random().toString(36).substring(2, 10)}`,
        authorKey: authorKey,
        text: text,
        timestamp: Date.now(),
        replies: [],
        isSpam: false
    };
    return newReply;
}

async function flagSpamAPI(targetTokenId: string, authorKey: string): Promise<{ targetTokenId: string }> {
    console.log("API: flagSpam", { targetTokenId, authorKey });
        
    // 1. Obtener la caja de perfil principal para gastar
    const inputProofBox = await getOrCreateProfileBox();
        
    // 2. Generar la prueba de spam usando la caja de perfil como input
    const tx = await generate_reputation_proof(
        1, // 1 token para marcar spam
        PROFILE_TOTAL_SUPPLY,
        "89505ed416ad43f2dc4b3c8d0eb949e6ba9993436ceb154a58645f1484e1437a",  // Ex: Spam Type NFT ID
        targetTokenId,
        true,  // polarization
        null,  // No content needed for spam flagging
        true, // is_locked
        inputProofBox // <-- La caja de perfil se pasa como input
    );

    if (!tx) throw new Error("La transacción de marcar spam falló.");
    console.log("Transacción de spam enviada, ID:", tx);

    return { targetTokenId };
}

// --- Svelte Store ---

const authorKey: string = "my_user_key_456";

export const threads = writable<any[]>([]);
export const isLoading = writable<boolean>(true);
export const error = writable<string | null>(null);
export const currentProjectId = writable<string>("project_a");

export async function loadThreads() {
    isLoading.set(true);
    error.set(null);
    let projectId = '';
    currentProjectId.subscribe(id => projectId = id)();

    try {
        const data = await fetchThreadsAPI(projectId);
        data.sort((a, b) => b.timestamp - a.timestamp);
        threads.set(data);
    } catch (err: any) {
        error.set(err.message || "Error al cargar los comentarios.");
    } finally {
        isLoading.set(false);
    }
}

// postComment ahora usa threads.update() en lugar de loadThreads()
export async function postComment(text: string) {
    console.log("Publicando comentario:", text);
    let projectId = '';
    currentProjectId.subscribe(id => projectId = id)();

    try {
        // 1. Llama a la API (modificada) y obtén el objeto del nuevo comentario
        const newComment = await postCommentAPI(projectId, authorKey, text);

        // 2. Actualiza el store localmente
        threads.update(currentThreadList => {
            // Añade el nuevo comentario al principio de la lista
            return [newComment, ...currentThreadList];
        });

    } catch (err: any) {
        console.error("Error al publicar comentario:", err);
        // Mostrar el error de "espera 2 minutos" al usuario
        error.set(err.message || "Error al publicar el comentario.");
    }
}

// --- Funciones auxiliares recursivas ---

/**
 * Añade una respuesta a un comentario padre en cualquier nivel de anidamiento.
 */
function addReplyToThread(threadsList: any[], parentId: string, newReply: any): any[] {
    return threadsList.map(comment => {
        // 1. Encontramos el padre
        if (comment.tokenId === parentId) {
            return {
                ...comment,
                replies: [newReply, ...(comment.replies || [])] // Añadir al principio
            };
        }
        
        // 2. Si no es el padre, buscamos en sus respuestas
        if (comment.replies && comment.replies.length > 0) {
            return {
                ...comment,
                replies: addReplyToThread(comment.replies, parentId, newReply)
            };
        }
        
        // 3. No es el padre y no tiene respuestas
        return comment;
    });
}

/**
 * Marca un comentario como spam en cualquier nivel de anidamiento.
 */
function flagCommentAsSpam(threadsList: any[], targetId: string): any[] {
    return threadsList.map(comment => {
        if (comment.tokenId === targetId) {
            // Marca como spam y opcionalmente oculta el texto
            return { ...comment, isSpam: true, text: "[Comentario marcado como spam]" };
        }
        if (comment.replies && comment.replies.length > 0) {
            return { ...comment, replies: flagCommentAsSpam(comment.replies, targetId) };
        }
        return comment;
    });
}


// replyToComment ahora usa la función auxiliar recursiva
export async function replyToComment(parentTokenId: string, text: string) {
    console.log("Respondiendo a comentario:", parentTokenId, text);

    try {
        // 1. Llama a la API (modificada) y obtén el objeto de la nueva respuesta
        const newReply = await replyToCommentAPI(parentTokenId, authorKey, text);

        // 2. Actualiza el store localmente usando la función recursiva
        threads.update(currentThreadList => {
            return addReplyToThread(currentThreadList, parentTokenId, newReply);
        });

    } catch (err: any) {
        console.error("Error al responder:", err);
        error.set(err.message || "Error al responder.");
    }
}

// flagSpam ahora usa la función auxiliar recursiva
export async function flagSpam(targetTokenId: string) {
    console.log("Marcando como spam:", targetTokenId);

    try {
        const { targetTokenId: confirmedId } = await flagSpamAPI(targetTokenId, authorKey);
        
        if (confirmedId) {
            threads.update(currentThreadList => {
                return flagCommentAsSpam(currentThreadList, confirmedId);
            });
        }
    } catch (err: any) {
        console.error("Error al marcar como spam:", err);
        error.set(err.message || "Error al marcar como spam.");
    }
}