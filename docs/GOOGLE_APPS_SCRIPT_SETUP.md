# Google Apps Script setup

1. Create a new Apps Script project under the clinic-owned Google Workspace account.
2. Add every `.gs` file from `apps-script/`, preserving their filenames. Set the project timezone to Asia/Kathmandu.
3. Run `initialize_({spreadsheetName:'NSC Hair Transplant Data'})` once from the editor and authorize Sheets and Drive access. It creates the spreadsheet, headers, and private Drive root. It is idempotent and deliberately not exposed as a web endpoint.
4. In Script Properties, record any required configuration. `NSC_SPREADSHEET_ID` and `NSC_ROOT_FOLDER_ID` are created by initialization.
5. Create the first Super Admin from the Apps Script editor (not the Sheet) by running `setupInitialSuperAdmin_('Your Name', 'admin@clinic.example', 'admin', 'a-long-unique-password')`. The helper will only work while no user exists; it hashes the password and never stores plaintext.
6. Deploy as a Web App. Execute as the clinic owner. Choose access appropriate to the clinic’s Workspace users; do not make patient data publicly accessible. Copy the `/exec` URL to frontend `.env.local` as `NEXT_PUBLIC_API_URL`.
7. Add a time-driven trigger for `sendDueReminders_` (for example, hourly). Test with a clinic-controlled recipient first.

The current Web App request format is JSON POST `{ action, token, payload }`. Apps Script deployment and Workspace access controls are a critical part of production security.
