import { useMutation } from "convex/react";
import { Download, FileUp } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Panel } from "@/components/admin-app/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsv, parseCsv, toCsv } from "@/lib/csv";
import { friendlyError } from "@/lib/friendly-error";

type Kind = "books" | "kids" | "teachers";
type Result = { dryRun: boolean; total: number; created: number; skipped: { row: number; reason: string }[]; errors: { row: number; message: string }[] };

const KINDS: Record<Kind, { label: string; headers: string[]; sample: string[][]; note: string }> = {
  books: {
    label: "Books",
    headers: ["Title", "Author", "Category", "Age range", "Department", "Copies", "Code", "Price"],
    sample: [["Heidi", "Johanna Spyri", "Classics", "8-12", "Juniors", "2", "B-101", "35"]],
    note: "Only Title is required. Copies defaults to 1.",
  },
  kids: {
    label: "Kids",
    headers: ["Name", "Date of birth", "Department", "Parent name", "Parent phone"],
    sample: [["Ama Mensah", "08/03/2015", "Juniors", "Kofi Mensah", "0244123456"]],
    note: "Name and either Date of birth (DD/MM/YYYY) or Age are required.",
  },
  teachers: {
    label: "Teachers",
    headers: ["Name", "Department", "Class name", "Phone", "Email"],
    sample: [["Esi Boateng", "Juniors", "Class 4", "0244123456", "esi@example.org"]],
    note: "Only Name is required. Department can be set later.",
  },
};

const CHUNK = 200;
const MAX_TOTAL = 1000;

export function ImportPanel() {
  const run = useMutation(api.imports.run);
  const [kind, setKind] = useState<Kind>("books");
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const grid = parseCsv(text);
    if (grid.length < 2) return [] as Record<string, string>[];
    const head = grid[0].map((h) => h.trim());
    return grid.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
  }, [text]);
  const headers = rows[0] ? Object.keys(rows[0]) : [];

  const send = async (dryRun: boolean) => {
    if (rows.length === 0 || busy) return;
    if (rows.length > MAX_TOTAL) return setError(`Import ${MAX_TOTAL} rows or fewer at a time.`);
    setBusy(true);
    setError("");
    try {
      const total: Result = { dryRun, total: rows.length, created: 0, skipped: [], errors: [] };
      for (let i = 0; i < rows.length; i += CHUNK) {
        const part: Result = await run({ kind, rows: rows.slice(i, i + CHUNK), dryRun });
        total.created += part.created;
        total.skipped.push(...part.skipped.map((s) => ({ ...s, row: s.row + i })));
        total.errors.push(...part.errors.map((e) => ({ ...e, row: e.row + i })));
      }
      setResult(total);
      if (!dryRun) setText("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const k = KINDS[kind];
  return (
    <div className="space-y-6">
      <Panel title="Import from a spreadsheet">
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(KINDS) as Kind[]).map((key) => (
            <Button key={key} size="sm" variant={kind === key ? "default" : "outline"} onClick={() => { setKind(key); setText(""); setResult(null); setError(""); }}>
              {KINDS[key].label}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mb-3">{k.note}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" variant="outline" onClick={() => downloadCsv(`bookwise-${kind}-template`, toCsv(k.headers, k.sample))}>
            <Download className="h-4 w-4 mr-1.5" /> Template
          </Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setText(await file.text());
            setResult(null);
            setError("");
            e.target.value = "";
          }} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4 mr-1.5" /> Choose CSV file
          </Button>
        </div>

        <Textarea value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder={`Or paste rows here, first line = column names\n${k.headers.join(",")}`} className="min-h-[140px] font-mono text-xs" />

        {rows.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">{rows.length} row{rows.length === 1 ? "" : "s"} found</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left">
                  <tr>{headers.map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>{headers.map((h) => <td key={h} className="px-3 py-2 whitespace-nowrap max-w-[14rem] truncate">{r[h]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" disabled={busy} onClick={() => send(true)}>{busy ? "Checking..." : "Check"}</Button>
              <Button disabled={busy || (result?.dryRun === true && result.created === 0)} onClick={() => send(false)}>{busy ? "Importing..." : `Import ${rows.length} rows`}</Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        {result && (
          <div className="mt-5 rounded-lg border p-4 text-sm space-y-3">
            <p className="font-medium">
              {result.dryRun ? `${result.created} will be added` : `${result.created} added`}
              {result.skipped.length > 0 && `, ${result.skipped.length} skipped`}
              {result.errors.length > 0 && `, ${result.errors.length} with problems`}
            </p>
            {result.errors.length > 0 && (
              <ul className="space-y-1 text-destructive">
                {result.errors.slice(0, 25).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
                {result.errors.length > 25 && <li>and {result.errors.length - 25} more</li>}
              </ul>
            )}
            {result.skipped.length > 0 && (
              <ul className="space-y-1 text-muted-foreground">
                {result.skipped.slice(0, 25).map((s, i) => <li key={i}>Row {s.row}: {s.reason}</li>)}
                {result.skipped.length > 25 && <li>and {result.skipped.length - 25} more</li>}
              </ul>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
