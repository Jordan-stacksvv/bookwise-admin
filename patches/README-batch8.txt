Bookwise - patch batch 8
========================
Needs batch 7 already applied. From the PROJECT ROOT in PowerShell:

  Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch8.zip" -DestinationPath . -Force
  node patches/run-all.cjs --dry
  node patches/run-all.cjs

  npx convex dev --once            (production too, if you use one:  npx convex deploy)

  npm run build
  git add -A
  git commit -m "Visual polish, batch import, documentation"
  git push

15  Cleaner look for teacher and admin apps: flat neutral colours, plain logo and app icons, no greeting or
    helper text, one "Needs your attention" list, book actions stay on screen on phones, delete asks first.
16  Admin > Import (CSV) for books, kids and teachers, plus a secured HTTP endpoint for scripts.
    The server now also refuses to give out a book with no free copy.

README.md and docs/ describe the whole project.
Turn on the import endpoint (optional):  npx convex env set IMPORT_API_KEY <24+ random characters>
