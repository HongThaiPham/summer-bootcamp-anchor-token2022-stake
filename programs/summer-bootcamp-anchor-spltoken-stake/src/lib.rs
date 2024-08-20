pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("GeHDEtmcien3L7U9TnLh69KHbrpbWBzr8btUbrkzGgSF");

#[program]
pub mod summer_bootcamp_anchor_spltoken_stake {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.handler(ctx.bumps)
    }

    pub fn create_pool(
        ctx: Context<CreatePool>,
        allocation: u64,
        reward_per_second: u64,
    ) -> Result<()> {
        ctx.accounts
            .handler(allocation, reward_per_second, ctx.bumps)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        ctx.accounts.handler(amount)
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        ctx.accounts.handler(amount, &ctx.bumps)
    }
}
