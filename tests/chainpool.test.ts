import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Enum,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { BN } from "bn.js";
import { createHash, randomBytes } from "crypto";
import { Chainpool } from "../target/types/chainpool";
import {
  getChainpoolAuthAddress,
  getChainpoolConfigAddress,
  getChainpoolOrderAddress,
  sendTransaction,
  setupRouteTest,
} from "./utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  closeAccountInstructionData,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountIdempotent,
  createCloseAccountInstruction,
  createTransferCheckedInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  transfer,
  transferInstructionData,
} from "@solana/spl-token";
import { Address, ripemd160 } from "ethereumjs-util";

jest.setTimeout(300000);

describe("chainpool test", () => {
  // anchor.setProvider(anchor.AnchorProvider.env());
  const owner = anchor.Wallet.local().payer;
  const chainpool_program = anchor.workspace.Chainpool as Program<Chainpool>;

  const connection = chainpool_program.provider.connection;

  const [chainpoolConfigAddr] = getChainpoolConfigAddress(
    chainpool_program.programId
  );
  const [chainpoolAuthAddr] = getChainpoolAuthAddress(
    chainpool_program.programId
  );
  const router0 = new Keypair();
  const router1 = new Keypair();
  const router2 = new Keypair();
  const newUser = new Keypair();

  const solana = 197710212031;
  const bsc = 56;
  const polygon = 137;

  let token0: PublicKey;
  let token0Program: PublicKey;
  let ownerToken0: PublicKey;
  let token1: PublicKey;
  let token1Program: PublicKey;
  let ownerToken1: PublicKey;
  let ownerWSolAccount: PublicKey;
  let chainpoolToken0: PublicKey;
  let chainpoolToken1: PublicKey;
  let chainpoolWSolAccount: PublicKey;

  let router1Token1: PublicKey;
  let router1Token0: PublicKey;
  let router1WSolAccount: PublicKey;

  beforeAll(async () => {
    [
      { token0, token0Program, ownerToken0 },
      { token1, token1Program, ownerToken1 },
    ] = await setupRouteTest(anchor.getProvider().connection, owner, {
      transferFeeBasisPoints: 0,
      MaxFee: 0,
    });

    token0Program = (await connection.getAccountInfo(token0)).owner;

    ownerWSolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      owner.publicKey,
      false, // WSOL mint address
      TOKEN_PROGRAM_ID
    );

    await createAssociatedTokenAccountIdempotent(
      connection,
      owner,
      NATIVE_MINT,
      owner.publicKey,
    )

    chainpoolToken0 = getAssociatedTokenAddressSync(
      token0,
      chainpoolAuthAddr,
      true,
      token0Program
    );


    chainpoolToken1 = getAssociatedTokenAddressSync(
      token1,
      chainpoolAuthAddr,
      true,
      token1Program
    );

    chainpoolWSolAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      chainpoolAuthAddr,
      true,
      TOKEN_PROGRAM_ID
    );

    router1Token1 = getAssociatedTokenAddressSync(
      token1,
      router1.publicKey,
      false,
      token1Program
    );

    router1Token0 = getAssociatedTokenAddressSync(
      token0,
      router1.publicKey,
      false,
      token0Program
    );

    router1WSolAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      router1.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    await createAssociatedTokenAccountIdempotent(
      connection,
      owner,
      token1,
      router1.publicKey,
      {
        commitment: "processed",
      },
      token1Program
    );

    await createAssociatedTokenAccountIdempotent(
      connection,
      owner,
      token0,
      router1.publicKey,
      {
        commitment: "processed",
      },
      token0Program
    );

    await chainpool_program.methods
      .deposit({
        transferTokenAmount: new BN(1000),
      })
      .accounts({
        owner: owner.publicKey,
        authority: chainpoolAuthAddr,
        tokenAccount: ownerToken0,
        tokenMint: token0,
        tokenVault: chainpoolToken0,
        tokenProgram: token0Program,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc({
        skipPreflight: true,
        commitment: "processed",
      });



      // await chainpool_program.methods
      // .deposit({
      //   transferTokenAmount: new BN(100000),
      // })
      // .accounts({
      //   owner: owner.publicKey,
      //   authority: chainpoolAuthAddr,
      //   tokenAccount: ownerWSolAccount,
      //   tokenMint: NATIVE_MINT,
      //   tokenVault: chainpoolWSolAccount,
      //   tokenProgram: TOKEN_PROGRAM_ID,
      //   associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      //   systemProgram: SystemProgram.programId,
      // })
      // .rpc({
      //   skipPreflight: true,
      //   commitment: "processed",
      // });

    chainpool_program.addEventListener(
      "CrossBeginEvent",
      (event, slot, signature) => {
        const orderId = Buffer.from(
          Uint8Array.from(event.orderRecord.orderId)
        ).toString("hex");
        console.log(
          `CrossBeginEvent: orderId[${orderId}], tokenAmount[${
            event.orderRecord.tokenAmount
          }], fromChainId[${event.orderRecord.fromChainId}], from[${
            event.orderRecord.from
          }], fromToken[${event.orderRecord.fromToken}], toToken[${
            event.orderRecord.toToken
          }], swapTokenOutMinAmountOut[${
            event.orderRecord.swapTokenOutMinAmountOut
          }], minAmountOut[${event.orderRecord.minAmountOut}], crossType[${
            event.crossType
          }], swapBefore[${event.orderRecord.swapTokenOutBeforeBalance}]`
        );
      }
    );
    chainpool_program.addEventListener(
      "CrossFinishEvent",
      (event, slot, signature) => {
        const orderId = Buffer.from(
          Uint8Array.from(event.orderRecord.orderId)
        ).toString("hex");
        console.log(
          `CrossFinishEvent: orderId[${orderId}], tokenAmount[${
            event.orderRecord.tokenAmount
          }], fromChainId[${event.orderRecord.fromChainId}], from[${
            event.orderRecord.from
          }], fromToken[${event.orderRecord.fromToken}], toToken[${
            event.orderRecord.toToken
          }], swapTokenOutMinAmountOut[${
            event.orderRecord.swapTokenOutMinAmountOut
          }], minAmountOut[${event.orderRecord.minAmountOut}], crossType[${
            event.crossType
          }], swapBefore[${
            event.orderRecord.swapTokenOutBeforeBalance
          }], swapfter[${event.afterBalance}]`
        );
      }
    );
  });

  it("create chainpool", async () => {

    await Promise.all([
      connection.requestAirdrop(router0.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(router1.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(router2.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(newUser.publicKey, LAMPORTS_PER_SOL),
    ]);

    console.log(`chainpoolAuthAddr: ${chainpoolAuthAddr.toBase58()}`);
    console.log(`chainpoolConfigAddr: ${chainpoolConfigAddr.toBase58()}`);
    await chainpool_program.methods
      .initConfig({
        admin: owner.publicKey,
        routers: [router0.publicKey, router1.publicKey],
      })
      .accounts({
        payer: owner.publicKey,
        authority: chainpoolAuthAddr,
        config: chainpoolConfigAddr,
        systemProgram: SystemProgram.programId,
      })
      .rpc({
        skipPreflight: true,
        commitment: "processed",
      });

    const config = await chainpool_program.account.chainPoolConfig.fetch(
      chainpoolConfigAddr
    );
    expect(config.routers.length).toEqual(2);
    expect(config.admin.toBase58()).toEqual(owner.publicKey.toBase58());
  });

  it("should update config", async () => {
    await chainpool_program.methods
      .updateConfig({
        routers: [router0.publicKey, router1.publicKey, router2.publicKey],
      })
      .accounts({
        admin: owner.publicKey,
        config: chainpoolConfigAddr,
      })
      .rpc({
        skipPreflight: true,
        commitment: "processed",
      });

    const config = await chainpool_program.account.chainPoolConfig.fetch(
      chainpoolConfigAddr
    );
    expect(config.routers.length).toEqual(3);
    expect(config.admin.toBase58()).toEqual(owner.publicKey.toBase58());
  });

  const newAdmin = new Keypair();
  it("should transfer admin", async () => {
    await chainpool_program.methods
      .transferAdmin({
        admin: newAdmin.publicKey,
      })
      .accounts({
        admin: owner.publicKey,
        config: chainpoolConfigAddr,
      })
      .rpc({
        skipPreflight: true,
        commitment: "processed",
      });

    const config = await chainpool_program.account.chainPoolConfig.fetch(
      chainpoolConfigAddr
    );
    expect(config.admin).toEqual(newAdmin.publicKey);
  });

  it("should withdraw", async () => {
    let balanceBefore = await connection.getTokenAccountBalance(
      chainpoolToken0
    );

    expect(balanceBefore.value.amount).toEqual("1000");

    const router1Token0 = getAssociatedTokenAddressSync(
      token0,
      router1.publicKey,
      false,
      token0Program
    );
    await chainpool_program.methods
      .withdraw({
        transferTokenAmount: new BN(100),
      })
      .accounts({
        router: router1.publicKey,
        config: chainpoolConfigAddr,
        authority: chainpoolAuthAddr,
        tokenAccount: router1Token0,
        tokenMint: token0,
        tokenVault: chainpoolToken0,
        tokenProgram: token0Program,
        systemProgram: SystemProgram.programId,
      })
      .signers([router1])
      .rpc({
        // skipPreflight: true,
        commitment: "processed",
      });

    const balanceAfter = await connection.getTokenAccountBalance(
      chainpoolToken0
    );
    expect(balanceAfter.value.amount).toEqual("900");

    const accountBalance = await connection.getTokenAccountBalance(
      router1Token0
    );
    expect(accountBalance.value.amount).toEqual("100");
  });

  // it("should cross in(Sol)", async () => {
  //   const userWSolAccount = await getAssociatedTokenAddress(
  //     NATIVE_MINT,
  //     newUser.publicKey,
  //     false, // WSOL mint address
  //     TOKEN_PROGRAM_ID
  //   );

  //   const orderId = ripemd160(Buffer.from("order1_SOL"), false);
  //   const from = Address.fromPrivateKey(randomBytes(32)).toBuffer();
  //   const toToken = Address.fromPrivateKey(randomBytes(32)).toBuffer();
  //   const receiver = newUser.publicKey.toBuffer();

  //   const [record] = getChainpoolOrderAddress(
  //     chainpool_program.programId,
  //     orderId
  //   );
  //   const accounts = {
  //     router: router1.publicKey,
  //     user: newUser.publicKey,
  //     config: chainpoolConfigAddr,
  //     record: record,
  //     tokenMint: NATIVE_MINT,
  //     tokenAccount: userWSolAccount,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //     associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //     systemProgram: SystemProgram.programId,
  //   };

  //   const prepareOrderIns = await chainpool_program.methods
  //     .crossIn({
  //       orderId: Array.from(orderId),
  //       tokenAmount: new BN(300),
  //       fromChainId: new BN(bsc),
  //       from: Array.from(from),
  //       fromToken: Array.from(toToken),
  //       toToken: Array.from(NATIVE_MINT.toBuffer()),
  //       swapTokenOutMinAmountOut: new BN(200),
  //       minAmountOut: new BN(200),
  //     })
  //     .accounts(accounts)
  //     .instruction();

  //   const withdrawAccounts = {
  //     router: router1.publicKey,
  //     config: chainpoolConfigAddr,
  //     authority: chainpoolAuthAddr,
  //     tokenAccount: router1WSolAccount,
  //     tokenMint: NATIVE_MINT,
  //     tokenVault: chainpoolWSolAccount,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //     systemProgram: SystemProgram.programId,
  //   };
  //   // const before0 = await connection.getTokenAccountBalance(router1Token0);
  //   const withdrawIns = await chainpool_program.methods
  //     .withdraw({
  //       transferTokenAmount: new BN(300),
  //     })
  //     .accounts(withdrawAccounts)
  //     .instruction();
  //   // const after0 = await connection.getTokenAccountBalance(router1Token0);
  //   // expect(parseInt(after0.value.amount)).toEqual(parseInt(before0.value.amount) + 300);

  //   // instead of exactTokenSwap
  //   const swapIns = createTransferCheckedInstruction(
  //     router1WSolAccount,
  //     NATIVE_MINT,
  //     userWSolAccount,
  //     owner.publicKey,
  //     300,
  //     9,
  //     [router1],
  //     TOKEN_PROGRAM_ID
  //   );
  //   const finishOrderIns = await chainpool_program.methods
  //     .crossFinish({
  //       orderId: Array.from(orderId),
  //     })
  //     .accounts({
  //       payer: router1.publicKey,
  //       record: record,
  //       tokenAccount: userWSolAccount,
  //     })
  //     .instruction();
    

  //   await sendTransaction(
  //     connection,
  //     [prepareOrderIns, withdrawIns, swapIns, finishOrderIns],
  //     [router1, owner], // owner signer just for swapIns
  //     {
  //       commitment: "processed",
  //     }
  //   );
  // });


  it("should cross in", async () => {
    const userToken1 = getAssociatedTokenAddressSync(
      token1,
      newUser.publicKey,
      false,
      token1Program
    );

    const orderIdFull = ripemd160(Buffer.from("order1"), false);
    const orderId = Buffer.concat([Buffer.from([255]), orderIdFull.subarray(1, 8)]) ;
    const from = Address.fromPrivateKey(randomBytes(32)).toBuffer();
    const toToken = Address.fromPrivateKey(randomBytes(32)).toBuffer();
    const receiver = newUser.publicKey.toBuffer();

    const [record] = getChainpoolOrderAddress(
      chainpool_program.programId,
      orderId
    );
    const accounts = {
      router: router1.publicKey,
      user: newUser.publicKey,
      config: chainpoolConfigAddr,
      record: record,
      tokenMint: token1,
      tokenAccount: userToken1,
      tokenProgram: token1Program,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    const prepareOrderIns = await chainpool_program.methods
      .crossIn({
        orderId: Array.from(orderId),
        // tokenAmount: new BN(300),
        // fromChainId: new BN(bsc),
        // from: Array.from(from),
        // fromToken: Array.from(toToken),
        // toToken: Array.from(token1.toBuffer()),
        // swapTokenOutMinAmountOut: new BN(200),
        minAmountOut: new BN(200),
      })
      .accounts(accounts)
      .instruction();

    const withdrawAccounts = {
      router: router1.publicKey,
      config: chainpoolConfigAddr,
      authority: chainpoolAuthAddr,
      tokenAccount: router1Token0,
      tokenMint: token0,
      tokenVault: chainpoolToken0,
      tokenProgram: token0Program,
      systemProgram: SystemProgram.programId,
    };
    // const before0 = await connection.getTokenAccountBalance(router1Token0);
    const withdrawIns = await chainpool_program.methods
      .withdraw({
        transferTokenAmount: new BN(300),
      })
      .accounts(withdrawAccounts)
      .instruction();
    // const after0 = await connection.getTokenAccountBalance(router1Token0);
    // expect(parseInt(after0.value.amount)).toEqual(parseInt(before0.value.amount) + 300);

    // instead of exactTokenSwap
    const swapIns = createTransferCheckedInstruction(
      ownerToken1,
      token1,
      userToken1,
      owner.publicKey,
      300,
      9,
      [owner],
      token1Program
    );
    const finishOrderIns = await chainpool_program.methods
      .crossFinish({
        orderId: Array.from(orderId),
      })
      .accounts({
        payer: router1.publicKey,
        user: newUser.publicKey,
        record: record,
        tokenAccount: userToken1,
      })
      .instruction();

    await sendTransaction(
      connection,
      [prepareOrderIns, withdrawIns, swapIns, finishOrderIns],
      [router1, owner], // owner signer just for swapIns
      {
        commitment: "processed",
      }
    );
  });

  it("should cross out", async () => {
    const userToken1 = getAssociatedTokenAddressSync(
      token1,
      newUser.publicKey,
      false,
      token1Program
    );
    
    const orderIdFull = ripemd160(Buffer.from("order2"), false);
    const orderId = Buffer.concat([Buffer.from([255]), orderIdFull.subarray(1, 8)]) ;

    const receiver = Address.fromPrivateKey(randomBytes(32)).toBuffer();
    const from = newUser.publicKey.toBuffer();
    const fromToken = Address.fromPrivateKey(randomBytes(32)).toBuffer();
    const [record] = getChainpoolOrderAddress(
      chainpool_program.programId,
      orderId
    );
    let amountOut = new BN("4558728638922499788144");
    const prepareOrderIns = await chainpool_program.methods
      .crossOut({
        orderId: Array.from(orderId),
        tokenAmount: new BN(300),
        // fromChainId: new BN(solana),
        toChainId: new BN(polygon),
        // from: Array.from(
        //   from
        // ),
        receiver: Array.from(receiver),
        fromToken: Array.from(token1.toBuffer()),
        toToken: Array.from(fromToken),
        swapTokenOutMinAmountOut: new BN(200),
        minAmountOut: amountOut,
      })
      .accounts({
        payer: newUser.publicKey,
        authority: chainpoolAuthAddr,
        record: record,
        tokenMint: token1,
        tokenAccount: chainpoolToken1,
        tokenProgram: token1Program,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const swapIns = createTransferCheckedInstruction(
      ownerToken1,
      token1,
      chainpoolToken1,
      owner.publicKey,
      3000,
      9,
      [owner],
      token1Program
    );
    const finishOrderIns = await chainpool_program.methods
      .crossFinish({
        orderId: Array.from(orderId),
      })
      .accounts({
        payer: newUser.publicKey,
        user: chainpoolAuthAddr,
        record: record,
        tokenAccount: chainpoolToken1,
      })
      .instruction();

    await sendTransaction(
      connection,
      [prepareOrderIns, swapIns, finishOrderIns],
      [newUser, owner],
      {
        commitment: "processed",
      }
    );
  });
});
