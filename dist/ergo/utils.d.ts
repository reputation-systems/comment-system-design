import { type Box, type InputBox, type Amount } from '@fleet-sdk/core';
export declare function hexToUtf8(hexString: string): string | null;
export declare function generate_pk_proposition(wallet_pk: string): string;
export declare function SString(value: string): string;
export declare function uint8ArrayToHex(array: Uint8Array): string;
export declare function parseLongColl(renderedValue: any): bigint[] | null;
export declare function hexToBytes(hexString: string | undefined | null): Uint8Array | null;
export declare function parseIntFromRendered(renderedValue: any): number | null;
export declare function parseCollByteToHex(renderedValue: any): string | null;
export declare function parseIntFromHex(renderedValue: any): number | null;
export declare function utf8StringToCollByteHex(inputString: string): string;
export declare function bigintToLongByteArray(value: bigint): Uint8Array;
export declare function parseBox(e: Box<Amount>): InputBox;
/**
 * A utility function to convert a serialized value to its "rendered" format (for debugging/display).
 * This is a simplification and may not cover all Ergo types.
 * @param serializedValue The full serialized hex string.
 * @returns A simplified hex string.
 */
export declare function serializedToRendered(serializedValue: string): string;
/**
 * Converts a JavaScript string directly to its "rendered" hex format.
 * This is a convenience function that combines stringToSerialized and serializedToRendered.
 * @param value The string to convert.
 * @returns The simplified, rendered hex string.
 */
export declare function stringToRendered(value: string): string;
export declare function pkHexToBase58Address(pkHex?: string): string;
