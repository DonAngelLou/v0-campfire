-- Add NFT Badge Store Schema
-- This script adds tables for the NFT badge store, inventory, and purchase tracking

-- Store Items Table (NFT designs available for purchase)
CREATE TABLE IF NOT EXISTS store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
  rank_name TEXT NOT NULL,
  rank_color TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT NOT NULL,
  is_customizable BOOLEAN NOT NULL DEFAULT true,
  artist_name TEXT,
  artist_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizer Inventory Table (Purchased NFTs)
CREATE TABLE IF NOT EXISTS organizer_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_wallet TEXT NOT NULL REFERENCES organizers(wallet_address) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  custom_name TEXT,
  custom_description TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  awarded BOOLEAN DEFAULT false,
  awarded_to TEXT REFERENCES users(wallet_address) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ
);

-- Purchase History Table (Track all purchases)
CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_wallet TEXT NOT NULL REFERENCES organizers(wallet_address) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES organizer_inventory(id) ON DELETE CASCADE,
  price_paid DECIMAL(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'simulated',
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add store_item_id to challenges table
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS store_item_id UUID REFERENCES store_items(id) ON DELETE SET NULL;

-- Add inventory_id to awards table
ALTER TABLE awards ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES organizer_inventory(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_items_rank ON store_items(rank);
CREATE INDEX IF NOT EXISTS idx_organizer_inventory_organizer ON organizer_inventory(organizer_wallet);
CREATE INDEX IF NOT EXISTS idx_organizer_inventory_awarded ON organizer_inventory(awarded);
CREATE INDEX IF NOT EXISTS idx_purchase_history_organizer ON purchase_history(organizer_wallet);
