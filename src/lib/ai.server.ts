const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

export type AiMessage = { role: "system" | "user"; content: string };

export async function callLovableAi(messages: AiMessage[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (response.status === 429) throw new Error("Rate limit reached — try again in a moment.");
  if (response.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error", response.status, text);
    throw new Error("The stylist is unavailable right now.");
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const arrayStart = candidate.indexOf("[");
  const from =
    arrayStart !== -1 && (start === -1 || arrayStart < start) ? arrayStart : start;
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  const slice = from !== -1 && end !== -1 ? candidate.slice(from, end + 1) : candidate;
  return JSON.parse(slice) as T;
}
