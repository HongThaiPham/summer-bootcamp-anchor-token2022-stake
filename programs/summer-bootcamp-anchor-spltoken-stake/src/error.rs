use anchor_lang::prelude::*;

#[error_code]
pub enum MyErrorCode {
    InvalidDepositAmount,
    InvalidStakeMintAccount,
    AllocationMustBeGreaterThanZero,
    RewardPerSecondMustBeGreaterThanZero,
    InvalidUnstakeAmount,
    InsufficientStakeAmount,
    Overflow,
}
