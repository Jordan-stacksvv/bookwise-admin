"use strict";
/**
 * 17 - Bring back the original look (colours, fonts, logo, icons), keep the cleanup
 * Restores: cream background, navy sidebar, gold accent, Fraunces headings, the church logo,
 *           the app icons, coloured stat chips, the navy panel on the sign-in page.
 * Keeps:    no greetings, no emojis, no helper text, phone layout fixes, "Needs your attention",
 *           delete confirmation, batch import.
 */
const fs = require("fs");
const path = require("path");
const { load, replaceOnce, copyAsset, exists, has, run } = require("./_lib.cjs");
const { overwriteFrom, L } = require("./_files.cjs");

const DIR = "files17";
const ASSETS = path.join(__dirname, "assets17");

/** Replace the text from `start` through `end` (both must be unique) with `repl`. */
function between(f, start, end, repl, label) {
  const s = f.text.indexOf(start);
  if (s < 0 || f.text.indexOf(start, s + 1) >= 0) throw new Error(`${f.rel}: could not find a single "${label}" start`);
  const e = f.text.indexOf(end, s);
  if (e < 0) throw new Error(`${f.rel}: could not find the end of "${label}"`);
  replaceOnce(f, f.text.slice(s, e + end.length), repl, label);
}

run("17 restore look", () => {
  const logoFile = load("src/components/Logo.tsx");
  if (has(logoFile, "@/assets/logo.png")) return "skip";

  // ---------------------------------------------------------------- logo + icons
  overwriteFrom(DIR, "src/components/Logo.tsx");
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

  // ---------------------------------------------------------------- colours and fonts
  const css = load("src/styles.css");
  replaceOnce(
    css,
    "@custom-variant dark (&:is(.dark *));\n\n",
    '@custom-variant dark (&:is(.dark *));\n\n@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap");\n\n',
    "css font import"
  );
  replaceOnce(css, '  --font-display: "Inter", system-ui, sans-serif;', '  --font-display: "Fraunces", Georgia, serif;', "css display font");
  between(
    css,
    ":root {\n  --radius: 0.5rem;",
    "  --shadow-elevated: 0 4px 16px oklch(0.2 0.02 258 / 0.08);\n}\n",
    fs.readFileSync(path.join(__dirname, DIR, "styles-root.css"), "utf8").replace(/\r\n/g, "\n"),
    "css :root block"
  );
  replaceOnce(css, "letter-spacing: -0.01em;", "letter-spacing: -0.02em;", "css heading spacing");

  const html = load("index.html");
  replaceOnce(
    html,
    L(
      '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
      '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />',
      ""
    ),
    "",
    "index.html font links"
  );

  // ---------------------------------------------------------------- logo in every place
  const shell = load("src/components/admin-app/AdminShell.tsx");
  replaceOnce(shell, "<Logo size={40} />", '<Logo size={40} className="rounded-md bg-white p-1" />', "shell logo 40");
  replaceOnce(shell, "<Logo size={32} />", '<Logo size={32} className="rounded bg-white p-0.5" />', "shell logo 32");
  replaceOnce(
    shell,
    '"bg-sidebar-primary text-sidebar-primary-foreground font-medium" : "hover:bg-sidebar-accent"',
    '"bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" : "hover:bg-sidebar-accent"',
    "shell active item"
  );
  replaceOnce(shell, "bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-[100dvh]", "bg-sidebar text-sidebar-foreground h-[100dvh]", "shell border");

  const side = load("src/components/admin/AppSidebar.tsx");
  replaceOnce(side, "<Logo size={40} />", '<Logo size={40} alt="SDA" className="rounded-md bg-white p-1" />', "sidebar logo 40");
  replaceOnce(side, "<Logo size={32} />", '<Logo size={32} alt="SDA" className="rounded bg-white p-0.5" />', "sidebar logo 32");
  replaceOnce(
    side,
    '"bg-sidebar-primary text-sidebar-primary-foreground font-medium"\n',
    '"bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"\n',
    "sidebar active item"
  );
  replaceOnce(side, "bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-[100dvh]", "bg-sidebar text-sidebar-foreground h-[100dvh]", "sidebar border");

  replaceOnce(load("src/components/admin/AccessGate.tsx"), "<Logo size={44} />", '<Logo size={44} className="rounded-lg" />', "gate logo");
  replaceOnce(load("src/routes/admin.tsx"), "<Logo size={44} />", '<Logo size={44} className="rounded-lg" />', "admin logo");

  // ---------------------------------------------------------------- page header
  const ph = load("src/components/admin/PageHeader.tsx");
  replaceOnce(ph, "sm:items-center sm:justify-between gap-3 mb-6", "sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8", "header spacing");
  replaceOnce(
    ph,
    "text-xl sm:text-2xl font-semibold tracking-tight text-foreground break-words",
    "text-2xl sm:text-3xl font-display font-semibold text-foreground break-words",
    "header title"
  );
  replaceOnce(ph, 'className="mt-0.5 text-sm text-muted-foreground"', 'className="mt-1 text-sm text-muted-foreground"', "header subtitle");

  // ---------------------------------------------------------------- small components
  replaceOnce(load("src/components/admin/AdminNotices.tsx"), '<Megaphone className="h-5 w-5 text-primary" />', '<Megaphone className="h-5 w-5 text-accent-foreground" />', "notices icon");

  const bd = load("src/components/admin/BirthdayCard.tsx");
  replaceOnce(bd, '<h3 className="text-base font-semibold flex items-center gap-2 min-w-0">', '<h3 className="font-display text-lg font-semibold flex items-center gap-2 min-w-0">', "birthday title");
  replaceOnce(bd, '<Cake className="h-4 w-4 text-muted-foreground shrink-0" />', '<Cake className="h-5 w-5 text-pink-500 shrink-0" />', "birthday icon");

  // ---------------------------------------------------------------- dashboard
  const dash = load("src/routes/_authenticated/dashboard.tsx");
  replaceOnce(
    dash,
    '"bg-card rounded-xl p-4 border hover:border-primary/40 transition-colors last:col-span-2 sm:last:col-span-1"',
    '"bg-card rounded-xl p-4 sm:p-5 border hover:border-primary/40 transition-colors last:col-span-2 sm:last:col-span-1"',
    "stat card padding"
  );
  replaceOnce(
    dash,
    L(
      '            <p className="text-xs sm:text-sm text-muted-foreground">{st.label}</p>',
      '            <p className={`mt-1 text-2xl sm:text-3xl font-semibold tabular-nums ${st.tone === "destructive" && st.value > 0 ? "text-destructive" : ""}`}>{st.value}</p>          </Link>'
    ),
    L(
      '            <div className="flex items-center justify-between mb-2 sm:mb-3">',
      '              <p className="text-xs sm:text-sm text-muted-foreground">{st.label}</p>',
      '              <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0 ${',
      '                st.tone === "accent" ? "bg-accent/20 text-accent-foreground" :',
      '                st.tone === "destructive" ? "bg-destructive/10 text-destructive" :',
      '                "bg-primary/10 text-primary"',
      "              }`}>",
      '                <st.icon className="h-4 w-4" />',
      "              </div>",
      "            </div>",
      '            <p className="text-2xl sm:text-3xl font-display font-semibold">{st.value}</p>',
      "          </Link>"
    ),
    "stat chips"
  );
  replaceOnce(
    dash,
    '"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>\n                      {od ? "Overdue" : "Active"}',
    '"bg-accent/20 text-accent-foreground"}`}>\n                      {od ? "Overdue" : "Active"}',
    "dashboard active pill"
  );
  replaceOnce(dash, '<div className="h-full bg-primary" style={{ width: `${pct}%` }} />', '<div className="h-full bg-accent" style={{ width: `${pct}%` }} />', "dashboard bar");
  replaceOnce(dash, '<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{count}×</span>', '<span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground shrink-0">{count}×</span>', "dashboard count 1");
  replaceOnce(
    dash,
    '<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{count} book{count === 1 ? "" : "s"}</span>',
    '<span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground shrink-0">{count} book{count === 1 ? "" : "s"}</span>',
    "dashboard count 2"
  );

  // ---------------------------------------------------------------- other pages
  const cal = load("src/routes/_authenticated/calendar.tsx");
  replaceOnce(cal, '"border-primary/50 bg-primary/5"', '"border-accent bg-accent/10"', "calendar today box");
  replaceOnce(cal, '${isToday ? "text-primary" : ""}', '${isToday ? "text-accent-foreground" : ""}', "calendar today number");
  replaceOnce(cal, '"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"', '"bg-accent/20 text-accent-foreground"', "calendar active pill");

  replaceOnce(load("src/routes/_authenticated/kids.tsx"), '"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"\n', '"bg-accent/20 text-accent-foreground"\n', "kids active pill");
  replaceOnce(
    load("src/routes/_authenticated/books.tsx"),
    'avail > 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"',
    'avail > 0 ? "bg-accent/20 text-accent-foreground"',
    "books available pill"
  );
  replaceOnce(
    load("src/routes/_authenticated/teachers.tsx"),
    '"h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold"',
    '"h-10 w-10 rounded-full bg-accent/30 text-accent-foreground flex items-center justify-center font-display font-semibold"',
    "teacher avatar"
  );

  // ---------------------------------------------------------------- sign-in page
  const login = load("src/routes/login.tsx");
  replaceOnce(login, 'borderRadius: "0.5rem",', 'borderRadius: "0.75rem",', "clerk radius");
  replaceOnce(login, 'border: "1px solid #e2e8f0"', 'border: "1px solid #e4dfd2"', "clerk border");
  replaceOnce(
    login,
    '"group w-full text-left flex items-center gap-4 rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"',
    '"group w-full text-left flex items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5 transition hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"',
    "role card"
  );
  replaceOnce(
    login,
    L(
      '      <span className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition">',
      '        <Icon className="h-5 w-5" />'
    ),
    L(
      '      <span className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition">',
      '        <Icon className="h-6 w-6" />'
    ),
    "role card icon"
  );
  replaceOnce(login, '<span className="block text-base font-semibold">{title}</span>', '<span className="block font-display text-lg font-semibold">{title}</span>', "role card title");
  between(
    login,
    '    <div className="min-h-screen flex flex-col bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>',
    "      <AppFooter />\n    </div>\n",
    L(
      '    <div className="min-h-screen grid lg:grid-cols-2 bg-background">',
      '      <div className="hidden lg:flex flex-col justify-between p-12 text-sidebar-foreground" style={{ background: "var(--gradient-hero)" }}>',
      '        <div className="flex items-center gap-3">',
      '          <Logo size={48} alt="SDA logo" className="rounded-lg bg-white/95 p-1.5" />',
      "          <div>",
      '            <p className="font-display text-lg font-semibold">Madina Central</p>',
      '            <p className="text-sm opacity-75">SDA Church Book Club</p>',
      "          </div>",
      "        </div>",
      '        <p className="text-xs opacity-60">© {new Date().getFullYear()} Madina Central SDA Church</p>',
      "      </div>",
      "",
      '      <div className="flex flex-col min-h-screen" style={{ paddingTop: "env(safe-area-inset-top)" }}>',
      '        <div className="lg:hidden flex items-center gap-3 px-6 pt-6">',
      '          <Logo size={40} alt="SDA" />',
      '          <p className="font-display font-semibold">Madina Central Book Club</p>',
      "        </div>",
      '        <div className="flex-1 flex items-center justify-center px-6 py-8">{body}</div>',
      "        <AppFooter />",
      "      </div>",
      "    </div>",
      ""
    ),
    "login layout"
  );

  // ---------------------------------------------------------------- documentation
  overwriteFrom(DIR, "README.md");
  const arch = load("docs/ARCHITECTURE.md");
  between(
    arch,
    "The look is set by tokens in `src/styles.css`:",
    "the title and the controls should be enough.",
    "The look is set by tokens in `src/styles.css`: a warm cream background, deep navy text and sidebar, a gold accent, 12px radius, soft shadows, Fraunces for headings and Inter for body text. Status colours are used only for meaning (gold for available or active, red for overdue or destructive, amber for waiting). The church logo is `src/assets/logo.png`, shown through `src/components/Logo.tsx`. Avoid adding greetings, emojis or explanatory subtitles under page titles; the title and the controls should be enough.",
    "architecture design"
  );
  replaceOnce(
    arch,
    "| 16 | Batch import and the HTTP endpoint |",
    "| 16 | Batch import and the HTTP endpoint |\n| 17 | Original colours, fonts, church logo and app icons restored; the cleanup stays. Detailed README |",
    "architecture patch table"
  );
});
