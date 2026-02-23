/*
  # Create Retro Hall Marketplace Schema

  1. New Tables
    - `products` - Catalog items for sale
      - `id` (uuid, primary key)
      - `title` (text, product name)
      - `system` (text, console/platform)
      - `year` (integer, release year)
      - `condition` (text, Mint/Good/Fair/Poor)
      - `price` (numeric, USD price)
      - `description` (text)
      - `category` (text, Games/Consoles/Accessories/Collectibles)
      - `created_at` (timestamp)
    
    - `user_listings` - Items users are selling
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `system` (text)
      - `condition` (text)
      - `asking_price` (numeric)
      - `description` (text)
      - `category` (text)
      - `status` (text, active/sold/delisted)
      - `created_at` (timestamp)
    
    - `user_profiles` - User account data
      - `id` (uuid, primary key/foreign key to auth.users)
      - `display_name` (text)
      - `email` (text)
      - `bio` (text)
      - `trade_in_credit` (numeric)
      - `total_sales` (integer)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Allow public read access to products
    - Restrict listings to authenticated users
*/

-- Create products table (public catalog)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  system text NOT NULL,
  year integer,
  condition text NOT NULL CHECK (condition IN ('Mint', 'Good', 'Fair', 'Poor')),
  price numeric NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('Games', 'Consoles', 'Accessories', 'Collectibles')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON products FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create user listings table
CREATE TABLE IF NOT EXISTS user_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  system text NOT NULL,
  condition text NOT NULL CHECK (condition IN ('Mint', 'Good', 'Fair', 'Poor')),
  asking_price numeric NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('Games', 'Consoles', 'Accessories', 'Collectibles')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'delisted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own listings"
  ON user_listings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR status = 'active');

CREATE POLICY "Users can create listings"
  ON user_listings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own listings"
  ON user_listings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own listings"
  ON user_listings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text UNIQUE,
  bio text,
  trade_in_credit numeric DEFAULT 0,
  total_sales integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert sample products
INSERT INTO products (title, system, year, condition, price, description, category) VALUES
  ('The Legend of Zelda: Ocarina of Time', 'N64', 1998, 'Mint', 89.99, 'Complete with box and manual', 'Games'),
  ('Super Mario World', 'SNES', 1990, 'Good', 45.99, 'Cartridge only', 'Games'),
  ('PlayStation 2 Slim Console', 'PS2', 2004, 'Fair', 129.99, 'Console with controllers', 'Consoles'),
  ('Sonic the Hedgehog 2', 'Genesis', 1992, 'Good', 34.99, 'Cart in good condition', 'Games'),
  ('Metroid Prime', 'GameCube', 2002, 'Mint', 79.99, 'Complete copy', 'Games'),
  ('Game Boy Advance SP Console', 'GBA', 2003, 'Good', 199.99, 'Silver model with charger', 'Consoles'),
  ('Final Fantasy VII', 'PS1', 1997, 'Fair', 89.99, '3 disc set', 'Games'),
  ('Nintendo 64 Controller', 'N64', 1996, 'Good', 34.99, 'Official controller', 'Accessories'),
  ('NES Classic Console', 'NES', 2016, 'Mint', 149.99, 'Sealed in box', 'Consoles'),
  ('Retro Gaming Bundle', 'Multi', 2024, 'Good', 299.99, 'Includes 5 games', 'Collectibles')
ON CONFLICT DO NOTHING;
