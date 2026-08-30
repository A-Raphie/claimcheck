import type { RunReport, Verdict } from "../types.js";

const COLORS: Record<Verdict, string> = {
  VERIFIED: "\x1b[32m",
  REFUTED: "\x1b[31m",
  UNVERIFIABLE: "\x1b[33m",
};
const RESET = "\x1b[0m";

export function renderTable(report: RunReport): string {
  const rows = report.claims.map((c) => {
    const color = COLORS[c.verdict] ?? "";
    return [
      c.id,
      clip(c.text, 46),
      `${color}${c.verdict}${RESET}`,
      clip(c.citation, 60),
    ];
  });
  const widths = [6, 46, 14, 60].map((w, i) =>
    Math.min(Math.max(w, ...rows.map((r) => r[i].length + (r[i].includes("\x1b") ? 9 : 0))), w + 6),
  );
  const header = pad("CLAIM", widths[0]) + "  " + pad("TEXT", widths[1]) + "  " + pad("VERDICT", widths[2] + 9) + "  CITATION";
  const sep = "-".repeat(header.length);
  const body = rows.map((r) => pad(r[0], widths[0]) + "  " + pad(r[1], widths[1]) + "  " + pad(r[2], widths[2] + 9) + "  " + r[3]);
  return [
    `claimcheck ${report.mode} run · ${report.claims.length} claims · ${report.model} · ${(report.durationMs / 1000).toFixed(1)}s · $${report.usage.costUsd.toFixed(5)}`,
    sep,
    header,
    sep,
    ...body,
    sep,
  ].join("\n");
}

function pad(s: string, w: number): string {
  const visible = s.replace(/\x1b\[\d+m/g, "");
  return s + " ".repeat(Math.max(w + 2 - visible.length, 1));
}

function clip(s: string, max: number): string {
  const single = s.replace(/\s+/g, " ").trim();
  return single.length > max ? single.slice(0, max - 1) + "…" : single;
}
