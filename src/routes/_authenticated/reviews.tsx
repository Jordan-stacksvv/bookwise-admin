import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { ReviewStatus, reviewState } from "@/components/admin/ReviewStatus";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/mock-store";
import { shortName } from "@/lib/review-share";

export const Route = createFileRoute("/_authenticated/reviews")({
  component: ReviewsPage,
});

type Tab = "published" | "mine";

function ReviewsPage() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("published");

  const rows = useMemo(() => {
    const all = s.reviews
      .map((r) => ({ r, kid: s.kids.find((k) => k.id === r.kidId), book: s.books.find((b) => b.id === r.bookId) }))
      .filter((x) => x.kid && x.book)
      .sort((a, b) => +new Date(b.r.createdAt) - +new Date(a.r.createdAt));
    return {
      published: all.filter((x) => reviewState(x.r) === "approved"),
      mine: all.filter((x) => reviewState(x.r) !== "approved"),
    };
  }, [s.reviews, s.kids, s.books]);

  const list = rows[tab];

  return (
    <>
      <PageHeader title="Book reviews" subtitle="Reviews the admin has approved are shown here and can be shared. Add new ones from a kid's page." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="published">Published ({rows.published.length})</TabsTrigger>
          <TabsTrigger value="mine">Waiting / not submitted ({rows.mine.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 text-center text-sm text-muted-foreground">
          {tab === "published" ? "No published reviews yet." : "Nothing waiting."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          {list.map(({ r, kid, book }) => (
            <article key={r.id} className="bg-card rounded-xl border p-4 flex flex-col" style={{ boxShadow: "var(--shadow-soft)" }}>
              <p className="font-display font-semibold break-words">{book!.title}</p>
              <p className="text-xs text-muted-foreground">
                {tab === "published" ? shortName(kid!.name) : kid!.name} · {kid!.department}
                {r.chapterRange ? ` · Chapters ${r.chapterRange}` : ""}
              </p>
              {r.imageUrl && <img src={r.imageUrl} alt="Photo of the review" loading="lazy" className="mt-3 w-full max-h-64 object-contain rounded-lg border bg-muted/40" />}
              <p className="text-sm mt-3 whitespace-pre-wrap break-words line-clamp-6">{r.summary}</p>
              <ReviewStatus review={r} kidName={kid!.name} bookTitle={book!.title} />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
