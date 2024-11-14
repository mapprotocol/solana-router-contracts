use constants::ROUTER_CONFIG_SEED;
use errors::RouterError;

use crate::state::RouterConfig;
use crate::*;

#[derive(Accounts)]
#[instruction(params: UpdateConfigParams)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [ROUTER_CONFIG_SEED],
        bump = config.bump,
        constraint  = params.fee_type != FeeType::Proportion || params.rate_or_native_fee <= 2000 @ RouterError::InvalidRateOrNativeFee,
        has_one = admin @RouterError::Unauthorized
    )]
    pub config: Account<'info, RouterConfig>,
    pub system_program: Program<'info, System>,
}

impl UpdateConfig<'_> {
    pub fn apply(ctx: &mut Context<UpdateConfig>, params: &UpdateConfigParams) -> Result<()> {
        ctx.accounts.config.admin = params.admin;
        ctx.accounts.config.referrer = params.referrer;
        ctx.accounts.config.rate_or_native_fee = params.rate_or_native_fee;
        ctx.accounts.config.fee_type = params.fee_type;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct UpdateConfigParams {
    pub fee_type: FeeType,
    pub admin: Pubkey,
    pub referrer: Pubkey,
    pub rate_or_native_fee: u64,
}
