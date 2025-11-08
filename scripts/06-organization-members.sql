-- Add organization members table for multi-admin support
CREATE TABLE IF NOT EXISTS organization_members (
  id SERIAL PRIMARY KEY,
  organization_wallet VARCHAR(255) NOT NULL REFERENCES organizers(wallet_address) ON DELETE CASCADE,
  user_wallet VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'left')),
  invited_by VARCHAR(255) REFERENCES users(wallet_address),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_wallet, user_wallet)
);

-- Add created_by field to organizers table to track who created the organization
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) REFERENCES users(wallet_address);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_wallet);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_wallet);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);

-- Migrate existing organizers to have themselves as owners
INSERT INTO organization_members (organization_wallet, user_wallet, role, status, accepted_at)
SELECT wallet_address, wallet_address, 'owner', 'active', NOW()
FROM organizers
ON CONFLICT (organization_wallet, user_wallet) DO NOTHING;

-- Update created_by for existing organizers
UPDATE organizers SET created_by = wallet_address WHERE created_by IS NULL;
