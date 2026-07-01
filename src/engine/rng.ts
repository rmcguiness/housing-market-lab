/**
 * Deterministic, seedable pseudo-random number generator.
 *
 * Every simulation run is fully reproducible from its seed, which matters for
 * testing (assert exact economic properties) and for the eventual UI (a slider
 * change should perturb the world predictably, not reshuffle every household).
 *
 * Uses mulberry32 — small, fast, good enough statistically for a behavioural
 * model that does not need cryptographic quality.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Force to uint32 so the same seed always yields the same stream.
    this.state = seed >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform in [min, max). */
  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /**
   * Standard normal sample via Box–Muller. Used as the building block for the
   * log-normal income distribution.
   */
  normal(mean = 0, stdDev = 1): number {
    // Guard against log(0).
    const u1 = this.next() || Number.MIN_VALUE;
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  /**
   * Log-normal sample. `mu` and `sigma` are the mean/stddev of the underlying
   * normal, NOT of the resulting distribution. The median of the result is
   * exp(mu), which is the convenient knob for calibrating to a target median
   * income.
   */
  logNormal(mu: number, sigma: number): number {
    return Math.exp(this.normal(mu, sigma));
  }
}
