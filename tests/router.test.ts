import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Router } from "../target/types/router";
import { BN } from "bn.js";
import {
  BPF_LOADER_DEPRECATED_PROGRAM_ID,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  accountExist,
  createValues,
  getRouterConfigAddress,
  mintingTokens,
  setupRouteTest,
  TestValues,
} from "./utils";
import {
  createNativeMint,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

jest.setTimeout(300000);

const FeeType = {
  Fixed: 0,
  PROPORTION: 1,
};

describe("router", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const owner = anchor.Wallet.local().payer;
  const router_program = anchor.workspace.Router as Program<Router>;

  const connection = router_program.provider.connection;

  const [config_address, _] = getRouterConfigAddress(router_program.programId);
  const platform_fee_receiver = new Keypair();

  beforeAll(async () => {
    await router_program.methods
      .initConfig({
        admin: owner.publicKey,
        referrer: platform_fee_receiver.publicKey,
        rateOrNativeFee: new BN(100),
        feeType: { proportion: {} },
      })
      .accounts({
        payer: owner.publicKey,
        config: config_address,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc({
        skipPreflight: true,
        commitment: "processed",
      });
  });

  it("should init config", async () => {
    expect(await accountExist(connection, config_address));
    const config = await router_program.account.routerConfig.fetch(
      config_address
    );
    expect(config.admin).toEqual(owner.publicKey);
    expect(config.admin).toEqual(owner.publicKey);
    expect(config.rateOrNativeFee.toNumber()).toEqual(new BN(100).toNumber());
  });

  it("should update config", async () => {
    await router_program.methods
      .updateConfig({
        admin: owner.publicKey,
        referrer: platform_fee_receiver.publicKey,
        rateOrNativeFee: new BN(100),
        feeType: { proportion: {} },
      })
      .accounts({
        admin: owner.publicKey,
        config: config_address,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc({
        // skipPreflight: true,
        commitment: "processed",
      });
    const config = await router_program.account.routerConfig.fetch(
      config_address
    );
    expect(config.rateOrNativeFee.toNumber()).toEqual(new BN(100).toNumber());
  });

  it("should get fee", async () => {
    const fee = await router_program.methods
      .getFee({
        referrer: platform_fee_receiver.publicKey,
        rateOrNativeFee: new BN(100),
        feeType: { proportion: {} },
        tokenAmount: new BN(1),
      })
      .accounts({ config: config_address })
      .view();
      expect(fee.toNumber()).toEqual(new BN(1).toNumber());
  });

  const feeReceiver = new Keypair();
  it("should router swap", async () => {
    await connection.requestAirdrop(feeReceiver.publicKey, 1000000000);
    await connection.requestAirdrop(
      platform_fee_receiver.publicKey,
      1000000000
    );
    const config = await router_program.account.routerConfig.fetch(
      config_address
    );

    const [
      { token0, token0Program, ownerToken0 },
      { token1, token1Program, ownerToken1 },
    ] = await setupRouteTest(
      anchor.getProvider().connection,
      owner,
      { transferFeeBasisPoints: 0, MaxFee: 0 }
    );
    const feeAdapterTokenAccount = getAssociatedTokenAddressSync(
      token0,
      feeReceiver.publicKey,
      false,
      token0Program
    );

    const feePlatformTokenAccount = getAssociatedTokenAddressSync(
      token0,
      platform_fee_receiver.publicKey,
      false,
      token0Program
    );

    const accounts = {
      payer: owner.publicKey,
      config: config_address,
      inputTokenAccount: ownerToken0,
      outputTokenAccount: ownerToken1,
      inputTokenMint: token0,
      outputTokenMint: token1,
      feeAdapterReferrer: feeReceiver.publicKey,
      feeAdapterTokenAccount: feeAdapterTokenAccount,
      platformFeeTokenAccount: feePlatformTokenAccount,
      platformFeeReferrer: platform_fee_receiver.publicKey,
      inputTokenProgram: token0Program,
      outputTokenProgram: token1Program,
      systemProgram: SystemProgram.programId,
    };
    // for (const key of Object.keys(accounts)) {
    //   console.log(key, accounts[key].toBase58());
    // }
    const fixedFeeType = { fixed: {} };
    const proportionFeeType = { proportion: {} };
    await router_program.methods
      .apply({
        feeAdapter: {
          feeAdapterReferrer: feeReceiver.publicKey,
          rateOrNativeFee: new BN(100000000),
          feeType: fixedFeeType,
        },
        programKey: feeReceiver.publicKey,
        amountIn: new BN(1000000),
        minimumAmountOut: new BN(0),
        data: Buffer.from([]),
      })
      .accounts(accounts)
      .signers([owner])
      .rpc({
        // skipPreflight: true,
        commitment: "processed",
      });

 
    if (config.feeType.fixed) {
     const platformFeeReceiver_after = await connection.getBalance(
        platform_fee_receiver.publicKey
      );
      expect(platformFeeReceiver_after.valueOf).toEqual(1100000000);
    } else {
      const platformFeeReceiver_after = await connection.getTokenAccountBalance(
        feePlatformTokenAccount
      );
      expect(platformFeeReceiver_after.value.amount).toEqual('10000');
    }

  
    if (fixedFeeType) {
      const feeAdapter_after = await connection.getBalance(feeReceiver.publicKey);
      expect(feeAdapter_after.valueOf()).toEqual(1100000000);
    } else {
      const feeAdapter_after = await connection.getTokenAccountBalance(
        feeAdapterTokenAccount
      );
      expect(feeAdapter_after.value.amount).toEqual('10000');
    }



  });
});
