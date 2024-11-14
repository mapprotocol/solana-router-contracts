use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::{AUTH_SEED, CHAINPOOL_CONFIG_SEED};
use crate::errors::ChainPoolError;
use crate::utils::transfer_from_pool_vault_to_user;
use crate::{ChainPoolConfig, WithdrawEvent};

#[derive(Accounts)]
#[instruction()]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub router: Signer<'info>,

    /// CHECK: pool vault authority
    #[account(seeds = [AUTH_SEED], bump)]
    pub authority: UncheckedAccount<'info>,

    #[account(
        seeds = [CHAINPOOL_CONFIG_SEED],
        bump = config.bump,
        constraint = config.routers.contains(&router.key()) @ ChainPoolError::InvalidRouter,
    )]
    pub config: Account<'info, ChainPoolConfig>,

    #[account(
        mint::token_program = token_program,
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    // /// The router token account for output token
    #[account(
        init_if_needed,
        payer = router,
        associated_token::mint = token_mint,
        associated_token::authority = router,
        associated_token::token_program = token_program,
    )]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub token_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL program for output token transfers
    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    pub fn apply(ctx: &mut Context<Withdraw>, params: &WithdrawParams) -> Result<()> {
        let config = &mut ctx.accounts.config;
        transfer_from_pool_vault_to_user(
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.token_vault.to_account_info(),
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.token_mint.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            params.transfer_token_amount,
            ctx.accounts.token_mint.decimals,
            &[&[AUTH_SEED, &[config.auth_bump]]],
        )?;
        emit!(WithdrawEvent {
            authority: *ctx.accounts.router.to_account_info().key,
            token_vault: *ctx.accounts.token_vault.to_account_info().key,
            token_account: *ctx.accounts.token_account.to_account_info().key,
            token_mint: *ctx.accounts.token_mint.to_account_info().key,
            token_program: *ctx.accounts.token_program.to_account_info().key,
            token_decimal: ctx.accounts.token_mint.decimals,
            amount: params.transfer_token_amount,
        });
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct WithdrawParams {
    pub transfer_token_amount: u64,
}


