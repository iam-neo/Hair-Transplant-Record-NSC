# Authorization

Roles provide permission defaults: Super Admin, Admin, Doctor, Assistant, and Reception. A `Permissions` CSV value on a user can override defaults. Every Apps Script action invokes `requirePermission_`; frontend navigation filtering is not an authorization control.

Permission names include `patients.*`, `consultations.*`, `assessments.*`, `procedures.*`, `photos.*`, `followups.*`, `payments.*`, `documents.*`, `users.*`, `reports.view`, and `audit_logs.view`.
