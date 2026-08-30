import type { UsageSummary } from "./types.js";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

// Rough public list prices per 1M tokens; override with CLAIMCHECK_PRICE_IN/OUT.
const PRICES: Record<string, [number, number]> = {
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10],
  "gpt-4.1-mini": [0.4, 1.6],
  "openai/gpt-oss-120b": [0.15, 0.6],
  "openai/gpt-oss-20b": [0.075, 0.3],
  "llama-3.3-70b-versatile": [0.59, 0.79],
  "llama-3.1-8b-instant": [0.05, 0.08],
};

export class AgentError extends Error {}

export interface AgentCall {
  system: string;
  user: string;
  maxTokens?: number;
  label: string;
}

export interface AgentReply {
  text: string;
  usage: UsageSummary;
}

export class Agent {
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly temperature: number;
  readonly usage: UsageSummary = {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
  };

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = (env.CLAIMCHECK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiKey = env.CLAIMCHECK_API_KEY || "";
    this.model = env.CLAIMCHECK_MODEL || DEFAULT_MODEL;
    this.temperature = Number(env.CLAIMCHECK_TEMPERATURE ?? 0);
    if (!this.apiKey) {
      throw new AgentError(
        "CLAIMCHECK_API_KEY is not set. Claimcheck needs any OpenAI-compatible key. " +
          "Set CLAIMCHECK_BASE_URL and CLAIMCHECK_MODEL if you do not use OpenAI. " +
          "Free tiers such as Groq or OpenRouter work: create a key, then run " +
          "CLAIMCHECK_BASE_URL=https://api.groq.com/openai/v1 CLAIMCHECK_MODEL=openai/gpt-oss-120b CLAIMCHECK_API_KEY=... <command>"
      );
    }
  }

  async chat(call: AgentCall, attempt = 0): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: this.temperature,
        max_tokens: call.maxTokens ?? 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AgentError(`model call ${call.label} failed: HTTP ${res.status} ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as any;
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new AgentError(`model call ${call.label} returned empty content`);
    }
    const u = data?.usage;
    if (u) {
      this.usage.calls += 1;
      this.usage.promptTokens += Number(u.prompt_tokens ?? 0);
      this.usage.completionTokens += Number(u.completion_tokens ?? 0);
      const price = this.pricePerMTok();
      this.usage.costUsd +=
        (Number(u.prompt_tokens ?? 0) / 1e6) * price[0] +
        (Number(u.completion_tokens ?? 0) / 1e6) * price[1];
    }
    return text;
  }

  async chatJson<T>(call: AgentCall, attempt = 0): Promise<T> {
    const text = await this.chat(call, attempt);
    try {
      return parseJsonLoose(text) as T;
    } catch (err) {
      if (attempt < 1) {
        return this.chatJson(
          {
            ...call,
            user:
              `${call.user}\n\nYour previous reply was not valid JSON ` +
              `(${(err as Error).message}). Reply again with ONLY the JSON object.`,
          },
          attempt + 1,
        );
      }
      throw new AgentError(`model call ${call.label} produced unparseable JSON: ${text.slice(0, 300)}`);
    }
  }

  private pricePerMTok(): [number, number] {
    const envIn = Number(process.env.CLAIMCHECK_PRICE_IN);
    const envOut = Number(process.env.CLAIMCHECK_PRICE_OUT);
    if (Number.isFinite(envIn) && Number.isFinite(envOut)) return [envIn, envOut];
    return PRICES[this.model] ?? [0, 0];
  }
}

export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error("no JSON object found");
  }
}
