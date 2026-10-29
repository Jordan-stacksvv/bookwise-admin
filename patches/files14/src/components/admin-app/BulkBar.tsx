import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** "Select all" + "Approve selected" row for lists of things waiting for the admin. */
export function BulkBar({ total, selected, busy, onToggleAll, onApprove, label = "Approve selected" }: {
  total: number;
  selected: number;
  busy?: boolean;
  onToggleAll: () => void;
  onApprove: () => void;
  label?: string;
}) {
  const all = total > 0 && selected === total;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 mb-3">
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <Checkbox checked={all ? true : selected > 0 ? "indeterminate" : false} onCheckedChange={onToggleAll} aria-label="Select all" />
        {all ? "Clear selection" : `Select all (${total})`}
      </label>
      <Button size="sm" className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white" disabled={selected === 0 || busy} onClick={onApprove}>
        <Check className="h-4 w-4 mr-1.5" /> {busy ? "Approving..." : `${label} (${selected})`}
      </Button>
    </div>
  );
}
