Bookwise - patch batch 7
========================
Needs batch 6 (activity log) already applied. From the PROJECT ROOT in PowerShell:

  Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch7.zip" -DestinationPath . -Force
  node patches/run-all.cjs --dry
  node patches/run-all.cjs

  npx convex dev --once            (production deployment too, if you use one:  npx convex deploy)

  npm run build
  git add -A
  git commit -m "Profile menu, reviews on books, admin pages, bulk approval"
  git push

13  Profile at the bottom of both sidebars (photo or initial, name, three dots). Review button on each active loan
    (dashboard + Kids page), and every approved review shows on its book (Books page).
14  Teachers can be approved with no class (assign it later). Admin app gets Books, Kids and Teachers pages.
    Books a teacher adds wait for the admin. Select-all / approve-selected for loans, reviews, people and books.
