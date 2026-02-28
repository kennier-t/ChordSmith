-- =============================================================
-- ChordSmith Song Versioning Migration
-- Date: 2026-02-28
--
-- What this migration does:
-- 1) Adds Songs.Version (INT) if it does not exist.
-- 2) Backfills existing rows to Version = 1.
-- 3) Adds supporting index/constraint for version ordering.
--
-- Title grouping rule used by the app:
-- - Versions are grouped by normalized title with LOWER(TRIM(Title)).
-- - Because setup.sql uses utf8mb4_unicode_ci, comparisons are already
--   case-insensitive and accent-insensitive by default.
--
-- Safe rollback notes:
-- - This migration updates data in-place (Version values), so rollback
--   should be done from a backup/snapshot if needed.
-- - Manual rollback steps (if absolutely required):
--   a) Drop added check/index constraints.
--   b) Drop Songs.Version.
--   c) Restore application code that does not depend on versioning.
-- =============================================================

USE `ChordSmith`;

SET @schema_name = DATABASE();

SET @has_version_column = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'Songs'
      AND COLUMN_NAME = 'Version'
);

SET @sql_add_version = IF(
    @has_version_column = 0,
    'ALTER TABLE Songs ADD COLUMN Version INT NOT NULL DEFAULT 1 AFTER Title',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_version;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @prev_sql_safe_updates = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE Songs
SET Version = 1
WHERE Id > 0
  AND (Version IS NULL OR Version < 1);

SET SQL_SAFE_UPDATES = @prev_sql_safe_updates;

SET @has_version_check = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @schema_name
      AND TABLE_NAME = 'Songs'
      AND CONSTRAINT_NAME = 'CK_Songs_Version_Positive'
      AND CONSTRAINT_TYPE = 'CHECK'
);

SET @sql_add_version_check = IF(
    @has_version_check = 0,
    'ALTER TABLE Songs ADD CONSTRAINT CK_Songs_Version_Positive CHECK (Version >= 1)',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_version_check;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_index_title_version = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'Songs'
      AND INDEX_NAME = 'IX_Songs_Title_Version'
);

SET @sql_add_index_title_version = IF(
    @has_index_title_version = 0,
    'ALTER TABLE Songs ADD INDEX IX_Songs_Title_Version (Title, Version)',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_index_title_version;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_index_creator_title_version = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'Songs'
      AND INDEX_NAME = 'IX_Songs_Creator_Title_Version'
);

SET @sql_add_index_creator_title_version = IF(
    @has_index_creator_title_version = 0,
    'ALTER TABLE Songs ADD INDEX IX_Songs_Creator_Title_Version (creator_id, Title, Version)',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_index_creator_title_version;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
