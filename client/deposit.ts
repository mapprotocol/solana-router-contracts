import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Chainpool } from "../target/types/chainpool";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  getChainpoolAuthAddress,
  getChainpoolConfigAddress,
  sendTransaction,
} from "../tests/utils";
import * as dotenv from "dotenv";
const idl = require("../target/idl/chainpool.json");
import { skip } from "node:test";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createWrappedNativeAccount,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  syncNative,
  transfer,
} from "@solana/spl-token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

dotenv.config();

async function main() {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());
  const connection = new Connection(process.env.ANCHOR_PROVIDER_URL);

  const owner = anchor.Wallet.local().payer;
  const programId = new PublicKey('B6rMLK5baKzh7uKTX9GnvaX1VLBZ8eYtZoEGpYkvwCVF');
  const provider = new anchor.AnchorProvider(
    connection,
    anchor.Wallet.local(),
    {}
  );
  const chainpool_program = new Program<Chainpool>(idl, programId, provider);

  const tokenMint = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
  const tokenInfo = await connection.getAccountInfo(tokenMint);
  // const lamports = 1 * LAMPORTS_PER_SOL;


  const ownerToken0 = getAssociatedTokenAddressSync(
    tokenMint,
    owner.publicKey,
    false,
    tokenInfo.owner,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const ta = await connection.getTokenAccountBalance(ownerToken0)
  console.log(`ownerToken0 balance: ${ta.value.amount}`);
  // const wTokenAccount = await createWrappedNativeAccount(
  //   connection,
  //   owner,
  //   owner.publicKey,
  //   lamports
  // );
  // console.log(`wTokenAccount: ${wTokenAccount.toBase58()}`);
  // console.log(`ownerToken0: ${ownerToken0.toBase58()}`);

  // Get addresses for chainpool configuration and authorization.
  const [chainpoolConfigAddr] = getChainpoolConfigAddress(
    chainpool_program.programId
  );
  const [chainpoolAuthAddr] = getChainpoolAuthAddress(
    chainpool_program.programId
  );

  const chainpoolToken0 = getAssociatedTokenAddressSync(
    tokenMint,
    chainpoolAuthAddr,
    true,
    tokenInfo.owner,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`chainpoolToken0: ${chainpoolToken0.toBase58()}`);
  console.log(`ownerToken0: ${ownerToken0.toBase58()}`);
  console.log(`chainpoolAuthAddr: ${chainpoolAuthAddr.toBase58()}`);
  // Add your deployment logic here.
  // For example, initialize the chainpool program with the generated addresses.
  await chainpool_program.methods
    .deposit({
      transferTokenAmount: new anchor.BN(ta.value.amount),
    })
    .accounts({
      owner: owner.publicKey,
      authority: chainpoolAuthAddr,
      tokenAccount: ownerToken0,
      tokenMint: tokenMint,
      tokenVault: chainpoolToken0,
      tokenProgram: tokenInfo.owner,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc({
      skipPreflight: false,
      commitment: "processed",
    });
  // const config = await chainpool_program.account.chainPoolConfig.fetch(chainpoolConfigAddr);
  // console.log("Config: ", config);
  console.log("Deployment successful!");
}

main().catch((err) => {
  console.error(err);
});
