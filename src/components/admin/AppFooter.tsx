/** Small footer used on the login page and the teacher app. The admin link is a plain <a> on purpose:
 *  a full page load lets the browser pick up the separate admin app manifest (installable admin PWA). */
export function AppFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-6 ${className}`}>
      <span>© {new Date().getFullYear()} Madina Central SDA Book Club</span>
      <a href="/admin" className="underline underline-offset-2 hover:text-foreground">
        Admin area
      </a>
    </footer>
  );
}
