import { get } from 'svelte/store';
import { explorer_uri } from './envs';
import { create_profile, create_opinion } from "ergo-reputation-system";
/**
 * Generates or modifies a reputation proof by building and submitting a transaction.
 * This is now a wrapper around the ergo-reputation-system library.
 */
export async function generate_reputation_proof(token_amount, total_supply, type_nft_id, object_pointer, polarization, content, is_locked = false, input_proof) {
    console.log("Generating reputation proof (via library) with parameters:", {
        token_amount,
        total_supply,
        type_nft_id,
        object_pointer,
        polarization,
        content,
        is_locked,
        input_proof
    });
    const explorerUri = get(explorer_uri);
    if (!input_proof) {
        // Minting a new profile
        return await create_profile(explorerUri, total_supply, type_nft_id, content);
    }
    else {
        // Creating an opinion from an existing box
        return await create_opinion(explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked, input_proof);
    }
}
