type Cell = string | number | boolean | null | undefined;

/** Stops spreadsheet programs from running a typed "=..." or "@..." cell as a formula. Phone numbers like +233... are left alone. */
const safe = (s: string) => (/^[=@]/.test(s) || /^[+-][^0-9\s.]/.test(s) ? `'${s}` : s);

const cell = (c: Cell) => {
  if (c === null || c === undefined) return "";
  const s = typeof c === "string" ? safe(c) : String(c);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

/** Date and time in the viewer's own time zone, like 2026-10-28 14:05 (sorts correctly in Excel). */
export const csvDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("sv-SE").slice(0, 16) : "");

/** Downloads a CSV. The leading BOM makes Excel read names with accents correctly. */
export function downloadCsv(name: string, csv: string) {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".csv") ? name : `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reads CSV text into rows of cells. Handles quotes, CRLF, a BOM, and comma, semicolon or tab separators. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t"].map((c) => [c, first.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}
