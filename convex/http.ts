import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

/**
 * Batch insert over HTTP, for scripts.
 *
 *   POST https://<your-deployment>.convex.site/import/books      (or /import/kids, /import/teachers)
 *   Authorization: Bearer <IMPORT_API_KEY>
 *   Content-Type: application/json
 *   { "rows": [ { "title": "Heidi", "author": "Johanna Spyri", ... } ], "dryRun": false }
 *
 * The endpoint is OFF until a key of 24+ characters is set:  npx convex env set IMPORT_API_KEY <key>
 * Column names are the same as in the admin Import page. Up to 500 rows per call.
 */
const http = httpRouter();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** Compares two secrets without leaking where they differ. */
async function sameSecret(given: string, expected: string) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(given)), crypto.subtle.digest("SHA-256", enc.encode(expected))]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const MAX_BYTES = 2_000_000;

function importRoute(kind: "books" | "kids" | "teachers") {
  http.route({
    path: `/import/${kind}`,
    method: "POST",
    handler: httpAction(async (ctx, req) => {
      const key = process.env.IMPORT_API_KEY;
      if (!key || key.length < 24) return json({ error: "Import API is switched off. Set IMPORT_API_KEY (24+ characters) on the deployment." }, 503);
      const given = /^Bearer (.+)$/.exec(req.headers.get("Authorization") ?? "")?.[1] ?? "";
      if (!given || !(await sameSecret(given, key))) return json({ error: "Unauthorized." }, 401);

      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: "Request is too large." }, 413);
      let body: { rows?: unknown; dryRun?: unknown };
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "Body must be JSON." }, 400);
      }
      if (!body || !Array.isArray(body.rows)) return json({ error: 'Send {"rows": [ ... ]}.' }, 400);
      const dryRun = body.dryRun === true || new URL(req.url).searchParams.get("dryRun") === "true";
      try {
        return json(await ctx.runMutation(internal.imports.runFromApi, { kind, rows: body.rows, dryRun }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Import failed.";
        return json({ error: msg.replace(/^\[.*?\]\s*/, "").slice(0, 200) }, 400);
      }
    }),
  });
}

importRoute("books");
importRoute("kids");
importRoute("teachers");

export default http;
