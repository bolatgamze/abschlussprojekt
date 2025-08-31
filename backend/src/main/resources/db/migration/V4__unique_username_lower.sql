-- V4__unique_username_lower.sql

-- Eski unique constraint'i kaldırıyoruz (username direkt unique idi)
ALTER TABLE ap_user DROP CONSTRAINT ap_user_username_key;

-- Yeni case-insensitive unique index ekliyoruz
CREATE UNIQUE INDEX unique_username_lower ON ap_user (LOWER(username));
