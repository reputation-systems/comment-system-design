import { Network, type RPBox, type ReputationProof, type TypeNFT } from "$lib/ergo/object";
import { hexToBytes, hexToUtf8, serializedToRendered, SString } from "$lib/ergo/utils";
import { get } from "svelte/store";
import { connected, proofs, reputation_proof, types } from "./store";
import { explorer_uri, PROFILE_TYPE_NFT_ID } from "./envs";
import { digital_public_good_contract_hash, ergo_tree, ergo_tree_hash } from "$lib/ergo/contract";
import { ErgoAddress, SByte, SColl } from "@fleet-sdk/core";

type RegisterValue = { renderedValue: string; serializedValue: string; };
type ApiBox = {
    boxId: string; value: string | bigint; assets: { tokenId: string; amount: string | bigint }[]; ergoTree: string; creationHeight: number;
    additionalRegisters: {
        R4?: RegisterValue; R5?: RegisterValue; R6?: RegisterValue; R7?: RegisterValue; R8?: RegisterValue; R9?: RegisterValue;
    };
    index: number; transactionId: string;
};

export async function fetchTypeNfts() {
    try {
        const fetchedTypesArray: TypeNFT[] = [];
        let offset = 0;
        const limit = 100;
        let moreDataAvailable = true;

        while (moreDataAvailable) {
            const url = `${explorer_uri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
            const body = { "ergoTreeTemplateHash": digital_public_good_contract_hash };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                moreDataAvailable = false;
                console.error("Failed to fetch a page of type boxes from the explorer.");
                continue;
            }
            
            const data = await response.json();
            if (data.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }

            const pageTypes = data.items.map((box: any): TypeNFT | null => {
                if (!box.assets || box.assets.length === 0) return null;
                return {
                    tokenId: box.assets[0].tokenId,
                    boxId: box.boxId,
                    typeName: hexToUtf8(box.additionalRegisters.R4?.renderedValue || '') ?? "",
                    description: hexToUtf8(box.additionalRegisters.R5?.renderedValue || '') ?? "",
                    schemaURI: hexToUtf8(box.additionalRegisters.R6?.renderedValue || '') ?? "",
                    isRepProof: box.additionalRegisters.R7?.renderedValue ?? false,
                };
            }).filter((t: TypeNFT | null): t is TypeNFT => t !== null);
            
            fetchedTypesArray.push(...pageTypes);
            offset += limit;
        }
        
        const typesMap = new Map(fetchedTypesArray.map(type => [type.tokenId, type]));
        types.set(typesMap);
        console.log(`Successfully fetched and stored ${typesMap.size} Type NFTs.`);

    } catch (e: any) {
        console.error("Failed to fetch and store types:", e);
        types.set(new Map());
    }
}

export async function updateReputationProofList(
    ergo: any, 
    all: boolean, 
    search: string | null
): Promise<Map<string, ReputationProof>> {

    await fetchTypeNfts();
    const availableTypes = get(types);

    if (!get(connected)) all = true;

    const proofs = new Map<string, ReputationProof>();
    const search_bodies = [];
    let r7_filter = {};
    let userR7SerializedHex: string | null = null;

    const change_address = get(connected) && ergo ? await ergo.get_change_address() : null;
    if (change_address) {
        const userAddress = ErgoAddress.fromBase58(change_address);
        const propositionBytes = hexToBytes(userAddress.ergoTree);

        if (propositionBytes) {
            userR7SerializedHex = SColl(SByte, propositionBytes).toHex();
            if (!all) {
                r7_filter = { "R7": userR7SerializedHex };
            }
        }
    }

    if (search) {
        // Search by asset (token ID)
        search_bodies.push({ assets: [search] });
        // Search by R5 (string content)
        search_bodies.push({ registers: { "R5": SString(search) } });
        // If search term is a valid token ID, search by R4 (Coll[Byte])
        if (search.length === 64 && /^[0-9a-fA-F]+$/.test(search)) {
            search_bodies.push({ registers: { "R4": SColl(SByte, hexToBytes(search) ?? "").toHex() }});
        }
    } else {
        search_bodies.push({});
    }

    try {
        for (const body_part of search_bodies) {
            let offset = 0, limit = 100, moreDataAvailable = true;
            while (moreDataAvailable) {
                const url = `${explorer_uri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
                const final_body = { "ergoTreeTemplateHash": ergo_tree_hash, "registers": { ...(body_part.registers || {}), ...r7_filter }, "assets": body_part.assets || [] };
                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(final_body) });

                if (!response.ok) { moreDataAvailable = false; continue; }
                const json_data = await response.json();
                if (json_data.items.length === 0) { moreDataAvailable = false; continue; }

                for (const box of json_data.items as ApiBox[]) {
                    if (box.ergoTree != ergo_tree) continue
                    if (!box.assets?.length || !box.additionalRegisters.R4 || !box.additionalRegisters.R6 || !box.additionalRegisters.R7) continue;

                    const rep_token_id = box.assets[0].tokenId;
                    const owner_serialized = box.additionalRegisters.R7.serializedValue;

                    let proof = proofs.get(rep_token_id);

                    if (proof && proof.owner_serialized !== owner_serialized) {
                        console.warn(`Reputation Proof with token ID ${rep_token_id} has conflicting owner hashes. Skipping this proof.`, {
                            expectedOwnerHash: proof.owner_serialized,
                            foundOwnerHash: owner_serialized,
                            conflictingBox: box.boxId
                        });
                        proofs.delete(rep_token_id);
                        continue;
                    }

                    if (!proof) {
                        const tokenResponse = await fetch(`${explorer_uri}/api/v1/tokens/${rep_token_id}`);
                        if (!tokenResponse.ok) {
                            console.error(`Error al obtener la cantidad emitida del token ${rep_token_id}`);
                            continue;
                        }
                        const tokenData = await tokenResponse.json();
                        const emissionAmount = Number(tokenData.emissionAmount || 0);

                        proof = {
                            token_id: rep_token_id,
                            type: { tokenId: "", boxId: '', typeName: "N/A", description: "...", schemaURI: "", isRepProof: false },
                            total_amount: emissionAmount,
                            owner_address: serializedToRendered(owner_serialized),
                            owner_serialized: owner_serialized,
                            can_be_spend: userR7SerializedHex ? owner_serialized === userR7SerializedHex : false,
                            current_boxes: [],
                            number_of_boxes: 0,
                            network: Network.ErgoMainnet,
                            data: {}
                        };
                        proofs.set(rep_token_id, proof);
                    }

                    const type_nft_id_for_box = box.additionalRegisters.R4.renderedValue ?? "";
                    let typeNftForBox = availableTypes.get(type_nft_id_for_box);
                    if (!typeNftForBox) {
                        typeNftForBox = { tokenId: type_nft_id_for_box, boxId: '', typeName: "Unknown Type", description: "Metadata not found", schemaURI: "", isRepProof: false };
                    }
                    
                    let box_content: string|object|null = {};
                    try {
                        const rawValue = box.additionalRegisters.R9?.renderedValue;
                        if (rawValue) {
                            const potentialString = hexToUtf8(rawValue);
                            try {
                                box_content = JSON.parse(potentialString ?? "");
                            } catch (jsonError) {
                                box_content = potentialString;
                            }
                        }
                    } catch (error) {
                        box_content = {};
                    }
                    
                    const object_pointer_for_box = hexToUtf8(box.additionalRegisters.R5?.renderedValue ?? "") ?? "";

                    const current_box: RPBox = {
                        box: {
                            boxId: box.boxId, value: box.value, assets: box.assets, ergoTree: box.ergoTree, creationHeight: box.creationHeight,
                            additionalRegisters: Object.entries(box.additionalRegisters).reduce((acc, [key, value]) => { acc[key] = value.serializedValue; return acc; }, {} as { [key: string]: string; }),
                            index: box.index, transactionId: box.transactionId
                        },
                        box_id: box.boxId,
                        type: typeNftForBox,
                        token_id: rep_token_id,
                        token_amount: Number(box.assets[0].amount),
                        object_pointer: object_pointer_for_box,
                        is_locked: box.additionalRegisters.R6.renderedValue === 'true',
                        polarization: box.additionalRegisters.R8?.renderedValue === 'true',
                        content: box_content,
                    };
                    
                    if (current_box.object_pointer === proof.token_id) {
                        proof.type = typeNftForBox;
                    }

                    proof.current_boxes.push(current_box);
                    proof.number_of_boxes += 1;
                }
                offset += limit;
            }
        }
        return proofs;
    } catch (error) {
        console.error('An error occurred during the reputation proof search:', error);
        return new Map();
    }
}

/**
 * Obtiene el objeto ReputationProof completo del usuario conectado,
 * buscando todas las cajas donde R7 coincida con su dirección.
 * * @param ergo El objeto de la billetera conectada (ej. dApp Connector)
 */
export async function fetchProfile(ergo: any) {

    // 1. Obtener la dirección de cambio y calcular el R7 serializado
    let userR7SerializedHex: string;
    let change_address: string;
    
    if (!ergo) {
        console.error("fetchProfile: El objeto 'ergo' no está disponible.");
        return null;
    }

    try {
        change_address = await ergo.get_change_address();
        if (!change_address) {
            console.warn("fetchProfile: No se pudo obtener la dirección de cambio.");
            return null;
        }
        
        const userAddress = ErgoAddress.fromBase58(change_address);
        const propositionBytes = hexToBytes(userAddress.ergoTree);
        
        if (!propositionBytes) {
            console.error("fetchProfile: No se pudieron obtener los propositionBytes.");
            return null;
        }
        
        userR7SerializedHex = SColl(SByte, propositionBytes).toHex();
        
    } catch (e) {
        console.error("fetchProfile: Error al obtener la dirección del usuario", e);
        return null;
    }

    console.log(`Buscando perfil para R7: ${userR7SerializedHex}`);

    // 2. Definir el cuerpo de la búsqueda (solo por R7 y el hash del contrato)
    const search_body = {
        registers: { 
            "R7": userR7SerializedHex
        }
    }
    
    const all_user_boxes: ApiBox[] = [];

    try {
        // 3. Bucle de paginación para obtener TODAS las cajas del usuario
        let offset = 0, limit = 100, moreDataAvailable = true;
        
        while (moreDataAvailable) {
            const url = `${explorer_uri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
            const final_body = { 
                "ergoTreeTemplateHash": ergo_tree_hash, 
                "registers": search_body.registers,
                "assets": [] 
            };
            
            const response = await fetch(url, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(final_body) 
            });

            if (!response.ok) {
                console.error(`Error al buscar perfil: ${response.statusText}`);
                moreDataAvailable = false;
                continue;
            }

            const json_data = await response.json();
            if (!json_data.items || json_data.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }

            all_user_boxes.push(...json_data.items as ApiBox[]);
            offset += limit;
        }

        // 4. Si no se encontraron cajas, el usuario no tiene perfil
        if (all_user_boxes.length === 0) {
            console.log("No se encontró ninguna caja de perfil para este usuario.");
            return null;
        }

        // 5. Encontrar el Token ID del perfil y obtener su total_amount
        // Asumimos que todas las cajas pertenecen al mismo token
        const profileTokenId = all_user_boxes[0].assets[0].tokenId;

        const tokenResponse = await fetch(`${explorer_uri}/api/v1/tokens/${profileTokenId}`);
        if (!tokenResponse.ok) {
            console.error(`Error al obtener la cantidad emitida del token ${profileTokenId}`);
            return null; // Error crítico
        }
        const tokenData = await tokenResponse.json();
        const emissionAmount = Number(tokenData.emissionAmount || 0);

        // 6. Construir el objeto ReputationProof base
        const proof: ReputationProof = {
            token_id: profileTokenId,
            // El 'type' y 'data' se llenarán al encontrar la caja de perfil principal
            type: { tokenId: "", boxId: '', typeName: "N/A", description: "...", schemaURI: "", isRepProof: false },
            data: null,
            total_amount: emissionAmount,
            owner_address: change_address,
            owner_serialized: userR7SerializedHex,
            can_be_spend: true, // Encontramos las cajas por su R7, así que puede gastarlas
            current_boxes: [],
            number_of_boxes: 0,
            network: Network.ErgoMainnet, // Asumir Mainnet
        };

        // 7. Iterar sobre todas las cajas encontradas y convertirlas a RPBox
        for (const box of all_user_boxes) {
            
            // Validar que la caja realmente pertenezca a este token de perfil
            if (!box.assets?.length || box.assets[0].tokenId !== profileTokenId) {
                console.warn(`Caja ${box.boxId} tiene R7 del usuario pero un token ID diferente. Omitiendo.`);
                continue;
            }

            // Validar que tenga los registros mínimos
            if (!box.additionalRegisters.R4 || !box.additionalRegisters.R5 || !box.additionalRegisters.R6) {
                console.warn(`Caja ${box.boxId} omitida por falta de registros R4, R5 o R6.`);
                continue;
            }

            const type_nft_id_for_box = box.additionalRegisters.R4.renderedValue ?? "";
            
            // TODO: Idealmente, aquí se buscaría la metadata del TypeNFT
            // Por ahora, usamos un placeholder.
            let typeNftForBox: TypeNFT = { 
                tokenId: type_nft_id_for_box, 
                boxId: '', 
                typeName: "Unknown Type", 
                description: "...", 
                schemaURI: "", 
                isRepProof: false 
            };
            if (type_nft_id_for_box === PROFILE_TYPE_NFT_ID) {
                typeNftForBox.typeName = "Profile";
            }

            // Extraer contenido de R9
            let box_content: string|object|null = null;
            try {
                const rawValue = box.additionalRegisters.R9?.renderedValue;
                if (rawValue) {
                    const potentialString = hexToUtf8(rawValue);
                    try {
                        // Intentar parsear como JSON (para el perfil)
                        box_content = JSON.parse(potentialString ?? "");
                    } catch (jsonError) {
                        // Si falla, tratarlo como texto plano (para comentarios)
                        box_content = potentialString;
                    }
                }
            } catch (error) {
                box_content = null;
            }

            // Extraer puntero de R5
            const object_pointer_for_box = hexToUtf8(box.additionalRegisters.R5?.renderedValue ?? "") ?? "";

            // Construir el objeto RPBox
            const current_box: RPBox = {
                box: {
                    boxId: box.boxId, value: box.value, assets: box.assets, ergoTree: box.ergoTree, creationHeight: box.creationHeight,
                    // Convertir registros a formato serializado simple
                    additionalRegisters: Object.entries(box.additionalRegisters).reduce((acc, [key, value]) => { acc[key] = value.serializedValue; return acc; }, {} as { [key: string]: string; }),
                    index: box.index, transactionId: box.transactionId
                },
                box_id: box.boxId,
                type: typeNftForBox,
                token_id: profileTokenId,
                token_amount: Number(box.assets[0].amount),
                object_pointer: object_pointer_for_box,
                is_locked: box.additionalRegisters.R6.renderedValue === 'true',
                polarization: box.additionalRegisters.R8?.renderedValue === 'true',
                content: box_content,
            };

            // 8. Si esta es la caja de perfil principal (apunta a sí misma), actualizar el 'proof'
            if (current_box.object_pointer === proof.token_id && type_nft_id_for_box === PROFILE_TYPE_NFT_ID) {
                proof.type = typeNftForBox;
                proof.data = box_content; // El R9 de la caja de perfil
            }

            proof.current_boxes.push(current_box);
            proof.number_of_boxes += 1;
        }

        console.log(`Perfil encontrado: ${proof.token_id}, ${proof.number_of_boxes} cajas.`, proof);
        
        reputation_proof.set(proof);

    } catch (error) {
        console.error('Ocurrió un error durante la búsqueda del perfil:', error);
        reputation_proof.set(null);
    }
}