use crate::*;

#[event]
pub struct CrossFinishEvent {
    pub cross_type: CrossType,
    pub after_balance: u64,
    pub amount_out: u64,
    pub order_record: OrderRecordEvent,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub enum CrossType {
    CrossIn,
    CrossOut,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct OrderRecordEvent {
    pub order_id: [u8; 8],
    pub payer: Pubkey,
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


impl From<OrderRecord> for OrderRecordEvent {
    fn from(record: OrderRecord) -> Self {
        Self {
            order_id: record.order_id,
            payer: record.payer,
            from_chain_id: record.from_chain_id,
            to_chain_id: record.to_chain_id,
            from_token: record.from_token,
            to_token: record.to_token,
            from: record.from,
            receiver: record.receiver,
            token_amount: record.token_amount,
            swap_token_out: record.swap_token_out,
            swap_token_out_before_balance: record.swap_token_out_before_balance,
            swap_token_out_min_amount_out: record.swap_token_out_min_amount_out,
            min_amount_out: record.min_amount_out,
            bump: record.bump,
        }
    }
}
#[event]
pub struct CrossBeginEvent {
    pub cross_type: CrossType,
    pub order_record: OrderRecordEvent,
}

#[event]
pub struct WithdrawEvent {
    pub authority: Pubkey,
    pub token_vault: Pubkey,
    pub token_account: Pubkey,
    pub token_mint: Pubkey,
    pub token_program: Pubkey,
    pub token_decimal: u8,
    pub amount: u64,
}

#[event]
pub struct DepositEvent {
    pub owner: Pubkey,
    pub authority: Pubkey,
    pub token_vault: Pubkey,
    pub token_account: Pubkey,
    pub token_mint: Pubkey,
    pub token_program: Pubkey,
    pub token_decimal: u8,
    pub amount: u64,
}

#[event]
pub struct AdminChanged {
    pub new_admin: Pubkey,
    pub old_admin: Pubkey,
}

#[event]
pub struct RouterChanged {
    pub new_routers: Vec<Pubkey>,
}