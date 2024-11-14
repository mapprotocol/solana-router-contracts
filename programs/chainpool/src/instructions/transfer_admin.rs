use crate::{constants::CHAINPOOL_CONFIG_SEED, *};

#[derive(Accounts)]
#[instruction(params: TransferAdminParams)]
pub struct TransferAdmin<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CHAINPOOL_CONFIG_SEED],
        bump = config.bump,
        has_one = admin,
    )]
    pub config: Account<'info, ChainPoolConfig>,
}

impl TransferAdmin<'_> {
    pub fn apply(ctx: &mut Context<TransferAdmin>, params: &TransferAdminParams) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = params.admin;
        emit!(AdminChanged {
            old_admin: ctx.accounts.admin.key(),
            new_admin: params.admin,
        });
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TransferAdminParams {
    pub admin: Pubkey,
}
