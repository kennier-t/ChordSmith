-- =============================================
-- Migration: 2026-02-20_add-song-layout-columns.sql
-- Purpose:
-- - Persist editor layout mode (single/two columns)
-- - Persist divider position and per-column text
-- - Keep backward compatibility with existing ContentText
-- Safe to re-run: yes (checks column/constraint existence)
-- =============================================

USE ChordSmith;
GO

SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID('dbo.Songs', 'U') IS NULL
    BEGIN
        RAISERROR('dbo.Songs table was not found.', 16, 1);
    END;

    IF COL_LENGTH('dbo.Songs', 'LayoutColumnCount') IS NULL
    BEGIN
        ALTER TABLE dbo.Songs
        ADD LayoutColumnCount TINYINT NOT NULL
            CONSTRAINT DF_Songs_LayoutColumnCount DEFAULT (1);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CK_Songs_LayoutColumnCount'
    )
    BEGIN
        EXEC sp_executesql N'
            ALTER TABLE dbo.Songs
            ADD CONSTRAINT CK_Songs_LayoutColumnCount
                CHECK (LayoutColumnCount IN (1, 2));
        ';
    END;

    IF COL_LENGTH('dbo.Songs', 'LayoutDividerRatio') IS NULL
    BEGIN
        ALTER TABLE dbo.Songs
        ADD LayoutDividerRatio DECIMAL(6,5) NOT NULL
            CONSTRAINT DF_Songs_LayoutDividerRatio DEFAULT (0.50000);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CK_Songs_LayoutDividerRatio'
    )
    BEGIN
        EXEC sp_executesql N'
            ALTER TABLE dbo.Songs
            ADD CONSTRAINT CK_Songs_LayoutDividerRatio
                CHECK (LayoutDividerRatio >= 0.20000 AND LayoutDividerRatio <= 0.80000);
        ';
    END;

    IF COL_LENGTH('dbo.Songs', 'ContentTextColumn1') IS NULL
    BEGIN
        ALTER TABLE dbo.Songs
        ADD ContentTextColumn1 NVARCHAR(MAX) NULL;
    END;

    IF COL_LENGTH('dbo.Songs', 'ContentTextColumn2') IS NULL
    BEGIN
        ALTER TABLE dbo.Songs
        ADD ContentTextColumn2 NVARCHAR(MAX) NULL;
    END;

    EXEC sp_executesql N'
        UPDATE dbo.Songs
        SET LayoutColumnCount = 1
        WHERE LayoutColumnCount IS NULL OR LayoutColumnCount NOT IN (1, 2);
    ';

    EXEC sp_executesql N'
        UPDATE dbo.Songs
        SET LayoutDividerRatio = 0.50000
        WHERE LayoutDividerRatio IS NULL
           OR LayoutDividerRatio < 0.20000
           OR LayoutDividerRatio > 0.80000;
    ';

    EXEC sp_executesql N'
        UPDATE dbo.Songs
        SET ContentTextColumn1 = ContentText
        WHERE ContentTextColumn1 IS NULL;
    ';

    EXEC sp_executesql N'
        UPDATE dbo.Songs
        SET ContentTextColumn2 = N''''
        WHERE ContentTextColumn2 IS NULL;
    ';

    COMMIT TRANSACTION;
    PRINT 'Migration completed: song layout columns added.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    DECLARE @err_msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('Migration failed: %s', 16, 1, @err_msg);
END CATCH;
GO
