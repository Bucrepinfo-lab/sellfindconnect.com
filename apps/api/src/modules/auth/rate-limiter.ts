/**
 * Small in-process sliding-window limiter (per IP). Per-number limits are also
 * enforced from the database so they survive restarts and multiple machines.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records a hit; returns false when the key is over its limit. */
  hit(key: string, now = Date.now()): boolean {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > since);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 50_000) {
      for (const [entry, times] of this.hits) {
        if (!times.some((at) => at > since)) this.hits.delete(entry);
      }
    }
    return true;
  }
}
