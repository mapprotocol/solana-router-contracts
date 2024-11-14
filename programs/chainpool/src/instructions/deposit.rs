use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::AUTH_SEED;
use crate::utils::transfer_from_user_to_pool_vault;
use crate::DepositEvent;

#[derive(Accounts)]
#[instruction()]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: pool vault authority
    #[account(seeds = [AUTH_SEED],bump)]
    pub authority: UncheckedAccount<'info>,

    #[account(
        mint::token_program = token_program,
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    // /// The user token account for output token
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = token_mint,
        associated_token::authority = owner,
        associated_token::token_program = token_program,
    )]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = owner,
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

impl<'info> Deposit<'info> {
    pub fn apply(ctx: &mut Context<Deposit>, params: &DepositParams) -> Result<()> {
        transfer_from_user_to_pool_vault(
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.token_vault.to_account_info(),
            ctx.accounts.token_mint.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            params.transfer_token_amount,
            ctx.accounts.token_mint.decimals,
        )?;
        emit!(DepositEvent {
            owner: *ctx.accounts.owner.key,
            authority: *ctx.accounts.authority.key,
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
pub struct DepositParams {
    pub transfer_token_amount: u64,
}


