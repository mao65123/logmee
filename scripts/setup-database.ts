/**
 * Database Setup Script for Logmee
 *
 * This script creates the necessary tables in Supabase.
 * Run with: npx ts-node scripts/setup-database.ts
 *
 * Or copy the SQL from supabase/migrations/001_create_tables.sql
 * and run it directly in the Supabase SQL Editor.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iefnonbwfronqhbqxnib.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    Supabase Database Setup Instructions                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  Service Role Key が設定されていません。                                    ║
║  以下の方法でデータベースをセットアップしてください：                        ║
║                                                                            ║
║  【方法1】Supabase Dashboard から SQL を実行                               ║
║  1. https://supabase.com/dashboard にログイン                              ║
║  2. プロジェクトを選択                                                     ║
║  3. 左メニューから "SQL Editor" を選択                                     ║
║  4. "New query" をクリック                                                 ║
║  5. supabase/migrations/001_create_tables.sql の内容をコピー＆ペースト     ║
║  6. "Run" ボタンをクリック                                                 ║
║                                                                            ║
║  【方法2】Supabase CLI を使用                                              ║
║  1. supabase login                                                         ║
║  2. supabase link --project-ref iefnonbwfronqhbqxnib                       ║
║  3. supabase db push                                                       ║
║                                                                            ║
║  【方法3】このスクリプトを使用                                              ║
║  1. Supabase Dashboard → Settings → API → service_role key をコピー       ║
║  2. SUPABASE_SERVICE_ROLE_KEY=<key> npx ts-node scripts/setup-database.ts  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const setupSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_goal_hours NUMERIC DEFAULT 160,
  monthly_goal_revenue NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD')),
  user_name TEXT DEFAULT '',
  theme_color TEXT DEFAULT 'blue',
  enable_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  default_hourly_rate NUMERIC,
  default_fixed_fee NUMERIC,
  closing_date INTEGER,
  task_presets TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TIME_ENTRIES TABLE
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  description TEXT DEFAULT '',
  rate_type TEXT DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'fixed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MONTHLY_FIXED_FEES TABLE
CREATE TABLE IF NOT EXISTS monthly_fixed_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, client_id, year_month)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client_id ON time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_monthly_fixed_fees_user_id ON monthly_fixed_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_fixed_fees_year_month ON monthly_fixed_fees(year_month);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_fixed_fees ENABLE ROW LEVEL SECURITY;
`;

async function setup() {
  console.log('Setting up database tables...');

  const { error } = await supabase.rpc('exec_sql', { sql: setupSQL });

  if (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }

  console.log('Database tables created successfully!');
}

setup();
