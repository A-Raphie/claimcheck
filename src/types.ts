export type Verdict = "VERIFIED" | "REFUTED" | "UNVERIFIABLE";

export interface Claim {
  id: string;
  text: string;
}

export interface ClaimResult {
  id: string;
  text: string;
  verdict: Verdict;
  citation: string;
  rationale: string;
  /** For UNVERIFIABLE claims: the missing evidence that would decide it. */
  settlesWith?: string;
  evidence: EvidenceItem[];
}

export type EvidenceAction =
  | { action: "read_file"; path: string }
  | { action: "search"; pattern: string; regex?: boolean }
  | { action: "list_tests" }
  | { action: "run_tests"; filter?: string }
  | { action: "git_log"; maxEntries?: number }
  | { action: "git_diff"; ref?: string }
  | { action: "run_script"; script: string; args?: string[] };

export interface EvidenceItem {
  action: EvidenceAction;
  ok: boolean;
  output: string;
  durationMs: number;
}

export interface UsageSummary {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

export interface RunReport {
  mode: "baseline" | "advanced";
  model: string;
  startedAt: string;
  durationMs: number;
  claims: ClaimResult[];
  usage: UsageSummary;
  repoPath: string;
  diff: string;
}

export interface GroundTruthEntry {
  verdict: Verdict;
  note: string;
}

export interface EvalCaseManifest {
  id: string;
  description: string;
  claims: Claim[];
  groundTruth: Record<string, GroundTruthEntry>;
  hard?: boolean;
}
