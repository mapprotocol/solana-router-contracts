use anchor_lang::prelude::*;
use anchor_lang::system_program;

use anchor_spl::{
    token::TokenAccount,
    token_2022::{
        self,
        spl_token_2022::{
            self,
            extension::{ExtensionType, StateWithExtensions},
        },
    },
    token_interface::{
        initialize_account3, spl_token_2022::extension::BaseStateWithExtensions, InitializeAccount3,
    },
};

pub fn transfer_native_to_referrer<'info>(
    sender: AccountInfo<'info>,
    receiver: AccountInfo<'info>,
    amount: u64,
    program: AccountInfo<'info>,
) -> Result<()> {
    system_program::transfer(
        CpiContext::new(
            program,
            system_program::Transfer {
                from: sender,
                to: receiver,
            },
        ),
        amount,
    )?;
    Ok(())
}

pub fn transfer_from_user_to_referrer<'a>(
    authority: AccountInfo<'a>,
    from: AccountInfo<'a>,
    receiver: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    amount: u64,
    mint_decimals: u8,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    token_2022::transfer_checked(
        CpiContext::new(
            token_program.to_account_info(),
            token_2022::TransferChecked {
                from,
                to: receiver,
                authority,
                mint,
            },
        ),
        amount,
        mint_decimals,
    )
}

pub fn transfer_from_vault_to_user<'a>(
    authority: AccountInfo<'a>,
    from_vault: AccountInfo<'a>,
    to: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    amount: u64,
    mint_decimals: u8,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    token_2022::transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            token_2022::TransferChecked {
                from: from_vault,
                to,
                authority,
                mint,
            },
            signer_seeds,
        ),
        amount,
        mint_decimals,
    )
}

/// Issue a spl_token `MintTo` instruction.
pub fn token_mint_to<'a>(
    authority: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    token_2022::mint_to(
        CpiContext::new_with_signer(
            token_program,
            token_2022::MintTo {
                to: destination,
                authority,
                mint,
            },
            signer_seeds,
        ),
        amount,
    )
}

pub fn token_burn<'a>(
    authority: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    from: AccountInfo<'a>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    token_2022::burn(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            token_2022::Burn {
                from,
                authority,
                mint,
            },
            signer_seeds,
        ),
        amount,
    )
}

pub fn create_token_account<'a>(
    authority: &AccountInfo<'a>,
    payer: &AccountInfo<'a>,
    token_account: &AccountInfo<'a>,
    mint_account: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    if token_account.lamports() > 0 {
        return Ok(());
    }
    let space = {
        let mint_info = mint_account.to_account_info();
        if *mint_info.owner == token_2022::Token2022::id() {
            let mint_data = mint_info.try_borrow_data()?;
            let mint_state =
                StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&mint_data)?;
            let mint_extensions = mint_state.get_extension_types()?;
            let required_extensions =
                ExtensionType::get_required_init_account_extensions(&mint_extensions);
            ExtensionType::try_calculate_account_len::<spl_token_2022::state::Account>(
                &required_extensions,
            )?
        } else {
            TokenAccount::LEN
        }
    };
    let lamports = Rent::get()?.minimum_balance(space);
    let cpi_accounts = anchor_lang::system_program::CreateAccount {
        from: payer.to_account_info(),
        to: token_account.to_account_info(),
    };
    let cpi_context = CpiContext::new(system_program.to_account_info(), cpi_accounts);
    anchor_lang::system_program::create_account(
        cpi_context.with_signer(signer_seeds),
        lamports,
        space as u64,
        token_program.key,
    )?;
    initialize_account3(CpiContext::new(
        token_program.to_account_info(),
        InitializeAccount3 {
            account: token_account.to_account_info(),
            mint: mint_account.to_account_info(),
            authority: authority.to_account_info(),
        },
    ))
}

pub fn create_and_fund_account<'a>(
    payer: &AccountInfo<'a>,
    account: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    if account.lamports() > 0 {
        return Ok(());
    }
    let space = account.data_len();
    let lamports = Rent::get()?.minimum_balance(space);
    let cpi_accounts = anchor_lang::system_program::CreateAccount {
        from: payer.to_account_info(),
        to: account.to_account_info(),
    };
    let cpi_context = CpiContext::new(system_program.to_account_info(), cpi_accounts);
    anchor_lang::system_program::create_account(
        cpi_context.with_signer(signer_seeds),
        lamports,
        space as u64,
        system_program.to_account_info().key,
    )?;

    Ok(())
}
