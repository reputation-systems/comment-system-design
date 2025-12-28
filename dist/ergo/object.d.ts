import { type ReputationProof, type RPBox, type TypeNFT } from "ergo-reputation-system";
export { type ReputationProof, type RPBox, type TypeNFT };
export declare function token_rendered(proof: ReputationProof): string;
export declare enum Network {
    ErgoTestnet = "ergo-testnet",
    ErgoMainnet = "ergo",
    BitcoinTestnet = "btc-testnet",
    BitcoinMainnet = "btc"
}
export declare function compute(proof: ReputationProof, target_object_pointer: string): number;
