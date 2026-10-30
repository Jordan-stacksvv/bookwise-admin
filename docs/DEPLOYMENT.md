# Deployment

## What you need

| Service | Used for |
|---|---|
| [Convex](https://convex.dev) | Database and server functions |
| [Clerk](https://clerk.com) | Sign-in with Google |
| Netlify (or Vercel) | Hosting the website |
| GitHub | The code (`Jordan-stacksvv/bookwise-admin`) |

Node.js 20 or newer is needed on your computer.

## First-time setup

### 1. Install and connect Convex
```powershell
npm install
npx convex dev
```
Log in when asked and link the project. This creates `convex/_generated/` and keeps your server code in sync while it runs. Leave it open while you work.

### 2. Clerk
1. In the Clerk dashboard open **JWT Templates**, create a template from the **Convex** preset, and copy its **Issuer URL**.
2. Paste the issuer into the `domain` field in `convex/auth.config.ts`.
3. Under **Paths** set the sign-in URL to `/login` and the after-sign-in and after-sign-up URLs to `/dashboard`.
4. Turn on the Google social connection.

### 3. Environment files
Create `.env` in the project root (these two are safe to keep in the repo):
```
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```
Set the same two variables in Netlify under **Site configuration, Environment variables**.

### 4. The first admin
Nobody can approve anyone until there is one admin. Make yourself admin by putting your Clerk user ID in a Convex environment variable (find the ID in the Clerk dashboard under **Users**):
```powershell
npx convex env set ADMIN_USER_IDS user_abc123
```
Several IDs can be separated by commas. After that, sign in, choose **I'm an admin**, and use **People** to approve everyone else. Other admins can be made from **People** and do not need to be in this variable. The ID set here always stays an admin and cannot be removed from the app.

Optional: `ADMIN_EMAILS` (comma-separated) also grants admin, but only works if your Clerk token includes a verified email claim. `ADMIN_USER_IDS` is the reliable choice.

### 5. Demo data (optional)
In the Convex dashboard open **Functions**, find `seed:run` and run it. It fills in sample books, kids and teachers, and refuses to run if books already exist. Do not run it on the live deployment.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_CONVEX_URL` | `.env` and Netlify | Which Convex deployment the website talks to |
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env` and Netlify | Clerk public key |
| `ADMIN_USER_IDS` | Convex env | First admin(s), by Clerk user ID |
| `ADMIN_EMAILS` | Convex env, optional | Admins by verified email |
| `IMPORT_API_KEY` | Convex env, optional | Switches on the HTTP import endpoint. 24 or more characters. See [IMPORT-API.md](IMPORT-API.md) |

`CLERK_SECRET_KEY` appears in the older `SETUP.md`, but the current code does not use it. If you do set it anywhere, keep it in hosting secrets and never in the repo.

Convex environment variables are per deployment: set them separately on the development and the production deployment (`npx convex env set NAME value`, add `--prod` for production).

## Development and production

`npx convex dev` talks to your **development** deployment. The live site should use a **production** deployment:
```powershell
npx convex deploy          # pushes server code to production
```
The website build uses whichever `VITE_CONVEX_URL` it is given, so the Netlify variable must point at the production deployment.

## Hosting the website

Netlify settings are already in `netlify.toml`: build command `npm run build`, publish folder `dist`, and every path redirects to `index.html` so deep links work. Push to the `main` branch and Netlify builds and publishes.

## Updating the app

Changes are shipped as numbered patch scripts in `patches/`. From the project root in PowerShell:
```powershell
Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batchN.zip" -DestinationPath . -Force
node patches/run-all.cjs --dry      # preview, writes nothing
node patches/run-all.cjs            # apply
npx convex dev --once               # push server code to the dev deployment
npm run build                       # check it builds
git add -A
git commit -m "message"
git push
npx convex deploy                   # production server code, if you use a separate production deployment
```
A patch that has already been applied is skipped, and a patch that cannot find its place stops without writing anything. In the dry run, a patch that builds on the one just before it can report an error because the earlier patch has not been written yet. That is expected; the real run applies them in order.

## Installing the apps on a phone

The teacher app and admin app are installable. On Android and desktop Chrome use **Install app** in the three-dot menu at the bottom of the sidebar. On iPhone use Share, then Add to Home Screen. It only works on the HTTPS site.

## Checking a deployment

1. Sign in as the first admin and open `/admin`. The overview should load.
2. Sign in as another Google account in a private window. It should show the waiting screen, and let in as soon as you approve it under **People**.
3. Add a book, give it to a child, open the parent link in a private window and approve, then give final approval in **Approvals**.

## Backups and data

All data is in Convex. Use the Convex dashboard (**Settings**, **Snapshot export**) to download a backup. The **Activity** page can export the log, loans, reviews, fees, people and books as CSV.

## Troubleshooting

| Problem | Fix |
|---|---|
| Everyone sees the waiting screen, including you | `ADMIN_USER_IDS` is not set on this deployment, or has the wrong ID |
| Sign-in works but data never loads | The Clerk issuer in `convex/auth.config.ts` does not match your Clerk JWT template |
| Type errors about `api.something` | Run `npx convex dev --once` to regenerate `convex/_generated` |
| "Import API is switched off" | Set `IMPORT_API_KEY` (24+ characters) on that deployment |
| A patch stops with "anchor not found" | The file was changed by hand since the patch was written. Send the file and the message |
