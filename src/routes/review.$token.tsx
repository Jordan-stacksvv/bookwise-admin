import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { BookOpen, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { reviewUrl, whatsappText } from "@/lib/review-share";

export const Route = createFileRoute("/review/$token")({
  component: PublicReview,
});

/** PUBLIC page (no login) for a review the admin approved. */
function PublicReview() {
  const { token } = Route.useParams();
  const review = useQuery(api.reviews.publicByToken, { token });
  const [copied, setCopied] = useState(false);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-10" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center gap-3 mb-5">
          <Logo size={40} />
          <div className="leading-tight">
            <p className="font-display font-semibold">Madina Central</p>
            <p className="text-xs text-muted-foreground">SDA Book Club</p>
          </div>
        </div>
        {children}
        <p className="text-xs text-muted-foreground text-center mt-8">Madina Central SDA Church Book Club</p>
      </div>
    </div>
  );

  if (review === undefined) {
    return shell(<div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>);
  }
  if (review === null) {
    return shell(
      <div className="bg-card border rounded-xl p-6 text-center">
        <h1 className="font-display text-xl font-semibold">Review not available</h1>
        <p className="text-sm text-muted-foreground mt-2">This review is not published, or the link is wrong.</p>
      </div>,
    );
  }

  const link = reviewUrl(token);
  const text = `\u{1F4D6} "${review.bookTitle}" - a review by ${review.reader}\n\nRead it here: ${link}\n- Madina Central SDA Book Club`;

  return shell(
    <article className="bg-card border rounded-2xl p-5 sm:p-7 space-y-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-start gap-3">
        <BookOpen className="h-6 w-6 mt-1 shrink-0 text-primary" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold break-words">{review.bookTitle}</h1>
          <p className="text-sm text-muted-foreground break-words">by {review.author}</p>
        </div>
      </div>
      <p className="text-sm">
        Review by <b>{review.reader}</b> · {review.className}
        {review.chapterRange ? ` · Chapters ${review.chapterRange}` : ""}
      </p>
      {review.imageUrl && <img src={review.imageUrl} alt="The review" className="w-full rounded-lg border bg-muted/40" />}
      <p className="whitespace-pre-wrap break-words leading-relaxed">{review.summary}</p>
      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.open(whatsappText(text), "_blank")}>
          <MessageCircle className="h-4 w-4 mr-2" /> Share on WhatsApp
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt("Copy this link:", link);
            }
          }}
        >
          <Copy className="h-4 w-4 mr-2" /> {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </article>,
  );
}
