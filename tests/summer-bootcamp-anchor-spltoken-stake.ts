import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SummerBootcampAnchorSpltokenStake } from "../target/types/summer_bootcamp_anchor_spltoken_stake";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import tokenInfo from "../app/assets/token-info.json";

describe("summer-bootcamp-anchor-spltoken-stake", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .SummerBootcampAnchorSpltokenStake as Program<SummerBootcampAnchorSpltokenStake>;

  const [config] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  const rewardMintKeypair = anchor.web3.Keypair.generate();

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
  });

  it("Should create a new pool", async () => {
    const tx = await program.methods
      .createPool(new anchor.BN(1000_000_000_000))
      .accounts({
        signer: provider.publicKey,
        rewardTokenProgram: TOKEN_2022_PROGRAM_ID,
        stakeTokenProgram: TOKEN_2022_PROGRAM_ID,
        rewardMint: rewardMintKeypair.publicKey,
        stakeMint: rewardMintKeypair.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
