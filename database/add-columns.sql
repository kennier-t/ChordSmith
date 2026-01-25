-- =============================================
-- Add Columns Script for ChordSmith
-- Run this script first in SSMS to add the necessary columns
-- Then run the main update script
-- =============================================

USE ChordSmith;
GO

-- Add creator_id, created_at, updated_at to Songs table
IF OBJECT_ID('dbo.Songs', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Songs','creator_id') IS NULL
    BEGIN
        ALTER TABLE dbo.Songs ADD creator_id INT NULL;
        PRINT 'Added creator_id to Songs';
    END
    IF COL_LENGTH('dbo.Songs','created_at') IS NULL
    BEGIN
        ALTER TABLE dbo.Songs ADD created_at DATETIME2 NULL CONSTRAINT DF_Songs_created_at DEFAULT SYSUTCDATETIME();
        PRINT 'Added created_at to Songs';
    END
    IF COL_LENGTH('dbo.Songs','updated_at') IS NULL
    BEGIN
        ALTER TABLE dbo.Songs ADD updated_at DATETIME2 NULL;
        PRINT 'Added updated_at to Songs';
    END
    IF OBJECT_ID('dbo.Users','U') IS NOT NULL
    BEGIN
        IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Songs_creator')
        BEGIN
            ALTER TABLE dbo.Songs ADD CONSTRAINT FK_Songs_creator FOREIGN KEY (creator_id) REFERENCES dbo.Users(id);
            PRINT 'Added FK to Songs';
        END;
    END;
END
ELSE
BEGIN
    PRINT 'Songs table not found';
END

-- Add creator_id, created_at, updated_at to Chords table
IF OBJECT_ID('dbo.Chords', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Chords','creator_id') IS NULL
    BEGIN
        ALTER TABLE dbo.Chords ADD creator_id INT NULL;
        PRINT 'Added creator_id to Chords';
    END
    IF COL_LENGTH('dbo.Chords','created_at') IS NULL
    BEGIN
        ALTER TABLE dbo.Chords ADD created_at DATETIME2 NULL CONSTRAINT DF_Chords_created_at DEFAULT SYSUTCDATETIME();
        PRINT 'Added created_at to Chords';
    END
    IF COL_LENGTH('dbo.Chords','updated_at') IS NULL
    BEGIN
        ALTER TABLE dbo.Chords ADD updated_at DATETIME2 NULL;
        PRINT 'Added updated_at to Chords';
    END
    IF OBJECT_ID('dbo.Users','U') IS NOT NULL
    BEGIN
        IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Chords_creator')
        BEGIN
            ALTER TABLE dbo.Chords ADD CONSTRAINT FK_Chords_creator FOREIGN KEY (creator_id) REFERENCES dbo.Users(id);
            PRINT 'Added FK to Chords';
        END;
    END;
END
ELSE
BEGIN
    PRINT 'Chords table not found';
END

PRINT 'Column addition complete.';