-- =============================================
-- Database Analysis Script for ChordSmith
-- Run this script in SSMS to gather information about the current database structure
-- This will help diagnose issues with the update script
-- =============================================

USE master;
GO

-- 1. List databases that might be related to ChordSmith
PRINT 'Available databases:';
SELECT name AS DatabaseName
FROM sys.databases
WHERE name LIKE '%Chord%' OR name LIKE '%Smith%'
ORDER BY name;
GO

-- 2. Switch to the presumed database (update this if the name is different)
USE ChordSmith;  -- Change this if your database has a different name
GO

-- 3. Show current database
PRINT 'Current database: ' + DB_NAME();
GO

-- 4. List all tables with their schemas
PRINT 'All tables in the database:';
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_SCHEMA, TABLE_NAME;
GO

-- 5. Check specific tables mentioned in the update script
PRINT 'Checking specific tables:';
SELECT 'Chords' AS TableName, CASE WHEN OBJECT_ID('dbo.Chords', 'U') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END AS Status
UNION ALL
SELECT 'Songs', CASE WHEN OBJECT_ID('dbo.Songs', 'U') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END
UNION ALL
SELECT 'Users', CASE WHEN OBJECT_ID('dbo.Users', 'U') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END
UNION ALL
SELECT 'Families', CASE WHEN OBJECT_ID('dbo.Families', 'U') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END;
GO

-- 6. Show columns for Chords table if it exists
IF OBJECT_ID('dbo.Chords', 'U') IS NOT NULL
BEGIN
    PRINT 'Columns in Chords table:';
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Chords' AND TABLE_SCHEMA = 'dbo'
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT 'Chords table does not exist in dbo schema.';
END
GO

-- 7. Show columns for Songs table if it exists
IF OBJECT_ID('dbo.Songs', 'U') IS NOT NULL
BEGIN
    PRINT 'Columns in Songs table:';
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Songs' AND TABLE_SCHEMA = 'dbo'
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT 'Songs table does not exist in dbo schema.';
END
GO

-- 8. Check for existing columns that the update script expects
PRINT 'Checking for existing columns:';
SELECT 'Chords.creator_id' AS ColumnCheck, CASE WHEN COL_LENGTH('dbo.Chords','creator_id') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END AS Status
UNION ALL
SELECT 'Chords.IsOriginal', CASE WHEN COL_LENGTH('dbo.Chords','IsOriginal') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END
UNION ALL
SELECT 'Songs.creator_id', CASE WHEN COL_LENGTH('dbo.Songs','creator_id') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END
UNION ALL
SELECT 'Songs.CreatedDate', CASE WHEN COL_LENGTH('dbo.Songs','CreatedDate') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END
UNION ALL
SELECT 'Songs.ModifiedDate', CASE WHEN COL_LENGTH('dbo.Songs','ModifiedDate') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END;
GO

-- 9. Show database collation
PRINT 'Database collation:';
SELECT DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS Collation;
GO

PRINT 'Analysis complete. Copy the results and share them for further assistance.';