
import { mixOklab } from './skyColor';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;


export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};


export const mixColor = (c1: [number, number, number], c2: [number, number, number], t: number) => {
  return mixOklab(c1, c2, clamp01(t));
};
