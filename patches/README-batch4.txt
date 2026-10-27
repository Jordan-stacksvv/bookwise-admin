Bookwise - patch batch 4 ("Who are you?" login, people list, admin cleanup)
===========================================================================
From the PROJECT ROOT in PowerShell:

  Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch4.zip" -DestinationPath . -Force
  node patches/run-all.cjs --dry
  node patches/run-all.cjs

  npx convex dev --once            (production deployment too, if you use one:  npx convex deploy)

  npm run build
  git add -A
  git commit -m "Role login, people list, admin cleanup"
  git push
