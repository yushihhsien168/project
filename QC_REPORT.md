# Login Flow QC Report — 2026-09-29

## Scope
Fix the member-login flow so an unauthenticated click on 「會員登入」 immediately starts Netlify Identity Google OAuth instead of opening an intermediate login modal with a missing Google button.

## Changes verified
- Header 「會員登入」 click no longer opens the login modal for unauthenticated users.
- Unauthenticated click directly executes `oauthLogin('google')`.
- Authenticated click may open the account/session modal.
- OAuth callback remains handled by `handleAuthCallback()`.
- Existing `getUser()`, `updateUser()`, `userMetadata`, journey persistence, and logout logic remain present.
- Removed the old fallback script that always opened the modal.
- Removed user-facing Netlify/Identity diagnostic text.
- Removed the stray literal `\\n` from the page.
- Preserved STEP 3 `primaryAudience`, `secondaryAudience`, and `restrictions` for all 8 AI applications.

## Static / logic QC
121 / 121 PASS

This includes 100 deterministic login-state branch cases plus structural checks. It is not a claim of 100 real human/browser OAuth sessions.

## Deployment note
Actual Google OAuth must be tested on the deployed HTTPS Netlify site. Netlify documents `oauthLogin('google')` as the external-provider login flow and `handleAuthCallback()` as required after the OAuth redirect.
