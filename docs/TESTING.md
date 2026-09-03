# Testing

Run `npm run lint`, `npm run build`, and `npm test` after dependencies are installed. Test Apps Script manually with a clinic test account: valid/invalid/disabled login; a forbidden direct API call; ID generation under concurrent registrations; duplicate warning; private file upload; reminder success/failure; and payment/follow-up status changes.

Use fictional data only. The current automated test verifies the stable ID format contract; deploy-time integration tests must run against the clinic’s isolated Google test resources.
