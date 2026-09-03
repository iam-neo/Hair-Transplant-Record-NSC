# Security controls

- Passwords are salted and iteratively SHA-256 hashed server-side; plaintext passwords are never stored or returned. Consider a managed identity provider if Google Workspace SSO becomes available.
- Sessions are opaque, random tokens held in Apps Script cache with an eight-hour expiry; account status is checked on every authenticated request.
- Each backend operation validates authentication and a granular permission. Hidden navigation is only a usability feature, not security.
- Patient files are saved in Drive with private access. The API returns metadata, not public Drive URLs.
- IDs use `LockService`; activity entries record important creates and uploads.
- Configure HTTPS deployment, least-privilege Drive/Sheets sharing, Workspace MFA, backups, and retention policies before go-live.

Do not log patient payloads in browser analytics or share the backing spreadsheet/folders outside authorized clinic personnel.
