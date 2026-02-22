# Migration Rollback and Support Notes

## Scope
These notes cover rollback and support steps for moving from SQL Server (`ChordSmith`) to MySQL (`Chordsmith Studio`).

## Rollback plan

1. Stop the running application process.
2. Keep SQL Server data as the fallback source of truth (migration script is read-only against source).
3. Recreate MySQL target to a known-clean state:
- Open MySQL Workbench.
- Execute `database/setup-mysql.sql`.
4. If migration previously failed, fix the root cause and rerun:
```bash
npm run migrate:sqlserver-to-mysql
```
5. If production/local users are blocked, continue running the original SQL Server-backed copy until MySQL migration is validated.

## Safe migration workflow

1. Backup SQL Server source database.
2. Backup MySQL target database (if not empty).
3. Run migration script.
4. Run verification checks.
5. Run smoke tests in app.

## Verification checklist

- Table row counts source vs target match for migrated tables.
- Login works with migrated users.
- Song create/edit/save/reopen works.
- Chord create/edit/delete works.
- Sharing flows (send, incoming list, accept/reject) work.
- PDF preview/download output remains unchanged.

## Common issues and fixes

- `ER_ACCESS_DENIED_ERROR`
  - Fix `DB_USER` and `DB_PASSWORD` in `.env`.
- `Unknown database 'Chordsmith Studio'`
  - Execute `database/setup-mysql.sql` in MySQL Workbench.
- SQL Server connection timeout
  - Verify `SRC_MSSQL_SERVER`, `SRC_MSSQL_PORT`, firewall rules, and SQL auth mode.
- `pdftotext command failed`
  - Install Poppler and confirm `pdftotext` is available in PATH.
- Duplicate key error during migration
  - Re-run `database/setup-mysql.sql` and rerun migration.

## Support notes

- Application DB config is centralized in `server/db.js` and driven by `.env`.
- Migration script is `scripts/migrate-sqlserver-to-mysql.js`.
- Keep `database/setup-complete.sql` (SQL Server) for legacy fallback and source migration reference.
