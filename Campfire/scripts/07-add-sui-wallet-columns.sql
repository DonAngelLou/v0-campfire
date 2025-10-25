-- Add SUI wallet columns to users table
-- This migration adds blockchain wallet support while preserving existing data

-- Add sui_wallet_address column (nullable initially for backward compatibility)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS sui_wallet_address TEXT UNIQUE;

-- Add wallet_type column with default value
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'slush';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_sui_wallet_address ON users(sui_wallet_address);

-- Add comment for documentation
COMMENT ON COLUMN users.sui_wallet_address IS 'SUI blockchain wallet address from Slush Wallet';
COMMENT ON COLUMN users.wallet_type IS 'Type of wallet used (slush, sui, etc.)';
