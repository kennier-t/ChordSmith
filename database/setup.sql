-- =============================================
-- ChordSmith - Complete Database Setup Script
-- MySQL 8+
-- =============================================

DROP DATABASE IF EXISTS `ChordSmith`;
CREATE DATABASE `ChordSmith`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ChordSmith`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE Users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    password_hash VARCHAR(256) NULL,
    language_pref CHAR(2) NULL DEFAULT 'en',
    user_type VARCHAR(20) NOT NULL DEFAULT 'user',
    is_verified TINYINT NULL DEFAULT 0,
    created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UX_Users_username (username),
    UNIQUE KEY UX_Users_email (email)
) ENGINE=InnoDB;

CREATE TABLE UserVerificationTokens (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(256) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_UserVerificationTokens_User FOREIGN KEY (user_id) REFERENCES Users(id)
) ENGINE=InnoDB;

CREATE TABLE PasswordResetTokens (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(256) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_PasswordResetTokens_User FOREIGN KEY (user_id) REFERENCES Users(id)
) ENGINE=InnoDB;

CREATE TABLE Families (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(50) NOT NULL,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UX_Families_Name (Name)
) ENGINE=InnoDB;

CREATE TABLE Chords (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(50) NOT NULL,
    BaseFret INT NOT NULL DEFAULT 1,
    IsOriginal TINYINT NOT NULL DEFAULT 0,
    IsDefault TINYINT NOT NULL DEFAULT 0,
    creator_id INT NULL,
    created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Chords_creator FOREIGN KEY (creator_id) REFERENCES Users(id),
    KEY IX_Chords_creator (creator_id)
) ENGINE=InnoDB;

CREATE TABLE ChordFingerings (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ChordId INT NOT NULL,
    StringNumber INT NOT NULL,
    FretNumber INT NOT NULL,
    FingerNumber INT NOT NULL,
    CONSTRAINT FK_ChordFingerings_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ChordFingerings_ChordString UNIQUE (ChordId, StringNumber),
    CONSTRAINT CK_ChordFingerings_StringNumber CHECK (StringNumber BETWEEN 1 AND 6),
    CONSTRAINT CK_ChordFingerings_FretNumber CHECK (FretNumber BETWEEN -1 AND 24),
    CONSTRAINT CK_ChordFingerings_FingerNumber CHECK (FingerNumber BETWEEN 0 AND 4)
) ENGINE=InnoDB;

CREATE TABLE ChordBarres (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ChordId INT NOT NULL,
    FretNumber INT NOT NULL,
    CONSTRAINT FK_ChordBarres_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE,
    CONSTRAINT CK_ChordBarres_FretNumber CHECK (FretNumber BETWEEN 1 AND 24)
) ENGINE=InnoDB;

CREATE TABLE ChordFamilyMapping (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ChordId INT NOT NULL,
    FamilyId INT NOT NULL,
    CONSTRAINT FK_ChordFamilyMapping_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE,
    CONSTRAINT FK_ChordFamilyMapping_Families FOREIGN KEY (FamilyId) REFERENCES Families(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ChordFamilyMapping UNIQUE (ChordId, FamilyId)
) ENGINE=InnoDB;

CREATE TABLE Folders (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    creator_id INT NOT NULL,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Folders_creator FOREIGN KEY (creator_id) REFERENCES Users(id)
) ENGINE=InnoDB;

CREATE TABLE Songs (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(200) NOT NULL,
    SongDate VARCHAR(50) NULL,
    Notes LONGTEXT NULL,
    SongKey VARCHAR(20) NULL,
    Capo VARCHAR(20) NULL,
    BPM VARCHAR(20) NULL,
    Effects VARCHAR(200) NULL,
    LayoutColumnCount TINYINT NOT NULL DEFAULT 1,
    LayoutDividerRatio DECIMAL(6,5) NOT NULL DEFAULT 0.50000,
    ContentTextColumn1 LONGTEXT NOT NULL,
    ContentTextColumn2 LONGTEXT NULL,
    SongContentFontSizePt DECIMAL(5,2) NULL,
    creator_id INT NULL,
    created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT FK_Songs_creator FOREIGN KEY (creator_id) REFERENCES Users(id),
    CONSTRAINT CK_Songs_LayoutColumnCount CHECK (LayoutColumnCount IN (1, 2)),
    CONSTRAINT CK_Songs_LayoutDividerRatio CHECK (LayoutDividerRatio >= 0.20000 AND LayoutDividerRatio <= 0.80000),
    KEY IX_Songs_creator (creator_id)
) ENGINE=InnoDB;

CREATE TABLE SongChordDiagrams (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    SongId INT NOT NULL,
    ChordId INT NOT NULL,
    DisplayOrder INT NOT NULL,
    CONSTRAINT FK_SongChordDiagrams_Songs FOREIGN KEY (SongId) REFERENCES Songs(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SongChordDiagrams_Chords FOREIGN KEY (ChordId) REFERENCES Chords(Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE SongFolderMapping (
    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    SongId INT NOT NULL,
    FolderId INT NOT NULL,
    CONSTRAINT FK_SongFolderMapping_Songs FOREIGN KEY (SongId) REFERENCES Songs(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SongFolderMapping_Folders FOREIGN KEY (FolderId) REFERENCES Folders(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_SongFolderMapping UNIQUE (SongId, FolderId)
) ENGINE=InnoDB;

CREATE TABLE UserSongs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    song_id INT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_creator TINYINT DEFAULT 0,
    CONSTRAINT FK_UserSongs_User FOREIGN KEY (user_id) REFERENCES Users(id),
    CONSTRAINT FK_UserSongs_Song FOREIGN KEY (song_id) REFERENCES Songs(id) ON DELETE CASCADE,
    UNIQUE KEY UX_UserSongs_user_song (user_id, song_id)
) ENGINE=InnoDB;

CREATE TABLE UserChords (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    chord_id INT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_creator TINYINT DEFAULT 0,
    CONSTRAINT FK_UserChords_User FOREIGN KEY (user_id) REFERENCES Users(id),
    CONSTRAINT FK_UserChords_Chord FOREIGN KEY (chord_id) REFERENCES Chords(id) ON DELETE CASCADE,
    UNIQUE KEY UX_UserChords_user_chord (user_id, chord_id)
) ENGINE=InnoDB;

CREATE TABLE SongShares (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    song_id INT NOT NULL,
    sender_user_id INT NULL,
    recipient_username VARCHAR(100) NULL,
    recipient_user_id INT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    payload LONGTEXT NULL,
    CONSTRAINT FK_SongShares_Song FOREIGN KEY (song_id) REFERENCES Songs(id) ON DELETE CASCADE,
    CONSTRAINT FK_SongShares_Sender FOREIGN KEY (sender_user_id) REFERENCES Users(id)
) ENGINE=InnoDB;

CREATE TABLE ChordShares (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    chord_id INT NOT NULL,
    sender_user_id INT NULL,
    recipient_username VARCHAR(100) NULL,
    recipient_user_id INT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    payload LONGTEXT NULL,
    CONSTRAINT FK_ChordShares_Chord FOREIGN KEY (chord_id) REFERENCES Chords(id) ON DELETE CASCADE,
    CONSTRAINT FK_ChordShares_Sender FOREIGN KEY (sender_user_id) REFERENCES Users(id)
) ENGINE=InnoDB;

INSERT INTO Families (Name) VALUES
('C'), ('D'), ('E'), ('F'), ('G'), ('A'), ('B');

SET @ChordId = NULL;

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('C', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 3, 3), (@ChordId, 3, 2, 2), (@ChordId, 4, 0, 0), (@ChordId, 5, 1, 1), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('G', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 3, 2), (@ChordId, 2, 2, 1), (@ChordId, 3, 0, 0), (@ChordId, 4, 0, 0), (@ChordId, 5, 0, 0), (@ChordId, 6, 3, 3);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Am', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 0, 0), (@ChordId, 3, 2, 2), (@ChordId, 4, 2, 3), (@ChordId, 5, 1, 1), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('F', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 1, 1), (@ChordId, 2, 3, 3), (@ChordId, 3, 3, 4), (@ChordId, 4, 2, 2), (@ChordId, 5, 1, 1), (@ChordId, 6, 1, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Dm', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 0, 0), (@ChordId, 4, 2, 2), (@ChordId, 5, 3, 3), (@ChordId, 6, 1, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Em', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 0, 0), (@ChordId, 2, 2, 2), (@ChordId, 3, 2, 3), (@ChordId, 4, 0, 0), (@ChordId, 5, 0, 0), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Bdim', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 3, 2), (@ChordId, 4, 4, 4), (@ChordId, 5, 3, 3), (@ChordId, 6, -1, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('D', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 0, 0), (@ChordId, 4, 2, 1), (@ChordId, 5, 3, 3), (@ChordId, 6, 2, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('A', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 0, 0), (@ChordId, 3, 2, 2), (@ChordId, 4, 2, 3), (@ChordId, 5, 2, 4), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Bm', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 4, 3), (@ChordId, 4, 4, 4), (@ChordId, 5, 3, 2), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('F#m', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 2, 1), (@ChordId, 2, 4, 3), (@ChordId, 3, 4, 4), (@ChordId, 4, 2, 1), (@ChordId, 5, 2, 1), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('C#dim', 4, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 4, 1), (@ChordId, 3, 5, 2), (@ChordId, 4, 6, 4), (@ChordId, 5, 5, 3), (@ChordId, 6, -1, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('E', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 0, 0), (@ChordId, 2, 2, 2), (@ChordId, 3, 2, 3), (@ChordId, 4, 1, 1), (@ChordId, 5, 0, 0), (@ChordId, 6, 0, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('B', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 2, 1), (@ChordId, 3, 4, 2), (@ChordId, 4, 4, 3), (@ChordId, 5, 4, 4), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('C#m', 4, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 4, 1), (@ChordId, 3, 6, 3), (@ChordId, 4, 6, 4), (@ChordId, 5, 5, 2), (@ChordId, 6, 4, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('G#m', 4, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 4, 1), (@ChordId, 2, 6, 3), (@ChordId, 3, 6, 4), (@ChordId, 4, 4, 1), (@ChordId, 5, 4, 1), (@ChordId, 6, 4, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('D#dim', 6, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 6, 1), (@ChordId, 3, 7, 2), (@ChordId, 4, 8, 4), (@ChordId, 5, 7, 3), (@ChordId, 6, -1, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Bb', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 3, 2), (@ChordId, 4, 3, 3), (@ChordId, 5, 3, 4), (@ChordId, 6, 1, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 1);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Gm', 3, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 3, 1), (@ChordId, 2, 5, 3), (@ChordId, 3, 5, 4), (@ChordId, 4, 3, 1), (@ChordId, 5, 3, 1), (@ChordId, 6, 3, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 3);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('Edim', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 0, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 2, 2), (@ChordId, 4, 0, 0), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('F#dim', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 2, 1), (@ChordId, 2, 3, 2), (@ChordId, 3, 4, 3), (@ChordId, 4, 2, 1), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('G#dim', 4, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 4, 1), (@ChordId, 2, 5, 2), (@ChordId, 3, 6, 3), (@ChordId, 4, 4, 1), (@ChordId, 5, -1, 0), (@ChordId, 6, -1, 0);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 4);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('F#', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, 2, 1), (@ChordId, 2, 4, 3), (@ChordId, 3, 4, 4), (@ChordId, 4, 3, 2), (@ChordId, 5, 2, 1), (@ChordId, 6, 2, 1);
INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@ChordId, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('D#m', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, -1, 0), (@ChordId, 3, 1, 1), (@ChordId, 4, 3, 3), (@ChordId, 5, 4, 4), (@ChordId, 6, 2, 2);

INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault) VALUES ('A#dim', 1, 1, 1);
SET @ChordId = LAST_INSERT_ID();
INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES
(@ChordId, 1, -1, 0), (@ChordId, 2, 1, 1), (@ChordId, 3, 2, 2), (@ChordId, 4, 3, 4), (@ChordId, 5, 2, 3), (@ChordId, 6, -1, 0);

INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c CROSS JOIN Families f
WHERE f.Name = 'C' AND c.Name IN ('C', 'G', 'Am', 'F', 'Dm', 'Em', 'Bdim');

INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c CROSS JOIN Families f
WHERE f.Name = 'D' AND c.Name IN ('D', 'A', 'Bm', 'G', 'Em', 'F#m', 'C#dim');

INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c CROSS JOIN Families f
WHERE f.Name = 'E' AND c.Name IN ('E', 'B', 'C#m', 'A', 'F#m', 'G#m', 'D#dim');

INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c CROSS JOIN Families f
WHERE f.Name = 'F' AND c.Name IN ('F', 'C', 'Dm', 'Bb', 'Gm', 'Am', 'Edim');

INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c CROSS JOIN Families f
WHERE f.Name = 'G' AND c.Name IN ('G', 'D', 'Em', 'C', 'Am', 'Bm', 'F#dim');

INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c CROSS JOIN Families f
WHERE f.Name = 'A' AND c.Name IN ('A', 'E', 'F#m', 'D', 'Bm', 'C#m', 'G#dim');

INSERT INTO ChordFamilyMapping (ChordId, FamilyId)
SELECT c.Id, f.Id FROM Chords c CROSS JOIN Families f
WHERE f.Name = 'B' AND c.Name IN ('B', 'F#', 'G#m', 'E', 'C#m', 'D#m', 'A#dim');

CREATE OR REPLACE VIEW vw_AllChords AS
SELECT
    c.Id,
    c.Name,
    c.BaseFret,
    c.IsOriginal,
    c.CreatedDate,
    COALESCE((
        SELECT GROUP_CONCAT(f.Name ORDER BY f.Name SEPARATOR ', ')
        FROM ChordFamilyMapping cfm
        INNER JOIN Families f ON cfm.FamilyId = f.Id
        WHERE cfm.ChordId = c.Id
    ), '') AS Families
FROM Chords c;

CREATE OR REPLACE VIEW vw_SongsWithFolders AS
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
        WHEN COALESCE(s.LayoutColumnCount, 1) = 2 THEN CONCAT(
            COALESCE(s.ContentTextColumn1, ''),
            CASE
                WHEN COALESCE(s.ContentTextColumn1, '') <> '' AND COALESCE(s.ContentTextColumn2, '') <> '' THEN CONCAT(CHAR(10), CHAR(10))
                ELSE ''
            END,
            COALESCE(s.ContentTextColumn2, '')
        )
        ELSE COALESCE(s.ContentTextColumn1, '')
    END AS ContentText,
    s.LayoutColumnCount,
    s.LayoutDividerRatio,
    s.ContentTextColumn1,
    s.ContentTextColumn2,
    s.CreatedDate,
    s.ModifiedDate,
    COALESCE((
        SELECT GROUP_CONCAT(f.Name ORDER BY f.Name SEPARATOR ', ')
        FROM SongFolderMapping sfm
        INNER JOIN Folders f ON sfm.FolderId = f.Id
        WHERE sfm.SongId = s.Id
    ), '') AS Folders
FROM Songs s;

CREATE OR REPLACE VIEW vw_SongChordDiagrams AS
SELECT
    scd.SongId,
    scd.ChordId,
    c.Name AS ChordName,
    scd.DisplayOrder
FROM SongChordDiagrams scd
INNER JOIN Chords c ON scd.ChordId = c.Id;

SET FOREIGN_KEY_CHECKS = 1;
