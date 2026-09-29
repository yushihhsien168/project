# Netlify Identity diagnostic / fix

## Root causes found in the previous build
1. `src/netlify-auth.js` imported `@netlify/identity` as a bare browser module. If the ZIP is uploaded as static files without running the Vite build, the browser cannot resolve that import, so the login module never initializes.
2. The previous provider check used the wrong settings shape. `getSettings()` returns `settings.providers.google`, not `settings.external.providers`.
3. The previous code read `user_metadata` from the normalized v2 browser User object and attempted `currentUser.update()`. The v2 API exposes `userMetadata` and `updateUser()`.

## Fix
- Browser module uses `@netlify/identity@2.0.0` through an ESM CDN so the ZIP remains directly runnable as static files.
- Google availability is checked with `getSettings().providers.google`.
- Account data is saved with `updateUser({ data: ... })` and restored from `userMetadata`.
- OAuth callback continues to use `handleAuthCallback()`.

## Runtime verification required
Deploy to Netlify over HTTPS. Open the member login dialog and click Google. The UI now reports whether Identity is reachable and whether Google is actually enabled. A local `file://` open cannot validate Netlify Identity.
