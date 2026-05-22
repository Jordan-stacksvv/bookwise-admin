import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

/**
 * Free-typing input with a dropdown of existing suggestions.
 * Users can either pick an existing value or type a new one.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  className,
  inputType = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | number)[];
  placeholder?: string;
  className?: string;
  inputType?: "text" | "number";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = String(value ?? "").toLowerCase();
  const filtered = options
    .map((o) => String(o))
    .filter((o, i, arr) => arr.indexOf(o) === i && o.length > 0)
    .filter((o) => !q || o.toLowerCase().includes(q));

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <Input
        type={inputType}
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        className="pr-8"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label="Toggle options"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
            >
              <span className="truncate">{o}</span>
              {String(value) === o && <Check className="h-3.5 w-3.5 opacity-70" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}