-- NFT Marketplace & User Holdings Schema

-- Track on-chain ownership for each awarded NFT
CREATE TABLE IF NOT EXISTS user_nft_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id INTEGER NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  blockchain_object_id TEXT UNIQUE NOT NULL,
  current_owner TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  owner_acquired_at TIMESTAMPTZ DEFAULT NOW(),
  last_transfer_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_nft_holdings_owner ON user_nft_holdings(current_owner);
CREATE INDEX IF NOT EXISTS idx_user_nft_holdings_object ON user_nft_holdings(blockchain_object_id);

-- Flag awards that have been sold so profiles can show placeholders
ALTER TABLE awards ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT FALSE;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS sold_to_wallet TEXT REFERENCES users(wallet_address);

-- Listing workflow for peer-to-peer sales
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nft_listing_status') THEN
    CREATE TYPE nft_listing_status AS ENUM ('active', 'payment_pending', 'awaiting_transfer', 'completed', 'cancelled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS nft_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id UUID NOT NULL REFERENCES user_nft_holdings(id) ON DELETE CASCADE,
  seller_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  price_sui DECIMAL(12, 4) NOT NULL CHECK (price_sui > 0),
  status nft_listing_status NOT NULL DEFAULT 'active',
  buyer_wallet TEXT REFERENCES users(wallet_address) ON DELETE SET NULL,
  payment_transaction_hash TEXT,
  payment_submitted_at TIMESTAMPTZ,
  transfer_transaction_hash TEXT,
  transfer_completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_listings_active_holding
  ON nft_listings(holding_id)
  WHERE status IN ('active', 'payment_pending', 'awaiting_transfer');

CREATE INDEX IF NOT EXISTS idx_nft_listings_status ON nft_listings(status);
CREATE INDEX IF NOT EXISTS idx_nft_listings_seller ON nft_listings(seller_wallet);
CREATE INDEX IF NOT EXISTS idx_nft_listings_buyer ON nft_listings(buyer_wallet);

-- Backfill holdings for existing awards that already track blockchain objects
INSERT INTO user_nft_holdings (award_id, blockchain_object_id, current_owner, owner_acquired_at, metadata)
SELECT
  id,
  blockchain_object_id,
  recipient_wallet,
  awarded_at,
  jsonb_build_object('inventory_id', inventory_id)
FROM awards
WHERE blockchain_object_id IS NOT NULL
ON CONFLICT (blockchain_object_id) DO NOTHING;
