-- =============================================
-- Chord Families - Schema Update for Chord Variations
-- SQL Server
-- This script modifies the Chords table to allow multiple variations per chord name.
-- Execute this script once after the initial database setup.
-- =============================================

USE ChordFamilies;
GO

PRINT '================================================';
PRINT 'Updating Chords table for variations...';
PRINT '================================================';
GO

-- Step 1: Drop the unique constraint on the Name column
-- First, get the name of the unique constraint
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = name
FROM sys.key_constraints
WHERE type = 'UQ' AND parent_object_id = OBJECT_ID('dbo.Chords') AND name LIKE '%Name%';

-- If the constraint exists, drop it
IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Chords DROP CONSTRAINT ' + @constraintName);
    PRINT 'Dropped unique constraint on Name column in Chords table.';
END
ELSE
BEGIN
    PRINT 'Unique constraint on Name column in Chords table not found or already removed.';
END
GO

-- Step 2: Add the IsDefault column to the Chords table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Chords') AND name = 'IsDefault')
BEGIN
    ALTER TABLE Chords
    ADD IsDefault BIT NOT NULL DEFAULT 0;
    PRINT 'Added IsDefault column to Chords table.';
END
ELSE
BEGIN
    PRINT 'IsDefault column already exists in Chords table.';
END
GO

-- Step 3: Set all existing chords to be the default variation
UPDATE Chords
SET IsDefault = 1
WHERE IsDefault = 0;
PRINT 'Set IsDefault = 1 for all existing chords.';
GO

PRINT '================================================';
PRINT 'Schema update for chord variations completed successfully!';
PRINT '================================================';
GO
