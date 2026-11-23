# Sign-in emails

Signing in by email sends a 6-digit code to type in the app, and no link, so signing in never leaves it (SYN-3, `docs/features/backup-and-sync.md`). Supabase sends these from its dashboard, not from this folder: this is the copy to paste there when they change.

In the Supabase project:

1. **Authentication → Emails → Templates:** paste `magic-link.html` into **Magic link** (sent to an account that exists) and `confirm-signup.html` into **Confirm signup** (sent the first time, making the account), with the subjects below. Neither may use `{{ .ConfirmationURL }}`, the link: only `{{ .Token }}`, the code.
2. **Authentication → Providers → Email:** **Email OTP Length** 6 (the app accepts only 6 digits), and **Email OTP Expiration** 3600 seconds (an hour, as the code says it lasts).

| Template       | Subject                         |
| -------------- | ------------------------------- |
| Magic link     | Your Loop Workouts code: {{ .Token }} |
| Confirm signup | Your Loop Workouts code: {{ .Token }} |

The code in the subject shows in a phone's notification, so it can be typed without opening the email.
