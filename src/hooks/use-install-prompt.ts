import { useEffect, useState } from "react";

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
