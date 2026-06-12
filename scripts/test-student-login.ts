#!/usr/bin/env bun
/**
 * Test student login API locally
 * Usage: bun run scripts/test-student-login.ts --id 10001 --password Ab3xY9z
 */

const args = process.argv.slice(2);
let studentId = "";
let password = "";
let baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--id" && args[i + 1]) studentId = args[i + 1];
  if (args[i] === "--password" && args[i + 1]) password = args[i + 1];
  if (args[i] === "--url" && args[i + 1]) baseUrl = args[i + 1];
}

if (!studentId || !password) {
  console.error("Usage: bun run scripts/test-student-login.ts --id 12345 --password secret");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ studentId, password }),
});

const data = await res.json();
console.log("Status:", res.status);
console.log(JSON.stringify(data, null, 2));

if (res.ok) {
  console.log("\nLogin OK — mustChangePassword:", data.mustChangePassword);
  console.log("Has access token:", Boolean(data.access_token));
  console.log("Has refresh token:", Boolean(data.refresh_token));
} else {
  process.exit(1);
}
