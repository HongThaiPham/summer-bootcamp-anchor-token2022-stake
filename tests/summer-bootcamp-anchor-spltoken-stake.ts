import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SummerBootcampAnchorSpltokenStake } from "../target/types/summer_bootcamp_anchor_spltoken_stake";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMint,
  createMintToCheckedInstruction,
  ExtensionType,
  getAccount,
  getAssociatedTokenAddressSync,
  getMintLen,
  getOrCreateAssociatedTokenAccount,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";

import tokenInfo from "../app/assets/token-info.json";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import { assert } from "chai";

describe("summer-bootcamp-anchor-spltoken-stake", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  provider.opts.commitment = "confirmed";
  anchor.setProvider(provider);

  const program = anchor.workspace
    .SummerBootcampAnchorSpltokenStake as Program<SummerBootcampAnchorSpltokenStake>;

  const [config] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  const rewardMintKeypair = anchor.web3.Keypair.generate();

  const stakeMintKeypair = anchor.web3.Keypair.generate();

  const metadata: TokenMetadata = {
    mint: stakeMintKeypair.publicKey,
    name: "STAKE TOKEN",
    symbol: "BCST",
    uri: "https://raw.githubusercontent.com/HongThaiPham/summer-bootcamp-anchor-token2022-stake/main/app/assets/token-info.json",
    additionalMetadata: [],
  };
  const staker = anchor.web3.Keypair.generate();
  console.log("Staker: ", staker.publicKey.toBase58());
  const rewardPerSecond = new anchor.BN(1_000_000_000);

  const stakerTokenAccount = getAssociatedTokenAddressSync(
    stakeMintKeypair.publicKey,
    staker.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const [pool] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), stakeMintKeypair.publicKey.toBuffer()],
    program.programId
  );

  const [stakeInfo] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("stakeinfo"), pool.toBuffer(), staker.publicKey.toBuffer()],
    program.programId
  );

  const stakeInfoAta = getAssociatedTokenAddressSync(
    stakeMintKeypair.publicKey,
    stakeInfo,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  const rewardAta = getAssociatedTokenAddressSync(
    rewardMintKeypair.publicKey,
    pool,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  before("Prepare test", async () => {
    // faucet to staker
    {
      const signature = await provider.connection.requestAirdrop(
        staker.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction({
        signature: signature,
        ...(await provider.connection.getLatestBlockhash()),
      });
    }

    // delay for airdrop

    {
      // create stake mint token
      const mintLen = getMintLen([ExtensionType.MetadataPointer]);

      const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

      const mintLamports =
        await provider.connection.getMinimumBalanceForRentExemption(
          mintLen + metadataLen
        );

      const mintTransaction = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: staker.publicKey,
          newAccountPubkey: stakeMintKeypair.publicKey,
          space: mintLen,
          lamports: mintLamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(
          stakeMintKeypair.publicKey,
          staker.publicKey,
          stakeMintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          stakeMintKeypair.publicKey,
          9,
          staker.publicKey,
          null,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          mint: stakeMintKeypair.publicKey,
          metadata: stakeMintKeypair.publicKey,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          mintAuthority: staker.publicKey,
          updateAuthority: staker.publicKey,
        }),
        createAssociatedTokenAccountInstruction(
          staker.publicKey,
          stakerTokenAccount,
          staker.publicKey,
          stakeMintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
        createMintToCheckedInstruction(
          stakeMintKeypair.publicKey,
          stakerTokenAccount,
          staker.publicKey,
          1_000 * anchor.web3.LAMPORTS_PER_SOL,
          9,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      const tx = await provider.sendAndConfirm(mintTransaction, [
        stakeMintKeypair,
        staker,
      ]);

      console.log("Prepare transaction signature: ", tx);
    }
  });

  it("Is configured", async () => {
    // Add your test here.
    const tx = await program.methods
      .initialize()
      .accountsPartial({
        mint: rewardMintKeypair.publicKey,
        signer: provider.publicKey,
        config,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([rewardMintKeypair])
      .rpc();

    console.log("Your transaction signature", tx);

    const configAccount = await program.account.config.fetch(config);
    assert(configAccount.rewardMint.equals(rewardMintKeypair.publicKey));
    assert(configAccount.authority.equals(provider.publicKey));
  });

  it("Should create a new pool", async () => {
    const tx = await program.methods
      .createPool(
        new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL),
        rewardPerSecond
      )
      .accounts({
        signer: provider.publicKey,
        rewardTokenProgram: TOKEN_2022_PROGRAM_ID,
        stakeTokenProgram: TOKEN_2022_PROGRAM_ID,
        rewardMint: rewardMintKeypair.publicKey,
        stakeMint: stakeMintKeypair.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);

    const poolAccount = await program.account.pool.fetch(pool);
    assert(poolAccount.rewardMint.equals(rewardMintKeypair.publicKey));
    assert(poolAccount.stakeMint.equals(stakeMintKeypair.publicKey));
    assert(poolAccount.rewardPerSecond.eq(rewardPerSecond));
    assert(
      poolAccount.allocation.eq(
        new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL)
      )
    );

    const rewardAtaAccount = await getAccount(
      provider.connection,
      rewardAta,
      null,
      TOKEN_2022_PROGRAM_ID
    );

    assert(
      new anchor.BN(rewardAtaAccount.amount.toString()).eq(
        new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL)
      )
    );
  });

  it("Should stake successfully", async () => {
    const tx = await program.methods
      .stake(new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL))
      .accounts({
        signer: staker.publicKey,
        stakeTokenProgram: TOKEN_2022_PROGRAM_ID,
        pool,
      })
      .signers([staker])
      .rpc();

    console.log("Your transaction signature", tx);

    const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeInfo);

    assert(
      stakeInfoAccount.amount.eq(
        new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL)
      )
    );

    const stakeInfoAtaAccount = await getAccount(
      provider.connection,
      stakeInfoAta,
      null,
      TOKEN_2022_PROGRAM_ID
    );

    assert(
      new anchor.BN(stakeInfoAtaAccount.amount.toString()).eq(
        new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL)
      )
    );
  });
});
