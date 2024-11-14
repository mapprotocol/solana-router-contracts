pub mod constants;
pub mod errors;
mod instructions;
mod state;
pub mod utils;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("76ASwn3P6TctZY4ssnhTPhm1rvRDe6FmJK2rq92kYv7Z");

#[program]
pub mod router {
    use super::*;

    pub fn init_config(mut ctx: Context<InitConfig>, params: InitConfigParams) -> Result<()> {
        InitConfig::apply(&mut ctx, &params)
    }

    pub fn update_config(mut ctx: Context<UpdateConfig>, params: UpdateConfigParams) -> Result<()> {
        UpdateConfig::apply(&mut ctx, &params)
    }

    pub fn apply(mut ctx: Context<Router>, params: ApplyParams) -> Result<()> {
        Router::apply(&mut ctx, &params)
    }

    pub fn get_fee(mut ctx: Context<GetFee>, params: GetFeeParams) -> Result<u64> {
        GetFee::apply(&mut ctx, &params)
    }
}
