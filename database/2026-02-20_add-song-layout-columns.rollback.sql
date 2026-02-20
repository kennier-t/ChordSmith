-- =============================================
-- Rollback: 2026-02-20_add-song-layout-columns.rollback.sql
-- Purpose:
-- - Remove layout-related columns/constraints from Songs
-- Note:
-- - This permanently drops LayoutColumnCount, LayoutDividerRatio,
--   ContentTextColumn1, ContentTextColumn2 data.
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

    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CK_Songs_LayoutDividerRatio'
    )
    BEGIN
        ALTER TABLE dbo.Songs DROP CONSTRAINT CK_Songs_LayoutDividerRatio;
    END;

    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CK_Songs_LayoutColumnCount'
    )
    BEGIN
        ALTER TABLE dbo.Songs DROP CONSTRAINT CK_Songs_LayoutColumnCount;
    END;

    IF EXISTS (
        SELECT 1
        FROM sys.default_constraints
        WHERE name = 'DF_Songs_LayoutDividerRatio'
    )
    BEGIN
        ALTER TABLE dbo.Songs DROP CONSTRAINT DF_Songs_LayoutDividerRatio;
    END;

    IF EXISTS (
        SELECT 1
        FROM sys.default_constraints
        WHERE name = 'DF_Songs_LayoutColumnCount'
    )
    BEGIN
        ALTER TABLE dbo.Songs DROP CONSTRAINT DF_Songs_LayoutColumnCount;
    END;

    IF COL_LENGTH('dbo.Songs', 'ContentTextColumn2') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.Songs DROP COLUMN ContentTextColumn2;
    END;

    IF COL_LENGTH('dbo.Songs', 'ContentTextColumn1') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.Songs DROP COLUMN ContentTextColumn1;
    END;

    IF COL_LENGTH('dbo.Songs', 'LayoutDividerRatio') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.Songs DROP COLUMN LayoutDividerRatio;
    END;

    IF COL_LENGTH('dbo.Songs', 'LayoutColumnCount') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.Songs DROP COLUMN LayoutColumnCount;
    END;

    COMMIT TRANSACTION;
    PRINT 'Rollback completed: song layout columns removed.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    DECLARE @err_msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('Rollback failed: %s', 16, 1, @err_msg);
END CATCH;
GO
