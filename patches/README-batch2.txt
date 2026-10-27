Bookwise - patch batch 2 (admin app, parent approval, fees)
===========================================================

Run from the PROJECT ROOT (the folder with package.json), in PowerShell.
Batch 1 must already be applied (it is - you pushed it).

 1. Unzip over the project (adds files into patches/, nothing else changes yet):

      Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch2.zip" -DestinationPath . -Force

 2. Preview, then apply (05 -> 06 -> 07; batch 1 patches are skipped automatically):

      node patches/run-all.cjs --dry
      node patches/run-all.cjs

 3. Pick the right Convex project, then deploy the server code.
    Your last deploy said "You don't have access to the selected project", so batch 1's server code
    (book codes, under-10 rule) is NOT live yet either. Fix that first:

      npx convex login          (sign in with the account that owns your project)
      npx convex dev --once     (choose / confirm the project; also regenerates convex/_generated)
      npx convex deploy

 4. Make yourself an admin (use your real sign-in email; separate several with commas):

      npx convex env set ADMIN_EMAILS "you@example.com"
      npx convex env set ADMIN_EMAILS "you@example.com" --prod      (for the production deployment)

 5. Build once to refresh the route list, check it, then push:

      npm run build
      git add -A
      git commit -m "Admin app, parent approval, fees"
      git push

 6. Open  https://<your-site>/admin  (or the "Admin area" link in the footer), sign in, then use
    "Install admin app" in the sidebar (iPhone: Share > Add to Home Screen).

Contents
  05-admin-backend.cjs   convex: admin check, loans, policy, announcements, class reading, schema
  06-loan-approval.cjs   teacher side: send-to-parent dialog, /approvals, public /approve/<token>, footer
  07-admin-app.cjs       /admin app + its own PWA, dashboard "From the admin" card
