#!/usr/bin/env bun
/**
 * Run Next.js dev server against .env.setup.local (sandbox Supabase).
 * Overrides .env.local so you can test /setup without touching main dev env.
 *
 * Usage: bun run dev:setup
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "./lib/load-env-file";

const ENV_FILE = ".env.setup.local";
const root = resolve(import.meta.dir, "..");

if (!existsSync(resolve(root, ENV_FILE))) {
  console.error(
    `Missing ${ENV_FILE}. Copy .env.setup.example → ${ENV_FILE} and add a dedicated Supabase sandbox project.`
  );
  process.exit(1);
}

loadEnvFile(ENV_FILE, root);

const child = spawn("bun run dev", {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
