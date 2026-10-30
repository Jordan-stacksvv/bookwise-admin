"use strict";
/**
 * 18 - Sign-in page: bring all the original text back
 * Tagline and paragraph on the navy panel, "Choose how you want to use the book club.",
 * the full role card descriptions, and the original sign-up messages.
 * Needs patch 17 already applied.
 */
const { load, replaceOnce, has, run } = require("./_lib.cjs");
const { L } = require("./_files.cjs");

run("18 login text", () => {
  const login = load("src/routes/login.tsx");
  if (has(login, "Nurturing young minds")) return "skip";

  replaceOnce(
    login,
    L(
      "        </div>",
      '        <p className="text-xs opacity-60">© {new Date().getFullYear()} Madina Central SDA Church</p>'
    ),
    L(
      "        </div>",
      '        <div className="space-y-4 max-w-md">',
      '          <BookOpen className="h-10 w-10 opacity-80" />',
      '          <h2 className="font-display text-4xl leading-tight">Nurturing young minds, one chapter at a time.</h2>',
      '          <p className="opacity-80 text-sm leading-relaxed">Track every book, every reader and every return, from one simple place built for the church library.</p>',
      "        </div>",
      '        <p className="text-xs opacity-60">© {new Date().getFullYear()} Madina Central SDA Church</p>'
    ),
    "panel tagline"
  );
  replaceOnce(
    login,
    L(
      '"Who are you?"}</h1>',
      "        </div>"
    ),
    L(
      '"Who are you?"}</h1>',
      '          <p className="text-sm text-muted-foreground mt-1">Choose how you want to use the book club.</p>',
      "        </div>"
    ),
    "choose line"
  );
  replaceOnce(login, 'text="Books, kids and reviews"', 'text="Assign books, track reading and manage kids."', "teacher card text");
  replaceOnce(login, 'text="Approvals, reports and settings"', 'text="Approvals, analytics, announcements and fees."', "admin card text");
  replaceOnce(
    login,
    '{mode === "signin" ? "Sign in to continue." : "An admin approves new accounts."}',
    '{mode === "signin" ? "Sign in to continue." : role === "admin" ? "An existing admin will approve your access." : "It only takes a minute."}',
    "sign-up message"
  );
});
