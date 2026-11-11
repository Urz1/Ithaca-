import { readFileSync } from "node:fs";
import path from "node:path";

const summaryPath = path.join(
  process.cwd(),
  "coverage",
  "coverage-summary.json",
);

const scopedPrefixes = ["src/lib/", "src/modules/"];
const minimumLines = 50;

function pct(value) {
  return Number.parseFloat(String(value).replace("%", ""));
}

const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const scopedEntries = Object.entries(summary).filter(
  ([filePath]) =>
    filePath !== "total" &&
    scopedPrefixes.some((prefix) => filePath.includes(prefix)),
);

if (scopedEntries.length === 0) {
  console.error("No scoped coverage entries found for src/lib or src/modules.");
  process.exit(1);
}

let totalLines = 0;
let coveredLines = 0;
const failures = [];

for (const [filePath, metrics] of scopedEntries) {
  const lines = metrics.lines;
  totalLines += lines.total;
  coveredLines += lines.covered;
  const filePct = pct(lines.pct);
  if (filePct < minimumLines) {
    failures.push(`${filePath}: ${filePct.toFixed(1)}% lines`);
  }
}

const aggregatePct = totalLines === 0 ? 0 : (coveredLines / totalLines) * 100;

console.log(
  `Scoped coverage (src/lib + src/modules): ${aggregatePct.toFixed(1)}% lines (${coveredLines}/${totalLines})`,
);

if (aggregatePct < minimumLines) {
  console.error(`Scoped aggregate below ${minimumLines}%`);
  process.exit(1);
}

if (failures.length > 0) {
  console.warn("Some scoped files are below threshold:");
  for (const failure of failures.slice(0, 20)) {
    console.warn(`  - ${failure}`);
  }
}

console.log("Scoped coverage gate passed.");
