NORTHBRIDGE INTELLIGENCE HUB — CATALYST LOGIN BUILD

This project adds a Catalyst Hosted Authentication gate to the existing React dashboard. It allows only shaliktestmail@gmail.com to render the dashboard UI. Existing API URLs and dashboard workflows have not been intentionally changed. Backend APIs are NOT protected by this change yet, as requested; protect them before treating the app as production-secure.

IMPORTANT
- Do not deploy this to Slate. It is prepared for Zoho Catalyst Web Client Hosting.
- Keep your existing Slate deployment unchanged as a backup while testing.
- The source is in src/ and the Catalyst client deployment output is generated in client/.

BUILD
1. Install Node.js (Node 20.19+ or 22.12+ recommended for Vite 8).
2. Open a terminal in this folder.
3. Run: npm install
4. Run: npm run build
5. This creates the client/ folder with the compiled website.

CATALYST CONFIGURATION
- client-package.json is at the project root.
- homepage is set to /__catalyst/auth/login.
- login_redirect is set to index.html.
- Deploy the client folder and client-package.json using the Catalyst Web Client Hosting workflow / CLI for the existing NorthBridge Catalyst project.
- After deployment, use the Catalyst Web Client Hosting Access URL for testing.
- In Authentication > User Management, update the user's Redirect Details platform to Web Client Hosting and use the new Catalyst web-client URL if the console requires a user-level redirect. Do not use the old Slate URL for the new hosted client.

AUTHENTICATION BEHAVIOR
- Unauthenticated sessions are redirected to /__catalyst/auth/login.
- Only the exact email shaliktestmail@gmail.com is allowed to render the dashboard.
- Other authenticated users see Access restricted.
- Local Vite development is allowed for preview only. The production build requires Catalyst authentication.
- This is a frontend access gate only. It does not protect the API endpoints themselves.

TEST BEFORE SWITCHING USERS
1. Open the Catalyst web-client URL in a private/incognito window; it should ask you to sign in.
2. Sign in as shaliktestmail@gmail.com; dashboard should appear.
3. Sign in as a different Catalyst user; Access restricted should appear.
4. Test Churn Overview refresh and Feature Requests refresh.
5. Keep the old Slate URL unused or separately restrict it; it remains public otherwise.
