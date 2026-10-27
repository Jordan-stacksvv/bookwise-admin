import { useEffect, useState } from "react";

const KEY_ENABLED = "bw-admin-alerts";
const KEY_LAST = "bw-admin-alerts-last";

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode etc. */
  }
};

export const alertsSupported = () => typeof window !== "undefined" && "Notification" in window;

/**
 * "Notifications" for the admin app. These are LOCAL notifications: they fire when the app is opened
 * (once a day at most) with a summary. True background push needs a push server, which this app does not have yet.
 */
export function useAdminAlerts(summary: { birthdaysToday: string[]; waitingForAdmin: number; overdue: number } | null) {
  const [enabled, setEnabled] = useState(() => safeGet(KEY_ENABLED) === "1" && alertsSupported() && Notification.permission === "granted");

  const enable = async () => {
    if (!alertsSupported()) return false;
    const p = await Notification.requestPermission();
    const ok = p === "granted";
    safeSet(KEY_ENABLED, ok ? "1" : "0");
    setEnabled(ok);
    return ok;
  };
  const disable = () => {
    safeSet(KEY_ENABLED, "0");
    setEnabled(false);
  };

  useEffect(() => {
    if (!enabled || !summary || !alertsSupported() || Notification.permission !== "granted") return;
    const parts: string[] = [];
    if (summary.birthdaysToday.length) parts.push(`Birthday today: ${summary.birthdaysToday.slice(0, 3).join(", ")}${summary.birthdaysToday.length > 3 ? "..." : ""}`);
    if (summary.waitingForAdmin) parts.push(`${summary.waitingForAdmin} loan${summary.waitingForAdmin === 1 ? "" : "s"} waiting for your approval`);
    if (summary.overdue) parts.push(`${summary.overdue} overdue book${summary.overdue === 1 ? "" : "s"}`);
    if (!parts.length) return;
    const today = new Date().toDateString();
    const signature = today + "|" + parts.join("|");
    if (safeGet(KEY_LAST) === signature) return; // already told them this exact thing today
    safeSet(KEY_LAST, signature);
    try {
      new Notification("Book Club Admin", { body: parts.join("\n"), icon: "/icons/admin-192.png", tag: "bw-admin-daily" });
    } catch {
      /* some mobile browsers only allow notifications via a service worker */
    }
  }, [enabled, summary?.birthdaysToday.join(","), summary?.waitingForAdmin, summary?.overdue]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enabled, enable, disable, supported: alertsSupported() };
}
