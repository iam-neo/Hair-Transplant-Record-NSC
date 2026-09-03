# Nepalgunj Skin Center — Hair Transplant System

Secure internal web application for documenting the patient journey: registration, clinical records, procedures, private photo/document storage, follow-ups, payments, reminders, activity history, and role-based access.

## Run the frontend

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` after deploying the Google Apps Script service.
2. Run `npm install` and `npm run dev`.
3. Open `http://localhost:3000`.

The login and all persistent operations require the configured backend. The UI intentionally does not simulate a successful sign-in or save when the backend is absent.

## Project layout

- `src/` — Next.js App Router frontend, API abstraction, session handling, permission-aware interface.
- `apps-script/` — Google Apps Script backend. Deploy this separately under a clinic-owned Google account.
- `Skin_logo.png` — supplied official logo, used without alteration.
- `docs/` — deployment, security, data, and operations guidance.

See [Google Apps Script setup](docs/GOOGLE_APPS_SCRIPT_SETUP.md), [architecture](docs/ARCHITECTURE.md), and [security](docs/SECURITY.md) before deployment.
