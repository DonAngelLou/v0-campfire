-- Blockchain integration support for tracking on-chain badge objects

-- Store the minted BadgeNFT object ids and their status directly on each inventory row
ALTER TABLE organizer_inventory
ADD COLUMN IF NOT EXISTS blockchain_tokens JSONB DEFAULT '[]'::jsonb;

-- Persist the specific on-chain object that was awarded to a recipient
ALTER TABLE awards
ADD COLUMN IF NOT EXISTS blockchain_object_id TEXT;
