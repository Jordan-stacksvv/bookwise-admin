# Bookwise

Book club management for the Madina Central SDA church. Teachers lend books to children, parents approve each loan from a link, and an admin gives final approval, publishes reviews and keeps an eye on everything.

Two installable apps share one backend:

| App | Address | For |
|---|---|---|
| Teacher app | `/dashboard` | Teachers: books, kids, loans, reviews |
| Admin app | `/admin` | Admins: approvals, people, reports, settings, import |

Two public pages need no sign-in: the parent approval page (`/approve/<token>`) and a published review (`/review/<token>`).

## What it does

- **Lending with approvals.** A teacher gives a book to a child. The parent approves from a link sent by WhatsApp, then an admin gives final approval. Children under 10 cannot borrow.
- **Book reviews.** A teacher adds a review (comments and an optional photo of the handwritten review). The admin publishes it. Published reviews show on the book and have a public link that shows only the child's first name and last initial.
- **Sign-in with approval.** Anyone can sign in with Google, but they only see a waiting screen until an admin approves them. Teachers can be approved before they have a class.
- **Admin tools.** Analytics, announcements per class, a book set for a class to read, birthdays, fees for lost or damaged books, an activity log, CSV exports, and batch import.
- **Works on phones.** Both apps install to the home screen.

## Stack

React 19, TypeScript, Vite, TanStack Router, Tailwind CSS 4, shadcn/ui, Convex (database and server functions), Clerk (sign-in), hosted on Netlify.

## Run it

```powershell
npm install
npx convex dev          # leave running: creates the dev database and keeps the server code in sync
npm run dev             # http://localhost:3000
```

You need a `.env` with `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY`. Full setup, including the first admin, is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

| Document | What is in it |
|---|---|
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | How teachers, admins and parents use the app |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Setup, environment variables, first admin, deploying, updating |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it is built: folders, sign-in and roles, loan and review flows |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Every database table and field |
| [docs/IMPORT-API.md](docs/IMPORT-API.md) | Batch import (admin page and HTTP endpoint) |
