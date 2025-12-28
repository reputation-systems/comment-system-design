import { type RPBox } from './object';
/**
 * Generates or modifies a reputation proof by building and submitting a transaction.
 * This is now a wrapper around the ergo-reputation-system library.
 */
export declare function generate_reputation_proof(token_amount: number, total_supply: number, type_nft_id: string, object_pointer: string | undefined, polarization: boolean, content: object | string | null, is_locked?: boolean, input_proof?: RPBox): Promise<string | null>;
