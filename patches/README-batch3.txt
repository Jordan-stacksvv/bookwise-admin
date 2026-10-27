Bookwise - patch batch 3 (admin sign-in fix, request/approve admins, profile pages, one login)
==============================================================================================
Run from the PROJECT ROOT in PowerShell.

 1. Unzip, preview, apply (earlier patches are skipped automatically):

      Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batch3.zip" -DestinationPath . -Force
      node patches/run-all.cjs --dry
      node patches/run-all.cjs

 2. Deploy the server code:

      npx convex dev --once
      (production deployment, if your live site uses one:  npx convex deploy)

 3. Push:

      npm run build
      git add -A
      git commit -m "Admin accounts, profile pages, one login"
      git push

 4. First admin (once): open  <your site>/admin , sign in, expand "I am setting up the very first admin",
    run the command it shows (it contains your account id), then reload:

      npx convex env set ADMIN_USER_IDS "user_xxxxxxxx"

    After that, other people use "Request admin access" and you approve them in Admin > Settings > Admins.
