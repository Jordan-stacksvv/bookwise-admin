"use strict";
/**
 * 04 - Installable PWA ("Add to Home Screen" / install as an app)
 * - Real PNG icons (192, 512, maskable, apple-touch) copied from patches/assets
 * - manifest.webmanifest rewritten + actually linked from index.html (it wasn't before)
 * - public/sw.js: app-shell service worker (network-first pages, cached hashed assets;
 *   Convex data and Clerk auth are never cached)
 * - Service worker registered in production builds only
 * - "Install app" button in the sidebar (Android/desktop Chrome); iOS gets a short hint
 *
 * Run from project root:  node patches/04-pwa.cjs   (frontend only, no Convex deploy)
 * NOTE: PWAs need HTTPS, so test on the deployed site (localhost also works).
 */
const path = require("path");
const { exists, load, replaceOnce, ensureAfter, create, copyAsset, run } = require("./_lib.cjs");

const ASSETS = path.join(__dirname, "assets");

const MANIFEST = `{
  "id": "/",
  "name": "Madina Central SDA Book Club",
  "short_name": "SDA Book Club",
  "description": "Admin panel for the Madina Central SDA Church Book Club.",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1e2a44",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
`;

const SW = `/* Book Club service worker - app shell only.
 * Convex (data) and Clerk (auth) are cross-origin and are never touched here.
 * Bump CACHE when you change this file so old caches are cleaned up. */
const CACHE = "bookwise-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Convex, Clerk, fonts: go straight to network

  // Page loads: always try the network first (so deploys show up), fall back to the cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Hashed build assets and icons never change for a given URL: cache-first.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
`;

const HOOK = `import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Captured at module load (main.tsx imports this file) so the event isn't missed
// if the browser fires it before the sidebar has mounted.
let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const standalone = isStandalone();
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return {
    /** Chrome/Edge/Android: the browser offered an install prompt. */
    canInstall: !!deferred && !installed && !standalone,
    /** iOS Safari has no prompt API: show a manual hint instead. */
    showIosHint: ios && !standalone && !installed,
    install: async () => {
      if (!deferred) return;
      const evt = deferred;
      await evt.prompt();
      await evt.userChoice;
      deferred = null;
      notify();
    },
  };
}
`;

run("04 PWA", () => {
  if (exists("public/sw.js")) return "skip";

  copyAsset(path.join(ASSETS, "icon-192.png"), "public/icons/icon-192.png");
  copyAsset(path.join(ASSETS, "icon-512.png"), "public/icons/icon-512.png");
  copyAsset(path.join(ASSETS, "maskable-512.png"), "public/icons/maskable-512.png");
  copyAsset(path.join(ASSETS, "apple-touch-icon.png"), "public/icons/apple-touch-icon.png");

  create("public/manifest.webmanifest", MANIFEST, { overwrite: true });
  create("public/sw.js", SW);
  create("src/hooks/use-install-prompt.ts", HOOK);

  // ---- index.html -------------------------------------------------------
  const html = load("index.html");
  replaceOnce(
    html,
    `    <link rel="icon" type="image/png" href="/favicon.png" />`,
    `    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#1e2a44" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Book Club" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />`,
    "head tags"
  );

  // ---- src/main.tsx -----------------------------------------------------
  const main = load("src/main.tsx");
  ensureAfter(main, `import "./styles.css";`, `import "./hooks/use-install-prompt";`);
  replaceOnce(
    main,
    `createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
    `createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Offline-capable app shell + installability. Production builds only, so dev hot-reload isn't cached.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}`,
    "sw registration"
  );

  // ---- AppSidebar.tsx: Install button ----------------------------------
  const side = load("src/components/admin/AppSidebar.tsx");
  replaceOnce(
    side,
    `import { LayoutDashboard, BookOpen, Users, CalendarDays, LogOut, GraduationCap, Menu, Building2 } from "lucide-react";`,
    `import { LayoutDashboard, BookOpen, Users, CalendarDays, LogOut, GraduationCap, Menu, Building2, Download } from "lucide-react";`,
    "lucide import"
  );
  ensureAfter(side, `import { useState } from "react";`, `import { useInstallPrompt } from "@/hooks/use-install-prompt";`);
  replaceOnce(
    side,
    `  const { signOut } = useClerk();\n`,
    `  const { signOut } = useClerk();\n  const { canInstall, showIosHint, install } = useInstallPrompt();\n`,
    "hook call"
  );
  replaceOnce(
    side,
    `      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}`,
    `      <div className="p-3 border-t border-sidebar-border">
        {canInstall && (
          <button
            onClick={install}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent transition"
          >
            <Download className="h-4 w-4" /> Install app
          </button>
        )}
        {showIosHint && (
          <p className="px-3 py-2 text-xs opacity-70">To install: tap Share, then Add to Home Screen.</p>
        )}
        <button
          onClick={handleSignOut}`,
    "install button"
  );
});
