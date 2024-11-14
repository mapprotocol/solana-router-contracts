use crate::*;

#[account]
#[derive(InitSpace)]
pub struct OrderRecord {
    pub order_id: [u8; 8],
    pub payer: Pubkey,
    pub user: Pubkey,
    pub from_chain_id: u64,
    pub to_chain_id: u64,
    pub from_token: [u8; 32],
    pub to_token: [u8; 32],
    pub from: [u8; 32],
    pub receiver: [u8; 32],
    pub token_amount: u128,
    pub swap_token_out: Pubkey,
    pub swap_token_out_before_balance: u64,
    pub swap_token_out_min_amount_out: u64,
    pub min_amount_out: u128,
    pub bump: u8,
}


#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct OrderCrossInParams {
    pub order_id: [u8; 8],
    pub min_amount_out: u64,
}


#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct OrderCrossOutParams {
    pub order_id: [u8; 8],
    pub token_amount: u64,
    pub min_amount_out: u128,
    pub to_chain_id: u64,
    pub from_token: [u8; 32],
    pub to_token: [u8; 20],
    // pub from: [u8; 32],
    pub receiver: [u8; 20],
    pub swap_token_out_min_amount_out: u64,
}


#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct OrderParams {
    pub order_id: [u8; 8],
}

