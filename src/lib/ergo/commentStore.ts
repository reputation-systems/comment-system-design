// $lib/commentStore.ts
import { writable, get } from 'svelte/store';
import { reputation_proof } from './store';
import { generate_reputation_proof } from './submit';
// Asumiendo que RPBox se importa así y tiene las propiedades usadas (box_id, token_id, token_amount, is_locked)
import { type RPBox } from '$lib/ergo/object'; 
// Importando la nueva interfaz de comentario
import { type Comment } from './commentObject';
import { fetchComments } from './commentFetch';
import { COMMENT_TYPE_NFT_ID, DISCUSSION_TYPE_NFT_ID, PROFILE_TOTAL_SUPPLY, PROFILE_TYPE_NFT_ID, SPAM_FLAG_NFT_ID } from './envs';

// --- API (Simulada) ---

async function fetchThreadsAPI(projectId: string): Promise<Comment[]> {
    console.log("API: fetchThreads", { projectId });
    
    return await fetchComments(projectId);
}

/**
 * Obtiene la caja principal (con más tokens) del 'reputation_proof' store.
 * Si el store está vacío, intenta crear la prueba de perfil inicial.
 */
export async function getOrCreateProfileBox(): Promise<RPBox> {
    // Asumimos que reputation_proof es un store: { current_boxes: RPBox[] }
    // y que RPBox tiene: { box_id: string, token_id: string, token_amount: number, is_locked: boolean }
    const proof = get(reputation_proof);

    // --- Caso 1: La prueba de perfil NO existe ---
    if (!proof || !proof.current_boxes || proof.current_boxes.length === 0) {
        console.log("No se encontró una prueba de reputación de usuario. Creando prueba de perfil...");

        const profileTxId = await generate_reputation_proof(
            PROFILE_TOTAL_SUPPLY,
            PROFILE_TOTAL_SUPPLY,
            PROFILE_TYPE_NFT_ID,
            undefined,
            true,
            { name: "Anon" },
            false, // La caja de perfil NO debe estar bloqueada
            undefined
        );

        if (!profileTxId) {
            throw new Error("Error fatal: La transacción de creación de perfil falló al enviarse.");
        }
        
        console.warn("Perfil de usuario no encontrado. Se ha creado uno nuevo. Por favor, espera ~2 minutos a que la transacción se confirme e inténtalo de nuevo.");
    }

    // --- Caso 2: La prueba de perfil SÍ existe ---
    const mainBox = proof.current_boxes[0];

    if (mainBox.is_locked) {
        throw new Error("Error: La caja de tu perfil principal está bloqueada (is_locked=true) y no se puede gastar.");
    }
    if (mainBox.token_amount < 1) {
        throw new Error("Error: No te quedan tokens de reputación en tu caja principal para realizar esta acción.");
    }
    
    console.log("Usando la caja de perfil existente como input:", mainBox.box_id, "con token de perfil:", mainBox.token_id);
    return mainBox;
}


// --- APIs Modificadas (sin authorKey, usando nueva interfaz Comment) ---

async function postCommentAPI(projectId: string, text: string): Promise<Comment> {
    console.log("API: postComment", { projectId, text });

    // 1. Obtener la caja de perfil principal para gastar
    const inputProofBox = await getOrCreateProfileBox();

    // 2. Generar la prueba de comentario
    const tx = await generate_reputation_proof(
        1,
        PROFILE_TOTAL_SUPPLY,
        DISCUSSION_TYPE_NFT_ID,  // Ex: Discussion Type NFT ID
        projectId, // El 'target' de la prueba es el ID de la discusión/proyecto
        true,  // Polarización (true/false)
        text,  // Contenido del comentario
        true,  // LOcked,  si no lo está no sería valido
        inputProofBox  // Prueba de reputación (todas las cajas que poseen el token_id del perfil)
    );

    if (!tx) throw new Error("La transacción de comentario falló.");
    console.log("Transacción de comentario enviada, ID:", tx);

    // 4. Simular el nuevo comentario
    // En la vida real, 'id' sería el box_id de la *nueva* caja creada por 'tx'
    const newComment: Comment = {
        id: `sim_box_${Math.random().toString(36).substring(2, 10)}`,
        discussion: projectId,
        authorProfileTokenId: inputProofBox.token_id, // El ID del token del perfil del autor
        text: text,
        timestamp: Date.now(),
        replies: [],
        isSpam: false
    };
    return newComment;
}

async function replyToCommentAPI(parentCommentId: string, projectId: string, text: string): Promise<Comment> {
    console.log("API: replyToComment", { parentCommentId, projectId, text });
    
    // 1. Obtener la caja de perfil principal para gastar
    const inputProofBox = await getOrCreateProfileBox();

    // 2. Generar la prueba de respuesta
    const tx = await generate_reputation_proof(
        1,
        PROFILE_TOTAL_SUPPLY,
        COMMENT_TYPE_NFT_ID,  // Ex: Comment Type NFT ID
        parentCommentId, // El 'target' de la prueba es el 'id' (box_id) del comentario padre
        true,
        text,
        true,
        inputProofBox
    );

    if (!tx) throw new Error("La transacción de respuesta falló.");
    console.log("Transacción de respuesta enviada, ID:", tx);
    
    // 4. Simular la nueva respuesta
    const newReply: Comment = {
        id: `sim_box_${Math.random().toString(36).substring(2, 10)}`,
        discussion: projectId, // La respuesta pertenece a la misma discusión
        authorProfileTokenId: inputProofBox.token_id, // El ID del token del perfil del autor
        text: text,
        timestamp: Date.now(),
        replies: [],
        isSpam: false
    };
    return newReply;
}

async function flagSpamAPI(targetCommentId: string): Promise<{ targetCommentId: string }> {
    console.log("API: flagSpam", { targetCommentId });
        
    // 1. Obtener la caja de perfil principal para gastar
    const inputProofBox = await getOrCreateProfileBox();
        
    // 2. Generar la prueba de spam
    const tx = await generate_reputation_proof(
        1,
        PROFILE_TOTAL_SUPPLY,
        SPAM_FLAG_NFT_ID,  // Ex: Spam Type NFT ID
        targetCommentId, // El 'target' es el 'id' (box_id) del comentario a marcar
        true,
        null,
        true,
        inputProofBox
    );

    if (!tx) throw new Error("La transacción de marcar spam falló.");
    console.log("Transacción de spam enviada, ID:", tx);

    return { targetCommentId };
}

// --- Svelte Store ---

export const threads = writable<Comment[]>([]); // Tipado con Comment[]
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

export async function postComment(text: string) {
    console.log("Publicando comentario:", text);
    let projectId = '';
    currentProjectId.subscribe(id => projectId = id)();

    try {
        // 1. Llama a la API
        const newComment = await postCommentAPI(projectId, text);

        // 2. Actualiza el store localmente
        threads.update(currentThreadList => {
            return [newComment, ...currentThreadList];
        });

    } catch (err: any) {
        console.error("Error al publicar comentario:", err);
        error.set(err.message || "Error al publicar el comentario.");
    }
}

// --- Funciones auxiliares recursivas (Tipadas) ---

/**
 * Añade una respuesta a un comentario padre en cualquier nivel de anidamiento.
 */
function addReplyToThread(threadsList: Comment[], parentId: string, newReply: Comment): Comment[] {
    return threadsList.map(comment => {
        // 1. Encontramos el padre
        if (comment.id === parentId) { // <- Comparando con 'id'
            return {
                ...comment,
                replies: [newReply, ...(comment.replies || [])]
            };
        }
        
        // 2. Si no es el padre, buscamos en sus respuestas
        if (comment.replies && comment.replies.length > 0) {
            return {
                ...comment,
                replies: addReplyToThread(comment.replies, parentId, newReply)
            };
        }
        
        return comment;
    });
}

/**
 * Marca un comentario como spam en cualquier nivel de anidamiento.
 */
function flagCommentAsSpam(threadsList: Comment[], targetId: string): Comment[] {
    return threadsList.map(comment => {
        if (comment.id === targetId) { // <- Comparando con 'id'
            return { ...comment, isSpam: true, text: "[Comentario marcado como spam]" };
        }
        if (comment.replies && comment.replies.length > 0) {
            return { ...comment, replies: flagCommentAsSpam(comment.replies, targetId) };
        }
        return comment;
    });
}


export async function replyToComment(parentCommentId: string, text: string) {
    console.log("Respondiendo a comentario:", parentCommentId, text);
    // Necesitamos el projectId para pasarlo a la API y que la respuesta
    // simulada tenga el campo 'discussion' correcto.
    let projectId = '';
    currentProjectId.subscribe(id => projectId = id)();

    try {
        // 1. Llama a la API (sin authorKey, con projectId)
        const newReply = await replyToCommentAPI(parentCommentId, projectId, text);

        // 2. Actualiza el store localmente
        threads.update(currentThreadList => {
            return addReplyToThread(currentThreadList, parentCommentId, newReply);
        });

    } catch (err: any) {
        console.error("Error al responder:", err);
        error.set(err.message || "Error al responder.");
    }
}

export async function flagSpam(targetCommentId: string) {
    console.log("Marcando como spam:", targetCommentId);

    try {
        // 1. Llama a la API (sin authorKey)
        const { targetTokenId: confirmedId } = await flagSpamAPI(targetCommentId);
        
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