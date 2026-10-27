Bookwise Admin - patch batch 1
==============================

1. Copy this whole "patches" folder into the project root (next to package.json).
   Keep the "assets" folder inside it (the PWA icons live there).
2. Commit or stash your work first so `git diff` shows exactly what changed.
3. From the project root:

     node patches/run-all.cjs --dry     (preview, writes nothing)
     node patches/run-all.cjs           (apply 01 -> 04)

   Or run one at a time:  node patches/01-book-codes.cjs

   Each patch is all-or-nothing and safe to re-run (applied patches are skipped).
   CRLF line endings and UTF-8 BOMs are preserved.

4. Deploy Convex (patches 01 and 02 change server code):

     npx convex deploy --typecheck=disable

5. Push and let Vercel/Netlify build. PWA install only works over HTTPS (your deployed site).

Contents
  01-book-codes.cjs       book code/ID field, duplicate check, search
  02-borrow-age-rule.cjs  kids under 10 cannot borrow (server + UI); rule lives in convex/policy.ts
  03-birthdays.cjs        dashboard birthday card + calendar markers
  04-pwa.cjs              manifest, icons, service worker, install button
