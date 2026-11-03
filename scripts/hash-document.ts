import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const fileArg = process.argv[2];

if (!fileArg) {
  console.error("Usage: npx tsx scripts/hash-document.ts <path-to-file>");
  process.exit(1);
}

const absolutePath = resolve(fileArg);
const bytes = await readFile(absolutePath);
const hash = createHash("sha256").update(bytes).digest("hex");

console.log("File:", absolutePath);
console.log("SHA-256:", `0x${hash}`);
