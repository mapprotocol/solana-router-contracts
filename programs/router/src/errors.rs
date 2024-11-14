use anchor_lang::prelude::error_code;

#[error_code]
pub enum RouterError {
    #[msg("Invalid rate or native fee")]
    InvalidRateOrNativeFee,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid fee")]
    InvalidFee,

    #[msg("User insufficient funds")]
    InsufficientFunds,

    #[msg("Invalid account")]
    InvalidAccount,

    #[msg("Invalid fee adapter receiver")]
    InvalidFeeAdapterReferrer,

    #[msg("Too little output received")]
    TooLittleOutputReceived,
}
