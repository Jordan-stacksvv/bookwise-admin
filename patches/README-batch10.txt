Bookwise - patch batch 10
=========================
Needs batch 9 (patch 17) already applied. From the PROJECT ROOT in PowerShell:

  Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch10.zip" -DestinationPath . -Force
  node patches/run-all.cjs --dry
  node patches/run-all.cjs

  npm run build
  git add -A
  git commit -m "Sign-in page text restored"
  git push

18  Sign-in page: the tagline and paragraph on the navy panel, "Choose how you want to use the book club.",
    the full teacher/admin card descriptions, and the original sign-up messages are back.
