use crate::*;
use constants::{CHAINPOOL_CONFIG_SEED, ROUTERS_MAX_LEN};
use errors::ChainPoolError;

#[derive(Accounts)]
#[instruction(params: UpdateConfigParams)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CHAINPOOL_CONFIG_SEED],
        bump = config.bump,
        has_one = admin,
    )]
    pub config: Account<'info, ChainPoolConfig>,
}

impl UpdateConfig<'_> {
    pub fn apply(ctx: &mut Context<UpdateConfig>, params: &UpdateConfigParams) -> Result<()> {
        let config = &mut ctx.accounts.config;

        require_gte!(
            ROUTERS_MAX_LEN,
            params.routers.len() as u64,
            ChainPoolError::TooManyRouters
        );
        config.routers = params.routers.clone();
        emit!(RouterChanged {
            new_routers: params.routers.clone(),
        });
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct UpdateConfigParams {
    pub routers: Vec<Pubkey>,
}
