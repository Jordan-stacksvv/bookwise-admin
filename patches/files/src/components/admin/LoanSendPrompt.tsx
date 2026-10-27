import { useQuery } from "convex/react";
import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { approvalMessage, approvalUrl, whatsappLink } from "@/lib/approval-link";
import { clearLoanNotice, useLoanNotice } from "@/lib/loan-notice";

/** Mounted once in the teacher layout. Opens after every successful "Assign". */
export function LoanSendPrompt() {
  const n = useLoanNotice();
  const policy = useQuery(api.loanPolicy.get);
  const [copied, setCopied] = useState(false);

  if (!n) return null;
  const text = approvalMessage({
    token: n.token,
    kidName: n.kidName,
    parentName: n.parentName,
    bookTitle: n.bookTitle,
    dueDate: n.dueDate,
    policyText: policy?.text ?? "",
    fee: policy?.damageFee ?? 0,
    currency: policy?.currency ?? "GHS",
  });
  const wa = whatsappLink(n.parentPhone, text);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(approvalUrl(n.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", approvalUrl(n.token));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && clearLoanNotice()}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Loan created - send it to the parent</DialogTitle>
          <DialogDescription>
            "{n.bookTitle}" for {n.kidName} stays <b>pending</b> until the parent approves, then the admin gives final approval.
          </DialogDescription>
        </DialogHeader>
        {!wa && (
          <p className="text-sm rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
            {n.kidName} has no valid parent phone number saved. Copy the link and send it yourself, or add the number on the Kids page.
          </p>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={copy}>
            <Copy className="h-4 w-4 mr-2" /> {copied ? "Copied!" : "Copy link"}
          </Button>
          {wa && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.open(wa, "_blank")}>
              <MessageCircle className="h-4 w-4 mr-2" /> Send on WhatsApp
            </Button>
          )}
          <Button variant="ghost" onClick={clearLoanNotice}>Later</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
