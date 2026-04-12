-- =====================================================
-- JyT App: Add missing 'budgets' column to trips table
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor → New Query
-- =====================================================

-- Step 1: Add the budgets column if it doesn't exist yet
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS budgets jsonb DEFAULT '{}'::jsonb;

-- Step 2: Add the archived column if it doesn't exist yet (used for trip archiving)
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Step 3: Verify the columns are now present
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'trips'
ORDER BY ordinal_position;
