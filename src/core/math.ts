export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Lerp independente de framerate. */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);

export const approach = (v: number, target: number, delta: number): number => {
  if (v < target) return Math.min(v + delta, target);
  if (v > target) return Math.max(v - delta, target);
  return target;
};

export const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

export const randRange = (min: number, max: number): number => min + Math.random() * (max - min);

export const randInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1));

export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
