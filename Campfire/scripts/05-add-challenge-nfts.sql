-- Add support for multiple NFTs per challenge
-- This allows organizers to allocate specific NFTs to challenges

-- Only add challenge_id column, remove duplicate columns
ALTER TABLE organizer_inventory
ADD COLUMN IF NOT EXISTS challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL;

-- Update awards table to link to specific inventory items
ALTER TABLE awards
ADD COLUMN IF NOT EXISTS inventory_id INTEGER REFERENCES organizer_inventory(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organizer_inventory_challenge ON organizer_inventory(challenge_id);
CREATE INDEX IF NOT EXISTS idx_organizer_inventory_awarded ON organizer_inventory(awarded_to);
CREATE INDEX IF NOT EXISTS idx_awards_inventory ON awards(inventory_id);
