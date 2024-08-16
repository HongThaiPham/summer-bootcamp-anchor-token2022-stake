import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SummerBootcampAnchorSpltokenStake } from "../target/types/summer_bootcamp_anchor_spltoken_stake";

import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'

import tokenInfo from '../app/assets/token-info.json'

describe("summer-bootcamp-anchor-spltoken-stake", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.SummerBootcampAnchorSpltokenStake as Program<SummerBootcampAnchorSpltokenStake>;

  const [config] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

  it("Is initialized!", async () => {
    // Add your test here.
    const mintKeypair = anchor.web3.Keypair.generate();



    const tx = await program.methods.initialize().accountsPartial({
      mint: mintKeypair.publicKey,
      signer: provider.publicKey,
      config,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    }).signers([mintKeypair]).rpc();

    console.log("Your transaction signature", tx);
  });
});
