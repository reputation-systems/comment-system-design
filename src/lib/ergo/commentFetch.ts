import { ErgoAddress, Network, SByte, SColl } from '@fleet-sdk/core';
import { type Comment } from './commentObject';
import { hexToBytes, hexToUtf8, serializedToRendered } from './utils'; 
import { COMMENT_TYPE_NFT_ID, DISCUSSION_TYPE_NFT_ID, explorer_uri, PROFILE_TYPE_NFT_ID, SPAM_FLAG_NFT_ID, SPAM_LIMIT } from './envs';
import { ergo_tree_hash } from './contract';
import { type TypeNFT, type ReputationProof, type RPBox } from './object';
import { reputation_proof } from './store';

// Definición mínima de la respuesta de la API de Explorer para una caja
interface ApiBox {
    boxId: string;
    value: string | number;
    ergoTree: string;
    assets: { tokenId: string; amount: string | number; }[];
    creationHeight: number;
    blockId: string;
    additionalRegisters: {
        [key: string]: {
            serializedValue: string;
            renderedValue?: string;
        };
    };
    index: number;
    transactionId: string;
}

// Constants
const LIMIT_PER_PAGE = 100;

// Interface for search body
interface SearchBody {
  registers: { [key: string]: string };
}

/**
 * Obtiene el timestamp del bloque según su altura en la blockchain.
 * @param height Altura del bloque
 * @returns Timestamp del bloque (en milisegundos)
 */
export async function getTimestampFromBlockId(blockId: string): Promise<number> {
    const url = `${explorer_uri}/api/v1/blocks/${blockId}`;

    try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();

        console.log("get Timestamp ", json);

        // Validar que el timestamp exista
        const timestamp = json?.block?.header?.timestamp;
        if (typeof timestamp !== "number") {
            console.warn(`No se encontró timestamp para el bloque ${blockId}`);
            return 0;
        }

        // La mayoría de APIs devuelven timestamp en milisegundos o segundos.
        // Si ves timestamps como "1.7e12", ya está en milisegundos.
        // Si ves algo como "1.7e9", conviértelo a milisegundos:
        return timestamp < 1e11 ? timestamp * 1000 : timestamp;

    } catch (error) {
        console.error(`Error al obtener timestamp del bloque ${blockId}:`, error);
        return 0; // Devolver 0 para evitar que falle la lógica principal
    }
}

/**
 * Busca en la blockchain todas las alertas de spam hacia un comentario.
 */
export async function fetchSpan(comment_id: string): Promise<number> {
    var amount: number = 0;

    const search_body = {
        registers: { 
            "R4": serializedToRendered(SColl(SByte, hexToBytes(SPAM_FLAG_NFT_ID) ?? "").toHex()),
            "R5": serializedToRendered(SColl(SByte, hexToBytes(comment_id) ?? "").toHex())
        }
    }

    try {
        let offset = 0, limit = 100, moreDataAvailable = true;
        
        while (moreDataAvailable) {
            const url = `${explorer_uri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
            
            // Buscamos cajas que coincidan con el hash del template Y los registros
            const final_body = { 
                "ergoTreeTemplateHash": ergo_tree_hash, 
                "registers": search_body.registers,
                "assets": [] // No necesitamos filtrar por assets, solo asegurarnos de que existan
            };
            
            const response = await fetch(url, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(final_body) 
            });

            if (!response.ok) {
                console.error(`Error al buscar spans: ${response.statusText}`);
                moreDataAvailable = false;
                continue;
            }

            const json_data = await response.json();
            if (!json_data.items || json_data.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }

            for (const box of json_data.items as ApiBox[]) {
                
                if (!box.assets?.length) continue;
                
                // Debe tener R6 (is_locked) y R9 (contenido)
                if (box.additionalRegisters.R6.renderedValue == "false" || !box.additionalRegisters.R9.renderedValue) continue;


                // --- Extracción de Datos ---
                
                const authorProfileTokenId = box.assets[0].tokenId;
                
                let textContent: string = "";
                try {
                    // R9 contiene el texto del spam como una cadena UTF-8
                    const rawValue = box.additionalRegisters.R9.renderedValue;
                    if (rawValue) {
                        textContent = hexToUtf8(rawValue) ?? "[Contenido vacío]";
                    }
                } catch (e) {
                    console.warn(`Error al decodificar R9 para la caja ${box.boxId}`, e);
                }
                
                amount += 1;  // TODO Could add textContent into a spam_reasons: string[] comment attr.
            }
            offset += limit;
        }

        return amount;

    } catch (error) {
        console.error('Ocurrió un error durante la búsqueda de comentarios:', error);
        return 0; // Devolver 0 en caso de error
    }
}

/**
 * Busca en la blockchain todos los comentarios de nivel superior (hilos)
 * para una 'discussion' (proyecto) específica.
 */
export async function fetchComments(discussion: string, reply: boolean = false): Promise<Comment[]> {
    console.log("fetchComments", { discussion }, reply)
    var comments: Comment[] = [];

    // Cuerpo de la búsqueda:
    // R4 = ID del Tipo (Discussion Type NFT)
    // R5 = ID de la Discusión (projectId)
    const search_body = {
        registers: { 
            "R4": serializedToRendered(SColl(SByte, hexToBytes(reply ? COMMENT_TYPE_NFT_ID : DISCUSSION_TYPE_NFT_ID) ?? "").toHex()),
            "R5": serializedToRendered(SColl(SByte, hexToBytes(discussion) ?? "").toHex())
        }
    }

    try {
        let offset = 0, limit = 100, moreDataAvailable = true;
        
        while (moreDataAvailable) {
            const url = `${explorer_uri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
            
            // Buscamos cajas que coincidan con el hash del template Y los registros
            const final_body = { 
                "ergoTreeTemplateHash": ergo_tree_hash, 
                "registers": search_body.registers,
                "assets": [] // No necesitamos filtrar por assets, solo asegurarnos de que existan
            };
            
            const response = await fetch(url, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(final_body) 
            });

            if (!response.ok) {
                console.error(`Error al buscar comentarios: ${response.statusText}`);
                moreDataAvailable = false;
                continue;
            }

            const json_data = await response.json();
            if (!json_data.items || json_data.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }

            console.log("Comments json data ", json_data.items)

            for (const box of json_data.items as ApiBox[]) {
                
                // --- Validación de la caja como Comentario Válido ---
                
                // Debe tener assets (el token de reputación del autor)
                if (!box.assets?.length) continue;
                
                // Debe tener R6 (is_locked) y R9 (contenido)
                if (box.additionalRegisters.R6.renderedValue == "false" || !box.additionalRegisters.R9.renderedValue) continue;


                // --- Extracción de Datos ---
                
                const authorProfileTokenId = box.assets[0].tokenId;
                
                let textContent: string = "[Contenido no legible]";
                try {
                    // R9 contiene el texto del comentario como una cadena UTF-8
                    const rawValue = box.additionalRegisters.R9.renderedValue;
                    if (rawValue) {
                        textContent = hexToUtf8(rawValue) ?? "[Contenido vacío]";
                    }
                } catch (e) {
                    console.warn(`Error al decodificar R9 para la caja ${box.boxId}`, e);
                }

                // --- Construcción del Objeto Comment ---
                
                const number_of_spans = await fetchSpan(box.boxId);
                const isSpam = number_of_spans > SPAM_LIMIT;

                const comment: Comment = {
                    id: box.boxId,
                    discussion: discussion,
                    authorProfileTokenId: authorProfileTokenId,
                    text: textContent,
                    timestamp: await getTimestampFromBlockId(box.blockId), // Usamos el timestamp de la API
                    isSpam: isSpam,
                    replies: await fetchComments(box.boxId, true),   // Las respuestas deben cargarse por separado
                    submitting: false,
                    sentiment: box.additionalRegisters.R8?.renderedValue === 'true',
                };

                comments.push(comment);
            }
            offset += limit;
        }

        // Ordenar los comentarios del más nuevo al más viejo
        comments.sort((a, b) => b.timestamp - a.timestamp);

        return comments;

    } catch (error) {
        console.error('Ocurrió un error durante la búsqueda de comentarios:', error);
        return []; // Devolver un array vacío en caso de error
    }
}

// Helper function to get serialized R7
async function getSerializedR7(ergo: any): Promise<{ changeAddress: string; r7SerializedHex: string } | null> {
  if (!ergo) {
    console.error("getSerializedR7: 'ergo' object is not available.");
    return null;
  }

  try {
    const changeAddress = await ergo.get_change_address();
    if (!changeAddress) {
      console.warn("getSerializedR7: Could not obtain change address.");
      return null;
    }

    const userAddress = ErgoAddress.fromBase58(changeAddress);
    const propositionBytes = hexToBytes(userAddress.ergoTree);

    console.log("Ergotree ", userAddress.ergoTree);

    if (!propositionBytes) {
      console.error("getSerializedR7: Could not obtain propositionBytes.");
      return null;
    }

    const r7SerializedHex = SColl(SByte, userAddress.ergoTree).toHex();
    return { changeAddress, r7SerializedHex };
  } catch (e) {
    console.error("getSerializedR7: Error obtaining user address", e);
    return null;
  }
}

// Fetch all user boxes with pagination
async function fetchProfileUserBoxes(r7SerializedHex: string): Promise<ApiBox[]> {
  const allBoxes: ApiBox[] = [];
  let offset = 0;
  let moreDataAvailable = true;

  const searchBody: SearchBody = { registers: {
    R7: serializedToRendered(r7SerializedHex),
    R4: PROFILE_TYPE_NFT_ID
  } }; // Adjust if R7 is needed

  while (moreDataAvailable) {
    const url = `${explorer_uri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${LIMIT_PER_PAGE}`;
    const finalBody = {
      ergoTreeTemplateHash: ergo_tree_hash,
      registers: searchBody.registers,
      assets: [],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBody),
      });

      if (!response.ok) {
        console.error(`fetchAllUserBoxes: Error fetching boxes: ${response.statusText}`);
        moreDataAvailable = false;
        continue;
      }

      const jsonData = await response.json();
      if (!jsonData.items || jsonData.items.length === 0) {
        moreDataAvailable = false;
        continue;
      }

      const filteredBoxes = jsonData.items
        .filter((box: ApiBox) => 
            box.additionalRegisters.R5.renderedValue === box.assets[0].tokenId &&  // Self
            box.additionalRegisters.R6.renderedValue === 'false'  // Is not locked.
          )
        .sort((a: ApiBox, b: ApiBox) => b.creationHeight - a.creationHeight);

      allBoxes.push(...filteredBoxes as ApiBox[]);
      offset += LIMIT_PER_PAGE;
    } catch (e) {
      console.error("fetchAllUserBoxes: Error during fetch", e);
      moreDataAvailable = false;
    }
  }

  console.log(allBoxes.map(box => box.additionalRegisters.R5.renderedValue))
  console.log(allBoxes.map(box => box.boxId))

  return allBoxes;
}

// Fetch token emission amount
async function fetchTokenEmissionAmount(tokenId: string): Promise<number | null> {
  try {
    const response = await fetch(`${explorer_uri}/api/v1/tokens/${tokenId}`);
    if (!response.ok) {
      console.error(`fetchTokenEmissionAmount: Error fetching token ${tokenId}: ${response.statusText}`);
      return null;
    }
    const tokenData = await response.json();
    return Number(tokenData.emissionAmount || 0);
  } catch (e) {
    console.error(`fetchTokenEmissionAmount: Error fetching token ${tokenId}`, e);
    return null;
  }
}

// Convert ApiBox to RPBox
function convertToRPBox(box: ApiBox, profileTokenId: string): RPBox | null {
  if (!box.assets?.length || box.assets[0].tokenId !== profileTokenId) {
    console.warn(`convertToRPBox: Box ${box.boxId} has different token ID. Skipping.`);
    return null;
  }

  if (!box.additionalRegisters.R4 || !box.additionalRegisters.R5 || !box.additionalRegisters.R6) {
    console.warn(`convertToRPBox: Box ${box.boxId} lacks R4, R5, or R6. Skipping.`);
    return null;
  }

  const typeNftId = box.additionalRegisters.R4.renderedValue ?? '';
  const typeNft: TypeNFT = {
    tokenId: typeNftId,
    boxId: '',
    typeName: typeNftId === PROFILE_TYPE_NFT_ID ? 'Profile' : 'Unknown Type',
    description: '...',
    schemaURI: '',
    isRepProof: false,
  };

  let boxContent: string | object | null = null;
  try {
    const rawValue = box.additionalRegisters.R9?.renderedValue;
    if (rawValue) {
      const potentialString = hexToUtf8(rawValue);
      try {
        boxContent = JSON.parse(potentialString);
      } catch {
        boxContent = potentialString;
      }
    }
  } catch (e) {
    console.error(`convertToRPBox: Error parsing R9 for box ${box.boxId}`, e);
  }

  const objectPointer = hexToUtf8(box.additionalRegisters.R5?.renderedValue ?? '') ?? '';

  return {
    box: {
      boxId: box.boxId,
      value: box.value,
      assets: box.assets,
      ergoTree: box.ergoTree,
      creationHeight: box.creationHeight,
      additionalRegisters: Object.entries(box.additionalRegisters).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value.serializedValue }),
        {} as { [key: string]: string }
      ),
      index: box.index,
      transactionId: box.transactionId,
    },
    box_id: box.boxId,
    type: typeNft,
    token_id: profileTokenId,
    token_amount: Number(box.assets[0].amount),
    object_pointer: objectPointer,
    is_locked: box.additionalRegisters.R6.renderedValue === 'true',
    polarization: box.additionalRegisters.R8?.renderedValue === 'true',
    content: boxContent,
  };
}

/**
 * Obtiene el objeto ReputationProof completo del usuario conectado,
 * buscando todas las cajas donde R7 coincida con su dirección.
 * @param ergo El objeto de la billetera conectada (ej. dApp Connector)
 */
export async function fetchProfile(ergo: any): Promise<ReputationProof | null> {
  try {
    // 1. Get serialized R7 and change address
    const r7Data = await getSerializedR7(ergo);
    if (!r7Data) {
      reputation_proof.set(null);
      return null;
    }
    const { changeAddress, r7SerializedHex } = r7Data;
    console.log(`Fetching profile for R7: ${r7SerializedHex}`);

    // 2. Fetch all user boxes
    const allUserBoxes = await fetchProfileUserBoxes(r7SerializedHex);
    if (allUserBoxes.length === 0) {
      console.log('No profile boxes found for this user.');
      reputation_proof.set(null);
      return null;
    }

    if (allUserBoxes.length === 0) {
      reputation_proof.set(null);
      console.warn("No profile boxes found for this user.");
      return null;
    }

    const first_box = allUserBoxes[0];

    const profileTokenId = first_box.assets[0].tokenId;
    const emissionAmount = await fetchTokenEmissionAmount(profileTokenId);
    if (emissionAmount === null) {
      reputation_proof.set(null);
      console.warn("fetchTokenEmissionAmount returned null.")
      return null;
    }

    // 4. Initialize ReputationProof
    const proof: ReputationProof = {
      token_id: profileTokenId,
      type: { tokenId: '', boxId: '', typeName: 'N/A', description: '...', schemaURI: '', isRepProof: false },
      data: null,
      total_amount: emissionAmount,
      owner_address: changeAddress,
      owner_serialized: r7SerializedHex,
      can_be_spend: true,
      current_boxes: [],
      number_of_boxes: 0,
      network: Network.ErgoMainnet,
    };

    const rpbox = convertToRPBox(first_box, profileTokenId);
    if (!rpbox) {
      reputation_proof.set(null);
      console.warn("convertToRPBox returned null.")
      return null;
    }

    proof.current_boxes.push(rpbox);
    proof.number_of_boxes += 1;

    console.log(`Perfil encontrado: ${proof.token_id}, ${proof.number_of_boxes} cajas.`, proof);
    reputation_proof.set(proof);

    console.log(proof)
    return proof;

  } catch (error) {
    console.error('Error fetching profile:', error);
    reputation_proof.set(null);
    return null;
  }
}