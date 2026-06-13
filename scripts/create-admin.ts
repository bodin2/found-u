#!/usr/bin/env bun
/**
 * สร้างบัญชีแอดมินระบบ (bootstrap)
 * Usage: bun run scripts/create-admin.ts [--student-id 00000] [--password yourpassword]
 */

import { createBootstrapAdminAccount } from "../lib/student-auth-server";

function parseArgs() {
  const args = process.argv.slice(2);
  let studentId = "5_digits";
  let password = "your-password";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--student-id" && args[i + 1]) studentId = args[++i];
    if (args[i] === "--password" && args[i + 1]) password = args[++i];
  }

  return { studentId, password };
}

const { studentId, password } = parseArgs();

const result = await createBootstrapAdminAccount({
  studentId,
  password,
  firstName: "Admin",
  lastName: "Found-U",
  nickname: "Admin",
});

console.log("สร้างบัญชีแอดมินสำเร็จ");
console.log({ studentId: result.studentId, uid: result.uid });
