-- =============================================
-- Chord Families Database - Many-to-Many Update
-- SQL Server
-- Ejecutar DESPUÉS de ChordFamilies-Setup.sql
-- =============================================

USE ChordFamilies;
GO

-- =============================================
-- Step 1: Create Junction Table
-- =============================================

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
-- Step 2: Migrate existing relationships
-- =============================================

INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT Id, FamilyId
FROM Chords
WHERE FamilyId IS NOT NULL;
GO

-- =============================================
-- Step 3: Insert missing chord-family relationships
-- =============================================

-- G appears in families: C, D, G
DECLARE @GChordId INT = (SELECT Id FROM Chords WHERE Name = 'G');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @GChordId, Id FROM Families WHERE Name IN ('D', 'G')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @GChordId AND FamilyId = Families.Id);

-- Em appears in families: C, D, G
DECLARE @EmChordId INT = (SELECT Id FROM Chords WHERE Name = 'Em');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @EmChordId, Id FROM Families WHERE Name IN ('D', 'G')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @EmChordId AND FamilyId = Families.Id);

-- F appears in families: C, F
DECLARE @FChordId INT = (SELECT Id FROM Chords WHERE Name = 'F');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @FChordId, Id FROM Families WHERE Name IN ('F')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @FChordId AND FamilyId = Families.Id);

-- Dm appears in families: C, F
DECLARE @DmChordId INT = (SELECT Id FROM Chords WHERE Name = 'Dm');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @DmChordId, Id FROM Families WHERE Name IN ('F')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @DmChordId AND FamilyId = Families.Id);

-- A appears in families: D, E, A
DECLARE @AChordId INT = (SELECT Id FROM Chords WHERE Name = 'A');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @AChordId, Id FROM Families WHERE Name IN ('E', 'A')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @AChordId AND FamilyId = Families.Id);

-- Bm appears in families: D, G, A
DECLARE @BmChordId INT = (SELECT Id FROM Chords WHERE Name = 'Bm');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @BmChordId, Id FROM Families WHERE Name IN ('G', 'A')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @BmChordId AND FamilyId = Families.Id);

-- F#m appears in families: D, E, A
DECLARE @FSmChordId INT = (SELECT Id FROM Chords WHERE Name = 'F#m');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @FSmChordId, Id FROM Families WHERE Name IN ('E', 'A')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @FSmChordId AND FamilyId = Families.Id);

-- E appears in families: E, A, B
DECLARE @EChordId INT = (SELECT Id FROM Chords WHERE Name = 'E');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @EChordId, Id FROM Families WHERE Name IN ('A', 'B')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @EChordId AND FamilyId = Families.Id);

-- C#m appears in families: E, A, B
DECLARE @CSmChordId INT = (SELECT Id FROM Chords WHERE Name = 'C#m');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @CSmChordId, Id FROM Families WHERE Name IN ('A', 'B')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @CSmChordId AND FamilyId = Families.Id);

-- G#m appears in families: E, B
DECLARE @GSmChordId INT = (SELECT Id FROM Chords WHERE Name = 'G#m');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @GSmChordId, Id FROM Families WHERE Name IN ('B')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @GSmChordId AND FamilyId = Families.Id);

-- C appears in families: C, F, G
DECLARE @CChordId INT = (SELECT Id FROM Chords WHERE Name = 'C');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @CChordId, Id FROM Families WHERE Name IN ('F', 'G')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @CChordId AND FamilyId = Families.Id);

-- Am appears in families: C, F, G
DECLARE @AmChordId INT = (SELECT Id FROM Chords WHERE Name = 'Am');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @AmChordId, Id FROM Families WHERE Name IN ('F', 'G')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @AmChordId AND FamilyId = Families.Id);

-- D appears in families: D, G, A
DECLARE @DChordId INT = (SELECT Id FROM Chords WHERE Name = 'D');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @DChordId, Id FROM Families WHERE Name IN ('G', 'A')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @DChordId AND FamilyId = Families.Id);

-- B appears in families: E, B
DECLARE @BChordId INT = (SELECT Id FROM Chords WHERE Name = 'B');
INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT @BChordId, Id FROM Families WHERE Name IN ('B')
AND NOT EXISTS (SELECT 1 FROM ChordFamilyMapping WHERE ChordId = @BChordId AND FamilyId = Families.Id);

GO

-- =============================================
-- Step 4: Drop old FamilyId column from Chords
-- =============================================

ALTER TABLE Chords DROP CONSTRAINT FK_Chords_Families;
GO

ALTER TABLE Chords DROP COLUMN FamilyId;
GO

-- =============================================
-- Step 5: Update View
-- =============================================

DROP VIEW IF EXISTS vw_AllChords;
GO

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

PRINT 'Many-to-Many relationship implemented successfully!';
PRINT 'Total Chord-Family mappings: ' + CAST((SELECT COUNT(*) FROM ChordFamilyMapping) AS VARCHAR);
GO
