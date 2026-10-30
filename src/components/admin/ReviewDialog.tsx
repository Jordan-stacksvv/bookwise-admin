import { CheckCircle2, ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { friendlyError } from "@/lib/friendly-error";
import { useApi } from "@/lib/mock-store";
import { useReviewPhotoUpload } from "@/lib/review-photo";

export type ReviewTarget = { assignmentId: string; kidId: string; bookId: string; bookTitle: string; kidName: string };

const MAX = 3000;

function ReviewForm({ target, onClose }: { target: ReviewTarget; onClose: () => void }) {
  const api = useApi();
  const upload = useReviewPhotoUpload();
  const [chapters, setChapters] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const send = async () => {
    if (!summary.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const imageId = file ? await upload(file) : undefined;
      await api.addReview({ assignmentId: target.assignmentId, kidId: target.kidId, bookId: target.bookId, chapterRange: chapters.trim() || undefined, summary, imageId });
      setDone(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="py-6 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
        <DialogTitle>Review sent</DialogTitle>
        <DialogDescription>The admin will review it before it is published.</DialogDescription>
        <Button onClick={onClose} className="w-full sm:w-auto">Done</Button>
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a review</DialogTitle>
        <DialogDescription className="break-words">
          {target.kidName} on “{target.bookTitle}”
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div>
          <Label className="mb-1.5 block">Chapters read (optional)</Label>
          <Input value={chapters} onChange={(e) => setChapters(e.target.value)} placeholder="e.g. 1-4" maxLength={40} />
        </div>
        <div>
          <Label className="mb-1.5 block">Comments / review</Label>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value.slice(0, MAX))} placeholder="What did they read? What did they think?" className="min-h-[120px]" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{summary.length}/{MAX}</p>
        </div>
        <div>
          <Label className="mb-1.5 block">Photo of the written review (optional)</Label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Chosen photo" className="w-full max-h-56 object-contain rounded-lg border bg-muted/40" />
              <Button type="button" size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8" aria-label="Remove photo" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full justify-center h-12" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4 mr-2" /> Upload or take a photo
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-1.5">The admin checks reviews before they are published. Avoid full names in photos.</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
        <Button disabled={!summary.trim() || busy} onClick={send} className="w-full sm:w-auto">{busy ? "Sending..." : "Send to admin"}</Button>
      </DialogFooter>
    </>
  );
}

/** Add a review for a book that was given to a child. It goes to the admin first. Opens from the dashboard, the Kids page and more. */
export function ReviewDialog({ target, onClose }: { target: ReviewTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto w-[calc(100%-1.5rem)] sm:w-full">
        {target && <ReviewForm key={target.assignmentId} target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
