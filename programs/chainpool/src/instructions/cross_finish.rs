use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenAccount;

use crate::constants::{CHAIN_ID, ORDER_SEED};
use crate::errors::ChainPoolError;
use crate::state::OrderParams;
use crate::{CrossFinishEvent, CrossType, OrderRecord, OrderRecordEvent};

#[derive(Accounts)]
#[instruction(params: OrderParams)]
pub struct CrossFinish<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [ORDER_SEED, &params.order_id],
        bump,
    )]
    pub record: Account<'info, OrderRecord>,

    /// CHECK: token account authority
    #[account()]
    pub user: AccountInfo<'info>,

    // /// The user token account for output token
    #[account()]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,
}

impl<'info> CrossFinish<'info> {
    pub fn apply(ctx: &mut Context<CrossFinish>, params: &OrderParams) -> Result<()> {
        let record = &mut ctx.accounts.record;
        require!(
            ctx.accounts.token_account.key() == record.swap_token_out,
            ChainPoolError::InvalidTokenAccount
        );

        require!(
            ctx.accounts.user.key() == record.user,
            ChainPoolError::InvalidAccount
        );

        let mut after_balance = ctx.accounts.token_account.amount;
        let mut cross_type = CrossType::CrossOut;
        // cross finish only can be called by the router
        if record.to_chain_id == CHAIN_ID {
            require!(
                ctx.accounts.payer.key() == record.payer,
                ChainPoolError::InvalidRouter
            );
            if ctx.accounts.token_account.is_native() {
                after_balance = ctx.accounts.user.lamports();
            }
            cross_type = CrossType::CrossIn;
        }
        let amount_out = after_balance - record.swap_token_out_before_balance;
        require!(
            amount_out >= record.swap_token_out_min_amount_out,
            ChainPoolError::ReceiveTooLittle
        );
        emit!(CrossFinishEvent {
            cross_type: cross_type,
            after_balance: after_balance,
            amount_out: amount_out,
            order_record: OrderRecordEvent::from(record.clone().into_inner()),
        });

        Ok(())
    }
}
