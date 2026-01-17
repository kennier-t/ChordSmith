-- =============================================
-- Chord Families - Complete Database Setup Script
-- SQL Server
-- This script creates the entire database with all tables and data
-- Execute this script once to set up everything
-- =============================================

USE master;
GO

-- Drop database if exists
IF DB_ID('ChordFamilies') IS NOT NULL
BEGIN
    ALTER DATABASE ChordFamilies SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ChordFamilies;
END
GO

-- Create database
CREATE DATABASE ChordFamilies;
GO

USE ChordFamilies;
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
    Name NVARCHAR(50) NOT NULL UNIQUE,
    BaseFret INT NOT NULL DEFAULT 1,
    IsOriginal BIT NOT NULL DEFAULT 0,
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
    ContentText NVARCHAR(MAX) NOT NULL,
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
INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('C', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 3, 3), (@ChordId, 3, 2, 2), (@ChordId, 4, 0, 0), (@ChordId, 5, 1, 1), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('G', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 3, 2), (@ChordId, 2, 2, 1), (@ChordId, 3, 0, 0), (@ChordId, 4, 0, 0), (@ChordId, 5, 0, 0), (@ChordId, 6, 3, 3);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('Am', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 0, 0), (@ChordId, 3, 2, 2), (@ChordId, 4, 2, 3), (@ChordId, 5, 1, 1), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('F', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 1, 1), (@ChordId, 2, 3, 3), (@ChordId, 3, 3, 4), (@ChordId, 4, 2, 2), (@ChordId, 5, 1, 1), (@ChordId, 6, 1, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('Dm', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 0, 0), (@ChordId, 4, 2, 2), (@ChordId, 5, 3, 3), (@ChordId, 6, 1, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('Em', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 2, 2), (@ChordId, 3, 2, 3), (@ChordId, 4, 0, 0), (@ChordId, 5, 0, 0), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('Bdim', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 3, 2), (@ChordId, 4, 4, 4), (@ChordId, 5, 3, 3), (@ChordId, 6, -1, 0);

-- D Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('D', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 0, 0), (@ChordId, 4, 2, 1), (@ChordId, 5, 3, 3), (@ChordId, 6, 2, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('A', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 0, 0), (@ChordId, 3, 2, 2), (@ChordId, 4, 2, 3), (@ChordId, 5, 2, 4), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('Bm', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 4, 3), (@ChordId, 4, 4, 4), (@ChordId, 5, 3, 2), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('F#m', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 4, 3), (@ChordId, 3, 4, 4), (@ChordId, 4, 2, 1), (@ChordId, 5, 2, 1), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('C#dim', 4, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 4, 1), (@ChordId, 3, 5, 2), (@ChordId, 4, 6, 4), (@ChordId, 5, 5, 3), (@ChordId, 6, -1, 0);

-- E Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('E', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 2, 2), (@ChordId, 3, 2, 3), (@ChordId, 4, 1, 1), (@ChordId, 5, 0, 0), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('B', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 4, 2), (@ChordId, 4, 4, 3), (@ChordId, 5, 4, 4), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('C#m', 4, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 4, 1), (@ChordId, 3, 6, 3), (@ChordId, 4, 6, 4), (@ChordId, 5, 5, 2), (@ChordId, 6, 4, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('G#m', 4, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 4, 1), (@ChordId, 2, 6, 3), (@ChordId, 3, 6, 4), (@ChordId, 4, 4, 1), (@ChordId, 5, 4, 1), (@ChordId, 6, 4, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('D#dim', 6, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 6, 1), (@ChordId, 3, 7, 2), (@ChordId, 4, 8, 4), (@ChordId, 5, 7, 3), (@ChordId, 6, -1, 0);

-- F Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('Bb', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 3, 2), (@ChordId, 4, 3, 3), (@ChordId, 5, 3, 4), (@ChordId, 6, 1, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('Gm', 3, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 3, 1), (@ChordId, 2, 5, 3), (@ChordId, 3, 5, 4), (@ChordId, 4, 3, 1), (@ChordId, 5, 3, 1), (@ChordId, 6, 3, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 3);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('Edim', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 2, 2), (@ChordId, 4, 0, 0), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);

-- G Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('F#dim', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 3, 2), (@ChordId, 3, 4, 3), (@ChordId, 4, 2, 1), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

-- A Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('G#dim', 4, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 4, 1), (@ChordId, 2, 5, 2), (@ChordId, 3, 6, 3), (@ChordId, 4, 4, 1), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

-- B Family Chords
INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('F#', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 4, 3), (@ChordId, 3, 4, 4), (@ChordId, 4, 3, 2), (@ChordId, 5, 2, 1), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('D#m', 1, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 1, 1), (@ChordId, 4, 3, 3), (@ChordId, 5, 4, 4), (@ChordId, 6, 2, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal) VALUES ('A#dim', 1, 1);
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
    s.ContentText,
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
PRINT 'Database: ChordFamilies';
PRINT 'Tables created: 10';
PRINT 'Views created: 3';
PRINT 'Chords inserted: 28';
PRINT 'Families: 7 (C, D, E, F, G, A, B)';
PRINT '================================================';
GO
