import { get } from 'svelte/store';
import { type RPBox } from '$lib/ergo/object';
import { explorer_uri } from './envs';
import {
    create_profile,
    create_opinion
} from "reputation-system";

/**
 * Generates or modifies a reputation proof by building and submitting a transaction.
 * This is now a wrapper around the reputation-system library.
 */
export async function generate_reputation_proof(
    token_amount: number,
    total_supply: number,
    type_nft_id: string,
    object_pointer: string | undefined,
    polarization: boolean,
    content: object | string | null,
    is_locked: boolean = false,
    input_proof?: RPBox,
): Promise<string | null> {

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
        return await create_profile(
            explorerUri,
            total_supply,
            type_nft_id,
            content
        );
    } else {
        // Creating an opinion from an existing box
        return await create_opinion(
            explorerUri,
            token_amount,
            type_nft_id,
            object_pointer,
            polarization,
            content,
            is_locked,
            input_proof
        );
    }
}