-- Seed NFT Badge Store Data
-- This script populates the store with NFT designs across all ranks

-- Clear existing store data (for development)
TRUNCATE store_items, organizer_inventory, purchase_history CASCADE;

-- Rank 5: Initiate ($10) - Slate Gray #A0AEC0
INSERT INTO store_items (name, description, rank, rank_name, rank_color, price, image_url, is_customizable) VALUES
('Initiate Badge - Classic', 'A timeless design representing the beginning of your journey', 5, 'Initiate', '#A0AEC0', 10.00, '/placeholder.svg?height=400&width=400', true),
('Initiate Badge - Modern', 'Contemporary style for the modern achiever', 5, 'Initiate', '#A0AEC0', 10.00, '/placeholder.svg?height=400&width=400', true),
('Initiate Badge - Minimal', 'Clean and simple, perfect for any profile', 5, 'Initiate', '#A0AEC0', 10.00, '/placeholder.svg?height=400&width=400', true),
('Initiate Badge - Shield', 'Traditional shield design symbolizing protection', 5, 'Initiate', '#A0AEC0', 10.00, '/placeholder.svg?height=400&width=400', true);

-- Rank 4: Adept ($25) - Blue #4299E1
INSERT INTO store_items (name, description, rank, rank_name, rank_color, price, image_url, is_customizable) VALUES
('Adept Badge - Wave', 'Flowing design representing growth and progress', 4, 'Adept', '#4299E1', 25.00, '/placeholder.svg?height=400&width=400', true),
('Adept Badge - Star', 'Rising star design for emerging talent', 4, 'Adept', '#4299E1', 25.00, '/placeholder.svg?height=400&width=400', true),
('Adept Badge - Hexagon', 'Geometric precision for the detail-oriented', 4, 'Adept', '#4299E1', 25.00, '/placeholder.svg?height=400&width=400', true),
('Adept Badge - Compass', 'Navigate your path to success', 4, 'Adept', '#4299E1', 25.00, '/placeholder.svg?height=400&width=400', true);

-- Rank 3: Vanguard ($50) - Emerald Green #38A169
INSERT INTO store_items (name, description, rank, rank_name, rank_color, price, image_url, is_customizable) VALUES
('Vanguard Badge - Leaf', 'Growth and leadership in harmony', 3, 'Vanguard', '#38A169', 50.00, '/placeholder.svg?height=400&width=400', true),
('Vanguard Badge - Crown', 'Lead from the front with confidence', 3, 'Vanguard', '#38A169', 50.00, '/placeholder.svg?height=400&width=400', true),
('Vanguard Badge - Mountain', 'Reach new heights as a pioneer', 3, 'Vanguard', '#38A169', 50.00, '/placeholder.svg?height=400&width=400', true),
('Vanguard Badge - Phoenix', 'Rise above and inspire others', 3, 'Vanguard', '#38A169', 50.00, '/placeholder.svg?height=400&width=400', true);

-- Rank 2: Luminary ($100) - Gold #D69E2E
INSERT INTO store_items (name, description, rank, rank_name, rank_color, price, image_url, is_customizable) VALUES
('Luminary Badge - Sun', 'Shine bright and illuminate the path for others', 2, 'Luminary', '#D69E2E', 100.00, '/placeholder.svg?height=400&width=400', true),
('Luminary Badge - Diamond', 'Rare excellence, admired by all', 2, 'Luminary', '#D69E2E', 100.00, '/placeholder.svg?height=400&width=400', true),
('Luminary Badge - Torch', 'Carry the flame of knowledge and skill', 2, 'Luminary', '#D69E2E', 100.00, '/placeholder.svg?height=400&width=400', true),
('Luminary Badge - Laurel', 'Victory and honor in classic form', 2, 'Luminary', '#D69E2E', 100.00, '/placeholder.svg?height=400&width=400', true);

-- Rank 1: Paragon ($500-$2000) - Royal Purple #805AD5 (Hand-drawn, not customizable)
INSERT INTO store_items (name, description, rank, rank_name, rank_color, price, image_url, is_customizable, artist_name, artist_description) VALUES
('Paragon: The Eternal Flame', 'A masterpiece depicting the eternal pursuit of excellence. The flame never dies, it only grows stronger with each achievement.', 1, 'Paragon', '#805AD5', 1500.00, '/placeholder.svg?height=400&width=400', false, 'Elena Rodriguez', 'Award-winning digital artist specializing in symbolic achievement art. 15+ years creating meaningful badges for global organizations.'),
('Paragon: Celestial Ascension', 'Hand-crafted artwork showing the journey from earth to stars. Each detail represents a milestone in the path to mastery.', 1, 'Paragon', '#805AD5', 2000.00, '/placeholder.svg?height=400&width=400', false, 'Marcus Chen', 'Renowned illustrator known for cosmic and inspirational themes. Featured in major tech conferences worldwide.'),
('Paragon: The Golden Phoenix', 'A phoenix rising in royal purple and gold, symbolizing rebirth through excellence. Limited edition artwork.', 1, 'Paragon', '#805AD5', 1800.00, '/placeholder.svg?height=400&width=400', false, 'Sophia Nakamura', 'Master of mythological symbolism in digital art. Her work has been featured in Fortune 500 recognition programs.'),
('Paragon: Infinity Crown', 'The crown of infinite achievement. This piece represents the endless pursuit of perfection and the ultimate recognition.', 1, 'Paragon', '#805AD5', 2200.00, '/placeholder.svg?height=400&width=400', false, 'David Okonkwo', 'International artist combining African heritage with modern achievement symbolism. 20+ years in recognition design.'),
('Paragon: The Architect', 'Blueprint of greatness - a geometric masterpiece showing the structure of excellence built brick by brick.', 1, 'Paragon', '#805AD5', 1200.00, '/placeholder.svg?height=400&width=400', false, 'Isabella Rossi', 'Geometric art specialist with a focus on achievement and structure. Her minimalist approach has won multiple design awards.'),
('Paragon: Wisdom Tree', 'Ancient tree with roots deep in knowledge and branches reaching for the stars. Each leaf represents a lesson learned.', 1, 'Paragon', '#805AD5', 1600.00, '/placeholder.svg?height=400&width=400', false, 'Raj Patel', 'Nature-inspired digital artist blending traditional wisdom with modern achievement. Featured in TEDx talks on meaningful recognition.');

-- Sample inventory for testing (alice.eth has purchased some NFTs)
INSERT INTO organizer_inventory (organizer_wallet, store_item_id, custom_name, custom_description, purchased_at) 
SELECT 
  'alice.eth',
  id,
  CASE 
    WHEN is_customizable THEN 'Web3 Pioneer Award'
    ELSE NULL
  END,
  CASE 
    WHEN is_customizable THEN 'Awarded to those who lead the way in blockchain innovation'
    ELSE NULL
  END,
  NOW() - INTERVAL '5 days'
FROM store_items 
WHERE rank = 4 
LIMIT 2;

INSERT INTO organizer_inventory (organizer_wallet, store_item_id, custom_name, custom_description, purchased_at) 
SELECT 
  'alice.eth',
  id,
  'Excellence in Community Building',
  'For outstanding contributions to community growth and engagement',
  NOW() - INTERVAL '3 days'
FROM store_items 
WHERE rank = 3 
LIMIT 1;

-- Sample purchase history
INSERT INTO purchase_history (organizer_wallet, store_item_id, inventory_id, price_paid, purchased_at)
SELECT 
  organizer_wallet,
  store_item_id,
  id,
  (SELECT price FROM store_items WHERE id = store_item_id),
  purchased_at
FROM organizer_inventory;
