use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use constants::{FEE_DENOMINATOR, ROUTER_CONFIG_SEED};
use errors::RouterError;

use crate::state::RouterConfig;
use crate::utils::*;
use crate::*;

#[derive(Accounts)]
#[instruction(params: ApplyParams)]
pub struct Router<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [ROUTER_CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Box<Account<'info, RouterConfig>>,

    #[account(
        mint::token_program = input_token_program,
    )]
    pub input_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mint::token_program = output_token_program,
    )]
    pub output_token_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The user token account for input token
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = input_token_mint,
        associated_token::authority = payer,
        associated_token::token_program = input_token_program,
    )]
    pub input_token_account: InterfaceAccount<'info, TokenAccount>,

    // /// The user token account for output token
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = output_token_mint,
        associated_token::authority = payer,
        associated_token::token_program = output_token_program,
    )]
    pub output_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = input_token_mint,
        associated_token::authority = fee_adapter_referrer,
        associated_token::token_program = input_token_program,
    )]
    pub fee_adapter_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = input_token_mint,
        associated_token::authority = platform_fee_referrer,
        associated_token::token_program = input_token_program,
    )]
    pub platform_fee_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK:
    #[account(mut)]
    pub fee_adapter_referrer: AccountInfo<'info>,

    /// CHECK:
    #[account(mut,
        address = config.referrer,
    )]
    pub platform_fee_referrer: AccountInfo<'info>,

    /// SPL program for input token transfers
    pub input_token_program: Interface<'info, TokenInterface>,

    /// SPL program for output token transfers
    pub output_token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

impl<'info> Router<'info> {
    pub fn apply(ctx: &mut Context<Router>, params: &ApplyParams) -> Result<()> {
        let amount_in = params.amount_in;
        let before_balance = ctx.accounts.output_token_account.amount;
        if let Some(fee_adapter) = &params.fee_adapter {
            require!(
                fee_adapter.fee_adapter_referrer == *ctx.accounts.fee_adapter_referrer.key,
                RouterError::InvalidFeeAdapterReferrer
            );
            if fee_adapter.fee_type == FeeType::Proportion {
                require!(
                    fee_adapter.rate_or_native_fee <= 2000,
                    RouterError::InvalidRateOrNativeFee
                );
            }

            if let Some(fee) = RouterConfig::calculate_fee(
                fee_adapter.fee_type,
                amount_in,
                fee_adapter.rate_or_native_fee,
                FEE_DENOMINATOR,
            )
            .filter(|&fee| fee > 0)
            {
                ctx.accounts.collect_fee(fee, fee_adapter.fee_type, false)?;
            }
        }

        if ctx.accounts.config.rate_or_native_fee > 0 {
            let fee = RouterConfig::calculate_fee(
                ctx.accounts.config.fee_type,
                amount_in,
                ctx.accounts.config.rate_or_native_fee,
                FEE_DENOMINATOR,
            )
            .unwrap();
            ctx.accounts
                .collect_fee(fee, ctx.accounts.config.fee_type, true)?;
        }

        // swap_on_program(
        //     ctx.remaining_accounts,
        //     params.program_key,
        //     params.data.clone(),
        // )?;
        // let after_balance = ctx.accounts.output_token_account.amount;

        // require_gte!(
        //     after_balance,
        //     before_balance + params.minimum_amount_out,
        //     RouterError::TooLittleOutputReceived
        // );
        Ok(())
    }

    fn collect_fee(&self, fee: u64, fee_type: FeeType, is_platform: bool) -> Result<()> {
        if fee == 0 {
            return Ok(());
        }
        match fee_type {
            FeeType::Fixed => {
                let receiver = if is_platform {
                    self.platform_fee_referrer.to_account_info()
                } else {
                    self.fee_adapter_referrer.to_account_info()
                };
                transfer_native_to_referrer(
                    self.payer.to_account_info(),
                    receiver.to_account_info(),
                    fee,
                    self.system_program.to_account_info(),
                )?;
            }
            FeeType::Proportion => {
                let receiver = if is_platform {
                    self.platform_fee_token_account.to_account_info()
                } else {
                    self.fee_adapter_token_account.to_account_info()
                };
                transfer_from_user_to_referrer(
                    self.payer.to_account_info(),
                    self.input_token_account.to_account_info(),
                    receiver,
                    self.input_token_mint.to_account_info(),
                    self.input_token_program.to_account_info(),
                    fee,
                    self.input_token_mint.decimals,
                )?;
            }
        }
        Ok(())
    }
}

fn swap_on_program(
    remaining_accounts: &[AccountInfo],
    program_key: Pubkey,
    data: Vec<u8>,
) -> ProgramResult {
    let accounts: Vec<AccountMeta> = remaining_accounts
        .iter()
        .map(|acc| AccountMeta {
            pubkey: *acc.key,
            is_signer: acc.is_signer,
            is_writable: acc.is_writable,
        })
        .collect();

    let accounts_infos: Vec<AccountInfo> = remaining_accounts
        .iter()
        .map(|acc| AccountInfo { ..acc.clone() })
        .collect();

    invoke_signed(
        &Instruction {
            program_id: program_key,
            accounts,
            data,
        },
        &accounts_infos,
        &[],
    )
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ApplyParams {
    pub fee_adapter: Option<FeeAdapter>,

    pub program_key: Pubkey,
    /// SOURCE amount to transfer, output to DESTINATION is based on the exchange rate
    pub amount_in: u64,
    /// Minimum amount of DESTINATION token to output, prevents excessive slippage
    pub minimum_amount_out: u64,

    pub data: Vec<u8>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct FeeAdapter {
    pub fee_type: FeeType,
    pub fee_adapter_referrer: Pubkey,
    pub rate_or_native_fee: u64,
}
