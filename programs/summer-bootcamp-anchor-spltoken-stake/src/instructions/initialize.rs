use anchor_lang::{prelude::*, solana_program::program::invoke_signed, system_program};
use anchor_spl::{
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata,
    },
    token_2022::{
        initialize_mint2,
        spl_token_2022::{self, extension::ExtensionType, state::Mint},
        InitializeMint2, Token2022,
    },
    token_2022_extensions::{self, token_metadata},
    token_interface::{spl_token_metadata_interface::state::TokenMetadata, TokenInterface},
};

use crate::{Config, CONFIG_SEED};
// https://orange-nasty-woodpecker-487.mypinata.cloud/ipfs/QmPD5UHJXsuZUgh7Bx81CEbYHRE1gM1LrXwMrx7jkeEgRp
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub mint: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> Initialize<'info> {
    pub fn handler(&mut self, bumps: InitializeBumps) -> Result<()> {
        self.config.authority = self.signer.to_account_info().key();
        self.config.reward_mint = self.mint.to_account_info().key();
        self.create_metadata(bumps)?;
        Ok(())
    }

    pub fn create_metadata(&mut self, bumps: InitializeBumps) -> Result<()> {
        let seeds = &[CONFIG_SEED, &[bumps.config]];
        let signer_seeds = &[&seeds[..]];

        let size =
            ExtensionType::try_calculate_account_len::<Mint>(&[ExtensionType::MetadataPointer])
                .unwrap();

        let metadata = TokenMetadata {
                update_authority: anchor_spl::token_interface::spl_pod::optional_keys::OptionalNonZeroPubkey(self.config.to_account_info().key()),
                mint: self.mint.to_account_info().key(),
                name: "Summer Bootcamp".to_string(),
                symbol: "SBC".to_string(),
                uri: "https://orange-nasty-woodpecker-487.mypinata.cloud/ipfs/QmRZek8nqjZim2xrjtVpoYckjeQ5Vr7UkdXEH3VHPe2aSn".to_string(),
                additional_metadata: vec![],
            };

        let extension_extra_space = metadata.tlv_size_of().unwrap();
        let lamports = self.rent.minimum_balance(size + extension_extra_space);

        system_program::create_account(
            CpiContext::new(
                self.system_program.to_account_info(),
                system_program::CreateAccount {
                    from: self.signer.to_account_info(),
                    to: self.mint.to_account_info(),
                },
            ),
            lamports,
            size.try_into().unwrap(),
            &spl_token_2022::ID,
        )?;

        token_2022_extensions::metadata_pointer_initialize(
            CpiContext::new(
                self.token_program.to_account_info(),
                token_2022_extensions::MetadataPointerInitialize {
                    token_program_id: self.token_program.to_account_info(),
                    mint: self.mint.to_account_info(),
                },
            ),
            Some(self.config.to_account_info().key()),
            Some(self.mint.to_account_info().key()),
        )?;

        initialize_mint2(
            CpiContext::new(
                self.token_program.to_account_info(),
                InitializeMint2 {
                    mint: self.mint.to_account_info(),
                },
            ),
            9,
            &self.config.to_account_info().key(),
            None,
        )?;

        invoke_signed(&token_2022_extensions::spl_token_metadata_interface::instruction::initialize(
            self.token_program.to_account_info().key,
            self.mint.to_account_info().key,
            self.config.to_account_info().key,
            self.mint.to_account_info().key,
            self.config.to_account_info().key,
            "Summer Bootcamp".to_string(),
            "SBC".to_string(),
            "https://orange-nasty-woodpecker-487.mypinata.cloud/ipfs/QmRZek8nqjZim2xrjtVpoYckjeQ5Vr7UkdXEH3VHPe2aSn".to_string(),
        ), &[
            self.token_program.to_account_info(),
            self.mint.to_account_info(),
            self.config.to_account_info(),
        ], signer_seeds)?;

        Ok(())
    }
}
