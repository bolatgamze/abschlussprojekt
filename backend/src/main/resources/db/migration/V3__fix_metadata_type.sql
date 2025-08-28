ALTER TABLE ap_game_session
ALTER COLUMN metadata TYPE jsonb USING metadata::jsonb;
