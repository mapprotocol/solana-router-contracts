use crate::*;

#[account]
#[derive(InitSpace)]
pub struct RouterConfig {
    pub rate_or_native_fee: u64,
    pub referrer: Pubkey,
    pub fee_type: FeeType,
    pub admin: Pubkey,
    pub bump: u8,
}

impl RouterConfig {
    pub fn init(
        &mut self,
        admin: Pubkey,
        rate_or_native_fee: u64,
        referrer: Pubkey,
        fee_type: FeeType,
    ) -> Result<()> {
        self.admin = admin;
        self.rate_or_native_fee = rate_or_native_fee;
        self.referrer = referrer;
        self.fee_type = fee_type;
        Ok(())
    }

    pub fn calculate_fee(
        fee_type: FeeType,
        token_amount: u64,
        rate_or_native_fee: u64,
        fee_denominator: u64,
    ) -> Option<u64> {
        match fee_type {
            FeeType::Proportion => {
                Self::calculate_proportion_fee(token_amount, rate_or_native_fee, fee_denominator)
            }
            FeeType::Fixed => Some(rate_or_native_fee),
        }
    }

    fn calculate_proportion_fee(
        token_amount: u64,
        rate_or_native_fee: u64,
        fee_denominator: u64,
    ) -> Option<u64> {
        if rate_or_native_fee == 0 || token_amount == 0 {
            Some(0)
        } else {
            let fee = token_amount
                .checked_mul(rate_or_native_fee)?
                .checked_div(fee_denominator)?;
            if fee == 0 {
                Some(1) // minimum fee of one token
            } else {
                Some(fee)
            }
        }
    }
}
