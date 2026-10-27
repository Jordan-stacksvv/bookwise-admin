"use strict";
/**
 * Runs every numbered patch in order, stopping at the first failure.
 * Each patch is atomic and safe to re-run (already-applied patches are skipped).
 *
 *   node patches/run-all.cjs          apply everything
 *   node patches/run-all.cjs --dry    show what would change, write nothing
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const extra = process.argv.slice(2);
const scripts = fs
  .readdirSync(__dirname)
  .filter((f) => /^\d\d-.*\.cjs$/.test(f))
  .sort();

for (const s of scripts) {
  const r = spawnSync(process.execPath, [path.join(__dirname, s), ...extra], { stdio: "inherit", cwd: process.cwd() });
  if (r.status !== 0) {
    console.error(`\nStopped at ${s}. Fix the problem above, then re-run - finished patches are skipped.`);
    process.exit(r.status || 1);
  }
}
console.log("\nAll patches processed.");
