-- Campfire Seed Data
-- Mock data for testing the badge platform

-- Updated seed data to match new challenge-based system

-- Insert mock users (organizers and regular users)
INSERT INTO users (wallet_address, display_name, bio, avatar_url, role) VALUES
  ('alice.eth', 'Alice Chen', 'Community builder and tech enthusiast', '/placeholder.svg?height=100&width=100', 'organizer'),
  ('bob.eth', 'Bob Martinez', 'Scout leader and outdoor educator', '/placeholder.svg?height=100&width=100', 'organizer'),
  ('carol.eth', 'Carol Johnson', 'Learning new skills every day', '/placeholder.svg?height=100&width=100', 'user'),
  ('dave.eth', 'Dave Kim', 'Full-stack developer and mentor', '/placeholder.svg?height=100&width=100', 'user'),
  ('eve.eth', 'Eve Rodriguez', 'Design thinking advocate', '/placeholder.svg?height=100&width=100', 'user'),
  ('frank.eth', 'Frank Wilson', 'Passionate about learning', '/placeholder.svg?height=100&width=100', 'user'),
  ('grace.eth', 'Grace Lee', 'Passionate about education', '/placeholder.svg?height=100&width=100', 'user'),
  ('henry.eth', 'Henry Brown', 'Tech community organizer', '/placeholder.svg?height=100&width=100', 'organizer')
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert organizer details for users with 'organizer' role
INSERT INTO organizers (wallet_address, org_name, org_description, org_logo_url, verified) VALUES
  ('alice.eth', 'Tech Pioneers', 'Building the future of technology education', '/placeholder.svg?height=80&width=80', true),
  ('bob.eth', 'Outdoor Adventures', 'Teaching wilderness skills and leadership', '/placeholder.svg?height=80&width=80', true),
  ('henry.eth', 'Code Academy', 'Empowering developers worldwide', '/placeholder.svg?height=80&width=80', false)
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert challenges
INSERT INTO challenges (created_by, name, description, criteria, status) VALUES
  ('alice.eth', 'Web3 Pioneer', 'Complete introduction to blockchain technology', 'Complete Web3 fundamentals course and build a dApp', 'open'),
  ('alice.eth', 'Community Leader', 'Demonstrate exceptional community building skills', 'Organize 3+ community events with 50+ participants', 'open'),
  ('bob.eth', 'Wilderness Expert', 'Master outdoor survival skills', 'Complete advanced wilderness training program', 'open'),
  ('bob.eth', 'First Aid Certified', 'Get certified in emergency first aid', 'Pass first aid certification exam', 'closed'),
  ('henry.eth', 'Full Stack Developer', 'Build and deploy a full-stack application', 'Create and deploy a production-ready web application', 'open'),
  ('henry.eth', 'Open Source Contributor', 'Make significant contributions to open source', 'Contribute to 5+ open source projects', 'open')
ON CONFLICT DO NOTHING;

-- Insert challenge applications
INSERT INTO challenge_applications (challenge_id, applicant_wallet, status) VALUES
  (1, 'carol.eth', 'approved'),
  (1, 'eve.eth', 'approved'),
  (2, 'dave.eth', 'approved'),
  (2, 'grace.eth', 'approved'),
  (3, 'carol.eth', 'approved'),
  (4, 'eve.eth', 'approved'),
  (5, 'dave.eth', 'approved'),
  (6, 'grace.eth', 'approved'),
  (1, 'frank.eth', 'pending'),
  (2, 'frank.eth', 'pending'),
  (3, 'dave.eth', 'pending'),
  (5, 'grace.eth', 'rejected')
ON CONFLICT DO NOTHING;

-- Insert awards (badges earned by users)
INSERT INTO awards (challenge_id, recipient_wallet, awarded_by, notes) VALUES
  (1, 'carol.eth', 'alice.eth', 'Excellent work on the final project!'),
  (2, 'dave.eth', 'alice.eth', 'Outstanding leadership in organizing hackathons'),
  (3, 'carol.eth', 'bob.eth', 'Demonstrated exceptional survival skills'),
  (4, 'eve.eth', 'bob.eth', 'Passed with flying colors'),
  (5, 'dave.eth', 'henry.eth', 'Built an impressive e-commerce platform'),
  (6, 'grace.eth', 'henry.eth', 'Great contributions to React ecosystem'),
  (1, 'eve.eth', 'alice.eth', 'Creative approach to smart contracts'),
  (2, 'grace.eth', 'alice.eth', 'Built an amazing study group community'),
  (5, 'carol.eth', 'henry.eth', 'Excellent full-stack skills demonstrated')
ON CONFLICT DO NOTHING;

-- Insert influences (badge-level mentorship relationships with approval)
INSERT INTO influences (influencer_wallet, influenced_wallet, award_id, status) VALUES
  ('alice.eth', 'carol.eth', 1, 'approved'),
  ('alice.eth', 'dave.eth', 2, 'approved'),
  ('bob.eth', 'carol.eth', 3, 'approved'),
  ('bob.eth', 'eve.eth', 4, 'approved'),
  ('henry.eth', 'dave.eth', 5, 'approved'),
  ('henry.eth', 'grace.eth', 6, 'approved'),
  ('dave.eth', 'grace.eth', 8, 'pending'),
  ('carol.eth', 'eve.eth', 7, 'approved')
ON CONFLICT DO NOTHING;

-- Insert profile likes
INSERT INTO profile_likes (liker_wallet, liked_wallet) VALUES
  ('alice.eth', 'carol.eth'),
  ('bob.eth', 'carol.eth'),
  ('dave.eth', 'carol.eth'),
  ('carol.eth', 'dave.eth'),
  ('eve.eth', 'dave.eth'),
  ('grace.eth', 'dave.eth'),
  ('frank.eth', 'grace.eth'),
  ('carol.eth', 'grace.eth'),
  ('dave.eth', 'eve.eth'),
  ('henry.eth', 'grace.eth')
ON CONFLICT DO NOTHING;
