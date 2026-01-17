-- =============================================
-- Chord Families Database Setup Script
-- SQL Server
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

-- =============================================
-- Create Tables
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
    FamilyId INT NULL, -- NULL for custom chords not tied to a family
    IsOriginal BIT NOT NULL DEFAULT 0,
    CreatedDate DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Chords_Families FOREIGN KEY (FamilyId) REFERENCES Families(Id)
);
GO

-- Table: ChordFingerings
-- Stores finger positions for each chord
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
-- Stores barre information for chords
CREATE TABLE ChordBarres (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ChordId INT NOT NULL,
    FretNumber INT NOT NULL CHECK (FretNumber BETWEEN 1 AND 24),
    CONSTRAINT FK_ChordBarres_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE
);
GO

-- =============================================
-- Insert Data
-- =============================================

-- Insert Families
INSERT INTO Families (Name) VALUES 
('C'), ('D'), ('E'), ('F'), ('G'), ('A'), ('B');
GO

-- =============================================
-- Insert Chords and Fingerings
-- Note: Array indices in JS [0,1,2,3,4,5] map to String Numbers [1,2,3,4,5,6]
-- =============================================

-- Family C
DECLARE @FamilyId INT = (SELECT Id FROM Families WHERE Name = 'C');
DECLARE @ChordId INT;

-- C
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('C', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 3, 3), (@ChordId, 3, 2, 2), 
(@ChordId, 4, 0, 0), (@ChordId, 5, 1, 1), (@ChordId, 6, 0, 0);

-- G (in C family)
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('G', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 3, 2), (@ChordId, 2, 2, 1), (@ChordId, 3, 0, 0), 
(@ChordId, 4, 0, 0), (@ChordId, 5, 0, 0), (@ChordId, 6, 3, 3);

-- Am
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('Am', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 0, 0), (@ChordId, 3, 2, 2), 
(@ChordId, 4, 2, 3), (@ChordId, 5, 1, 1), (@ChordId, 6, 0, 0);

-- F (in C family)
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('F', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 1, 1), (@ChordId, 2, 3, 3), (@ChordId, 3, 3, 4), 
(@ChordId, 4, 2, 2), (@ChordId, 5, 1, 1), (@ChordId, 6, 1, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 1);

-- Dm
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('Dm', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 0, 0), 
(@ChordId, 4, 2, 2), (@ChordId, 5, 3, 3), (@ChordId, 6, 1, 1);

-- Em
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('Em', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 2, 2), (@ChordId, 3, 2, 3), 
(@ChordId, 4, 0, 0), (@ChordId, 5, 0, 0), (@ChordId, 6, 0, 0);

-- Bdim
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('Bdim', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 3, 2), 
(@ChordId, 4, 4, 4), (@ChordId, 5, 3, 3), (@ChordId, 6, -1, 0);

-- Family D
SET @FamilyId = (SELECT Id FROM Families WHERE Name = 'D');

-- D
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('D', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 0, 0), 
(@ChordId, 4, 2, 1), (@ChordId, 5, 3, 3), (@ChordId, 6, 2, 2);

-- A (in D family)
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('A', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 0, 0), (@ChordId, 3, 2, 2), 
(@ChordId, 4, 2, 3), (@ChordId, 5, 2, 4), (@ChordId, 6, 0, 0);

-- Bm
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('Bm', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 4, 3), 
(@ChordId, 4, 4, 4), (@ChordId, 5, 3, 2), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

-- G (in D family) - duplicate name but different family
-- Note: Since we have UNIQUE constraint on Name, we need to skip or handle duplicates
-- For now, skipping duplicate chord names

-- Em (in D family) - skipping duplicate

-- F#m
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('F#m', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 4, 3), (@ChordId, 3, 4, 4), 
(@ChordId, 4, 2, 1), (@ChordId, 5, 2, 1), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

-- C#dim
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('C#dim', 4, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 4, 1), (@ChordId, 3, 5, 2), 
(@ChordId, 4, 6, 4), (@ChordId, 5, 5, 3), (@ChordId, 6, -1, 0);

-- Family E
SET @FamilyId = (SELECT Id FROM Families WHERE Name = 'E');

-- E
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('E', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 2, 2), (@ChordId, 3, 2, 3), 
(@ChordId, 4, 1, 1), (@ChordId, 5, 0, 0), (@ChordId, 6, 0, 0);

-- B
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('B', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 4, 2), 
(@ChordId, 4, 4, 3), (@ChordId, 5, 4, 4), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

-- C#m
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('C#m', 4, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 4, 1), (@ChordId, 3, 6, 3), 
(@ChordId, 4, 6, 4), (@ChordId, 5, 5, 2), (@ChordId, 6, 4, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

-- A (in E family) - skipping duplicate

-- F#m (in E family) - skipping duplicate

-- G#m
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('G#m', 4, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 4, 1), (@ChordId, 2, 6, 3), (@ChordId, 3, 6, 4), 
(@ChordId, 4, 4, 1), (@ChordId, 5, 4, 1), (@ChordId, 6, 4, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

-- D#dim
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('D#dim', 6, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 6, 1), (@ChordId, 3, 7, 2), 
(@ChordId, 4, 8, 4), (@ChordId, 5, 7, 3), (@ChordId, 6, -1, 0);

-- Family F
SET @FamilyId = (SELECT Id FROM Families WHERE Name = 'F');

-- F (in F family) - skipping duplicate

-- C (in F family) - skipping duplicate

-- Dm (in F family) - skipping duplicate

-- Bb
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('Bb', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 3, 2), 
(@ChordId, 4, 3, 3), (@ChordId, 5, 3, 4), (@ChordId, 6, 1, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 1);

-- Gm
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('Gm', 3, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 3, 1), (@ChordId, 2, 5, 3), (@ChordId, 3, 5, 4), 
(@ChordId, 4, 3, 1), (@ChordId, 5, 3, 1), (@ChordId, 6, 3, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 3);

-- Am (in F family) - skipping duplicate

-- Edim
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('Edim', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 0, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 2, 2), 
(@ChordId, 4, 0, 0), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);

-- Family G
SET @FamilyId = (SELECT Id FROM Families WHERE Name = 'G');

-- G (in G family) - skipping duplicate

-- D (in G family) - skipping duplicate

-- Em (in G family) - skipping duplicate

-- C (in G family) - skipping duplicate

-- Am (in G family) - skipping duplicate

-- Bm (in G family) - skipping duplicate

-- F#dim
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('F#dim', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 3, 2), (@ChordId, 3, 4, 3), 
(@ChordId, 4, 2, 1), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

-- Family A
SET @FamilyId = (SELECT Id FROM Families WHERE Name = 'A');

-- A (in A family) - skipping duplicate

-- E (in A family) - skipping duplicate

-- F#m (in A family) - skipping duplicate

-- D (in A family) - skipping duplicate

-- Bm (in A family) - skipping duplicate

-- C#m (in A family) - skipping duplicate

-- G#dim
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('G#dim', 4, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 4, 1), (@ChordId, 2, 5, 2), (@ChordId, 3, 6, 3), 
(@ChordId, 4, 4, 1), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

-- Family B
SET @FamilyId = (SELECT Id FROM Families WHERE Name = 'B');

-- B (in B family) - skipping duplicate

-- F#
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('F#', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, 2, 1), (@ChordId, 2, 4, 3), (@ChordId, 3, 4, 4), 
(@ChordId, 4, 3, 2), (@ChordId, 5, 2, 1), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

-- G#m (in B family) - skipping duplicate

-- E (in B family) - skipping duplicate

-- C#m (in B family) - skipping duplicate

-- D#m
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('D#m', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 1, 1), 
(@ChordId, 4, 3, 3), (@ChordId, 5, 4, 4), (@ChordId, 6, 2, 2);

-- A#dim
INSERT INTO Chords (Name, BaseFret, FamilyId, IsOriginal) VALUES ('A#dim', 1, @FamilyId, 1);
SET @ChordId = SCOPE_IDENTITY();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES 
(@ChordId, 1, -1, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 2, 2), 
(@ChordId, 4, 3, 4), (@ChordId, 5, 2, 3), (@ChordId, 6, -1, 0);

GO

-- =============================================
-- Create Views for Easy Querying
-- =============================================

-- View: All chords with their complete information
CREATE VIEW vw_AllChords AS
SELECT 
    c.Id,
    c.Name,
    c.BaseFret,
    c.FamilyId,
    f.Name AS FamilyName,
    c.IsOriginal,
    c.CreatedDate
FROM Chords c
LEFT JOIN Families f ON c.FamilyId = f.Id;
GO

-- View: Chord fingerings in array format
CREATE VIEW vw_ChordFingeringsArray AS
SELECT 
    ChordId,
    MAX(CASE WHEN StringNumber = 1 THEN FretNumber END) AS String1_Fret,
    MAX(CASE WHEN StringNumber = 1 THEN FingerNumber END) AS String1_Finger,
    MAX(CASE WHEN StringNumber = 2 THEN FretNumber END) AS String2_Fret,
    MAX(CASE WHEN StringNumber = 2 THEN FingerNumber END) AS String2_Finger,
    MAX(CASE WHEN StringNumber = 3 THEN FretNumber END) AS String3_Fret,
    MAX(CASE WHEN StringNumber = 3 THEN FingerNumber END) AS String3_Finger,
    MAX(CASE WHEN StringNumber = 4 THEN FretNumber END) AS String4_Fret,
    MAX(CASE WHEN StringNumber = 4 THEN FingerNumber END) AS String4_Finger,
    MAX(CASE WHEN StringNumber = 5 THEN FretNumber END) AS String5_Fret,
    MAX(CASE WHEN StringNumber = 5 THEN FingerNumber END) AS String5_Finger,
    MAX(CASE WHEN StringNumber = 6 THEN FretNumber END) AS String6_Fret,
    MAX(CASE WHEN StringNumber = 6 THEN FingerNumber END) AS String6_Finger
FROM ChordFingerings
GROUP BY ChordId;
GO

PRINT 'ChordFamilies database setup completed successfully!';
PRINT 'Total Families: ' + CAST((SELECT COUNT(*) FROM Families) AS VARCHAR);
PRINT 'Total Chords: ' + CAST((SELECT COUNT(*) FROM Chords) AS VARCHAR);
PRINT 'Total Fingerings: ' + CAST((SELECT COUNT(*) FROM ChordFingerings) AS VARCHAR);
PRINT 'Total Barres: ' + CAST((SELECT COUNT(*) FROM ChordBarres) AS VARCHAR);
GO
