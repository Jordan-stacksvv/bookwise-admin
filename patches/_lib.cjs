"use strict";
/**
 * Shared helpers for the patch scripts.
 *
 * - Run scripts from the PROJECT ROOT:  node patches/01-book-codes.cjs
 * - Every edit is staged in memory and written only if ALL anchors match,
 *   so a failed patch never leaves the project half-edited.
 * - Handles Windows CRLF line endings and UTF-8 BOMs explicitly.
 * - Safe to re-run: each script checks for its own marker and skips.
 * - Add --dry to see what would change without writing anything.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRY = process.argv.includes("--dry");
const staged = new Map(); // absolute path -> file record
const copies = []; // { from, to, rel }

const abs = (rel) => path.join(ROOT, rel);
const exists = (rel) => fs.existsSync(abs(rel));

function projectUsesCrlf() {
  try {
    return fs.readFileSync(abs("package.json"), "utf8").includes("\r\n");
  } catch {
    return false;
  }
}

/** Load an existing text file (normalised to LF internally). */
function load(rel) {
  const p = abs(rel);
  if (staged.has(p)) return staged.get(p);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing file: ${rel}\n(Run this from the project root, next to package.json.)`);
  }
  let raw = fs.readFileSync(p, "utf8");
  const bom = raw.charCodeAt(0) === 0xfeff;
  if (bom) raw = raw.slice(1);
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  const rec = { rel, p, text, original: text, crlf, bom, isNew: false };
  staged.set(p, rec);
  return rec;
}

const has = (f, s) => f.text.includes(s);

/** Replace exactly one occurrence of `find`. Throws if missing or ambiguous. */
function replaceOnce(f, find, repl, label) {
  const i = f.text.indexOf(find);
  if (i < 0) {
    throw new Error(
      `[${f.rel}] anchor not found${label ? `: ${label}` : ""}.\n` +
        `The file has probably changed since this patch was written.\n` +
        `Anchor started with: ${JSON.stringify(find.slice(0, 80))}`
    );
  }
  if (f.text.indexOf(find, i + find.length) >= 0) {
    throw new Error(`[${f.rel}] anchor is ambiguous (matches more than once)${label ? `: ${label}` : ""}.`);
  }
  f.text = f.text.slice(0, i) + repl + f.text.slice(i + find.length);
}

/** Insert `line` right after `anchor` unless `line` is already in the file. */
function ensureAfter(f, anchor, line, label) {
  if (has(f, line)) return;
  replaceOnce(f, anchor, anchor + "\n" + line, label || `import after ${anchor.slice(0, 40)}`);
}

/** Create a new file. No-op if it already exists with identical content. */
function create(rel, text, { overwrite = false } = {}) {
  const p = abs(rel);
  const norm = text.replace(/\r\n/g, "\n");
  if (fs.existsSync(p) && !staged.has(p)) {
    const cur = fs.readFileSync(p, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
    if (cur === norm) return;
    if (!overwrite) {
      throw new Error(`${rel} already exists with different content. Move it aside or delete it and re-run.`);
    }
    const rec = load(rel);
    rec.text = norm;
    return;
  }
  staged.set(p, { rel, p, text: norm, original: null, crlf: projectUsesCrlf(), bom: false, isNew: true });
}

/** Queue a binary file copy (e.g. icons shipped next to the patch scripts). */
function copyAsset(fromAbs, toRel) {
  if (!fs.existsSync(fromAbs)) throw new Error(`Missing asset: ${fromAbs}\n(Keep the patches/assets folder next to the scripts.)`);
  copies.push({ from: fromAbs, to: abs(toRel), rel: toRel });
}

function commit() {
  let changed = 0;
  for (const f of staged.values()) {
    if (!f.isNew && f.text === f.original) continue;
    changed++;
    console.log(`${DRY ? "would " : ""}${f.isNew ? "create" : "patch "}  ${f.rel}`);
    if (DRY) continue;
    let out = f.crlf ? f.text.replace(/\n/g, "\r\n") : f.text;
    if (f.bom) out = "﻿" + out;
    fs.mkdirSync(path.dirname(f.p), { recursive: true });
    fs.writeFileSync(f.p, out, "utf8");
  }
  for (const c of copies) {
    changed++;
    console.log(`${DRY ? "would " : ""}copy   ${c.rel}`);
    if (DRY) continue;
    fs.mkdirSync(path.dirname(c.to), { recursive: true });
    fs.copyFileSync(c.from, c.to);
  }
  if (changed === 0) console.log("nothing to change");
}

/** Run a patch body; write nothing unless the whole body succeeds. */
function run(name, body) {
  console.log(`\n== ${name}${DRY ? " (dry run)" : ""} ==`);
  try {
    const res = body();
    if (res === "skip") {
      console.log("already applied - skipped");
      return;
    }
    commit();
    console.log("done");
  } catch (e) {
    console.error(`\nPATCH FAILED - nothing was written.\n${e.message}\n`);
    process.exit(1);
  }
}

module.exports = { ROOT, abs, exists, load, has, replaceOnce, ensureAfter, create, copyAsset, run };
