// $lib/commentStore.ts
import { writable } from 'svelte/store';
import { generate_reputation_proof } from './submit';

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


// La API ahora devuelve el objeto de comentario creado, no solo un string.
async function postCommentAPI(projectId: string, authorKey: string, text: string): Promise<any> {
    console.log("API: postComment", { projectId, authorKey, text });

    const tx = await generate_reputation_proof(
        1,
        1,
        "273f60541e8869216ee6aed5552e522d9bea29a69d88e567d089dc834da227cf",  // Ex: Discussion Type NFT ID
        projectId,
        true,  // polarization
        text,
        true, // is_locked
        undefined  //  Cada vez una nueva prueba.
    );

    console.log("Transacción de comentario enviada, ID:", tx);
    
    // Simula el nuevo comentario que el backend crearía y devolvería
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

// La API de respuesta también devuelve el objeto de respuesta creado.
async function replyToCommentAPI(parentTokenId: string, authorKey: string, text: string): Promise<any> {
    console.log("API: replyToComment", { parentTokenId, authorKey, text });
    
    const tx = await generate_reputation_proof(
        1,
        1,
        "6c1ec833dc4aff98458b60e278fc9a0161274671d6a0c36a7429216ca99c3267",  // Ex: Comment Type NFT ID
        parentTokenId,
        true,  // polarization
        text,
        true, // is_locked
        undefined  //  Cada vez una nueva prueba.
    );
    
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

// La API de spam devuelve el ID del token marcado para confirmar.
async function flagSpamAPI(targetTokenId: string, authorKey: string): Promise<{ targetTokenId: string }> {
    console.log("API: flagSpam", { targetTokenId, authorKey });
        
    const tx = await generate_reputation_proof(
        1,
        1,
        "89505ed416ad43f2dc4b3c8d0eb949e6ba9993436ceb154a58645f1484e1437a",  // Ex: Spam Type NFT ID
        targetTokenId,
        true,  // polarization
        null,  // No content needed for spam flagging -  Could be spam reason.
        true, // is_locked
        undefined  //  Cada vez una nueva prueba.
    );

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
        // 1. Llama a la API y obtén el objeto del nuevo comentario
        const newComment = await postCommentAPI(projectId, authorKey, text);

        // 2. Actualiza el store localmente
        threads.update(currentThreadList => {
            // Añade el nuevo comentario al principio de la lista
            return [newComment, ...currentThreadList];
        });

    } catch (err: any) {
        console.error("Error al publicar comentario:", err);
        error.set(err.message || "Error al publicar el comentario.");
        // Opcional: revertir la actualización optimista si falló
    }
}

// --- Funciones auxiliares recursivas para actualizar el estado anidado ---

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
        // 1. Llama a la API y obtén el objeto de la nueva respuesta
        const newReply = await replyToCommentAPI(parentTokenId, authorKey, text);

        // 2. Actualiza el store localmente usando la función recursiva
        threads.update(currentThreadList => {
            return addReplyToThread(currentThreadList, parentTokenId, newReply);
        });

    } catch (err: any) {
        console.error("Error al responder:", err);
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
    }
}