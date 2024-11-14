import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  VersionedTransaction,
} from "@solana/web3.js";
import { Chainpool } from "../target/types/chainpool";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  getChainpoolAuthAddress,
  getChainpoolConfigAddress,
} from "../tests/utils";
import * as dotenv from "dotenv";
const idl = require("../target/idl/chainpool.json");
import { skip } from "node:test";

dotenv.config();

async function main() {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());
  const connection = new Connection(process.env.ANCHOR_PROVIDER_URL);

  const owner = anchor.Wallet.local().payer;
  const programId = new PublicKey(
    "B6rMLK5baKzh7uKTX9GnvaX1VLBZ8eYtZoEGpYkvwCVF"
  );
  const provider = new anchor.AnchorProvider(
    connection,
    anchor.Wallet.local(),
    {}
  );
  const chainpool_program = new Program<Chainpool>(idl, programId, provider);

  const router0 = new Keypair();
  const router1 = new Keypair();
  const router2 = new Keypair();

  console.log(`Private key of router0: ${router0.secretKey.toString()}`);
  console.log(`Private key of router1: ${router1.secretKey.toString()}`);
  console.log(`Private key of router2: ${router2.secretKey.toString()}`);

  // Get addresses for chainpool configuration and authorization.
  const [chainpoolConfigAddr] = getChainpoolConfigAddress(
    chainpool_program.programId
  );
  const [chainpoolAuthAddr] = getChainpoolAuthAddress(
    chainpool_program.programId
  );

  await chainpool_program.methods
    .initConfig({
      admin: owner.publicKey,
      routers: [router0.publicKey, router1.publicKey, router2.publicKey],
    })
    .accounts({
      payer: owner.publicKey,
      authority: chainpoolAuthAddr,
      config: chainpoolConfigAddr,
      systemProgram: SystemProgram.programId,
    })
    .rpc({
      skipPreflight: false,
    });
  const config = await chainpool_program.account.chainPoolConfig.fetch(chainpoolConfigAddr);
  for (let i = 0; i < config.routers.length; i++) {
    console.log(`Router ${i}: ${config.routers[i].toBase58()}`);
  }
  console.log("Config: ", config);
  console.log("Deployment successful!");

}

main().catch((err) => {
  console.error(err);
});
