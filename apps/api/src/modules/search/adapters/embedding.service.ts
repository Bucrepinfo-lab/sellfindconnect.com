export class EmbeddingService {
  private readonly MODEL = "text-embedding-3-small";
  constructor(private env: Record<string,string|undefined> = process.env, private fetchImpl: typeof fetch = fetch) {}
  get isEnabled(): boolean { return !!this.env["OPENAI_API_KEY"]; }

  async embed(text: string): Promise<number[]|null> {
    if (!this.isEnabled) return null;
    const res = await this.fetchImpl("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: "Bearer " + this.env["OPENAI_API_KEY"], "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.MODEL, input: text.slice(0, 8000) }),
    });
    if (!res.ok) { console.warn("[EmbeddingService] API error", res.status); return null; }
    const json = await res.json() as { data: Array<{ embedding: number[] }> };
    return json.data[0]?.embedding ?? null;
  }

  async embedBatch(texts: string[]): Promise<(number[]|null)[]> {
    if (!this.isEnabled || texts.length === 0) return texts.map(() => null);
    const res = await this.fetchImpl("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: "Bearer " + this.env["OPENAI_API_KEY"], "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.MODEL, input: texts.map(t => t.slice(0, 8000)) }),
    });
    if (!res.ok) return texts.map(() => null);
    const json = await res.json() as { data: Array<{ embedding: number[]; index: number }> };
    const out: (number[]|null)[] = texts.map(() => null);
    for (const item of json.data) out[item.index] = item.embedding;
    return out;
  }
}
