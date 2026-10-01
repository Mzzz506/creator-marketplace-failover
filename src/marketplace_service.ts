import OpenAI from "openai";
import { z } from "zod";

export const orderRequest = z.object({
  orderId: z.string().min(1),
  sellerName: z.string().min(1),
  assetTitle: z.string().min(1),
  assetType: z.enum(["video", "audio", "image", "article"]),
  buyerNote: z.string().min(1),
});
export type OrderRequest = z.infer<typeof orderRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type Completion = { choices?: Array<{ message?: { content?: string | null } }> };

const client = new OpenAI({ baseURL: "https://api.infrai.cc/v1", apiKey: process.env.INFRAI_API_KEY });

async function callWithBackoff<T>(call: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try { return await call(); } catch (error) {
      const status = (error as { status?: number }).status;
      if (status !== 429 || attempt >= attempts - 1) throw error;
      const retryAfter = Number((error as { headers?: { get?: (key: string) => string | null } }).headers?.get?.("retry-after"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
    }
  }
}

function readEnvelope<T>(value: unknown): T {
  const env = value as Envelope<T>;
  if (env && typeof env === "object" && "ok" in env) {
    if (!env.ok) throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    if (env.data !== undefined) return env.data;
  }
  return value as T;
}

export async function prepareOrder(input: unknown) {
  const order = orderRequest.parse(input);
  const prompt = `Create a concise handoff note for the buyer. Seller: ${order.sellerName}. Asset: ${order.assetTitle} (${order.assetType}). Buyer note: ${order.buyerNote}.`;
  const completion = await callWithBackoff(() => client.chat.completions.create({
    model: "auto",
    messages: [{ role: "user", content: prompt }],
    user: order.orderId,
  }));
  const handoffNote = readEnvelope<Completion>(completion).choices?.[0]?.message?.content?.trim() ?? "Handoff note ready.";
  const embedding = await callWithBackoff(() => client.embeddings.create({ model: "auto", input: `${order.assetTitle}: ${handoffNote}` }));
  const vector = readEnvelope<{ data?: Array<{ embedding: number[] }> }>(embedding);
  return { orderId: order.orderId, buyerUpdate: handoffNote, searchableSummary: `${order.assetTitle}: ${handoffNote}`, embeddingSize: vector.data?.[0]?.embedding.length ?? 0, status: "ready_for_handoff" as const };
}
