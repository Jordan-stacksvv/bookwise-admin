import { useMemo } from "react";
import { ReviewStatus } from "@/components/admin/ReviewStatus";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, type Book } from "@/lib/mock-store";
import { shortName } from "@/lib/review-share";

/** Everything the admin has approved for one book: read it, open the photo, copy the link or share it. */
export function BookReviewsDialog({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const s = useStore();
  const rows = useMemo(
    () =>
      book
        ? s.reviews
            .filter((r) => r.bookId === book.id && r.status === "approved")
            .map((r) => ({ r, kid: s.kids.find((k) => k.id === r.kidId) }))
            .sort((a, b) => +new Date(b.r.decidedAt ?? b.r.createdAt) - +new Date(a.r.decidedAt ?? a.r.createdAt))
        : [],
    [book, s.reviews, s.kids],
  );

  return (
    <Dialog open={!!book} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto w-[calc(100%-1.5rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="break-words">Reviews: {book?.title}</DialogTitle>
          <DialogDescription>{rows.length === 0 ? "Nothing published yet." : `${rows.length} approved review${rows.length === 1 ? "" : "s"}.`}</DialogDescription>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">When a teacher adds a review and the admin approves it, it shows up here.</p>
        ) : (
          <div className="space-y-3">
            {rows.map(({ r, kid }) => (
              <article key={r.id} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  {kid ? `${shortName(kid.name)} · ${kid.department}` : "A reader"}
                  {r.chapterRange ? ` · Chapters ${r.chapterRange}` : ""} · {new Date(r.decidedAt ?? r.createdAt).toLocaleDateString()}
                </p>
                {r.imageUrl && (
                  <a href={r.imageUrl} target="_blank" rel="noreferrer">
                    <img src={r.imageUrl} alt="Photo of the review" loading="lazy" className="mt-2 w-full max-h-64 object-contain rounded-lg border bg-muted/40" />
                  </a>
                )}
                <p className="text-sm mt-2 whitespace-pre-wrap break-words">{r.summary}</p>
                <ReviewStatus review={r} kidName={kid?.name ?? ""} bookTitle={book?.title ?? ""} />
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
