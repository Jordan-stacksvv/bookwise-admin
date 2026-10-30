"use strict";
/**
 * 15 - Visual polish for the teacher and admin apps
 * - Neutral, flat look: one navy accent, white sidebar, hairline borders, no shadows, Inter only.
 * - Replaces the clip-art logo (and app icons) with a plain mark.
 * - Removes the greeting, the marketing panel, emojis and explanatory sub-headings and helper lines.
 * - Phone fixes: book actions stay on screen, one "Needs your attention" list on the admin overview.
 */
const path = require("path");
const { load, replaceOnce, create, copyAsset, exists, run } = require("./_lib.cjs");
const { createFrom, L } = require("./_files.cjs");

const DIR = "files15";
const ASSETS = path.join(__dirname, "assets15");

function between(f, start, end, repl, label) {
  const s = f.text.indexOf(start);
  if (s < 0 || f.text.indexOf(start, s + 1) >= 0) throw new Error(`${f.rel}: could not find a single "${label}" start`);
  const e = f.text.indexOf(end, s);
  if (e < 0) throw new Error(`${f.rel}: could not find the end of "${label}"`);
  replaceOnce(f, f.text.slice(s, e + end.length), repl, label);
}

/** Regex replace that must hit exactly `count` times. */
function sub(f, re, repl, count, label) {
  const hits = f.text.match(re)?.length ?? 0;
  if (hits !== count) throw new Error(`${f.rel}: expected ${count} match(es) for "${label}", found ${hits}`);
  f.text = f.text.replace(re, repl);
}

run("15 polish", () => {
  if (exists("src/components/Logo.tsx")) return "skip";

  createFrom(DIR, "src/components/Logo.tsx");
  createFrom(DIR, "src/components/admin-app/NeedsAttention.tsx");
  for (const [from, to] of [
    ["favicon.png", "public/favicon.png"],
    ["icon-192.png", "public/icons/icon-192.png"],
    ["icon-512.png", "public/icons/icon-512.png"],
    ["maskable-512.png", "public/icons/maskable-512.png"],
    ["apple-touch-icon.png", "public/icons/apple-touch-icon.png"],
    ["admin-192.png", "public/icons/admin-192.png"],
    ["admin-512.png", "public/icons/admin-512.png"],
    ["admin-maskable-512.png", "public/icons/admin-maskable-512.png"],
    ["admin-apple-touch-icon.png", "public/icons/admin-apple-touch-icon.png"],
  ]) copyAsset(path.join(ASSETS, from), to);

  // ---------------------------------------------------------------- look: tokens + font
  const css = load("src/styles.css");
  replaceOnce(css, '@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap");\n\n', "", "css font import");
  replaceOnce(css, '  --font-display: "Fraunces", Georgia, serif;', '  --font-display: "Inter", system-ui, sans-serif;', "css display font");
  between(
    css,
    ":root {\n  --radius: 0.75rem;",
    "  --shadow-elevated: 0 8px 30px oklch(0.22 0.04 250 / 0.1);\n}\n",
    `:root {
  --radius: 0.5rem;
  --background: oklch(0.985 0.003 250);
  --foreground: oklch(0.2 0.02 258);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0.02 258);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2 0.02 258);
  --primary: oklch(0.3 0.07 256);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.96 0.004 250);
  --secondary-foreground: oklch(0.3 0.07 256);
  --muted: oklch(0.96 0.004 250);
  --muted-foreground: oklch(0.5 0.02 256);
  --accent: oklch(0.955 0.006 250);
  --accent-foreground: oklch(0.2 0.02 258);
  --destructive: oklch(0.55 0.21 27);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.915 0.006 250);
  --input: oklch(0.9 0.008 250);
  --ring: oklch(0.5 0.1 256);
  --chart-1: oklch(0.3 0.07 256);
  --chart-2: oklch(0.52 0.11 252);
  --chart-3: oklch(0.6 0.12 150);
  --chart-4: oklch(0.65 0.15 60);
  --chart-5: oklch(0.55 0.18 20);
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.32 0.02 258);
  --sidebar-primary: oklch(0.955 0.012 256);
  --sidebar-primary-foreground: oklch(0.3 0.07 256);
  --sidebar-accent: oklch(0.965 0.005 250);
  --sidebar-accent-foreground: oklch(0.2 0.02 258);
  --sidebar-border: oklch(0.915 0.006 250);
  --sidebar-ring: oklch(0.5 0.1 256);
  --shadow-soft: 0 1px 2px oklch(0.2 0.02 258 / 0.05);
  --shadow-elevated: 0 4px 16px oklch(0.2 0.02 258 / 0.08);
}
`,
    "css root tokens",
  );
  replaceOnce(css, "    letter-spacing: -0.02em;", "    letter-spacing: -0.01em;", "css heading tracking");

  replaceOnce(
    load("index.html"),
    '    <link rel="icon" type="image/png" href="/favicon.png" />',
    L(
      '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
      '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />',
      '    <link rel="icon" type="image/png" href="/favicon.png" />',
    ),
    "html fonts",
  );

  // ---------------------------------------------------------------- logo -> plain mark
  for (const [rel, n] of [
    ["src/components/admin-app/AdminShell.tsx", 2],
    ["src/components/admin/AppSidebar.tsx", 2],
    ["src/components/admin/AccessGate.tsx", 1],
    ["src/routes/login.tsx", 2],
    ["src/routes/approve.$token.tsx", 1],
    ["src/routes/admin.tsx", 1],
    ["src/routes/review.$token.tsx", 1],
  ]) {
    const f = load(rel);
    replaceOnce(f, 'import logo from "@/assets/logo.png";', 'import { Logo } from "@/components/Logo";', `${rel} logo import`);
    f.text = f.text.replace(/<img src=\{logo\}[^>]*?width=\{(\d+)\}[^>]*?\/>/g, (_m, w) => `<Logo size={${w}} />`);
    if ((f.text.match(/<Logo size=/g) ?? []).length !== n) throw new Error(`${rel}: expected ${n} logo image(s)`);
  }

  // ---------------------------------------------------------------- sidebars: border, no shadow
  for (const rel of ["src/components/admin-app/AdminShell.tsx", "src/components/admin/AppSidebar.tsx"]) {
    const f = load(rel);
    replaceOnce(f, "flex-col bg-sidebar text-sidebar-foreground h-[100dvh] sticky top-0", "flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-[100dvh] sticky top-0", `${rel} aside`);
    replaceOnce(f, "text-sidebar-primary-foreground font-medium shadow-sm", "text-sidebar-primary-foreground font-medium", `${rel} active`);
  }

  // ---------------------------------------------------------------- page header + sub-headings
  create(
    "src/components/admin/PageHeader.tsx",
    `import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground break-words">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
`,
    { overwrite: true },
  );
  for (const rel of [
    "src/routes/admin/activity.tsx", "src/routes/admin/birthdays.tsx", "src/routes/admin/people.tsx", "src/routes/admin/reading.tsx",
    "src/routes/admin/settings.tsx", "src/routes/admin/announcements.tsx", "src/routes/admin/approvals.tsx", "src/routes/admin/reviews.tsx",
    "src/routes/admin/fees.tsx", "src/routes/admin/index.tsx", "src/routes/admin/profile.tsx",
    "src/routes/_authenticated/kids.tsx", "src/routes/_authenticated/books.tsx", "src/routes/_authenticated/calendar.tsx",
    "src/routes/_authenticated/departments.tsx", "src/routes/_authenticated/teachers.tsx", "src/routes/_authenticated/approvals.tsx",
    "src/routes/_authenticated/reviews.tsx", "src/routes/_authenticated/profile.tsx",
  ]) sub(load(rel), /\s*subtitle=(?:"[^"]*"|\{`[^`]*`\})/g, "", 1, `${rel} subtitle`);

  // ---------------------------------------------------------------- dashboard: no greeting, plain stat cards
  const dash = load("src/routes/_authenticated/dashboard.tsx");
  between(dash, "const MORNING = [", "  return list[day % list.length];\n}\n\n", "", "dash greetings");
  replaceOnce(dash, "  const [greeting, setGreeting] = useState(pickGreeting);\n", "", "dash greeting state");
  replaceOnce(dash, "      setGreeting(pickGreeting());\n", "", "dash greeting tick");
  between(
    dash,
    "  const subtitle =\n    overdue > 0",
    '    hour: "numeric", minute: "2-digit",\n  });\n',
    L(
      "  const timeLabel = [",
      '    now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),',
      '    overdue > 0 && `${overdue} overdue`,',
      '    dueToday > 0 && `${dueToday} due today`,',
      '  ].filter(Boolean).join(" · ");',
    ),
    "dash subtitle",
  );
  replaceOnce(dash, "        title={`${greeting}!`}\n        subtitle={`${timeLabel} · ${subtitle}`}", '        title="Dashboard"\n        subtitle={timeLabel}', "dash header");
  between(
    dash,
    '            <div className="flex items-center justify-between mb-2 sm:mb-3">',
    '            <p className="text-2xl sm:text-3xl font-display font-semibold">{st.value}</p>\n',
    L(
      '            <p className="text-xs sm:text-sm text-muted-foreground">{st.label}</p>',
      '            <p className={`mt-1 text-2xl sm:text-3xl font-semibold tabular-nums ${st.tone === "destructive" && st.value > 0 ? "text-destructive" : ""}`}>{st.value}</p>',
    ),
    "dash stat card",
  );
  replaceOnce(dash, 'className="bg-card rounded-xl p-4 sm:p-5 border hover:border-primary/40 transition-colors"', 'className="bg-card rounded-xl p-4 border hover:border-primary/40 transition-colors last:col-span-2 sm:last:col-span-1"', "dash stat card box");

  // ---------------------------------------------------------------- accent was gold; now neutral, so name the colours
  const GOOD = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  const PRIMARY = "bg-primary/10 text-primary";
  const kp = load("src/routes/_authenticated/kids.tsx");
  const bk = load("src/routes/_authenticated/books.tsx");
  const cal = load("src/routes/_authenticated/calendar.tsx");
  for (const f of [kp, bk, cal]) f.text = f.text.replace(/bg-accent\/20 text-accent-foreground/g, GOOD);
  dash.text = dash.text
    .split("\n")
    .map((l) => (l.includes("{count}") ? l.replace(/bg-accent\/20 text-accent-foreground/g, PRIMARY) : l.replace(/bg-accent\/20 text-accent-foreground/g, GOOD)))
    .join("\n");
  replaceOnce(dash, 'className="h-full bg-accent"', 'className="h-full bg-primary"', "dash bar");
  replaceOnce(cal, '"border-accent bg-accent/10"', '"border-primary/50 bg-primary/5"', "cal today cell");
  replaceOnce(cal, 'isToday ? "text-accent-foreground" : ""', 'isToday ? "text-primary" : ""', "cal today text");
  replaceOnce(load("src/routes/_authenticated/teachers.tsx"), "rounded-full bg-accent/30 text-accent-foreground flex items-center justify-center font-display font-semibold", "rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold", "teacher avatar");
  const notices = load("src/components/admin/AdminNotices.tsx");
  replaceOnce(notices, "h-5 w-5 text-accent-foreground", "h-5 w-5 text-primary", "notices icon");
  replaceOnce(notices, "by {new Date(r.dueDate).toLocaleDateString()}", 'by {new Date(r.dueDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })}', "notices date");

  // ---------------------------------------------------------------- emojis
  replaceOnce(load("src/routes/admin/birthdays.tsx"), '{kid.name}{isToday ? " \u{1F382}" : ""}', '{kid.name}{isToday ? " (today)" : ""}', "birthday emoji");
  replaceOnce(load("src/routes/admin/index.tsx"), "Nothing overdue. \u{1F389}", "Nothing overdue.", "overdue emoji");
  replaceOnce(cal, "All caught up. \u2728", "All caught up.", "calendar emoji");

  // ---------------------------------------------------------------- helper text that only explains the obvious
  replaceOnce(load("src/components/admin-app/ExportPanel.tsx"), "These files contain children's full names and parents' phone numbers. Keep them private.", "Contains children's names and parents' phone numbers.", "export note");
  replaceOnce(load("src/components/admin-app/PeoplePanel.tsx"), '              <p className="text-xs text-muted-foreground mt-1.5">They can sign in and use the app now. Give them a class later on the Teachers page.</p>\n', "", "people helper");
  replaceOnce(load("src/components/admin/SidebarProfile.tsx"), "To install: tap Share, then Add to Home Screen.", "Tap Share, then Add to Home Screen.", "sidebar ios hint");
  replaceOnce(load("src/components/admin/ProfileCard.tsx"), "To install: tap Share, then Add to Home Screen.", "Tap Share, then Add to Home Screen.", "profile ios hint");
  const brd = load("src/components/admin/BookReviewsDialog.tsx");
  replaceOnce(brd, '{rows.length === 0 ? "Nothing published yet." : `${rows.length} approved review${rows.length === 1 ? "" : "s"}.`}', '{rows.length > 0 ? `${rows.length} review${rows.length === 1 ? "" : "s"}` : null}', "reviews dialog count");
  replaceOnce(brd, "When a teacher adds a review and the admin approves it, it shows up here.", "No reviews yet.", "reviews dialog empty");
  const rd = load("src/components/admin/ReviewDialog.tsx");
  replaceOnce(rd, "The admin will check it. Once approved, it shows under the book for everyone to read.", "The admin will review it before it is published.", "review sent text");
  replaceOnce(rd, "The admin checks every review before it is published. Make sure the photo does not show the child's full name.", "The admin checks reviews before they are published. Avoid full names in photos.", "review note");
  replaceOnce(load("src/routes/admin/approvals.tsx"), "The copy goes back on the shelf. You can add a reason for the teacher.", "The copy goes back on the shelf.", "decline loan text");
  replaceOnce(load("src/routes/admin/reviews.tsx"), "It will not be public. A published link stops working. Add a reason for the teacher (optional).", "Add a reason for the teacher (optional).", "decline review text");
  replaceOnce(bk, '          {!editing && !isAdmin && <p className="text-sm text-muted-foreground -mt-1">New books are checked by the admin before they can be given out.</p>}\n', "", "books add note");
  replaceOnce(bk, '<p className="text-xs text-muted-foreground">Items currently used by a book, kid, or teacher cannot be deleted.</p>', "", "books delete note");
  replaceOnce(load("src/routes/admin/fees.tsx"), '        <p className="text-xs text-muted-foreground mt-3">To mark a book <b>lost</b>, use "Mark lost" on the Overview page (overdue list).</p>\n', "", "fees note");
  replaceOnce(load("src/routes/admin/activity.tsx"), "More lines exist. Narrow the dates, or use Export for up to 5,000.", "Showing the latest 2,000. Narrow the dates to see more.", "activity more");

  // ---------------------------------------------------------------- sign-in: plain, centred, no marketing panel
  const login = load("src/routes/login.tsx");
  replaceOnce(login, 'border: "1px solid #e4dfd2"', 'border: "1px solid #e2e8f0"', "clerk border");
  replaceOnce(login, 'borderRadius: "0.75rem"', 'borderRadius: "0.5rem"', "clerk radius");
  replaceOnce(login, "rounded-2xl border bg-card p-4 sm:p-5 transition hover:border-primary hover:shadow-md focus:outline-none", "rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:bg-muted/40 focus:outline-none", "role card");
  replaceOnce(login, "h-12 w-12 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition", "h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition", "role icon box");
  replaceOnce(login, '<Icon className="h-6 w-6" />', '<Icon className="h-5 w-5" />', "role icon");
  replaceOnce(login, '<span className="block font-display text-lg font-semibold">{title}</span>', '<span className="block text-base font-semibold">{title}</span>', "role title");
  replaceOnce(login, '          <p className="text-sm text-muted-foreground mt-1">Choose how you want to use the book club.</p>\n', "", "login choose text");
  replaceOnce(login, 'text="Assign books, track reading and manage kids."', 'text="Books, kids and reviews"', "login teacher text");
  replaceOnce(login, 'text="Approvals, analytics, announcements and fees."', 'text="Approvals, reports and settings"', "login admin text");
  replaceOnce(login, '{mode === "signin" ? "Sign in to continue." : role === "admin" ? "An existing admin will approve your access." : "It only takes a minute."}', '{mode === "signin" ? "Sign in to continue." : "An admin approves new accounts."}', "login sub text");
  const lp = login.text.indexOf('  return (\n    <div className="min-h-screen grid lg:grid-cols-2 bg-background">');
  if (lp < 0) throw new Error("login: layout start not found");
  login.text =
    login.text.slice(0, lp) +
    `  return (
    <div className="min-h-screen flex flex-col bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="px-6 pt-6 flex items-center gap-3">
        <Logo size={36} />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Madina Central</p>
          <p className="text-xs text-muted-foreground">SDA Book Club</p>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-8">{body}</main>
      <AppFooter />
    </div>
  );
}
`;

  // ---------------------------------------------------------------- admin overview: one list instead of three coloured banners
  const idx = load("src/routes/admin/index.tsx");
  between(idx, '      {d.waitingAdmin > 0 && (\n        <Link to="/admin/approvals"', "      <PeopleWaiting />\n", "      <NeedsAttention loans={d.waitingAdmin} />\n", "admin attention");
  sub(idx, /import \{ PeopleWaiting \} from "[^"]+";/g, 'import { NeedsAttention } from "@/components/admin-app/NeedsAttention";', 1, "admin attention import");

  const bday = load("src/components/admin/BirthdayCard.tsx");
  replaceOnce(bday, '      <div className="flex items-center justify-between mb-4">', '      <div className="flex items-center justify-between gap-3 mb-4">', "birthday header");
  replaceOnce(bday, '<h3 className="font-display text-lg font-semibold flex items-center gap-2">', '<h3 className="text-base font-semibold flex items-center gap-2 min-w-0">', "birthday title");
  replaceOnce(bday, '<Cake className="h-5 w-5 text-pink-500" />', '<Cake className="h-4 w-4 text-muted-foreground shrink-0" />', "birthday icon");
  replaceOnce(bday, '<span className="text-xs font-normal text-muted-foreground">({all.length})</span>', '<span className="text-xs font-normal text-muted-foreground whitespace-nowrap">({all.length})</span>', "birthday count");
  replaceOnce(bday, 'className="text-sm text-muted-foreground hover:text-foreground">Calendar', 'className="text-sm text-muted-foreground hover:text-foreground shrink-0 whitespace-nowrap">Calendar', "birthday link");

  // ---------------------------------------------------------------- books table: keep the action buttons on screen on a phone
  replaceOnce(bk, '<table className="w-full text-sm min-w-160">', '<table className="w-full text-sm">', "books table width");
  replaceOnce(bk, '  const isAdmin = useAdmin().status === "admin";', L('  const isAdmin = useAdmin().status === "admin";', "  const hasCovers = s.books.some((b) => b.coverUrl);"), "books hasCovers");
  replaceOnce(bk, '<th className="px-3 sm:px-4 py-3 font-medium w-14">Cover</th>', '<th className={`px-3 sm:px-4 py-3 font-medium w-14 ${hasCovers ? "hidden sm:table-cell" : "hidden"}`}>Cover</th>', "books cover th");
  replaceOnce(
    bk,
    L('                    <td className="px-3 sm:px-4 py-3">', '                      <div className="flex items-center gap-2">', '                        <div className="min-w-0">'),
    L('                    <td className="px-3 sm:px-4 py-3 w-full max-w-0 sm:w-auto sm:max-w-none">', '                      <div className="flex items-center gap-2">', '                        <div className="min-w-0">'),
    "books title td",
  );
  replaceOnce(bk, '<th className="px-3 sm:px-4 py-3 font-medium">Copies</th>', '<th className="px-3 sm:px-4 py-3 font-medium hidden sm:table-cell">Copies</th>', "books copies th");
  replaceOnce(bk, '<th className="px-3 sm:px-4 py-3 font-medium">Status</th>', '<th className="px-3 sm:px-4 py-3 font-medium hidden sm:table-cell">Status</th>', "books status th");
  replaceOnce(
    bk,
    L('                    <td className="px-3 sm:px-4 py-3">', '                      <div className="h-12 w-9 rounded-md bg-muted'),
    L('                    <td className={`px-3 sm:px-4 py-3 ${hasCovers ? "hidden sm:table-cell" : "hidden"}`}>', '                      <div className="h-12 w-9 rounded-md bg-muted'),
    "books cover td",
  );
  replaceOnce(
    bk,
    L('                    <td className="px-3 sm:px-4 py-3 text-muted-foreground">', '                      <span className="tabular-nums">{avail}/{b.copies}</span>'),
    L('                    <td className="px-3 sm:px-4 py-3 text-muted-foreground hidden sm:table-cell">', '                      <span className="tabular-nums">{avail}/{b.copies}</span>'),
    "books copies td",
  );
  between(
    bk,
    '                    <td className="px-3 sm:px-4 py-3">\n                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap',
    "                    </td>\n",
    L(
      '                    <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">',
      '                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${b.status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : b.status === "rejected" ? "bg-destructive/10 text-destructive" : avail > 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>',
      '                        {b.status === "pending" ? "Pending" : b.status === "rejected" ? "Declined" : avail > 0 ? "Available" : "All out"}',
      "                      </span>",
      "                    </td>",
      "",
    ),
    "books status td",
  );
  replaceOnce(
    bk,
    '. Edit it to send it again.</p>}\n',
    L('. Edit it to send it again.</p>}', '                          {(!b.status || b.status === "approved") && <p className="sm:hidden text-xs text-muted-foreground">{avail}/{b.copies} available</p>}', ""),
    "books mobile meta",
  );
  replaceOnce(bk, 'variant="ghost" className="relative" aria-label="Reviews" onClick={() => setReviewsFor(b)}>', 'variant="ghost" className="relative h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3" aria-label="Reviews" title="Reviews" onClick={() => setReviewsFor(b)}>', "books reviews title");
  replaceOnce(bk, '<Button size="sm" variant="ghost" disabled={avail === 0 || b.status === "pending" || b.status === "rejected"} onClick', '<Button size="sm" variant="ghost" className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3" title="Give to a kid" aria-label="Give to a kid" disabled={avail === 0 || b.status === "pending" || b.status === "rejected"} onClick', "books assign title");
  replaceOnce(bk, '<Button size="sm" variant="ghost" onClick={() => openEdit(b)}>', '<Button size="sm" variant="ghost" className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3" title="Edit" aria-label="Edit" onClick={() => openEdit(b)}>', "books edit title");
  replaceOnce(bk, '<Button size="sm" variant="ghost" onClick={() => api.deleteBook(b.id)}>', '<Button size="sm" variant="ghost" className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3" title="Delete" aria-label="Delete" onClick={() => { if (window.confirm(`Delete "${b.title}"? Its loans are deleted too.`)) api.deleteBook(b.id); }}>', "books delete confirm");
});
