# Deployment checklist

1. Deploy Apps Script from a clinic-owned Workspace account and complete the setup guide.
2. Configure the frontend environment with the Web App `/exec` endpoint.
3. Build the frontend with `npm run build` and deploy it to a HTTPS host.
4. Verify Super Admin login, disabled-account rejection, restricted API requests, a test patient, a private photo upload, and a test reminder.
5. Establish a recurring export/versioned backup for the backing spreadsheet and Drive root. Test restoration before production use.

Do not deploy until access control, retention, and local medical/privacy obligations have been reviewed by the clinic.
