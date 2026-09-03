# Data schema

The initializer creates `Users`, `Patients`, `Consultations`, `Assessments`, `Procedures`, `PhotoSessions`, `Photos`, `FollowUps`, `Payments`, `Documents`, `Reminders`, `ActivityLogs`, and `Settings` sheets. Each contains a permanent entity ID and audit timestamps. Headers are defined centrally in `apps-script/Config.gs` and are the source of truth.

Patient IDs follow `HT-YYYY-000001`; other IDs use prefixes such as `CON`, `ASM`, `PROC`, `FU`, `PAY`, `DOC`, `PHOTO`, `REM`, and `ACT`.
