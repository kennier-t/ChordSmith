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
-- AUTH / USERS TABLES
-- =============================================

CREATE TABLE Users (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    password_hash VARCHAR(256) NULL,
    language_pref CHAR(2) NULL DEFAULT 'en',
    user_type VARCHAR(20) NOT NULL DEFAULT 'user',
    is_verified BIT NULL DEFAULT 0,
    created_at DATETIME2 NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE UNIQUE INDEX UX_Users_username ON Users(username);
CREATE UNIQUE INDEX UX_Users_email ON Users(email);
GO

CREATE TABLE UserVerificationTokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(256) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    used_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_UserVerificationTokens_User FOREIGN KEY (user_id) REFERENCES Users(id)
);
GO

CREATE TABLE PasswordResetTokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(256) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    used_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PasswordResetTokens_User FOREIGN KEY (user_id) REFERENCES Users(id)
);
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
    creator_id INT NULL,
    created_at DATETIME2 NULL CONSTRAINT DF_Chords_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CreatedDate DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Chords_creator FOREIGN KEY (creator_id) REFERENCES Users(id)
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
    creator_id INT NOT NULL,
    CreatedDate DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Folders_creator FOREIGN KEY (creator_id) REFERENCES Users(id)
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
    creator_id INT NULL,
    created_at DATETIME2 NULL CONSTRAINT DF_Songs_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL,
    CreatedDate DATETIME2 DEFAULT GETDATE(),
    ModifiedDate DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Songs_creator FOREIGN KEY (creator_id) REFERENCES Users(id)
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

-- =============================================
-- MULTI-USER MAPPING / SHARING TABLES
-- =============================================

CREATE TABLE UserSongs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    song_id INT NOT NULL,
    assigned_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    is_creator BIT DEFAULT 0,
    CONSTRAINT FK_UserSongs_User FOREIGN KEY (user_id) REFERENCES Users(id),
    CONSTRAINT FK_UserSongs_Song FOREIGN KEY (song_id) REFERENCES Songs(id) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX UX_UserSongs_user_song ON UserSongs(user_id, song_id);
GO

CREATE TABLE UserChords (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    chord_id INT NOT NULL,
    assigned_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    is_creator BIT DEFAULT 0,
    CONSTRAINT FK_UserChords_User FOREIGN KEY (user_id) REFERENCES Users(id),
    CONSTRAINT FK_UserChords_Chord FOREIGN KEY (chord_id) REFERENCES Chords(id) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX UX_UserChords_user_chord ON UserChords(user_id, chord_id);
GO

CREATE TABLE SongShares (
    id INT IDENTITY(1,1) PRIMARY KEY,
    song_id INT NOT NULL,
    sender_user_id INT NULL,
    recipient_username VARCHAR(100) NULL,
    recipient_user_id INT NULL,
    sent_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    status VARCHAR(20) DEFAULT 'pending',
    payload NVARCHAR(MAX) NULL,
    CONSTRAINT FK_SongShares_Song FOREIGN KEY (song_id) REFERENCES Songs(id) ON DELETE CASCADE,
    CONSTRAINT FK_SongShares_Sender FOREIGN KEY (sender_user_id) REFERENCES Users(id)
);
GO

CREATE TABLE ChordShares (
    id INT IDENTITY(1,1) PRIMARY KEY,
    chord_id INT NOT NULL,
    sender_user_id INT NULL,
    recipient_username VARCHAR(100) NULL,
    recipient_user_id INT NULL,
    sent_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    status VARCHAR(20) DEFAULT 'pending',
    payload NVARCHAR(MAX) NULL,
    CONSTRAINT FK_ChordShares_Chord FOREIGN KEY (chord_id) REFERENCES Chords(id) ON DELETE CASCADE,
    CONSTRAINT FK_ChordShares_Sender FOREIGN KEY (sender_user_id) REFERENCES Users(id)
);
GO

CREATE INDEX IX_Chords_creator ON Chords(creator_id);
CREATE INDEX IX_Songs_creator ON Songs(creator_id);
GO

PRINT '================================================';
PRINT 'Creating initial admin user...';
PRINT '================================================';
GO

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
PRINT 'Tables created: 16';
PRINT 'Views created: 3';
PRINT 'Chords inserted: 28';
PRINT 'Families: 7 (C, D, E, F, G, A, B)';
PRINT 'Initial users inserted: 1';
PRINT '================================================';
GO
