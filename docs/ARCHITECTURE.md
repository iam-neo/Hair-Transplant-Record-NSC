# Architecture

The browser communicates only with a deployed Google Apps Script Web App. React components call `src/lib/api/client.ts`; they never call Google Sheets or Drive directly. The service authenticates its session token, verifies account status and a granular permission, validates input, then writes metadata to Sheets and files to private Drive folders.

Stable IDs are backend-generated with `LockService`, never spreadsheet row numbers. The service layer keeps the UI independent of Sheets, so a future backend can retain the same action contract while moving to PostgreSQL or another database.

Brand tokens derive from the supplied logo: cyan `#109fd2`, deep navy `#252985`, and lavender `#9490c7`. Accessible darker cyan is used for control text and focus states.
