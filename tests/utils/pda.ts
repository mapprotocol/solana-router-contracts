import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { Router } from "../../target/types/router";
import { numberToBytesBigEndian } from "./util";
import { Chainpool } from '../../target/types/chainpool';

export const ROUTER_CONFIG_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("router_config")
);

export const ORACLE_CONFIG_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("oracle_config")
);

export const HEADER_CONFIG_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("header")
);

export const CHAINPOOL_CONFIG_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("chainpool_config")
);

export const CHAINPOOL_AUTH_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("auth")
);

export const CHAINPOOL_ORDER_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("order")
);


export function getRouterConfigAddress(
  programId: PublicKey
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [ROUTER_CONFIG_SEED],
    programId
  );
  return [address, bump];
}

export function getOracleConfigAddress(
  programId: PublicKey
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [ORACLE_CONFIG_SEED],
    programId
  );
  return [address, bump];
}

export function getHeaderAddress(
  programId: PublicKey,
  oracleProgramId: PublicKey,
  headerNumber: number,
  header: Uint8Array
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [
      HEADER_CONFIG_SEED,
      oracleProgramId.toBytes(),
      numberToBytesBigEndian(headerNumber),
      header
    ],
    programId
  );
  return [address, bump];
}


export function getChainpoolConfigAddress(
  programId: PublicKey
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [CHAINPOOL_CONFIG_SEED],
    programId
  );
  return [address, bump];
}

export function getChainpoolAuthAddress(
  programId: PublicKey,
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [CHAINPOOL_AUTH_SEED],
    programId
  );
  return [address, bump];
}

export function getChainpoolOrderAddress(
  programId: PublicKey,
  orderId: Buffer
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [CHAINPOOL_ORDER_SEED, orderId],
    programId
  );
  return [address, bump];
}