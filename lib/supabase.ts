import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Product = {
  id: string;
  title: string;
  system: string;
  year: number;
  sku?: string | null;
  barcode?: string | null;
  cost_price?: number | null;
  supplier?: string | null;
  condition: 'Mint' | 'Good' | 'Fair' | 'Poor';
  price: number;
  description: string;
  category: 'Games' | 'Consoles' | 'Accessories' | 'Collectibles';
  stock_qty?: number;
  low_stock_threshold?: number;
  featured?: boolean;
  image_url?: string | null;
  created_at: string;
};

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';

export type Order = {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  notes?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_checkout_url?: string | null;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  product?: Product;
};

export type UserListing = {
  id: string;
  user_id: string;
  title: string;
  system: string;
  condition: 'Mint' | 'Good' | 'Fair' | 'Poor';
  asking_price: number;
  description: string;
  category: 'Games' | 'Consoles' | 'Accessories' | 'Collectibles';
  status: 'active' | 'sold' | 'delisted';
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  display_name: string;
  email: string;
  bio: string;
  trade_in_credit: number;
  total_sales: number;
  expo_push_token?: string | null;
  updated_at: string;
};
