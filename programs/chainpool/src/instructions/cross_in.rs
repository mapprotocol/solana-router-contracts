use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::{CHAINPOOL_CONFIG_SEED, CHAIN_ID, NATIVE_MINT, ORDER_SEED};
use crate::errors::ChainPoolError;
use crate::state::{OrderParams, OrderCrossInParams};
use crate::{ChainPoolConfig, CrossBeginEvent, CrossType, OrderRecord, OrderRecordEvent};

#[derive(Accounts)]
#[instruction(params: OrderParams)]
pub struct CrossIn<'info> {
    #[account(mut)]
    pub router: Signer<'info>,

    /// CHECK: token account authority
    #[account()]
    pub user: AccountInfo<'info>,

    #[account(
        seeds = [CHAINPOOL_CONFIG_SEED],
        bump = config.bump,
        constraint = config.routers.contains(&router.key()) @ ChainPoolError::InvalidRouter,
    )]
    pub config: Account<'info, ChainPoolConfig>,

    #[account(
        init,
        payer = router,
        space = 8 + OrderRecord::INIT_SPACE,
        seeds = [ORDER_SEED, &params.order_id],
        bump,
    )]
    pub record: Account<'info, OrderRecord>,

    #[account(
        mint::token_program = token_program,
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    // /// The user token account for output token
    #[account(
        init_if_needed,
        payer = router,
        associated_token::mint = token_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

impl<'info> CrossIn<'info> {
    pub fn apply(ctx: &mut Context<CrossIn>, params: &OrderCrossInParams) -> Result<()> {
        let record = &mut ctx.accounts.record;

        record.order_id = params.order_id;
        record.payer = ctx.accounts.router.key();
        record.user = ctx.accounts.user.key();
        record.to_chain_id = CHAIN_ID;
        record.receiver = ctx.accounts.user.key().to_bytes();
        record.swap_token_out = *ctx.accounts.token_account.to_account_info().key;
        record.min_amount_out = params.min_amount_out as u128;
        record.swap_token_out_min_amount_out = params.min_amount_out;
        record.swap_token_out_before_balance = ctx.accounts.token_account.amount;
        if ctx.accounts.token_account.is_native() {
            record.swap_token_out_before_balance = ctx.accounts.user.lamports();
        } 
        record.bump = ctx.bumps.record;


        emit!(CrossBeginEvent {
            cross_type: CrossType::CrossIn,
            order_record: OrderRecordEvent::from(record.clone().into_inner()),
        });

        Ok(())
    }

}


