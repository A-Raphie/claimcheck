import { spawn } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import type { EvidenceAction, EvidenceItem } from "./types.js";

const MAX_OUTPUT = 6000;
const COMMAND_TIMEOUT_MS = 30_000;
const ALLOWED_BINARIES = new Set(["node", "git"]);

export class Sandbox {
  readonly dir: string;
  private cleaned = false;

  /** Prefer Sandbox.fromRepo; direct construction exists for unit tests. */
  constructor(dir: string) {
    this.dir = dir;
  }

  static async fromRepo(repoPath: string): Promise<Sandbox> {
    const st = await stat(repoPath);
    if (!st.isDirectory()) throw new Error(`repo path is not a directory: ${repoPath}`);
    const dir = await mkdtemp(join(tmpdir(), "claimcheck-"));
    await cp(repoPath, dir, { recursive: true, filter: (src) => !src.includes(".git") ? true : src.endsWith(".git") ? false : true });
    // Keep git history when present: copy .git separately if it exists.
    try {
      await cp(join(repoPath, ".git"), join(dir, ".git"), { recursive: true });
    } catch {
      // No git history in source repo; git tools will report that honestly.
    }
    return new Sandbox(dir);
  }

  async cleanup(): Promise<void> {
    if (this.cleaned) return;
    this.cleaned = true;
    await rm(this.dir, { recursive: true, force: true });
  }

  /** Resolve a path inside the sandbox, refusing escapes. */
  inside(relPath: string): string {
    const abs = resolve(this.dir, relPath);
    if (abs !== this.dir && !abs.startsWith(this.dir + "/")) {
      throw new Error(`path escapes sandbox: ${relPath}`);
    }
    return abs;
  }

  async readFile(path: string): Promise<string> {
    const abs = this.inside(path);
    const st = await stat(abs);
    if (st.size > 200_000) {
      return (await readFile(abs, "utf8")).slice(0, MAX_OUTPUT) + `\n... truncated (file is ${st.size} bytes)`;
    }
    return (await readFile(abs, "utf8")).slice(0, MAX_OUTPUT);
  }

  async search(pattern: string, regex: boolean): Promise<string> {
    const results: string[] = [];
    const files = await this.walkFiles();
    const flags = "m" + (RegexSafety(pattern) ? "i" : "");
    const re = RegexSafety(pattern)
      ? new RegExp(pattern, flags)
      : null;
    const lower = pattern.toLowerCase();
    for (const file of files) {
      if (file.includes("node_modules/") || file.includes(".git/")) continue;
      const content = await this.readFile(file);
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const hit = re ? re.test(line) : line.toLowerCase().includes(lower);
        if (hit) results.push(`${file}:${i + 1}: ${line.trim().slice(0, 200)}`);
      });
      if (results.length > 200) break;
    }
    return results.slice(0, 200).join("\n") || "(no matches)";
  }

  async listTests(): Promise<string> {
    const files = (await this.walkFiles()).filter(
      (f) => /\.(test|spec)\.[cm]?[jt]s$/.test(f) || /(^|\/)tests?\//.test(f),
    );
    return files.join("\n") || "(no test files found)";
  }

  async gitLog(maxEntries: number): Promise<string> {
    return this.run("git", ["log", `-${maxEntries}`, "--stat", "--format=medium"]);
  }

  async gitDiff(ref?: string): Promise<string> {
    const args = ref ? ["diff", `${ref}...HEAD`] : ["diff", "HEAD~1", "HEAD"];
    return this.run("git", args);
  }

  async runTests(filter?: string): Promise<string> {
    const args = ["--test"];
    if (filter) args.push(filter);
    return this.run("node", args, { timeoutMs: 60_000 });
  }

  async runScript(script: string, args: string[] = []): Promise<string> {
    const abs = this.inside(script);
    return this.run("node", [abs, ...args], { timeoutMs: 30_000 });
  }

  async execute(action: EvidenceAction): Promise<EvidenceItem> {
    const started = performance.now();
    try {
      let output: string;
      switch (action.action) {
        case "read_file":
          output = await this.readFile(action.path);
          break;
        case "search":
          output = await this.search(action.pattern, action.regex ?? false);
          break;
        case "list_tests":
          output = await this.listTests();
          break;
        case "run_tests":
          output = await this.runTests(action.filter);
          break;
        case "git_log":
          output = await this.gitLog(action.maxEntries ?? 5);
          break;
        case "git_diff":
          output = await this.gitDiff(action.ref);
          break;
        case "run_script":
          output = await this.runScript(action.script, action.args);
          break;
        default:
          output = `unsupported action: ${(action as EvidenceAction).action}`;
      }
      return {
        action,
        ok: true,
        output: clip(output, MAX_OUTPUT),
        durationMs: Math.round(performance.now() - started),
      };
    } catch (err) {
      return {
        action,
        ok: false,
        output: clip(`ERROR: ${(err as Error).message}`, MAX_OUTPUT),
        durationMs: Math.round(performance.now() - started),
      };
    }
  }

  async walkFiles(): Promise<string[]> {
    const out: string[] = [];
    const walk = async (rel: string) => {
      const entries = await readdir(join(this.dir, rel), { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (e.name === ".git" || e.name === "node_modules") continue;
        const relPath = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(relPath);
        else out.push(relPath);
      }
    };
    await walk("");
    return out.sort();
  }

  private async run(
    bin: string,
    args: string[],
    opts: { timeoutMs?: number } = {},
  ): Promise<string> {
    if (!ALLOWED_BINARIES.has(bin)) throw new Error(`binary not allowed: ${bin}`);
    return new Promise<string>((resolvePromise, reject) => {
      const child = spawn(bin, args, {
        cwd: this.dir,
        env: {
          PATH: process.env.PATH ?? "/usr/bin:/bin",
          HOME: this.dir,
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: "/dev/null",
          LANG: "C",
          NO_COLOR: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs ?? COMMAND_TIMEOUT_MS);
      child.stdout.on("data", (d) => (out += d.toString()));
      child.stderr.on("data", (d) => (out += d.toString()));
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolvePromise(out);
        else resolvePromise(out + `\n(exit code ${code})`);
      });
    });
  }
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n... output truncated at ${max} characters`;
}

function RegexSafety(pattern: string): boolean {
  try {
    new RegExp(pattern, "mi");
    return true;
  } catch {
    return false;
  }
}

// Keep dirname import used for potential future path joins without breaking tree-shaking checks.
void dirname;
