use anchor_lang::prelude::error_code;

#[error_code]
pub enum ChainPoolError {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("User insufficient funds")]
    InsufficientFunds,

    #[msg("Invalid account")]
    InvalidAccount,

    #[msg("Too little output received")]
    TooLittleOutputReceived,

    #[msg("Too many routers")]
    TooManyRouters,

    #[msg("Invalid router")]
    InvalidRouter,

    #[msg("Receive too little")]
    ReceiveTooLittle,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Invalid chain id")]
    InvalidChainId,

    #[msg("Order already exists")]
    OrderAlreadyExists,

    #[msg("Order already processed")]
    OrderAlreadyProcessed,
}
