Bookwise - patch batch 6 (activity log + exports)
=================================================
From the PROJECT ROOT in PowerShell:

  Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch6.zip" -DestinationPath . -Force
  node patches/run-all.cjs --dry
  node patches/run-all.cjs

  npx convex dev --once            (production deployment too, if you use one:  npx convex deploy)

  npm run build
  git add -A
  git commit -m "Activity log and exports"
  git push

What you get (Admin app > Activity):
  - A log of what teachers, parents and admins did, with who and when. Only starts recording after you deploy.
  - Filters: who, what area, dates, words. Newest first.
  - Export to Excel (CSV): activity log, loans, reviews, fees, people, books.
