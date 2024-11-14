use crate::*;
use constants::ROUTER_CONFIG_SEED;
use errors::RouterError;

#[derive(Accounts)]
#[instruction(params: InitConfigParams)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + RouterConfig::INIT_SPACE,
        seeds = [ROUTER_CONFIG_SEED],
        bump,
        constraint  = params.fee_type != FeeType::Proportion || params.rate_or_native_fee <= 2000 @ RouterError::InvalidRateOrNativeFee
    )]
    pub config: Account<'info, RouterConfig>,
    pub system_program: Program<'info, System>,
}

impl InitConfig<'_> {
    pub fn apply(ctx: &mut Context<InitConfig>, params: &InitConfigParams) -> Result<()> {
        ctx.accounts.config.bump = ctx.bumps.config;
        ctx.accounts.config.init(
            params.admin,
            params.rate_or_native_fee,
            params.referrer,
            params.fee_type,
        )
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitConfigParams {
    pub admin: Pubkey,
    pub fee_type: FeeType,
    pub referrer: Pubkey,
    pub rate_or_native_fee: u64,
}

#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq, Copy)]
pub enum FeeType {
    Fixed,
    Proportion,
}
