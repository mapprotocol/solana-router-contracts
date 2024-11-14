import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  Signer,
  TransactionInstruction,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  ExtensionType,
  getMintLen,
  createInitializeTransferFeeConfigInstruction,
  createInitializeMintInstruction,
  getAccount,
} from "@solana/spl-token";
import { sendTransaction } from "./index";
import { BN } from "bn.js";

// create a token mint and a token2022 mint with transferFeeConfig
export async function createTokenMintAndAssociatedTokenAccount(
  connection: Connection,
  payer: Signer,
  mintAuthority: Signer,
  transferFeeConfig: { transferFeeBasisPoints: number; MaxFee: number }
) {
  let ixs: TransactionInstruction[] = [];
  ixs.push(
    web3.SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: mintAuthority.publicKey,
      lamports: web3.LAMPORTS_PER_SOL,
    })
  );
  await sendTransaction(connection, ixs, [payer]);

  interface Token {
    address: PublicKey;
    program: PublicKey;
  }

  let tokenArray: Token[] = [];
  let token0 = await createMint(
    connection,
    mintAuthority,
    mintAuthority.publicKey,
    null,
    9
  );
  tokenArray.push({ address: token0, program: TOKEN_PROGRAM_ID });

  let token1 = await createMintWithTransferFee(
    connection,
    payer,
    mintAuthority,
    Keypair.generate(),
    transferFeeConfig
  );

  tokenArray.push({ address: token1, program: TOKEN_2022_PROGRAM_ID });

  tokenArray.sort(function (x, y) {
    if (x.address < y.address) {
      return -1;
    }
    if (x.address > y.address) {
      return 1;
    }
    return 0;
  });

  token0 = tokenArray[0].address;
  token1 = tokenArray[1].address;
  //   console.log("Token 0", token0.toString());
  //   console.log("Token 1", token1.toString());
  const token0Program = tokenArray[0].program;
  const token1Program = tokenArray[1].program;

  const ownerToken0Account = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    token0,
    payer.publicKey,
    false,
    "processed",
    { skipPreflight: true },
    token0Program
  );

  await mintTo(
    connection,
    payer,
    token0,
    ownerToken0Account.address,
    mintAuthority,
    100_000_000_000_000,
    [],
    { skipPreflight: true },
    token0Program
  );

  // console.log(
  //   "ownerToken0Account key: ",
  //   ownerToken0Account.address.toString()
  // );

  const ownerToken1Account = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    token1,
    payer.publicKey,
    false,
    "processed",
    { skipPreflight: true },
    token1Program
  );
  // console.log(
  //   "ownerToken1Account key: ",
  //   ownerToken1Account.address.toString()
  // );
  await mintTo(
    connection,
    payer,
    token1,
    ownerToken1Account.address,
    mintAuthority,
    100_000_000_000_000,
    [],
    { skipPreflight: true },
    token1Program
  );

  return [
    { token0, token0Program },
    { token1, token1Program },
  ];
}

async function createMintWithTransferFee(
  connection: Connection,
  payer: Signer,
  mintAuthority: Signer,
  mintKeypair = Keypair.generate(),
  transferFeeConfig: { transferFeeBasisPoints: number; MaxFee: number }
) {
  const transferFeeConfigAuthority = Keypair.generate();
  const withdrawWithheldAuthority = Keypair.generate();

  const extensions = [ExtensionType.TransferFeeConfig];

  const mintLen = getMintLen(extensions);
  const decimals = 9;

  const mintLamports = await connection.getMinimumBalanceForRentExemption(
    mintLen
  );
  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      transferFeeConfigAuthority.publicKey,
      withdrawWithheldAuthority.publicKey,
      transferFeeConfig.transferFeeBasisPoints,
      BigInt(transferFeeConfig.MaxFee),
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      mintAuthority.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer, mintKeypair],
    undefined
  );

  return mintKeypair.publicKey;
}

export async function getUserAndVaultAmount(
  owner: PublicKey,
  token0Mint: PublicKey,
  token0Program: PublicKey,
  token1Mint: PublicKey,
  token1Program: PublicKey,
  poolToken0Vault: PublicKey,
  poolToken1Vault: PublicKey
) {
  const onwerToken0AccountAddr = getAssociatedTokenAddressSync(
    token0Mint,
    owner,
    false,
    token0Program
  );

  const onwerToken1AccountAddr = getAssociatedTokenAddressSync(
    token1Mint,
    owner,
    false,
    token1Program
  );

  const onwerToken0Account = await getAccount(
    anchor.getProvider().connection,
    onwerToken0AccountAddr,
    "processed",
    token0Program
  );

  const onwerToken1Account = await getAccount(
    anchor.getProvider().connection,
    onwerToken1AccountAddr,
    "processed",
    token1Program
  );

  const poolVault0TokenAccount = await getAccount(
    anchor.getProvider().connection,
    poolToken0Vault,
    "processed",
    token0Program
  );

  const poolVault1TokenAccount = await getAccount(
    anchor.getProvider().connection,
    poolToken1Vault,
    "processed",
    token1Program
  );
  return {
    onwerToken0Account,
    onwerToken1Account,
    poolVault0TokenAccount,
    poolVault1TokenAccount,
  };
}

export function isEqual(amount1: bigint, amount2: bigint) {
  if (
    BigInt(amount1) === BigInt(amount2) ||
    BigInt(amount1) - BigInt(amount2) === BigInt(1) ||
    BigInt(amount1) - BigInt(amount2) === BigInt(-1)
  ) {
    return true;
  }
  return false;
}

export interface TestValues {
  id: PublicKey;
  fee: number;
  admin: Keypair;
  mintAKeypair: Keypair;
  mintBKeypair: Keypair;
  defaultSupply: anchor.BN;
  ammKey: PublicKey;
  minimumLiquidity: anchor.BN;
  poolKey: PublicKey;
  poolAuthority: PublicKey;
  mintLiquidity: PublicKey;
  depositAmountA: anchor.BN;
  depositAmountB: anchor.BN;
  liquidityAccount: PublicKey;
  poolAccountA: PublicKey;
  poolAccountB: PublicKey;
  holderAccountA: PublicKey;
  holderAccountB: PublicKey;
}

type TestValuesDefaults = {
  [K in keyof TestValues]+?: TestValues[K];
};
export function createValues(defaults?: TestValuesDefaults): TestValues {
  const id = defaults?.id || Keypair.generate().publicKey;
  const admin = Keypair.generate();
  const ammKey = PublicKey.findProgramAddressSync(
    [id.toBuffer()],
    anchor.workspace.Swap.programId
  )[0];

  // Making sure tokens are in the right order
  const mintAKeypair = Keypair.generate();
  let mintBKeypair = Keypair.generate();
  while (
    new BN(mintBKeypair.publicKey.toBytes()).lt(
      new BN(mintAKeypair.publicKey.toBytes())
    )
  ) {
    mintBKeypair = Keypair.generate();
  }

  const poolAuthority = PublicKey.findProgramAddressSync(
    [
      ammKey.toBuffer(),
      mintAKeypair.publicKey.toBuffer(),
      mintBKeypair.publicKey.toBuffer(),
      Buffer.from("authority"),
    ],
    anchor.workspace.Swap.programId
  )[0];
  const mintLiquidity = PublicKey.findProgramAddressSync(
    [
      ammKey.toBuffer(),
      mintAKeypair.publicKey.toBuffer(),
      mintBKeypair.publicKey.toBuffer(),
      Buffer.from("liquidity"),
    ],
    anchor.workspace.Swap.programId
  )[0];
  const poolKey = PublicKey.findProgramAddressSync(
    [
      ammKey.toBuffer(),
      mintAKeypair.publicKey.toBuffer(),
      mintBKeypair.publicKey.toBuffer(),
    ],
    anchor.workspace.Swap.programId
  )[0];
  return {
    id,
    fee: 500,
    admin,
    ammKey,
    mintAKeypair,
    mintBKeypair,
    mintLiquidity,
    poolKey,
    poolAuthority,
    poolAccountA: getAssociatedTokenAddressSync(
      mintAKeypair.publicKey,
      poolAuthority,
      true
    ),
    poolAccountB: getAssociatedTokenAddressSync(
      mintBKeypair.publicKey,
      poolAuthority,
      true
    ),
    liquidityAccount: getAssociatedTokenAddressSync(
      mintLiquidity,
      admin.publicKey,
      true
    ),
    holderAccountA: getAssociatedTokenAddressSync(
      mintAKeypair.publicKey,
      admin.publicKey,
      true
    ),
    holderAccountB: getAssociatedTokenAddressSync(
      mintBKeypair.publicKey,
      admin.publicKey,
      true
    ),
    depositAmountA: new BN(4 * 10 ** 6),
    depositAmountB: new BN(1 * 10 ** 6),
    minimumLiquidity: new BN(100),
    defaultSupply: new BN(100 * 10 ** 6),
  };
}

export const mintingTokens = async ({
  connection,
  creator,
  holder = creator,
  mintAKeypair,
  mintBKeypair,
  mintedAmount = 100,
  decimals = 6,
}: {
  connection: Connection;
  creator: Signer;
  holder?: Signer;
  mintAKeypair: Keypair;
  mintBKeypair: Keypair;
  mintedAmount?: number;
  decimals?: number;
}) => {
  // Mint tokens
  await connection.confirmTransaction(
    await connection.requestAirdrop(creator.publicKey, 10 ** 10)
  );
  await createMint(
    connection,
    creator,
    creator.publicKey,
    creator.publicKey,
    decimals,
    mintAKeypair
  );
  await createMint(
    connection,
    creator,
    creator.publicKey,
    creator.publicKey,
    decimals,
    mintBKeypair
  );
  await getOrCreateAssociatedTokenAccount(
    connection,
    holder,
    mintAKeypair.publicKey,
    holder.publicKey,
    true
  );
  await getOrCreateAssociatedTokenAccount(
    connection,
    holder,
    mintBKeypair.publicKey,
    holder.publicKey,
    true
  );
  await mintTo(
    connection,
    creator,
    mintAKeypair.publicKey,
    getAssociatedTokenAddressSync(
      mintAKeypair.publicKey,
      holder.publicKey,
      true
    ),
    creator.publicKey,
    mintedAmount * 10 ** decimals
  );
  await mintTo(
    connection,
    creator,
    mintBKeypair.publicKey,
    getAssociatedTokenAddressSync(
      mintBKeypair.publicKey,
      holder.publicKey,
      true
    ),
    creator.publicKey,
    mintedAmount * 10 ** decimals
  );
};

export function numberToBytesBigEndian(
  num: number | bigint,
  length: number = 8
): Uint8Array {
  let bn: anchor.BN;
  if (typeof num === "bigint") {
    bn = new BN(num.toString());
  } else {
    bn = new BN(num);
  }
  const byteArray = bn.toArray("be", length); // 8 bytes for u64
  return new Uint8Array(byteArray);
}
