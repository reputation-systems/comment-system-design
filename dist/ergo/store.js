import { writable } from 'svelte/store';
export const address = writable(null);
export const network = writable(null);
export const connected = writable(false);
export const balance = writable(null);
// App logic stores
export const compute_deep_level = writable(5);
export const searchStore = writable(null);
export const data_store = writable(null);
export const types = writable(new Map());
// Main store for holding fetched reputation proofs, keyed by token ID.
export const proofs = writable(new Map());
export const reputation_proof = writable(null);
