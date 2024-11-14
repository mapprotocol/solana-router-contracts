use crate::*;
use constants::{AUTH_SEED, CHAINPOOL_CONFIG_SEED, ROUTERS_MAX_LEN};
use errors::ChainPoolError;

#[derive(Accounts)]
#[instruction(params: InitConfigParams)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: pool vault authority
    #[account(seeds = [AUTH_SEED],bump)]
    pub authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ChainPoolConfig::INIT_SPACE,
        seeds = [CHAINPOOL_CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, ChainPoolConfig>,
    pub system_program: Program<'info, System>,
}

impl InitConfig<'_> {
    pub fn apply(ctx: &mut Context<InitConfig>, params: &InitConfigParams) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = params.admin;

        require_gte!(
            ROUTERS_MAX_LEN,
            params.routers.len() as u64,
            ChainPoolError::TooManyRouters
        );
        config.routers = params.routers.clone();
        config.bump = ctx.bumps.config;
        config.auth_bump = ctx.bumps.authority;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitConfigParams {
    pub admin: Pubkey,
    pub routers: Vec<Pubkey>,
}
