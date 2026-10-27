import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/friendly-error";

export type ChargeTarget = { id: string; kind: "lost" | "damaged"; bookTitle: string; kidName: string; defaultFee: number; currency: string };

export function ChargeFeeDialog({ target, onClose }: { target: ChargeTarget | null; onClose: () => void }) {
  const charge = useMutation(api.loans.chargeFee);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (target) {
      setAmount(String(target.defaultFee));
      setNote("");
      setError("");
    }
  }, [target]);

  if (!target) return null;
  const lost = target.kind === "lost";

  const submit = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a valid amount.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await charge({ id: target.id as Id<"assignments">, kind: target.kind, amount: n, note });
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lost ? "Mark book as lost" : "Charge damage fee"}</DialogTitle>
          <DialogDescription>
            "{target.bookTitle}" · {target.kidName}.{" "}
            {lost ? "The loan is closed and one copy is removed from the shelf count." : "The loan itself is not changed."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block">Fee ({target.currency})</Label>
            <Input type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={lost ? "e.g. not found after reminders" : "e.g. torn cover"} maxLength={200} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={lost ? "destructive" : "default"} disabled={busy} onClick={submit}>
            {busy ? "Saving..." : lost ? "Mark lost & charge" : "Charge fee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
