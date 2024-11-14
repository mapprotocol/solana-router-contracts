use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::{AUTH_SEED, CHAIN_ID, ORDER_SEED};
use crate::errors::ChainPoolError;
use crate::state::{OrderParams, OrderCrossOutParams};
use crate::utils::pad_to_32_bytes;
use crate::{CrossBeginEvent, CrossType, OrderRecord, OrderRecordEvent};

#[derive(Accounts)]
#[instruction(params: OrderParams)]
pub struct CrossOut<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: pool vault authority
    #[account(seeds = [AUTH_SEED], bump)]
    pub authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + OrderRecord::INIT_SPACE,
        seeds = [ORDER_SEED, &params.order_id],
        bump,
    )]
    pub record: Account<'info, OrderRecord>,

    #[account(
        mint::token_program = token_program,
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    // /// The pool token account for output token
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

impl<'info> CrossOut<'info> {
    pub fn apply(ctx: &mut Context<CrossOut>, params: &OrderCrossOutParams) -> Result<()> {
        let record = &mut ctx.accounts.record;
        require!(
            params.to_chain_id != CHAIN_ID,
            ChainPoolError::InvalidChainId
        );
        record.order_id = params.order_id;
        record.payer = ctx.accounts.payer.key();
        record.user = ctx.accounts.authority.key();
        record.from_chain_id = CHAIN_ID;
        record.to_chain_id = params.to_chain_id;
        record.from_token = params.from_token;
        record.to_token = pad_to_32_bytes(params.to_token.as_slice());
        record.from = ctx.accounts.payer.key().to_bytes();
        record.token_amount = params.token_amount as u128;
        record.receiver = pad_to_32_bytes(params.receiver.as_slice());
        record.swap_token_out = *ctx.accounts.token_account.to_account_info().key;
        record.swap_token_out_before_balance = ctx.accounts.token_account.amount;
        record.swap_token_out_min_amount_out = params.swap_token_out_min_amount_out;
        record.min_amount_out = params.min_amount_out;
        record.bump = ctx.bumps.record;

        emit!(CrossBeginEvent {
            cross_type: CrossType::CrossOut,
            order_record: OrderRecordEvent::from(record.clone().into_inner()),
        });
        
        Ok(())
    }
}
