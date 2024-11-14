use anchor_lang::prelude::*;

#[constant]
pub const CHAINPOOL_CONFIG_SEED: &[u8] = b"chainpool_config";

#[constant]
pub const ROUTERS_MAX_LEN: u64 = 5;

#[constant]
pub const AUTH_SEED: &[u8] = b"auth";

#[constant]
pub const ORDER_SEED: &[u8] = b"order";

#[constant]
pub const CHAIN_ID: u64 = 1360108768460801;

#[constant]
pub const NATIVE_MINT: &[u8] = b"So11111111111111111111111111111111111111112";
