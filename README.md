# Bookwise

Book club management for the Madina Central SDA church library.

Teachers lend books to children. The child's parent approves each loan from a link sent on WhatsApp, and an admin gives final approval. Teachers write reviews, admins publish them, and everything that happens is logged.

This file is the starting point for anyone new: a developer taking over the code, an admin setting the app up for the first time, or a teacher who just wants to know how it works. Pick your section from the list below.

## Contents

1. [The apps at a glance](#the-apps-at-a-glance)
2. [Who can do what](#who-can-do-what)
3. [How a loan works](#how-a-loan-works)
4. [For developers: run it on your computer](#for-developers-run-it-on-your-computer)
5. [For the first admin: set the library up](#for-the-first-admin-set-the-library-up)
6. [For teachers: daily use](#for-teachers-daily-use)
7. [For parents](#for-parents)
8. [Adding many books, kids or teachers at once](#adding-many-books-kids-or-teachers-at-once)
9. [Settings and environment variables](#settings-and-environment-variables)
10. [Project layout](#project-layout)
11. [Putting it online and updating it](#putting-it-online-and-updating-it)
12. [Backups](#backups)
13. [Troubleshooting](#troubleshooting)
14. [More documentation](#more-documentation)

## The apps at a glance

Two installable apps share one backend. Both work on phones and can be added to the home screen.

| App | Address | For |
|---|---|---|
| Teacher app | `/dashboard` | Teachers: books, kids, loans, reviews, calendar |
| Admin app | `/admin` | Admins: approvals, people, reports, announcements, fees, settings, import |

Two public pages need no sign-in:

| Page | Address | What it shows |
|---|---|---|
| Parent approval | `/approve/<token>` | The child, the book, the due date and the borrowing policy, with an Approve button |
| Published review | `/review/<token>` | One approved review, with the child's first name and last initial only |

The sign-in page is `/login`. Everyone signs in with Google and chooses **I'm a teacher** or **I'm an admin**.

## Who can do what

| Person | How they get in | What they can do |
|---|---|---|
| Not signed in | Opens a link | Only the two public pages above |
| New sign-in | Signs in with Google | Sees a waiting screen until an admin approves them. The screen updates by itself on approval |
| Denied | An admin denied them | Sees "No access" |
| Teacher | Approved by an admin | The teacher app |
| Admin | Approved as admin by another admin, or listed as a first admin on the server | Everything, including the admin app |

Access is checked on the server, not just hidden in the screens, so a person who is not approved cannot read or change anything even by calling the server directly.

## How a loan works

```
Teacher gives a book to a child
        |
        v
Waiting for the parent   -- parent opens the WhatsApp link and taps Approve
        |
        v
Waiting for the admin    -- admin approves under Approvals
        |
        v
Active                   -- the child has the book
        |
        v
Returned                 -- teacher taps Return (or the admin marks it lost and charges a fee)
```

Rules the server enforces:
- A child under 10 cannot borrow.
- A book with no free copy cannot be given out, so two teachers cannot hand out the last copy.
- A book a teacher added stays unavailable until an admin approves it.

## For developers: run it on your computer

### What you need

- Node.js 20 or newer
- A free [Convex](https://convex.dev) account (database and server functions)
- A free [Clerk](https://clerk.com) account (Google sign-in)
- Windows PowerShell, macOS or Linux terminal. The commands below work in all of them

### Steps

1. Get the code and install it:
   ```powershell
   git clone https://github.com/Jordan-stacksvv/bookwise-admin.git
   cd bookwise-admin
   npm install
   ```
2. Connect Convex. Log in when asked and link or create the project:
   ```powershell
   npx convex dev
   ```
   Leave this window open. It creates the development database, writes `convex/_generated/`, and keeps your server code in sync as you edit.
3. Set up Clerk (one time, in the Clerk dashboard):
   - Open **JWT Templates**, create a template from the **Convex** preset, and copy its **Issuer URL**.
   - Paste the issuer into the `domain` field of `convex/auth.config.ts`.
   - Under **Paths**, set the sign-in URL to `/login` and both the after-sign-in and after-sign-up URLs to `/dashboard`.
   - Turn on the **Google** social connection.
4. Create a file named `.env` in the project root:
   ```
   VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
   VITE_CLERK_PUBLISHABLE_KEY=pk_...
   ```
   The Convex address is printed by `npx convex dev` and shown in the Convex dashboard.
5. Make yourself the first admin. Find your Clerk user ID in the Clerk dashboard under **Users**, then:
   ```powershell
   npx convex env set ADMIN_USER_IDS user_abc123
   ```
6. In a second window, start the website:
   ```powershell
   npm run dev
   ```
   Open <http://localhost:3000>, choose **I'm an admin**, and sign in with the same Google account.
7. Optional demo data: in the Convex dashboard open **Functions**, find `seed:run` and run it. It adds sample books, kids and teachers, and refuses to run if books already exist. Never run it on the live deployment.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the website at <http://localhost:3000> |
| `npx convex dev` | Keeps the development server code in sync (leave running) |
| `npx convex dev --once` | Pushes server code once and regenerates `convex/_generated/` |
| `npm run build` | Builds the website into `dist/` |
| `npm run build:check` | Type-checks, then builds |
| `npm run lint` | Runs ESLint |

The type check reports about 38 older errors, mostly in `convex/vocab.ts`. They do not stop the build.

## For the first admin: set the library up

After you can sign in as an admin, work through this list once.

1. **People.** Ask each teacher to open the site and sign in with Google. They appear under **Waiting for approval**. Choose **Approve as teacher** for each (or tick several and press **Approve selected**). Use **Approve as admin** only for people who should run the library. Only the first admin set on the server cannot be removed from the app.
2. **Settings.** Check the classes (departments), book categories and age ranges. Write the borrowing policy that parents will see. Set the default damage fee and currency.
3. **Books, kids and teachers.** Add them one by one on their pages, or import many from a spreadsheet (see [below](#adding-many-books-kids-or-teachers-at-once)).
4. **Announcements and Class reading.** Optional. Post a notice to all classes or chosen classes, or set a book for a class to read.
5. **Install the apps.** On Android or desktop Chrome use **Install app** in the three-dot menu at the bottom of the sidebar. On iPhone use Share, then Add to Home Screen. This only works on the live HTTPS site.

Day to day, the admin app's sidebar shows a badge on anything waiting for you, and the Overview page has a **Needs your attention** list:

| Page | Use it to |
|---|---|
| Overview | See books out, overdue and missing items, charts, and what needs you |
| Approvals | Give final approval to loans the parent has approved, one by one or many at once |
| Reviews | Publish or decline teachers' reviews, one by one or many at once |
| Books, Kids, Teachers | Manage records. Approve books teachers added |
| Import | Add many books, kids or teachers from a CSV |
| Announcements, Class reading | Post notices and set class reading |
| Birthdays | See this month's birthdays and send the parent wishes on WhatsApp |
| Fees | Charge, mark paid or waive fees for lost or damaged books |
| Activity | See who did what and when. Download CSV exports |
| People | Approve, deny or remove access. Make or remove admins |
| Settings | Classes, categories, policy text, damage fee, book prices |

## For teachers: daily use

1. Open the site, choose **I'm a teacher**, and sign in with Google. If you see the waiting screen, an admin has to approve you first.
2. **Give a book out.** On **Books**, tap the give icon on the book, choose the child and a due date. A prompt then lets you send the parent the approval link on WhatsApp. WhatsApp opens with the message ready, and you tap send.
3. **Track it.** The **Dashboard** lists active loans with due dates. Overdue loans are marked. **Approvals** in the menu shows where each loan stands.
4. **Take it back.** Tap **Return** on the loan.
5. **Write a review.** Tap **Review** on an active loan. Type the comments, optionally add a photo of the handwritten review, and send. The admin publishes it. Once it is published you can copy its link or share it on WhatsApp. Check photos first, because a child may have written their full name on the paper.
6. **Add a book.** Use **Add Book** on **Books**. It shows a Pending label and cannot be given out until an admin approves it. If it is declined, the reason is shown, and editing it sends it again.
7. **Other pages.** Kids, Departments, Teachers, Calendar (due dates and birthdays) and Reviews.

The full walk-through with every screen is in [docs/USER-GUIDE.md](docs/USER-GUIDE.md).

## For parents

You will receive a WhatsApp message from the teacher with a link. Open it, check the child, the book and the due date, read the borrowing policy, type your name and tap **Approve**. You do not need an account.

## Adding many books, kids or teachers at once

1. Open **Import** in the admin app and choose **Books**, **Kids** or **Teachers**.
2. Press **Template** to download a CSV with the right column names. Fill it in Excel and save it as CSV. You can also paste rows into the box.
3. Press **Choose CSV file**. The first row must be the column names. Commas, semicolons and tabs all work.
4. Press **Check**. Nothing is saved yet. You see how many rows will be added, which are skipped because they already exist, and which have problems, with their row numbers.
5. Press **Import**. Up to 1,000 rows at a time.

Scripts can do the same through a secured HTTP endpoint (`POST /import/books`, `/import/kids`, `/import/teachers`). It is switched off until you set a key:

```powershell
npx convex env set IMPORT_API_KEY <a random string of 24 or more characters>
```

Full column lists, request examples in PowerShell and curl, and the response format are in [docs/IMPORT-API.md](docs/IMPORT-API.md).

## Settings and environment variables

| Variable | Where to set it | Purpose |
|---|---|---|
| `VITE_CONVEX_URL` | `.env` and the hosting site | Which Convex deployment the website talks to |
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env` and the hosting site | Clerk public key |
| `ADMIN_USER_IDS` | Convex (`npx convex env set`) | First admin(s) by Clerk user ID, comma separated |
| `ADMIN_EMAILS` | Convex, optional | Admins by verified email. Only works if the Clerk token carries a verified email |
| `IMPORT_API_KEY` | Convex, optional | Turns on the HTTP import endpoint |

Convex variables belong to one deployment. Set them separately for development and production (add `--prod` for production). Do not put secrets in the repository.

## Project layout

| Path | What is in it |
|---|---|
| `convex/` | The server: database schema, queries, mutations, HTTP endpoint |
| `convex/schema.ts` | Every table and index |
| `convex/secure.ts`, `access.ts`, `adminAuth.ts` | Who is calling, and whether they may |
| `convex/loans.ts`, `reviews.ts`, `books.ts`, `kids.ts`, `teachers.ts` | The main business rules |
| `convex/imports.ts`, `http.ts` | Batch import and its HTTP endpoint |
| `src/routes/` | One file per page. `_authenticated/` is the teacher app, `admin/` is the admin app |
| `src/components/` | Screens' building blocks: `admin/` (teacher side and shared), `admin-app/` (admin side), `ui/` (shadcn/ui) |
| `src/lib/mock-store.ts` | `useStore()` and `useApi()`, the one door the screens use to reach data. The name is historical: it is real Convex data |
| `src/styles.css` | Colours, fonts and radius for the whole app |
| `src/assets/logo.png` | The church logo |
| `public/` | App icons, manifests and the service worker |
| `docs/` | The detailed documentation |
| `patches/` | The numbered patch scripts used to ship changes |

Built with React 19, TypeScript, Vite, TanStack Router, Tailwind CSS 4, shadcn/ui, Convex and Clerk.

## Putting it online and updating it

The website is hosted on Netlify (or Vercel). `netlify.toml` already has the build command, the `dist` publish folder, and the redirect that makes deep links work.

1. Create a **production** Convex deployment and push the server code to it:
   ```powershell
   npx convex deploy
   ```
2. Set `VITE_CONVEX_URL` (pointing at the production deployment) and `VITE_CLERK_PUBLISHABLE_KEY` in the hosting site's environment variables.
3. Set `ADMIN_USER_IDS` on the production Convex deployment: `npx convex env set ADMIN_USER_IDS user_abc123 --prod`.
4. Push to the `main` branch. The host builds and publishes it.

### Applying a patch batch

Changes arrive as a zip of numbered patch scripts. From the project root in PowerShell:

```powershell
Expand-Archive -Path "$HOME\Downloads\bookwise-patches-batchN.zip" -DestinationPath . -Force
node patches/run-all.cjs --dry      # preview only, writes nothing
node patches/run-all.cjs            # apply
npx convex dev --once               # push server code to the dev deployment
npm run build                       # check that it builds
git add -A
git commit -m "describe the change"
git push
npx convex deploy                   # only if you use a separate production deployment
```

A patch that was already applied is skipped, and a patch that cannot find its place stops without writing anything. In the dry run, a patch that builds on the one just before it can report an error because the earlier one has not been written yet. That is expected, and the real run applies them in order.

## Backups

All data lives in Convex. In the Convex dashboard open **Settings** and use **Snapshot export** to download a full backup. The admin **Activity** page can also export the activity log, loans, reviews, fees, people and books as CSV. Those files contain children's names and parents' phone numbers, so keep them private.

## Troubleshooting

| Problem | What to do |
|---|---|
| Everyone sees the waiting screen, including you | `ADMIN_USER_IDS` is missing or wrong on this deployment. Set it with your Clerk user ID |
| You can sign in but no data loads | The Clerk issuer in `convex/auth.config.ts` does not match your Clerk JWT template for Convex |
| Type errors about `api.something` | Run `npx convex dev --once` to regenerate `convex/_generated/` |
| The site shows old data or a blank page after a deploy | Check that `VITE_CONVEX_URL` on the host points at the right deployment, then redeploy |
| "Import API is switched off" | Set `IMPORT_API_KEY` (24 or more characters) on that deployment |
| Import says rows were skipped | Those books, kids or teachers already exist. Check the row list for the reason |
| A patch stops with "anchor not found" | A file was edited by hand after the patch was written. Send the file and the message |
| The install button is missing | Installing only works on the live HTTPS site. On iPhone use Share, then Add to Home Screen |
| A teacher cannot give out a book | The child is under 10, the book has no free copy, or the book is still waiting for admin approval |

## More documentation

| Document | What is in it |
|---|---|
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | How teachers, admins and parents use every screen |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Setup, environment variables, first admin, deploying, updating |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it is built: folders, sign-in and roles, loan and review flows |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Every database table and field |
| [docs/IMPORT-API.md](docs/IMPORT-API.md) | Batch import: the admin page and the HTTP endpoint |
