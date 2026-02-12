// Tähdet piirtäminen. Renderöi tähtikentän kanvaalle.

import { Star } from './skyStars';
import { createStarField } from './skyStars';
import { clamp01, mixColor } from './skyUtils';

/* --------------------------------------------------
   Types
-------------------------------------------------- */

type StarEx = Star & {
  rgb: [number, number, number];
  radius: number;
  intensity: number;
  extinction: number;
};

/* --------------------------------------------------
   State
-------------------------------------------------- */

let starData: StarEx[] = [];
let twinkleIndices: number[] = []; // indices of stars that twinkle
let starFieldW = 0;
let starFieldH = 0;

let starLayerCanvas: HTMLCanvasElement | null = null;
let starLayerCtx: CanvasRenderingContext2D | null = null;

type SpriteKey = string;
const starSprites = new Map<SpriteKey, HTMLCanvasElement>();

/* --------------------------------------------------
   Star color temperature
-------------------------------------------------- */

const sampleStarColor = (r01: number): [number, number, number] => {
  if (r01 < 0.1) {
    return mixColor([1.0, 0.7, 0.4], [1.0, 0.82, 0.65], r01 / 0.1);
  } else if (r01 < 0.7) {
    const t = (r01 - 0.1) / 0.6;
    return mixColor([1.0, 0.92, 0.75], [0.98, 0.98, 0.95], t);
  } else {
    const t = (r01 - 0.7) / 0.3;
    return mixColor([0.92, 0.95, 1.0], [0.8, 0.88, 1.0], t);
  }
};

/* --------------------------------------------------
   Star sprite generation
-------------------------------------------------- */

const getStarSprite = (
  radius: number,
  rgb: [number, number, number],
  hasGlow: boolean,
  glowStrength: number = 1
) => {
  const rBucket = Math.round(radius * 10) / 10;
  const cBucket = `${Math.round(rgb[0] * 10)}${Math.round(rgb[1] * 10)}${Math.round(rgb[2] * 10)}`;
  const gBucket = hasGlow ? `g${Math.round(glowStrength * 10)}` : 'g0';
  const key: SpriteKey = `${rBucket}_${cBucket}_${gBucket}`;

  const cached = starSprites.get(key);
  if (cached) return cached;

  const size = 6;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // ---- HARD PINPOINT CORE (1 pixel) ----
  ctx.fillStyle = `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},1)`;
  ctx.fillRect(cx - 0.5, cy - 0.5, 1, 1);

  // ---- SOFT ATMOSPHERIC GLOW ----
  if (hasGlow) {
    const glow = ctx.createRadialGradient(cx, cy, 1.2, cx, cy, size * 0.6);

    const g0 = 0.028 * glowStrength; // was 0.018
const g1 = 0.012 * glowStrength; // was 0.007

    glow.addColorStop(0, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},${g0})`);
    glow.addColorStop(0.25, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},${g1})`);
    glow.addColorStop(1, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},0)`);

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  }

  starSprites.set(key, canvas);
  return canvas;
};

/* --------------------------------------------------
   Twinkle bloom sprite (larger, softer glow)
-------------------------------------------------- */

const twinkleBloomSprites = new Map<string, HTMLCanvasElement>();

const getTwinkleBloomSprite = (
  rgb: [number, number, number],
  bloomRadius: number
) => {
  const rB = Math.round(bloomRadius * 4) / 4;
  const cB = `${Math.round(rgb[0] * 10)}${Math.round(rgb[1] * 10)}${Math.round(rgb[2] * 10)}`;
  const key = `tb_${rB}_${cB}`;

  const cached = twinkleBloomSprites.get(key);
  if (cached) return cached;

  const size = Math.ceil(bloomRadius * 2 + 4);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // Bright core
  ctx.fillStyle = `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},1)`;
  ctx.fillRect(cx - 1, cy - 1, 2, 2);

  // Bloom glow - soft radial
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomRadius);
  glow.addColorStop(0, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},0.35)`);
  glow.addColorStop(0.2, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},0.18)`);
  glow.addColorStop(0.5, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},0.06)`);
  glow.addColorStop(1, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},0)`);

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, bloomRadius, 0, Math.PI * 2);
  ctx.fill();

  twinkleBloomSprites.set(key, canvas);
  return canvas;
};

/* --------------------------------------------------
   Atmospheric extinction
-------------------------------------------------- */

const starExtinction = (y: number, height: number) => {
  const alt = clamp01(1 - y / height);
  return 0.3 + 0.7 * Math.pow(alt, 1.2);
};

/* --------------------------------------------------
   Build static star field
-------------------------------------------------- */

export const ensureStarField = (width: number, height: number) => {
  if (
    starData.length &&
    width === starFieldW &&
    height === starFieldH &&
    starLayerCanvas
  ) return;

  const raw = createStarField(width, height);

  starData = raw.map((s) => {
    const base = clamp01(s.baseAlpha);
    const intensity = Math.pow(base, 1.8);
    const h = Math.abs((Math.sin(s.x * 12.9898 + s.y * 78.233) * 43758.5453) % 1);

    return {
      ...s,
      rgb: sampleStarColor(h),
      radius: Math.max(0.5, Math.min(2.0, s.size * 1.2)),
      intensity,
      extinction: starExtinction(s.y, height)
    };
  });

  // Pre-collect twinkling star indices for the dynamic pass
  twinkleIndices = [];
  for (let i = 0; i < starData.length; i++) {
    if (starData[i].twinkle) twinkleIndices.push(i);
  }

  starFieldW = width;
  starFieldH = height;

  starLayerCanvas = document.createElement('canvas');
  starLayerCanvas.width = width;
  starLayerCanvas.height = height;
  starLayerCtx = starLayerCanvas.getContext('2d');
  if (!starLayerCtx) return;

  starLayerCtx.clearRect(0, 0, width, height);
  starLayerCtx.globalCompositeOperation = 'lighter';
  starLayerCtx.imageSmoothingEnabled = false;

  for (const s of starData) {
    const a = clamp01(s.intensity * s.extinction) * 0.95;
    if (a < 0.002) continue;

    const sprite = getStarSprite(s.radius, s.rgb, s.intensity > 0.4, 1);
    const half = sprite.width / 2;

    starLayerCtx.globalAlpha = a;
    starLayerCtx.drawImage(sprite, s.x - half, s.y - half);
  }

  starLayerCtx.globalAlpha = 1;
  starLayerCtx.imageSmoothingEnabled = true;
};

/* --------------------------------------------------
   Draw stars
-------------------------------------------------- */

export const drawStars = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunElevation: number,
  cloudCover: number,
  time: number
) => {
  const cloudVisibility = Math.max(0, 1 - cloudCover * 1.2);

  const CIVIL = -6;
  const ASTRO = -18;

  if (sunElevation >= CIVIL || cloudVisibility < 0.01) return;

  ensureStarField(width, height);

  const nightFade = clamp01((CIVIL - sunElevation) / (CIVIL - ASTRO));
  const globalAlpha = nightFade * cloudVisibility;
  if (!starLayerCanvas || globalAlpha < 0.01) return;

  // ---------- BASE STAR LAYER ----------
  ctx.save();
  ctx.globalAlpha = globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(starLayerCanvas, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.restore();

  // ---------- TWINKLE + BLOOM OVERLAY ----------
  if (twinkleIndices.length > 0 && globalAlpha > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;

    const t = time * 0.001; // seconds

    for (let j = 0; j < twinkleIndices.length; j++) {
      const s = starData[twinkleIndices[j]];
      const tw = s.twinkle!;

      // Compound sine for organic, non-uniform flicker
      const raw =
        Math.sin(t * tw.speed + tw.phase) * 0.6 +
        Math.sin(t * tw.speed * 1.73 + tw.phase * 2.1) * 0.3 +
        Math.sin(t * tw.speed * 0.37 + tw.phase * 0.7) * 0.1;

      // Map to 0..1 then apply amplitude
      const twinkle01 = clamp01((raw + 1) * 0.5);
      const brightBoost = twinkle01 * tw.amplitude;

      if (brightBoost < 0.05) continue; // skip dim phases for perf

      const a = clamp01(s.intensity * s.extinction * brightBoost * 2.5) * globalAlpha;
      if (a < 0.005) continue;

      // Bloom radius scales with brightness
      const bloomR = 3.5 + brightBoost * 8.0 * (0.5 + s.intensity * 0.5);
      const sprite = getTwinkleBloomSprite(s.rgb, bloomR);
      const half = sprite.width / 2;

      ctx.globalAlpha = a;
      ctx.drawImage(sprite, s.x - half, s.y - half);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
};
