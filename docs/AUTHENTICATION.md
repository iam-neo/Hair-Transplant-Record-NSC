# Authentication

The Apps Script backend accepts username/email and password only over the deployed HTTPS endpoint. Login compares a salted, iteratively hashed password and returns an opaque six-hour session token. The frontend keeps that token in session storage, clears it on sign-out, and never stores a password.

Disabled users and expired sessions are rejected server-side on every protected request. Resetting a password requires generating a new random salt and replacing the hash through an authorized administrative process.
