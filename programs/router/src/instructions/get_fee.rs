use crate::*;
use constants::{FEE_DENOMINATOR, ROUTER_CONFIG_SEED};

#[derive(Accounts)]
#[instruction(params: GetFeeParams)]
pub struct GetFee<'info> {
    #[account(
        seeds = [ROUTER_CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, RouterConfig>,
}

impl GetFee<'_> {
    pub fn apply(ctx: &mut Context<GetFee>, params: &GetFeeParams) -> Result<u64> {
        if let Some(fee) = RouterConfig::calculate_fee(
            params.fee_type,
            params.token_amount,
            params.rate_or_native_fee,
            FEE_DENOMINATOR,
        ) {
            Ok(fee)
        } else {
            Ok(0)
        }
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct GetFeeParams {
    pub fee_type: FeeType,
    pub referrer: Pubkey,
    pub rate_or_native_fee: u64,
    pub token_amount: u64,
}
