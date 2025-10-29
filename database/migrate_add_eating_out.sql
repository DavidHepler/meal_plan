-- Migration script to add eating_out fields to meal_plan table
-- Run this if you have an existing database

-- Add eating_out column (default to 0/false)
ALTER TABLE meal_plan ADD COLUMN eating_out BOOLEAN DEFAULT 0;

-- Add eating_out_location column (can be null)
ALTER TABLE meal_plan ADD COLUMN eating_out_location TEXT;

-- Update the updated_at timestamp for consistency
UPDATE meal_plan SET updated_at = CURRENT_TIMESTAMP WHERE eating_out IS NOT NULL;
