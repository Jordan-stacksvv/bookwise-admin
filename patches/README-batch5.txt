Bookwise - patch batch 5 (book reviews + nobody gets in without approval)
=========================================================================
From the PROJECT ROOT in PowerShell:

  Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch5.zip" -DestinationPath . -Force
  node patches/run-all.cjs --dry
  node patches/run-all.cjs

  npx convex dev --once            (production deployment too, if you use one:  npx convex deploy)

  npm run build
  git add -A
  git commit -m "Book reviews, approval for new sign-ins"
  git push

Then, in the admin app, open  People  and approve the teachers who already use the app
(people recorded before this update count as waiting).

OPTIONAL - auto-approve teachers you added on the Teachers page (matched by email):
  Clerk dashboard > JWT templates > convex > add the claim   "email": "{{user.primary_email_address}}"
  Without it everything still works; you just approve each person by hand (People page shows
  "Matches teacher: ..." so it is one tap).
