"use strict";
/**
 * 10 - Book reviews: photo upload, admin approval, public share page
 * - Teachers add a review (text + optional photo of the handwritten review); it goes to the admin
 * - Admin > Reviews: approve & publish / decline / take down. Approving creates a public link.
 * - Teacher app: new Reviews page (published reviews from everyone + your waiting ones), status + Copy link / Share under each review
 * - Public page /review/<link>: no login; shows first name + last initial only
 * Run from the project root, then:  npx convex dev --once
 */
const { load, has, replaceOnce, run } = require("./_lib.cjs");
const { createFrom, overwriteFrom, L } = require("./_files.cjs");

const DIR = "files10";
const DRY = process.argv.includes("--dry");

run("10 reviews", () => {
  const schema = load("convex/schema.ts");
  if (has(schema, "shareToken")) return "skip";
  if (!DRY && !has(schema, "members: defineTable")) throw new Error("Apply patch 09 first.");

  // ---- backend
  replaceOnce(
    schema,
    L('    sentToParentAt: v.optional(v.string()),', "  })", '    .index("by_kid", ["kidId"])', '    .index("by_assignment", ["assignmentId"]),'),
    L(
      "    sentToParentAt: v.optional(v.string()),",
      "    // --- publishing (batch 2). status undefined = saved before approvals existed (not published).",
      '    imageId: v.optional(v.id("_storage")),',
      "    status: v.optional(v.union(v.literal(\"pending\"), v.literal(\"approved\"), v.literal(\"rejected\"))),",
      "    submittedAt: v.optional(v.string()),",
      "    decidedAt: v.optional(v.string()),",
      "    decidedBy: v.optional(v.string()),",
      "    rejectedReason: v.optional(v.string()),",
      "    shareToken: v.optional(v.string()),",
      "  })",
      '    .index("by_kid", ["kidId"])',
      '    .index("by_assignment", ["assignmentId"])',
      '    .index("by_token", ["shareToken"]),',
    ),
    "bookReviews fields",
  );
  overwriteFrom(DIR, "convex/reviews.ts");

  // ---- new files
  for (const f of [
    "src/lib/review-share.ts",
    "src/lib/review-photo.ts",
    "src/components/admin/ReviewStatus.tsx",
    "src/routes/_authenticated/reviews.tsx",
    "src/routes/admin/reviews.tsx",
    "src/routes/review.$token.tsx",
  ]) createFrom(DIR, f);

  // ---- mock-store.ts
  const store = load("src/lib/mock-store.ts");
  replaceOnce(
    store,
    L("  createdAt: string;", "  sentToParentAt?: string;", "};"),
    L(
      "  createdAt: string;",
      "  sentToParentAt?: string;",
      "  imageUrl?: string | null;",
      "  /** undefined = saved before approvals existed */",
      '  status?: "pending" | "approved" | "rejected";',
      "  submittedAt?: string;",
      "  decidedAt?: string;",
      "  decidedBy?: string;",
      "  rejectedReason?: string;",
      "  shareToken?: string;",
      "};",
    ),
    "BookReview type",
  );
  replaceOnce(
    store,
    L(
      '    addReview: (r: { assignmentId: string; kidId: string; bookId: string; chapterRange?: string; summary: string }) =>',
      "      m.addReview({",
      '        assignmentId: r.assignmentId as Id<"assignments">,',
      '        kidId: r.kidId as Id<"kids">,',
      '        bookId: r.bookId as Id<"books">,',
      "        chapterRange: r.chapterRange,",
      "        summary: r.summary,",
      "      }),",
    ),
    L(
      '    addReview: (r: { assignmentId: string; kidId: string; bookId: string; chapterRange?: string; summary: string; imageId?: string }) =>',
      "      m.addReview({",
      '        assignmentId: r.assignmentId as Id<"assignments">,',
      '        kidId: r.kidId as Id<"kids">,',
      '        bookId: r.bookId as Id<"books">,',
      "        chapterRange: r.chapterRange,",
      "        summary: r.summary,",
      '        imageId: r.imageId as Id<"_storage"> | undefined,',
      "      }),",
    ),
    "addReview",
  );

  // ---- kids.tsx: photo field, submit flow, status under each review
  const kids = load("src/routes/_authenticated/kids.tsx");
  replaceOnce(
    kids,
    'import { friendlyError } from "@/lib/friendly-error";',
    L(
      'import { friendlyError } from "@/lib/friendly-error";',
      'import { ReviewStatus } from "@/components/admin/ReviewStatus";',
      'import { useReviewPhotoUpload } from "@/lib/review-photo";',
    ),
    "kids imports",
  );
  replaceOnce(
    kids,
    '  const [reviewSummary, setReviewSummary] = useState("");',
    L(
      '  const [reviewSummary, setReviewSummary] = useState("");',
      "  const [reviewFile, setReviewFile] = useState<File | null>(null);",
      "  const [reviewBusy, setReviewBusy] = useState(false);",
      "  const uploadPhoto = useReviewPhotoUpload();",
    ),
    "review state",
  );
  replaceOnce(
    kids,
    L(
      "  const submitReview = () => {",
      "    if (!reviewFor || !reviewSummary.trim()) return;",
      "    api.addReview({",
      "      assignmentId: reviewFor.assignmentId,",
      "      kidId: reviewFor.kidId,",
      "      bookId: reviewFor.bookId,",
      "      chapterRange: reviewChapters || undefined,",
      "      summary: reviewSummary,",
      "    });",
      '    setReviewFor(null); setReviewChapters(""); setReviewSummary("");',
      "  };",
    ),
    L(
      "  const submitReview = async () => {",
      "    if (!reviewFor || !reviewSummary.trim() || reviewBusy) return;",
      "    setReviewBusy(true);",
      "    try {",
      "      const imageId = reviewFile ? await uploadPhoto(reviewFile) : undefined;",
      "      await api.addReview({",
      "        assignmentId: reviewFor.assignmentId,",
      "        kidId: reviewFor.kidId,",
      "        bookId: reviewFor.bookId,",
      "        chapterRange: reviewChapters || undefined,",
      "        summary: reviewSummary,",
      "        imageId,",
      "      });",
      '      setReviewFor(null); setReviewChapters(""); setReviewSummary(""); setReviewFile(null);',
      "    } catch (e) {",
      "      alert(friendlyError(e));",
      "    } finally {",
      "      setReviewBusy(false);",
      "    }",
      "  };",
    ),
    "submitReview",
  );
  replaceOnce(
    kids,
    L(
      '              <Textarea value={reviewSummary} onChange={(e) => setReviewSummary(e.target.value)} placeholder="What did they read? What did they think?" className="w-full min-h-[100px]" />',
      "            </div>",
      "          </div>",
      '          <DialogFooter className="flex-wrap gap-2">',
      '            <Button variant="outline" onClick={() => setReviewFor(null)}>Cancel</Button>',
      "            <Button disabled={!reviewSummary.trim()} onClick={submitReview}>Save review</Button>",
    ),
    L(
      '              <Textarea value={reviewSummary} onChange={(e) => setReviewSummary(e.target.value)} placeholder="What did they read? What did they think?" className="w-full min-h-[100px]" />',
      "            </div>",
      "            <div>",
      '              <Label className="mb-1.5 block">Photo of the written review (optional)</Label>',
      '              <Input type="file" accept="image/*" onChange={(e) => setReviewFile(e.target.files?.[0] ?? null)} className="w-full" />',
      '              <p className="text-xs text-muted-foreground mt-1.5">The admin checks every review before it is published.</p>',
      "            </div>",
      "          </div>",
      '          <DialogFooter className="flex-wrap gap-2">',
      '            <Button variant="outline" onClick={() => { setReviewFor(null); setReviewFile(null); }}>Cancel</Button>',
      "            <Button disabled={!reviewSummary.trim() || reviewBusy} onClick={submitReview}>{reviewBusy ? \"Sending...\" : \"Submit review\"}</Button>",
    ),
    "review dialog",
  );
  replaceOnce(
    kids,
    L(
      "                                      {r.sentToParentAt && ` · Sent to parent ${new Date(r.sentToParentAt).toLocaleDateString()}`}",
      "                                    </p>",
    ),
    L(
      "                                      {r.sentToParentAt && ` · Sent to parent ${new Date(r.sentToParentAt).toLocaleDateString()}`}",
      "                                    </p>",
      "                                    <ReviewStatus review={r} kidName={k.name} bookTitle={book?.title ?? \"\"} />",
    ),
    "review row status",
  );

  // ---- teacher sidebar: Reviews link
  const side = load("src/components/admin/AppSidebar.tsx");
  replaceOnce(side, "Building2, Download, ClipboardCheck, UserCircle } from \"lucide-react\";", "Building2, Download, ClipboardCheck, UserCircle, BookOpenCheck } from \"lucide-react\";", "sidebar icons");
  replaceOnce(
    side,
    '  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },',
    L('  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },', '  { to: "/reviews", label: "Reviews", icon: BookOpenCheck },'),
    "sidebar nav",
  );

  // ---- admin shell + overview
  const shell = load("src/components/admin-app/AdminShell.tsx");
  replaceOnce(shell, "Settings, UserCircle, Wallet, BookMarked } from \"lucide-react\";", "Settings, UserCircle, Wallet, BookMarked, BookOpenCheck } from \"lucide-react\";", "shell icons");
  replaceOnce(
    shell,
    '  { to: "/admin/approvals", label: "Approvals", icon: ClipboardCheck, badge: true },',
    L('  { to: "/admin/approvals", label: "Approvals", icon: ClipboardCheck, badge: true },', '  { to: "/admin/reviews", label: "Reviews", icon: BookOpenCheck },'),
    "shell nav",
  );
  const idx = load("src/routes/admin/index.tsx");
  replaceOnce(
    idx,
    "      <BirthdayCard kids={s.kids} />",
    L(
      '      {s.reviews.filter((r) => r.status === "pending").length > 0 && (',
      '        <Link to="/admin/reviews" className="block mb-6 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm font-medium hover:bg-sky-500/15 transition">',
      '          {s.reviews.filter((r) => r.status === "pending").length} book review(s) waiting for your approval →',
      "        </Link>",
      "      )}",
      "",
      "      <BirthdayCard kids={s.kids} />",
    ),
    "overview strip",
  );
});
