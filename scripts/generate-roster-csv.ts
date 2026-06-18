#!/usr/bin/env bun
/**
 * Generate roster test file (colon-delimited, no passwords)
 * Usage: bun run scripts/generate-roster-csv.ts --count 100 --output tests/fixtures/students-100.csv
 */

import { writeFileSync } from "fs";

const FIRST_NAMES = [
  "สมชาย", "สมหญิง", "วิชัย", "พิมพ์", "อรุณ", "นารี", "ธนา", "มานี", "กิตติ", "สุดา",
  "ประเสริฐ", "วราภรณ์", "ณัฐพล", "ชลธิชา", "อภิชาติ", "พัชรี", "ศุภกร", "มณีรัตน์", "เกียรติ", "ปิยะ",
];
const LAST_NAMES = [
  "ใจดี", "รักเรียน", "มั่นคง", "สดใส", "เก่งกาจ", "ยิ้มแย้ม", "ขยัน", "สุภาพ", "กล้าหาญ", "อดทน",
  "วงศ์สกุล", "ศรีสุข", "ทองดี", "แสงจันทร์", "พูนสุข", "บุญมา", "จันทร์เพ็ญ", "สุวรรณ", "เพชรรัตน์", "คำแพง",
];

const GRADES = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6", "ป.4", "ป.5", "ป.6"];

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 100;
  let output = "tests/fixtures/students-100.csv";
  let startId = 30001;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" && args[i + 1]) count = parseInt(args[i + 1], 10);
    if (args[i] === "--output" && args[i + 1]) output = args[i + 1];
    if (args[i] === "--start-id" && args[i + 1]) startId = parseInt(args[i + 1], 10);
  }

  return { count, output, startId };
}

type RowFormat = "class4" | "classFull3" | "name3" | "full2";

function pickFormat(i: number): RowFormat {
  const r = i % 20;
  if (r < 12) return "class4";
  if (r < 15) return "classFull3";
  if (r < 18) return "name3";
  return "full2";
}

const { count, output, startId } = parseArgs();
const lines: string[] = [
  "# Found-U roster test file (colon-delimited)",
  "# Formats: id:class/room:first:last | id:class:fullname | id:first:last | id:fullname",
  "studentId:gradeOrRoom:firstName:lastName",
];

for (let i = 0; i < count; i++) {
  const studentId = String(startId + i).padStart(5, "0");
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
  const grade = GRADES[i % GRADES.length];
  const room = String((i % 15) + 1);
  const format = pickFormat(i);

  switch (format) {
    case "class4":
      lines.push(`${studentId}:${grade}/${room}:${firstName}:${lastName}`);
      break;
    case "classFull3":
      lines.push(`${studentId}:${grade}:${firstName} ${lastName}`);
      break;
    case "name3":
      lines.push(`${studentId}:${firstName}:${lastName}`);
      break;
    case "full2":
      lines.push(`${studentId}:${firstName} ${lastName}`);
      break;
  }
}

writeFileSync(output, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${count} students to ${output}`);
