export const network_id: "mainnet"|"testnet" = "mainnet";
export const explorer_uri =          (network_id == "mainnet") ? "https://api.ergoplatform.com"          : "https://api-testnet.ergoplatform.com";
export const web_explorer_uri_tx =   (network_id == "mainnet") ? "https://sigmaspace.io/en/transaction/" : "https://testnet.ergoplatform.com/transactions/";
export const web_explorer_uri_addr = (network_id == "mainnet") ? "https://sigmaspace.io/en/address/"     : "https://testnet.ergoplatform.com/addresses/";
export const web_explorer_uri_tkn = (network_id == "mainnet") ? "https://sigmaspace.io/en/token/"     : "https://testnet.ergoplatform.com/tokens/";

export const PROFILE_TYPE_NFT_ID = "1820fd428a0b92d61ce3f86cd98240fdeeee8a392900f0b19a2e017d66f79926";