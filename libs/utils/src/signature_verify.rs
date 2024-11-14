use anchor_lang::{prelude::{msg, ProgramError}, solana_program::secp256k1_recover::secp256k1_recover};



pub fn verify_signatures(
    signers: &Vec<[u8; 64]>,  
    hash: &[u8],          
    signatures: &[(u8, [u8; 64])] // (recovery_id, signature)
) -> Result<u8, ProgramError> {
    let mut used_pubkeys: Vec<[u8; 64]> = Vec::new(); 
    for (recovery_id, signature) in signatures.iter() {
        match secp256k1_recover(hash, *recovery_id, signature) {
            Ok(recovered_pubkey) => {
                let recovered_pubkey_bytes = recovered_pubkey.to_bytes();

                if used_pubkeys.iter().any(|pubkey| pubkey == &recovered_pubkey_bytes) {
                    msg!("Duplicate signature detected for pubkey");
                    continue;
                }

                if signers.iter().any(|&pubkey| pubkey == recovered_pubkey_bytes) {
                    used_pubkeys.push(recovered_pubkey_bytes);
                } else {
                    msg!("Invaild recovering pubkey: {:?}", recovered_pubkey.to_bytes());
                }
            },
            Err(e) => {
                msg!("Error recovering pubkey: {:?}", e);
                return Err(ProgramError::InvalidArgument);
            }
        }
    }

    Ok(used_pubkeys.len() as u8)
}