-- This script removes the unique constraint on the 'Name' column of the 'Chords' table.
-- This change is necessary to allow for multiple chord variations with the same name.

-- Note: The constraint name 'UQ__Chords__737584F629BE3A9C' was taken from the error log.
-- If your database has a different auto-generated name for this constraint,
-- you may need to find the correct name by inspecting the table properties in your database management tool.

ALTER TABLE Chords
DROP CONSTRAINT UQ__Chords__737584F629BE3A9C;
