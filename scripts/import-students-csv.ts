#!/usr/bin/env bun
/**
 * Import student CSV via Supabase admin API (dev/test)
 * Usage: bun run scripts/import-students-csv.ts --file students-test.csv [--dry-run]
 */

import { readFileSync } from "fs";
import { importStudentRows, parseStudentRosterContent } from "../lib/student-auth-server";

function parseArgs() {
  const args = process.argv.slice(2);
  let file = "students-test.csv";
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) file = args[i + 1];
    if (args[i] === "--dry-run") dryRun = true;
  }
  return { file, dryRun };
}

const { file, dryRun } = parseArgs();
const content = readFileSync(file, "utf8");
const { rows, errors } = parseStudentRosterContent(content);

console.log(`Parsed ${rows.length} rows, ${errors.length} parse errors`);
if (errors.length) console.log(errors);

if (dryRun) {
  console.log("Dry run — not importing");
  process.exit(0);
}

const summary = await importStudentRows(rows, `script_${Date.now()}`, "script");
console.log(summary);
