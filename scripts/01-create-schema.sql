-- Campfire Database Schema
-- Digital Badge Platform by Group 5 Scouts

-- Updated schema to match new challenge-based system

-- Drop all existing tables first to ensure clean slate
DROP TABLE IF EXISTS profile_likes CASCADE;
DROP TABLE IF EXISTS influences CASCADE;
DROP TABLE IF EXISTS awards CASCADE;
DROP TABLE IF EXISTS challenge_applications CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS organizers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS challenge_status CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS influence_status CASCADE;

-- Create enum for user roles (removed 'viewer')
CREATE TYPE user_role AS ENUM ('user', 'organizer');

-- Create enum for challenge status
CREATE TYPE challenge_status AS ENUM ('open', 'closed', 'completed');

-- Create enum for application status
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for influence status
CREATE TYPE influence_status AS ENUM ('pending', 'approved', 'rejected');

-- Users table: Main user records
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizers table: Additional info for users with 'organizer' role
CREATE TABLE IF NOT EXISTS organizers (
  wallet_address TEXT PRIMARY KEY REFERENCES users(wallet_address) ON DELETE CASCADE,
  org_name TEXT NOT NULL,
  org_description TEXT,
  org_logo_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenges table: Challenges created by organizers (renamed from badge_templates)
CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  created_by TEXT NOT NULL REFERENCES organizers(wallet_address) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  criteria TEXT,
  status challenge_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge Applications table: Users apply to challenges
CREATE TABLE IF NOT EXISTS challenge_applications (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  applicant_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, applicant_wallet)
);

-- Awards table: Badges awarded to users who completed challenges
CREATE TABLE IF NOT EXISTS awards (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  recipient_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  awarded_by TEXT NOT NULL REFERENCES organizers(wallet_address) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Influences table: Badge-level influencer relationships with approval
CREATE TABLE IF NOT EXISTS influences (
  id SERIAL PRIMARY KEY,
  influencer_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  influenced_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  award_id INTEGER REFERENCES awards(id) ON DELETE CASCADE,
  status influence_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(influencer_wallet, influenced_wallet, award_id)
);

-- Profile Likes table: Users can like other profiles
CREATE TABLE IF NOT EXISTS profile_likes (
  id SERIAL PRIMARY KEY,
  liker_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  liked_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(liker_wallet, liked_wallet)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON challenges(created_by);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenge_applications_challenge ON challenge_applications(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_applications_applicant ON challenge_applications(applicant_wallet);
CREATE INDEX IF NOT EXISTS idx_challenge_applications_status ON challenge_applications(status);
CREATE INDEX IF NOT EXISTS idx_awards_recipient ON awards(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_awards_challenge ON awards(challenge_id);
CREATE INDEX IF NOT EXISTS idx_awards_awarded_by ON awards(awarded_by);
CREATE INDEX IF NOT EXISTS idx_influences_influencer ON influences(influencer_wallet);
CREATE INDEX IF NOT EXISTS idx_influences_influenced ON influences(influenced_wallet);
CREATE INDEX IF NOT EXISTS idx_influences_award ON influences(award_id);
CREATE INDEX IF NOT EXISTS idx_profile_likes_liker ON profile_likes(liker_wallet);
CREATE INDEX IF NOT EXISTS idx_profile_likes_liked ON profile_likes(liked_wallet);
