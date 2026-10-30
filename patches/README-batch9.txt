Bookwise - patch batch 9
========================
Needs batch 8 already applied (you have). From the PROJECT ROOT in PowerShell:

  Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch9.zip" -DestinationPath . -Force
  node patches/run-all.cjs --dry
  node patches/run-all.cjs

  npm run build
  git add -A
  git commit -m "Restore original look, detailed README"
  git push

No Convex change in this batch, so npx convex dev / deploy is not needed.

17  Original colours, fonts, church logo and app icons are back (cream background, navy sidebar, gold accent,
    Fraunces headings, coloured stat chips, navy panel on the sign-in page). The cleanup stays: no greetings,
    no emojis, no helper text, phone layout fixes, "Needs your attention", delete confirmation, batch import.
    README.md is rewritten as a full guide for developers, admins, teachers and parents.
