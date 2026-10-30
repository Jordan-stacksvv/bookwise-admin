import { BookOpen } from "lucide-react";

/** The app mark: a flat tile with a book glyph. Scales with `size` (px). */
export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground ${className}`}
      style={{ width: size, height: size }}
    >
      <BookOpen strokeWidth={1.75} style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}
