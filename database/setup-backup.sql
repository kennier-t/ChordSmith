-- setup-complete!!!

-- =============================================
-- ChordSmith - Complete Database Setup Script
-- SQL Server
-- This script creates the entire database with all tables and data
-- Execute this script once to set up everything
-- =============================================

USE master;
GO

-- Drop database if exists
IF DB_ID('ChordSmith') IS NOT NULL
BEGIN
    ALTER DATABASE ChordSmith SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ChordSmith;
END
GO

-- Create database
CREATE DATABASE ChordSmith;
GO

USE ChordSmith;
GO

PRINT '================================================';
PRINT 'Creating database tables...';
PRINT '================================================';
GO

-- =============================================
-- CHORD TABLES
-- =============================================

-- Table: Families
CREATE TABLE Families (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL UNIQUE,
    CreatedDate DATETIME2 DEFAULT GETDATE()
);
GO

-- Table: Chords
CREATE TABLE Chords (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL,
    BaseFret INT NOT NULL DEFAULT 1,
    IsOriginal BIT NOT NULL DEFAULT 0,
    IsDefault BIT NOT NULL DEFAULT 0,
    CreatedDate DATETIME2 DEFAULT GETDATE()
);
GO

-- Table: ChordFingerings
-- StringNumber: 1-6 (from thickest E string to thinnest e string)
-- FretNumber: -1 = not played (X), 0 = open, 1-24 = fret number
-- FingerNumber: 0 = open/not used, 1-4 = finger number
CREATE TABLE ChordFingerings (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ChordId INT NOT NULL,
    StringNumber INT NOT NULL CHECK (StringNumber BETWEEN 1 AND 6),
    FretNumber INT NOT NULL CHECK (FretNumber BETWEEN -1 AND 24),
    FingerNumber INT NOT NULL CHECK (FingerNumber BETWEEN 0 AND 4),
    CONSTRAINT FK_ChordFingerings_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ChordFingerings_ChordString UNIQUE (ChordId, StringNumber)
);
GO

-- Table: ChordBarres
CREATE TABLE ChordBarres (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ChordId INT NOT NULL,
    FretNumber INT NOT NULL CHECK (FretNumber BETWEEN 1 AND 24),
    CONSTRAINT FK_ChordBarres_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE
);
GO

-- Table: ChordFamilyMapping (Many-to-Many)
CREATE TABLE ChordFamilyMapping (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ChordId INT NOT NULL,
    FamilyId INT NOT NULL,
    CONSTRAINT FK_ChordFamilyMapping_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE,
    CONSTRAINT FK_ChordFamilyMapping_Families FOREIGN KEY (FamilyId) REFERENCES Families(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ChordFamilyMapping UNIQUE (ChordId, FamilyId)
);
GO

-- =============================================
-- SONGS TABLES
-- =============================================

-- Table: Folders
CREATE TABLE Folders (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    CreatedDate DATETIME2 DEFAULT GETDATE()
);
GO

-- Table: Songs
CREATE TABLE Songs (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    SongDate NVARCHAR(50) NULL,
    Notes NVARCHAR(MAX) NULL,
    SongKey NVARCHAR(20) NULL,
    Capo NVARCHAR(20) NULL,
    BPM NVARCHAR(20) NULL,
    Effects NVARCHAR(200) NULL,
    LayoutColumnCount TINYINT NOT NULL DEFAULT 1 CHECK (LayoutColumnCount IN (1, 2)),
    LayoutDividerRatio DECIMAL(6,5) NOT NULL DEFAULT 0.50000 CHECK (LayoutDividerRatio >= 0.20000 AND LayoutDividerRatio <= 0.80000),
    ContentTextColumn1 NVARCHAR(MAX) NOT NULL DEFAULT N'',
    ContentTextColumn2 NVARCHAR(MAX) NULL,
    SongContentFontSizePt DECIMAL(5,2) NULL,
    CreatedDate DATETIME2 DEFAULT GETDATE(),
    ModifiedDate DATETIME2 DEFAULT GETDATE()
);
GO

-- Table: SongChordDiagrams
CREATE TABLE SongChordDiagrams (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SongId INT NOT NULL,
    ChordId INT NOT NULL,
    DisplayOrder INT NOT NULL,
    CONSTRAINT FK_SongChordDiagrams_Songs FOREIGN KEY (SongId) REFERENCES Songs(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SongChordDiagrams_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE
);
GO

-- Table: SongFolderMapping (Many-to-Many)
CREATE TABLE SongFolderMapping (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SongId INT NOT NULL,
    FolderId INT NOT NULL,
    CONSTRAINT FK_SongFolderMapping_Songs FOREIGN KEY (SongId) REFERENCES Songs(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SongFolderMapping_Folders FOREIGN KEY (FolderId) REFERENCES Folders(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_SongFolderMapping UNIQUE (SongId, FolderId)
);
GO

PRINT '================================================';
PRINT 'Inserting chord families...';
PRINT '================================================';
GO

-- Insert Families
INSERT INTO Families (Name) VALUES 
('C'), ('D'), ('E'), ('F'), ('G'), ('A'), ('B');
GO

PRINT '================================================';
PRINT 'Inserting chords and fingerings...';
PRINT '================================================';
GO

-- =============================================
-- INSERT CHORDS
-- =============================================

DECLARE @ChordId INT;

-- C Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('C', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 3, 3), (@ChordId, 3, 2, 2), (@ChordId, 4, 0, 0), (@ChordId, 5, 1, 1), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('G', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 3, 2), (@ChordId, 2, 2, 1), (@ChordId, 3, 0, 0), (@ChordId, 4, 0, 0), (@ChordId, 5, 0, 0), (@ChordId, 6, 3, 3);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Am', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 0, 0), (@ChordId, 3, 2, 2), (@ChordId, 4, 2, 3), (@ChordId, 5, 1, 1), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('F', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 1, 1), (@ChordId, 2, 3, 3), (@ChordId, 3, 3, 4), (@ChordId, 4, 2, 2), (@ChordId, 5, 1, 1), (@ChordId, 6, 1, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Dm', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 0, 0), (@ChordId, 4, 2, 2), (@ChordId, 5, 3, 3), (@ChordId, 6, 1, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Em', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 2, 2), (@ChordId, 3, 2, 3), (@ChordId, 4, 0, 0), (@ChordId, 5, 0, 0), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Bdim', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 3, 2), (@ChordId, 4, 4, 4), (@ChordId, 5, 3, 3), (@ChordId, 6, -1, 0);

-- D Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('D', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 0, 0), (@ChordId, 4, 2, 1), (@ChordId, 5, 3, 3), (@ChordId, 6, 2, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('A', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 0, 0), (@ChordId, 3, 2, 2), (@ChordId, 4, 2, 3), (@ChordId, 5, 2, 4), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Bm', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 4, 3), (@ChordId, 4, 4, 4), (@ChordId, 5, 3, 2), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('F#m', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 4, 3), (@ChordId, 3, 4, 4), (@ChordId, 4, 2, 1), (@ChordId, 5, 2, 1), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('C#dim', 4, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 4, 1), (@ChordId, 3, 5, 2), (@ChordId, 4, 6, 4), (@ChordId, 5, 5, 3), (@ChordId, 6, -1, 0);

-- E Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('E', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 2, 2), (@ChordId, 3, 2, 3), (@ChordId, 4, 1, 1), (@ChordId, 5, 0, 0), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('B', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 4, 2), (@ChordId, 4, 4, 3), (@ChordId, 5, 4, 4), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('C#m', 4, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 4, 1), (@ChordId, 3, 6, 3), (@ChordId, 4, 6, 4), (@ChordId, 5, 5, 2), (@ChordId, 6, 4, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('G#m', 4, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 4, 1), (@ChordId, 2, 6, 3), (@ChordId, 3, 6, 4), (@ChordId, 4, 4, 1), (@ChordId, 5, 4, 1), (@ChordId, 6, 4, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('D#dim', 6, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 6, 1), (@ChordId, 3, 7, 2), (@ChordId, 4, 8, 4), (@ChordId, 5, 7, 3), (@ChordId, 6, -1, 0);

-- F Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Bb', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 3, 2), (@ChordId, 4, 3, 3), (@ChordId, 5, 3, 4), (@ChordId, 6, 1, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Gm', 3, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 3, 1), (@ChordId, 2, 5, 3), (@ChordId, 3, 5, 4), (@ChordId, 4, 3, 1), (@ChordId, 5, 3, 1), (@ChordId, 6, 3, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 3);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Edim', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 2, 2), (@ChordId, 4, 0, 0), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);

-- G Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('F#dim', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 3, 2), (@ChordId, 3, 4, 3), (@ChordId, 4, 2, 1), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

-- A Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('G#dim', 4, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 4, 1), (@ChordId, 2, 5, 2), (@ChordId, 3, 6, 3), (@ChordId, 4, 4, 1), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

-- B Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('F#', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 4, 3), (@ChordId, 3, 4, 4), (@ChordId, 4, 3, 2), (@ChordId, 5, 2, 1), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('D#m', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 1, 1), (@ChordId, 4, 3, 3), (@ChordId, 5, 4, 4), (@ChordId, 6, 2, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('A#dim', 1, 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 2, 2), (@ChordId, 4, 3, 4), (@ChordId, 5, 2, 3), (@ChordId, 6, -1, 0);

GO

PRINT '================================================';
PRINT 'Creating chord-family mappings...';
PRINT '================================================';
GO

-- =============================================
-- CHORD-FAMILY MAPPINGS
-- =============================================

-- Family C chords
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c, Families f
WHERE f.Name = 'C' AND c.Name IN ('C', 'G', 'Am', 'F', 'Dm', 'Em', 'Bdim');

-- Family D chords
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c, Families f
WHERE f.Name = 'D' AND c.Name IN ('D', 'A', 'Bm', 'G', 'Em', 'F#m', 'C#dim');

-- Family E chords
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c, Families f
WHERE f.Name = 'E' AND c.Name IN ('E', 'B', 'C#m', 'A', 'F#m', 'G#m', 'D#dim');

-- Family F chords
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c, Families f
WHERE f.Name = 'F' AND c.Name IN ('F', 'C', 'Dm', 'Bb', 'Gm', 'Am', 'Edim');

-- Family G chords
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c, Families f
WHERE f.Name = 'G' AND c.Name IN ('G', 'D', 'Em', 'C', 'Am', 'Bm', 'F#dim');

-- Family A chords
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c, Families f
WHERE f.Name = 'A' AND c.Name IN ('A', 'E', 'F#m', 'D', 'Bm', 'C#m', 'G#dim');

-- Family B chords
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c, Families f
WHERE f.Name = 'B' AND c.Name IN ('B', 'F#', 'G#m', 'E', 'C#m', 'D#m', 'A#dim');

GO

PRINT '================================================';
PRINT 'Creating views...';
PRINT '================================================';
GO

-- =============================================
-- VIEWS
-- =============================================

-- View: All chords with their families
CREATE VIEW vw_AllChords AS
SELECT 
    c.Id,
    c.Name,
    c.BaseFret,
    c.IsOriginal,
    c.CreatedDate,
    STUFF((
        SELECT ', ' + f.Name
        FROM ChordFamilyMapping cfm
        INNER JOIN Families f ON cfm.FamilyId = f.Id
        WHERE cfm.ChordId = c.Id
        FOR XML PATH(''), TYPE
    ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS Families
FROM Chords c;
GO

-- View: Songs with folders
CREATE VIEW vw_SongsWithFolders AS
SELECT 
    s.Id,
    s.Title,
    s.SongDate,
    s.Notes,
    s.SongKey,
    s.Capo,
    s.BPM,
    s.Effects,
    CASE
        WHEN ISNULL(s.LayoutColumnCount, 1) = 2
            THEN CONCAT(
                ISNULL(s.ContentTextColumn1, N''),
                CASE
                    WHEN ISNULL(s.ContentTextColumn1, N'') <> N'' AND ISNULL(s.ContentTextColumn2, N'') <> N''
                        THEN NCHAR(10) + NCHAR(10)
                    ELSE N''
                END,
                ISNULL(s.ContentTextColumn2, N'')
            )
        ELSE ISNULL(s.ContentTextColumn1, N'')
    END AS ContentText,
    s.LayoutColumnCount,
    s.LayoutDividerRatio,
    s.ContentTextColumn1,
    s.ContentTextColumn2,
    s.CreatedDate,
    s.ModifiedDate,
    STUFF((
        SELECT ', ' + f.Name
        FROM SongFolderMapping sfm
        INNER JOIN Folders f ON sfm.FolderId = f.Id
        WHERE sfm.SongId = s.Id
        FOR XML PATH(''), TYPE
    ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS Folders
FROM Songs s;
GO

-- View: Song chord diagrams
CREATE VIEW vw_SongChordDiagrams AS
SELECT 
    scd.SongId,
    scd.ChordId,
    c.Name AS ChordName,
    scd.DisplayOrder
FROM SongChordDiagrams scd
INNER JOIN Chords c ON scd.ChordId = c.Id;
GO

PRINT '================================================';
PRINT 'Database setup completed successfully!';
PRINT '================================================';
PRINT 'Database: ChordSmith';
PRINT 'Tables created: 10';
PRINT 'Views created: 3';
PRINT 'Chords inserted: 28';
PRINT 'Families: 7 (C, D, E, F, G, A, B)';
PRINT '================================================';
GO

-- add-columns!!!
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

-- 2026-01-23_add-multiuser-and-sharing!!!

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

-- 2026-01-26_add-user-folders!!!
-- =============================================
-- Migration: 2026-01-26_add-user-folders.sql
-- Add creator_id to Folders table to make folders user-specific
-- =============================================

USE ChordSmith;
GO

-- Add creator_id to Folders table
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Folders') AND name = 'creator_id')
BEGIN
    ALTER TABLE dbo.Folders ADD creator_id INT NULL;
    ALTER TABLE dbo.Folders ADD CONSTRAINT FK_Folders_creator FOREIGN KEY (creator_id) REFERENCES dbo.Users(id);
END;
GO

-- Assign existing folders to the initial user 'kennier'
DECLARE @kennier_id INT = (SELECT TOP (1) id FROM Users WHERE username = 'kennier');
IF @kennier_id IS NOT NULL
BEGIN
    UPDATE dbo.Folders SET creator_id = @kennier_id WHERE creator_id IS NULL;
END;
GO

-- Make creator_id NOT NULL after assigning
ALTER TABLE dbo.Folders ALTER COLUMN creator_id INT NOT NULL;
GO

-- Add CASCADE to UserSongs FK
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserSongs_Song')
BEGIN
    ALTER TABLE dbo.UserSongs DROP CONSTRAINT FK_UserSongs_Song;
END;
ALTER TABLE dbo.UserSongs ADD CONSTRAINT FK_UserSongs_Song FOREIGN KEY (song_id) REFERENCES dbo.Songs(id) ON DELETE CASCADE;
GO

-- Add CASCADE to UserChords FK
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserChords_Chord')
BEGIN
    ALTER TABLE dbo.UserChords DROP CONSTRAINT FK_UserChords_Chord;
END;
ALTER TABLE dbo.UserChords ADD CONSTRAINT FK_UserChords_Chord FOREIGN KEY (chord_id) REFERENCES dbo.Chords(id) ON DELETE CASCADE;
GO

-- Add CASCADE to SongShares FK
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_SongShares_Song')
BEGIN
    ALTER TABLE dbo.SongShares DROP CONSTRAINT FK_SongShares_Song;
END;
ALTER TABLE dbo.SongShares ADD CONSTRAINT FK_SongShares_Song FOREIGN KEY (song_id) REFERENCES dbo.Songs(id) ON DELETE CASCADE;
GO

-- Add CASCADE to ChordShares FK
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ChordShares_Chord')
BEGIN
    ALTER TABLE dbo.ChordShares DROP CONSTRAINT FK_ChordShares_Chord;
END;
ALTER TABLE dbo.ChordShares ADD CONSTRAINT FK_ChordShares_Chord FOREIGN KEY (chord_id) REFERENCES dbo.Chords(id) ON DELETE CASCADE;
GO

PRINT 'Migration completed: Folders are now user-specific, and delete cascades added';

-- 2026-02-20_add-song-layout-columns!!!

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

    IF COL_LENGTH('dbo.Songs', 'ContentText') IS NOT NULL
    BEGIN
        EXEC sp_executesql N'
            UPDATE dbo.Songs
            SET ContentTextColumn1 = ContentText
            WHERE ContentTextColumn1 IS NULL;
        ';
    END;

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


-- 2026-02-21_drop-songs-contenttext!!!
-- =============================================
-- Migration: 2026-02-21_drop-songs-contenttext.sql
-- Purpose:
-- - Remove deprecated Songs.ContentText column
-- - Keep compatibility in vw_SongsWithFolders by exposing computed ContentText
-- Safe to re-run: yes
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

    IF COL_LENGTH('dbo.Songs', 'ContentTextColumn1') IS NULL
    BEGIN
        RAISERROR('ContentTextColumn1 was not found. Run 2026-02-20_add-song-layout-columns.sql first.', 16, 1);
    END;

    IF COL_LENGTH('dbo.Songs', 'ContentTextColumn2') IS NULL
    BEGIN
        RAISERROR('ContentTextColumn2 was not found. Run 2026-02-20_add-song-layout-columns.sql first.', 16, 1);
    END;

    IF COL_LENGTH('dbo.Songs', 'LayoutColumnCount') IS NULL
    BEGIN
        RAISERROR('LayoutColumnCount was not found. Run 2026-02-20_add-song-layout-columns.sql first.', 16, 1);
    END;

    -- Backfill before drop, only if old column still exists
    IF COL_LENGTH('dbo.Songs', 'ContentText') IS NOT NULL
    BEGIN
        EXEC sp_executesql N'
            UPDATE dbo.Songs
            SET ContentTextColumn1 = ISNULL(ContentTextColumn1, ContentText)
            WHERE ContentTextColumn1 IS NULL;
        ';
    END;

    -- Keep view output compatible by exposing a computed ContentText column.
    EXEC sp_executesql N'
        CREATE OR ALTER VIEW dbo.vw_SongsWithFolders AS
        SELECT
            s.Id,
            s.Title,
            s.SongDate,
            s.Notes,
            s.SongKey,
            s.Capo,
            s.BPM,
            s.Effects,
            CASE
                WHEN ISNULL(s.LayoutColumnCount, 1) = 2
                    THEN CONCAT(
                        ISNULL(s.ContentTextColumn1, N''''),
                        CASE
                            WHEN ISNULL(s.ContentTextColumn1, N'''') <> N'''' AND ISNULL(s.ContentTextColumn2, N'''') <> N''''
                                THEN NCHAR(10) + NCHAR(10)
                            ELSE N''''
                        END,
                        ISNULL(s.ContentTextColumn2, N'''')
                    )
                ELSE ISNULL(s.ContentTextColumn1, N'''')
            END AS ContentText,
            s.LayoutColumnCount,
            s.LayoutDividerRatio,
            s.ContentTextColumn1,
            s.ContentTextColumn2,
            s.CreatedDate,
            s.ModifiedDate,
            STUFF((
                SELECT '', '' + f.Name
                FROM SongFolderMapping sfm
                INNER JOIN Folders f ON sfm.FolderId = f.Id
                WHERE sfm.SongId = s.Id
                FOR XML PATH(''''), TYPE
            ).value(''.'', ''NVARCHAR(MAX)''), 1, 2, '''') AS Folders
        FROM Songs s;
    ';

    IF COL_LENGTH('dbo.Songs', 'ContentText') IS NOT NULL
    BEGIN
        EXEC sp_executesql N'ALTER TABLE dbo.Songs DROP COLUMN ContentText;';
    END;

    COMMIT TRANSACTION;
    PRINT 'Migration completed: Songs.ContentText removed safely.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    DECLARE @err_msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('Migration failed: %s', 16, 1, @err_msg);
END CATCH;
GO
