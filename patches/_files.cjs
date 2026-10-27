"use strict";
/** Helpers for patches that ship whole new files under patches/files/. */
const fs = require("fs");
const path = require("path");
const { create } = require("./_lib.cjs");

const FILES = path.join(__dirname, "files");

function walk(dir, base = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = path.posix.join(base, e.name);
    return e.isDirectory() ? walk(path.join(dir, e.name), rel) : [rel];
  });
}

/** Create every file under patches/files/<prefix> (prefix like "convex" or "src/routes/admin"). */
function createTree(prefix) {
  const root = path.join(FILES, prefix);
  if (!fs.existsSync(root)) throw new Error(`Missing patch files: patches/files/${prefix}\n(Keep the whole patches folder together.)`);
  for (const f of walk(root)) {
    create(path.posix.join(prefix, f), fs.readFileSync(path.join(root, f), "utf8"));
  }
}

/** Create one file from patches/files/<rel>. */
function createOne(rel) {
  const p = path.join(FILES, rel);
  if (!fs.existsSync(p)) throw new Error(`Missing patch file: patches/files/${rel}`);
  create(rel, fs.readFileSync(p, "utf8"));
}

const L = (...lines) => lines.join("\n");

module.exports = { createTree, createOne, L, FILES };
