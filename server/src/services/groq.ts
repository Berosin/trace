// ---------------------------------------------------------------------------
// Groq client. Groq gives free-tier API keys (https://console.groq.com/keys)
// and runs open models (Llama 3.x, etc.) at very low latency, which is why
// TRACE uses it instead of OpenAI — every agent "step" in the UI is a real
// inference call, and Groq is fast enough that clicking a button and getting
// back a genuinely-reasoned diagnostic update still feels instant.
//
// This module is the ONLY place that talks to the network. Swapping to a
// different OpenAI-compatible provider (OpenAI itself, Together, Fireworks,
// a local vLLM server, etc.) means changing GROQ_BASE_URL / GROQ_MODEL in
// .env — nothing else in the codebase needs to change.
// ---------------------------------------------------------------------------

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export function isLLMConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function providerName(): string {
  return isLLMConfigured() ? `groq:${GROQ_MODEL}` : "not configured";
}

export class LLMNotConfiguredError extends Error {
  constructor() {
    super(
      "GROQ_API_KEY is not set. TRACE's agents run on real inference, not scripted output, so a key is required. " +
        "Get a free key at https://console.groq.com/keys and add it to server/.env as GROQ_API_KEY=..., then restart the server."
    );
    this.name = "LLMNotConfiguredError";
  }
}

/**
 * Calls Groq's chat completions endpoint and parses the response as JSON.
 * Every reasoning step in TRACE (triage, escalation, recovery, resolution)
 * goes through this function with a schema-describing prompt, so the model
 * always returns structured diagnostic data we can render directly.
 */
export async function chatJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  if (!isLLMConfigured()) throw new LLMNotConfiguredError();

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq API returned no content");

  try {
    return JSON.parse(content) as T;
  } catch {
    // Some models occasionally wrap JSON in prose despite the response_format
    // hint — fall back to extracting the first {...} block before giving up.
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through */
      }
    }
    throw new Error(`Groq returned non-JSON content: ${content.slice(0, 300)}`);
  }
}
