use constants::ROUTERS_MAX_LEN;

use crate::*;

#[account]
#[derive(InitSpace)]
pub struct ChainPoolConfig {
    pub admin: Pubkey,
    #[max_len(ROUTERS_MAX_LEN)]
    pub routers: Vec<Pubkey>,
    pub bump: u8,
    pub auth_bump: u8,
}
