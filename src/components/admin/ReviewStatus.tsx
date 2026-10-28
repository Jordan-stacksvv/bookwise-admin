import { useMutation } from "convex/react";
import { Copy, ImageIcon, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/friendly-error";
import type { BookReview } from "@/lib/mock-store";
import { reviewShareText, reviewUrl, whatsappText } from "@/lib/review-share";

const BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Not submitted", cls: "bg-muted text-muted-foreground" },
  pending: { label: "Waiting for admin", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  approved: { label: "Published", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "Declined", cls: "bg-destructive/15 text-destructive" },
};

export const reviewState = (r: Pick<BookReview, "status">) => r.status ?? "draft";

/** Status line + actions under a review: submit for approval, photo, copy/share once published. */
export function ReviewStatus({ review, kidName, bookTitle }: { review: BookReview; kidName: string; bookTitle: string }) {
  const submit = useMutation(api.reviews.submit);
  const [copied, setCopied] = useState(false);
  const st = reviewState(review);
  const b = BADGE[st];

  const run = async () => {
    try {
      await submit({ id: review._id as Id<"bookReviews"> });
    } catch (e) {
      alert(friendlyError(e));
    }
  };
  const copy = async () => {
    if (!review.shareToken) return;
    try {
      await navigator.clipboard.writeText(reviewUrl(review.shareToken));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", reviewUrl(review.shareToken));
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className={b.cls}>{b.label}</Badge>
      {review.imageUrl && (
        <a href={review.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
          <ImageIcon className="h-3.5 w-3.5" /> Photo
        </a>
      )}
      {(st === "draft" || st === "rejected") && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={run}>
          <Send className="h-3.5 w-3.5 mr-1" /> {st === "draft" ? "Submit for approval" : "Resubmit"}
        </Button>
      )}
      {st === "approved" && review.shareToken && (
        <>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={copy}>
            <Copy className="h-3.5 w-3.5 mr-1" /> {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => window.open(whatsappText(reviewShareText({ bookTitle, kidName, summary: review.summary, token: review.shareToken! })), "_blank")}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Share
          </Button>
        </>
      )}
      {st === "rejected" && review.rejectedReason && <p className="w-full text-xs text-destructive">Reason: {review.rejectedReason}</p>}
    </div>
  );
}
