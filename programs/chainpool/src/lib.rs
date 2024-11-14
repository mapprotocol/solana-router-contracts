pub mod constants;
pub mod errors;
mod instructions;
mod state;
pub mod utils;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

declare_id!("B6rMLK5baKzh7uKTX9GnvaX1VLBZ8eYtZoEGpYkvwCVF");

#[program]
pub mod chainpool {
    use super::*;

    pub fn init_config(mut ctx: Context<InitConfig>, params: InitConfigParams) -> Result<()> {
        InitConfig::apply(&mut ctx, &params)
    }

    pub fn update_config(mut ctx: Context<UpdateConfig>, params: UpdateConfigParams) -> Result<()> {
        UpdateConfig::apply(&mut ctx, &params)
    }

    pub fn transfer_admin(
        mut ctx: Context<TransferAdmin>,
        params: TransferAdminParams,
    ) -> Result<()> {
        TransferAdmin::apply(&mut ctx, &params)
    }

    pub fn cross_in(mut ctx: Context<CrossIn>, params: OrderCrossInParams) -> Result<()> {
        CrossIn::apply(&mut ctx, &params)
    }

    pub fn cross_out(mut ctx: Context<CrossOut>, params: OrderCrossOutParams) -> Result<()> {
        CrossOut::apply(&mut ctx, &params)
    }

    pub fn cross_finish(mut ctx: Context<CrossFinish>, params: OrderParams) -> Result<()> {
        CrossFinish::apply(&mut ctx, &params)
    }

    pub fn deposit(mut ctx: Context<Deposit>, params: DepositParams) -> Result<()> {
        Deposit::apply(&mut ctx, &params)
    }

    pub fn withdraw(mut ctx: Context<Withdraw>, params: WithdrawParams) -> Result<()> {
        Withdraw::apply(&mut ctx, &params)
    }

}
