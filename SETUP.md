# Bookwise Admin — Setup Checklist

## 1. Install dependencies

```bash
npm install
```

## 2. Connect Convex

```bash
npx convex dev
```
- This will prompt you to log in and link to your `mild-gnat-551` deployment.
- It generates `convex/_generated/` (api.ts, dataModel.ts, server.ts).
- Leave it running — it watches for schema/function changes.

## 3. Clerk JWT Template (one-time, in Clerk dashboard)

1. Go to **Clerk Dashboard → JWT Templates**
2. Click **New template → Convex** (preset)
3. Copy the **Issuer URL** (looks like `https://clerk.wired-tick-78.accounts.dev`)
4. Paste it into `convex/auth.config.ts` → `domain` field

## 4. Seed demo data (optional)

After `npx convex dev` is running:
1. Open **Convex Dashboard → mild-gnat-551 → Functions**
2. Find `seed → run`
3. Click **Run** — this populates books, kids, teachers, and assignments

## 5. Set CLERK_SECRET_KEY for server-side auth

Add to your hosting platform (Vercel/Netlify) as a **secret env var** — never commit it:
```
CLERK_SECRET_KEY=sk_test_...your_rotated_key...
```

## 6. Allowed redirect URLs in Clerk

In **Clerk Dashboard → Paths**:
- Sign-in URL: `/login`
- After sign-in: `/dashboard`
- After sign-up: `/dashboard`

## Environment variables summary

| Variable | Where | Safe to commit? |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env` | ✅ Yes |
| `VITE_CONVEX_URL` | `.env` | ✅ Yes |
| `CLERK_SECRET_KEY` | Hosting secrets only | ❌ Never |
