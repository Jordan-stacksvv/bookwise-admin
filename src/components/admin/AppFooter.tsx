export function AppFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-xs text-muted-foreground flex items-center justify-center py-6 ${className}`}>
      <span>© {new Date().getFullYear()} Madina Central SDA Book Club</span>
    </footer>
  );
}
