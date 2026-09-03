# Email reminder setup

When a follow-up is created, the backend can create a reminder per validated recipient in `recipients`. A time-driven trigger calls `sendDueReminders_`. Each reminder has its own ID and changes from `Scheduled` to `Sent` or `Failed`, preventing a successful reminder from being resent on subsequent runs.

Monitor failure records and Gmail quotas. Configure recipient and consent policies with the clinic before enabling patient emails.
