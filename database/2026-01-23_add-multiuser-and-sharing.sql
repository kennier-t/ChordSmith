-- =============================================
-- Migration: 2026-01-23_add-multiuser-and-sharing.sql
-- Read files: README.md and sql_request.pdf.
--
-- Purpose:
-- - Add Users, mapping tables (UserSongs, UserChords), share/audit tables (SongShares, ChordShares),
--   verification and password reset token tables.
-- - Add creator_id, created_at, updated_at to Songs and Chords (if those tables exist).
-- - Assign existing non-default chords (IsOriginal = 0) to initial user "kennier" (id = 1 if safe).
-- - Keep default chords (IsOriginal = 1) unchanged and visible to everyone.
-- - Script is idempotent and safe to re-run; checks object/column existence before changes.
-- - IMPORTANT: setup-complete.sql was not available to this script. If your actual table/column names differ
--   from dbo.Songs / dbo.Chords / IsOriginal etc., edit the sections marked with -- REVIEW/ADJUST.
--
-- Assumptions / notes:
-- - Database is Microsoft SQL Server (per README). Using T-SQL.
-- - Password hashing uses HASHBYTES('SHA2_256', ...) to store a hex string. Best practice: application should
--   handle password hashing with salt/argon2/bcrypt; this DB-level hash is a fallback for the initial user only.
-- - If Users table already contains rows such that id = 1 is taken, the script inserts the user normally and
--   documents that manual resequencing would be needed if you require id = 1.
-- - Do not run if you expect other migrations to run concurrently (use your deployment process).
-- =============================================

USE ChordSmith;
GO

-- Wrap changes in a transaction and try/catch for safety
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    ------------------------------------------------------------------------
    -- 1) Create Users table (id numeric identity)
    ------------------------------------------------------------------------
    IF OBJECT_ID('Users','U') IS NULL
    BEGIN
        CREATE TABLE Users (
            id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            username VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NULL,
            last_name VARCHAR(100) NULL,
            password_hash VARCHAR(256) NULL,
            language_pref CHAR(2) DEFAULT 'en' NULL,
            user_type VARCHAR(20) NOT NULL DEFAULT 'user', -- NEW COLUMN
            is_verified BIT DEFAULT 0,
            created_at DATETIME2 DEFAULT SYSUTCDATETIME()
        );


        CREATE UNIQUE INDEX UX_Users_username ON Users(username);
        CREATE UNIQUE INDEX UX_Users_email ON Users(email);
    END;

    ------------------------------------------------------------------------
    -- 2) Insert initial user "kennier" (attempt id = 1 if safe)
    ------------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'kennier')
    BEGIN
        DECLARE @users_count INT = (SELECT COUNT(1) FROM Users);
        IF @users_count = 0
        BEGIN
            -- safe to insert with id = 1
            SET IDENTITY_INSERT Users ON;
            INSERT INTO Users (id, username, email, first_name, last_name, password_hash, is_verified, user_type)
            VALUES (
                1,
                'kennier',
                'kennier.trejos@gmail.com',
                'Kennier',
                'Trejos',
                LOWER(CONVERT(VARCHAR(256), HASHBYTES('SHA2_256', 'kennier26'), 2)),
                1,
                'admin'
            );
            SET IDENTITY_INSERT Users OFF;
        END
        ELSE
        BEGIN
            -- Cannot safely force id = 1 because Users contains data.
            -- Insert normally and the application can re-map if id=1 is required.
            INSERT INTO Users (username, email, first_name, last_name, password_hash, is_verified, user_type)
            VALUES (
                'kennier',
                'kennier.trejos@gmail.com',
                'Kennier',
                'Trejos',
                LOWER(CONVERT(VARCHAR(256), HASHBYTES('SHA2_256', 'kennier26'), 2)),
                1,
                'admin'
            );
        END;
    END;

    -- Get Kennier's id for subsequent operations
    DECLARE @kennier_id INT = (SELECT TOP (1) id FROM Users WHERE username = 'kennier');

    ------------------------------------------------------------------------
    -- 3) Add creator_id, created_at, updated_at to Songs table if present
    ------------------------------------------------------------------------
    IF OBJECT_ID('dbo.Songs', 'U') IS NOT NULL
    BEGIN
        IF COL_LENGTH('dbo.Songs','creator_id') IS NULL
        BEGIN
            ALTER TABLE dbo.Songs ADD creator_id INT NULL;
            -- add timestamps if absent
            IF COL_LENGTH('dbo.Songs','created_at') IS NULL
                ALTER TABLE dbo.Songs ADD created_at DATETIME2 NULL CONSTRAINT DF_Songs_created_at DEFAULT SYSUTCDATETIME();
            IF COL_LENGTH('dbo.Songs','updated_at') IS NULL
                ALTER TABLE dbo.Songs ADD updated_at DATETIME2 NULL;
            -- add FK to Users if Users exists
            IF OBJECT_ID('dbo.Users','U') IS NOT NULL
                BEGIN
                    IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Songs_creator')
                    BEGIN
                        ALTER TABLE dbo.Songs
                        ADD CONSTRAINT FK_Songs_creator FOREIGN KEY (creator_id) REFERENCES dbo.Users(id);
                    END;
                END;
        END;
    END;

    ------------------------------------------------------------------------
    -- 4) Add creator_id, created_at, updated_at to Chords table if present
    ------------------------------------------------------------------------
    IF OBJECT_ID('dbo.Chords', 'U') IS NOT NULL
    BEGIN
        IF COL_LENGTH('dbo.Chords','creator_id') IS NULL
        BEGIN
            ALTER TABLE dbo.Chords ADD creator_id INT NULL;
            IF COL_LENGTH('dbo.Chords','created_at') IS NULL
                ALTER TABLE dbo.Chords ADD created_at DATETIME2 NULL CONSTRAINT DF_Chords_created_at DEFAULT SYSUTCDATETIME();
            IF COL_LENGTH('dbo.Chords','updated_at') IS NULL
                ALTER TABLE dbo.Chords ADD updated_at DATETIME2 NULL;
            IF OBJECT_ID('dbo.Users','U') IS NOT NULL
                BEGIN
                    IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Chords_creator')
                    BEGIN
                        ALTER TABLE dbo.Chords
                        ADD CONSTRAINT FK_Chords_creator FOREIGN KEY (creator_id) REFERENCES dbo.Users(id);
                    END;
                END;
        END;
    END;

    ------------------------------------------------------------------------
    -- 5) Create mapping tables: UserSongs and UserChords
    ------------------------------------------------------------------------
    IF OBJECT_ID('UserSongs','U') IS NULL
    BEGIN
        CREATE TABLE UserSongs (
            id INT IDENTITY(1,1) PRIMARY KEY,
            user_id INT NOT NULL,
            song_id INT NOT NULL,
            assigned_at DATETIME2 DEFAULT SYSUTCDATETIME(),
            is_creator BIT DEFAULT 0
        );
        CREATE UNIQUE INDEX UX_UserSongs_user_song ON UserSongs(user_id, song_id);
        -- add FK constraints if referenced tables exist
        IF OBJECT_ID('Users','U') IS NOT NULL
            ALTER TABLE UserSongs ADD CONSTRAINT FK_UserSongs_User FOREIGN KEY (user_id) REFERENCES Users(id);
        IF OBJECT_ID('Songs','U') IS NOT NULL
            ALTER TABLE UserSongs ADD CONSTRAINT FK_UserSongs_Song FOREIGN KEY (song_id) REFERENCES Songs(id);
    END;

    IF OBJECT_ID('UserChords','U') IS NULL
    BEGIN
        CREATE TABLE UserChords (
            id INT IDENTITY(1,1) PRIMARY KEY,
            user_id INT NOT NULL,
            chord_id INT NOT NULL,
            assigned_at DATETIME2 DEFAULT SYSUTCDATETIME(),
            is_creator BIT DEFAULT 0
        );
        CREATE UNIQUE INDEX UX_UserChords_user_chord ON UserChords(user_id, chord_id);
        IF OBJECT_ID('Users','U') IS NOT NULL
            ALTER TABLE UserChords ADD CONSTRAINT FK_UserChords_User FOREIGN KEY (user_id) REFERENCES Users(id);
        IF OBJECT_ID('Chords','U') IS NOT NULL
            ALTER TABLE UserChords ADD CONSTRAINT FK_UserChords_Chord FOREIGN KEY (chord_id) REFERENCES Chords(id);
    END;

    ------------------------------------------------------------------------
    -- 6) Create Share/Audit tables: SongShares, ChordShares
    ------------------------------------------------------------------------
    IF OBJECT_ID('SongShares','U') IS NULL
    BEGIN
        CREATE TABLE SongShares (
            id INT IDENTITY(1,1) PRIMARY KEY,
            song_id INT NOT NULL,
            sender_user_id INT NULL,       -- FK to Users.id when available
            recipient_username VARCHAR(100) NULL, -- store typed username/email
            recipient_user_id INT NULL,    -- resolved on acceptance
            sent_at DATETIME2 DEFAULT SYSUTCDATETIME(),
            status VARCHAR(20) DEFAULT 'pending', -- pending|accepted|rejected
            payload NVARCHAR(MAX) NULL     -- includes full ContentText and metadata
        );
        IF OBJECT_ID('Songs','U') IS NOT NULL
            ALTER TABLE SongShares ADD CONSTRAINT FK_SongShares_Song FOREIGN KEY (song_id) REFERENCES Songs(id);
        IF OBJECT_ID('Users','U') IS NOT NULL
            ALTER TABLE SongShares ADD CONSTRAINT FK_SongShares_Sender FOREIGN KEY (sender_user_id) REFERENCES Users(id);
    END;

    IF OBJECT_ID('ChordShares','U') IS NULL
    BEGIN
        CREATE TABLE ChordShares (
            id INT IDENTITY(1,1) PRIMARY KEY,
            chord_id INT NOT NULL,
            sender_user_id INT NULL,
            recipient_username VARCHAR(100) NULL,
            recipient_user_id INT NULL,
            sent_at DATETIME2 DEFAULT SYSUTCDATETIME(),
            status VARCHAR(20) DEFAULT 'pending',
            payload NVARCHAR(MAX) NULL -- full chord details except DB id
        );
        IF OBJECT_ID('Chords','U') IS NOT NULL
            ALTER TABLE ChordShares ADD CONSTRAINT FK_ChordShares_Chord FOREIGN KEY (chord_id) REFERENCES Chords(id);
        IF OBJECT_ID('Users','U') IS NOT NULL
            ALTER TABLE ChordShares ADD CONSTRAINT FK_ChordShares_Sender FOREIGN KEY (sender_user_id) REFERENCES Users(id);
    END;

    ------------------------------------------------------------------------
    -- 7) Verification & Password reset token tables
    ------------------------------------------------------------------------
    IF OBJECT_ID('UserVerificationTokens','U') IS NULL
    BEGIN
        CREATE TABLE UserVerificationTokens (
            id INT IDENTITY(1,1) PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(256) NOT NULL,
            expires_at DATETIME2 NOT NULL,
            used_at DATETIME2 NULL,
            created_at DATETIME2 DEFAULT SYSUTCDATETIME()
        );
        IF OBJECT_ID('Users','U') IS NOT NULL
            ALTER TABLE UserVerificationTokens ADD CONSTRAINT FK_UserVerificationTokens_User FOREIGN KEY (user_id) REFERENCES Users(id);
    END;

    IF OBJECT_ID('PasswordResetTokens','U') IS NULL
    BEGIN
        CREATE TABLE PasswordResetTokens (
            id INT IDENTITY(1,1) PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(256) NOT NULL,
            expires_at DATETIME2 NOT NULL,
            used_at DATETIME2 NULL,
            created_at DATETIME2 DEFAULT SYSUTCDATETIME()
        );
        IF OBJECT_ID('Users','U') IS NOT NULL
            ALTER TABLE PasswordResetTokens ADD CONSTRAINT FK_PasswordResetTokens_User FOREIGN KEY (user_id) REFERENCES Users(id);
    END;

    ------------------------------------------------------------------------
    -- 8) Data migration rules (chords: IsOriginal = 0 -> assign to Kennier)
    --    NOTE: Only run updates when expected columns exist.
    ------------------------------------------------------------------------
    IF OBJECT_ID('dbo.Chords','U') IS NOT NULL AND COL_LENGTH('dbo.Chords','IsOriginal') IS NOT NULL
    BEGIN
        -- Set creator_id = NULL for IsOriginal = 1 (defaults), ensure they remain unchanged
        -- (We leave IsOriginal = 1 creator_id NULL on purpose.)

        -- For IsOriginal = 0 (user-created chords): set creator_id = @kennier_id
        IF COL_LENGTH('dbo.Chords','creator_id') IS NOT NULL
        BEGIN
            UPDATE dbo.Chords
            SET creator_id = @kennier_id
            WHERE ISNULL(CAST(IsOriginal AS INT), 0) = 0
              AND (creator_id IS NULL OR creator_id <> @kennier_id);
        END;

        -- Create UserChords mapping rows for kennier where needed
        -- Only insert mapping for chords with IsOriginal = 0 (user chords)
        IF OBJECT_ID('dbo.UserChords','U') IS NOT NULL
        BEGIN
            INSERT INTO dbo.UserChords (user_id, chord_id, is_creator)
            SELECT DISTINCT @kennier_id, c.id, 1
            FROM dbo.Chords c
            LEFT JOIN dbo.UserChords uc ON uc.user_id = @kennier_id AND uc.chord_id = c.id
            WHERE ISNULL(CAST(c.IsOriginal AS INT),0) = 0
              AND uc.id IS NULL;
        END;
    END;

    ------------------------------------------------------------------------
    -- 9) Songs migration: set creator_id for existing songs to Kennier (since single-user before)
    ------------------------------------------------------------------------
    IF OBJECT_ID('Songs','U') IS NOT NULL AND COL_LENGTH('Songs','creator_id') IS NOT NULL
    BEGIN
        -- Set creator_id for existing songs to Kennier
        UPDATE Songs SET creator_id = @kennier_id WHERE creator_id IS NULL;

        -- Set created_at and updated_at from existing CreatedDate and ModifiedDate if available
        IF COL_LENGTH('Songs','CreatedDate') IS NOT NULL
            UPDATE Songs SET created_at = CreatedDate WHERE created_at IS NULL;
        IF COL_LENGTH('Songs','ModifiedDate') IS NOT NULL
            UPDATE Songs SET updated_at = ModifiedDate WHERE updated_at IS NULL;

        -- Create UserSongs mappings for Kennier
        IF OBJECT_ID('UserSongs','U') IS NOT NULL
        BEGIN
            INSERT INTO UserSongs (user_id, song_id, is_creator)
            SELECT DISTINCT @kennier_id, s.id, 1
            FROM Songs s
            LEFT JOIN UserSongs us ON us.user_id = @kennier_id AND us.song_id = s.id
            WHERE s.creator_id = @kennier_id AND us.id IS NULL;
        END;
    END;

    ------------------------------------------------------------------------
    -- 10) Indexes for performance on creator/owner columns and mapping tables
    ------------------------------------------------------------------------
    IF OBJECT_ID('dbo.Chords','U') IS NOT NULL AND COL_LENGTH('dbo.Chords','creator_id') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Chords') AND name = 'IX_Chords_creator')
            CREATE INDEX IX_Chords_creator ON dbo.Chords(creator_id);
    END;
    IF OBJECT_ID('Songs','U') IS NOT NULL AND COL_LENGTH('Songs','creator_id') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Songs') AND name = 'IX_Songs_creator')
            CREATE INDEX IX_Songs_creator ON Songs(creator_id);
    END;

    -- commit
    COMMIT TRANSACTION;
    PRINT 'Migration completed successfully (best-effort).';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    DECLARE @err_msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('Migration failed: %s', 16, 1, @err_msg);
END CATCH;