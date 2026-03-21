-- Add latitude and longitude columns to profiles table if they don't exist
DO $$ 
BEGIN 
    -- Add latitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE profiles ADD COLUMN latitude double precision;
    END IF;
    
    -- Add longitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE profiles ADD COLUMN longitude double precision;
    END IF;
END $$;
