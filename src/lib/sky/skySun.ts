import type { SunScreenPos } from './skyView';
import { clamp01, smoothstep } from './skyUtils';

/* --------------------------------------------------
   Colour helpers
-------------------------------------------------- */

type Rgb = [number, number, number];

const lerpRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const rgbaCache = new Map<string, string>();
const RGBA_CACHE_MAX = 256;

const toRgba = (c: Rgb, a: number) => {
  const r = (c[0] * 255) | 0;
  const g = (c[1] * 255) | 0;
  const b = (c[2] * 255) | 0;
  const ab = (a * 1000 + 0.5) | 0;
  const key = (r << 24 | g << 16 | b << 8 | ab) >>> 0;
  const sKey = key.toString(36);

  const cached = rgbaCache.get(sKey);
  if (cached) return cached;

  const result = `rgba(${r},${g},${b},${a})`;
  if (rgbaCache.size >= RGBA_CACHE_MAX) {
    const first = rgbaCache.keys().next().value;
    if (first !== undefined) rgbaCache.delete(first);
  }
  rgbaCache.set(sKey, result);
  return result;
};

/* --------------------------------------------------
   Lens flare configuration
-------------------------------------------------- */

type FlareElement = {
  position: number;
  size: number;
  color: Rgb;
  alpha: number;
  shape?: 'circle' | 'hex' | 'ring';
  ca?: number;
  rimBias?: number;
  squeeze?: number;
};

const FLARE_ELEMENTS: FlareElement[] = [
  // Warm golden primary flares near the sun
  { position: 0.12, size: 0.025, color: [1.0, 0.95, 0.75], alpha: 0.45, ca: 0.03, rimBias: 0.15 },
  { position: 0.22, size: 0.015, color: [1.0, 0.88, 0.65], alpha: 0.38, ca: 0.04, rimBias: 0.25, shape: 'hex' },
  
  // Subtle rainbow spectrum (desaturated)
  { position: 0.38, size: 0.032, color: [0.95, 0.95, 0.70], alpha: 0.32, ca: 0.05, rimBias: 0.4 },
  { position: 0.50, size: 0.018, color: [0.90, 0.92, 0.85], alpha: 0.28, ca: 0.04, rimBias: 0.3, shape: 'hex' },
  { position: 0.65, size: 0.048, color: [0.88, 0.90, 0.95], alpha: 0.24, ca: 0.06, rimBias: 0.5, shape: 'ring' },
  { position: 0.78, size: 0.014, color: [1.0, 0.92, 0.80], alpha: 0.30, ca: 0.03, rimBias: 0.25 },
  { position: 1.0, size: 0.08, color: [1.0, 0.94, 0.78], alpha: 0.18, ca: 0.02, rimBias: 0.08, squeeze: 0.88 },
  { position: 1.15, size: 0.024, color: [0.98, 0.90, 0.75], alpha: 0.22, ca: 0.05, rimBias: 0.35, shape: 'hex' },
  { position: 1.35, size: 0.038, color: [0.85, 0.88, 0.92], alpha: 0.17, ca: 0.07, rimBias: 0.45, shape: 'ring' },
  { position: 1.50, size: 0.016, color: [1.0, 0.93, 0.82], alpha: 0.20, ca: 0.03, rimBias: 0.3 },
  { position: 1.70, size: 0.065, color: [0.92, 0.90, 0.88], alpha: 0.14, ca: 0.08, rimBias: 0.55, shape: 'ring' },
  { position: 1.88, size: 0.012, color: [1.0, 0.96, 0.88], alpha: 0.16, ca: 0.02, rimBias: 0.2 },
];

const hexPath = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, squeeze = 1) => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a) * squeeze;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

let streakSprite: HTMLCanvasElement | null = null;
let streakSpriteW = 0;
let streakSpriteH = 0;

const getStreakSprite = (w: number, h: number): HTMLCanvasElement => {
  if (streakSprite && Math.abs(streakSpriteW - w) < 50 && Math.abs(streakSpriteH - h) < 20) {
    return streakSprite;
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const cx = w / 2;
  const cy = h / 2;

  const channels: { color: string; yOff: number; peak: number }[] = [
    { color: '255,120,80',  yOff: -1.2, peak: 0.07 },
    { color: '255,255,240', yOff: 0,    peak: 0.13 },
    { color: '100,160,255', yOff: 1.2,  peak: 0.06 },
  ];

  ctx.globalCompositeOperation = 'screen';

  for (const ch of channels) {
    const y = cy + ch.yOff;
    const gh = ctx.createLinearGradient(0, y, w, y);
    gh.addColorStop(0, `rgba(${ch.color},0)`);
    gh.addColorStop(0.2, `rgba(${ch.color},${ch.peak * 0.08})`);
    gh.addColorStop(0.38, `rgba(${ch.color},${ch.peak * 0.45})`);
    gh.addColorStop(0.5, `rgba(${ch.color},${ch.peak})`);
    gh.addColorStop(0.62, `rgba(${ch.color},${ch.peak * 0.45})`);
    gh.addColorStop(0.8, `rgba(${ch.color},${ch.peak * 0.08})`);
    gh.addColorStop(1, `rgba(${ch.color},0)`);

    const gv = ctx.createLinearGradient(cx, 0, cx, h);
    const coreY = clamp01(0.5 + (ch.yOff / Math.max(1, h)) * 10);
    const s0 = clamp01(coreY - 0.15);
    const s1 = clamp01(coreY - 0.04);
    const s2 = coreY;
    const s3 = clamp01(coreY + 0.04);
    const s4 = clamp01(coreY + 0.15);
    gv.addColorStop(0, 'rgba(255,255,255,0)');
    if (s0 > 0) gv.addColorStop(s0, 'rgba(255,255,255,0)');
    if (s1 > s0 + 0.001) gv.addColorStop(s1, 'rgba(255,255,255,0.6)');
    if (s2 > s1 + 0.001) gv.addColorStop(s2, 'rgba(255,255,255,1)');
    if (s3 > s2 + 0.001) gv.addColorStop(s3, 'rgba(255,255,255,0.6)');
    if (s4 > s3 + 0.001 && s4 < 1) gv.addColorStop(s4, 'rgba(255,255,255,0)');
    gv.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gh;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  streakSprite = c;
  streakSpriteW = w;
  streakSpriteH = h;
  return c;
};

const SUN_COLORS: { elev: number; color: Rgb }[] = [
  { elev: -4, color: [0.85, 0.25, 0.12] },
  { elev: -1, color: [0.95, 0.35, 0.15] },
  { elev: 0, color: [1.0, 0.45, 0.18] },
  { elev: 3, color: [1.0, 0.6, 0.28] },
  { elev: 6, color: [1.0, 0.75, 0.42] },
  { elev: 10, color: [1.0, 0.88, 0.62] },
  { elev: 20, color: [1.0, 0.95, 0.82] },
  { elev: 40, color: [1.0, 0.98, 0.94] },
  { elev: 90, color: [1.0, 0.99, 0.97] },
];

const sampleSunColor = (elevation: number): Rgb => {
  if (elevation <= SUN_COLORS[0].elev) return SUN_COLORS[0].color;
  if (elevation >= SUN_COLORS[SUN_COLORS.length - 1].elev)
    return SUN_COLORS[SUN_COLORS.length - 1].color;

  for (let i = 0; i < SUN_COLORS.length - 1; i++) {
    const a = SUN_COLORS[i];
    const b = SUN_COLORS[i + 1];
    if (elevation >= a.elev && elevation <= b.elev) {
      const t = (elevation - a.elev) / (b.elev - a.elev);
      return lerpRgb(a.color, b.color, t);
    }
  }
  return SUN_COLORS[SUN_COLORS.length - 1].color;
};

type SpriteEntry = {
  canvas: HTMLCanvasElement;
  size: number;
};

const spriteCache = new Map<string, SpriteEntry>();
const CACHE_MAX = 48;

const bucketKey = (
  elevation: number,
  cloudCover: number,
  fogDensity: number,
  canvasScale: number
): string => {
  const e = Math.round(elevation * 2) / 2;
  const c = Math.round(cloudCover * 10) / 10;
  const f = Math.round(fogDensity * 10) / 10;
  const s = Math.round(canvasScale * 4) / 4;
  return `${e}_${c}_${f}_${s}`;
};

const buildSunSprite = (
  elevation: number,
  cloudCover: number,
  fogDensity: number,
  canvasScale: number
): SpriteEntry => {
  const color = sampleSunColor(elevation);

  const horizonEnlargement = 1 + smoothstep(8, 0, elevation) * 0.25;
  const baseRadius = 14 * canvasScale * horizonEnlargement;

  const coronaScale = 3.5 + smoothstep(15, 0, elevation) * 3.0;
  const glowRadius = baseRadius * coronaScale;

  const margin = glowRadius + 4;
  const size = Math.ceil((margin) * 2);
  const cx = size / 2;
  const cy = size / 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const elevVis = smoothstep(-5, 2, elevation);
  const cloudDim = 1 - cloudCover * 0.85;
  const fogDim = 1 - fogDensity * 0.7;
  const masterAlpha = clamp01(elevVis * cloudDim * fogDim);

  if (masterAlpha < 0.005) {
    return { canvas, size };
  }

  {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);

    const horizonality = smoothstep(20, 0, elevation);
    const glowColor = lerpRgb(color, [1.0, 0.7, 0.35], horizonality * 0.5);
    const glowAlpha = (0.12 + horizonality * 0.18) * masterAlpha;

    const fogSpread = 1 + fogDensity * 0.6;

    g.addColorStop(0, toRgba(glowColor, glowAlpha));
    g.addColorStop(0.15 / fogSpread, toRgba(glowColor, glowAlpha * 0.7));
    g.addColorStop(0.4 / fogSpread, toRgba(glowColor, glowAlpha * 0.25));
    g.addColorStop(0.7, toRgba(glowColor, glowAlpha * 0.06));
    g.addColorStop(1, toRgba(glowColor, 0));

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  {
    const coronaR = baseRadius * 2.2;
    const g = ctx.createRadialGradient(cx, cy, baseRadius * 0.7, cx, cy, coronaR);

    const coronaColor = lerpRgb(color, [1.0, 0.92, 0.75], 0.3);
    const coronaAlpha = 0.35 * masterAlpha;

    g.addColorStop(0, toRgba(coronaColor, coronaAlpha));
    g.addColorStop(0.4, toRgba(coronaColor, coronaAlpha * 0.3));
    g.addColorStop(1, toRgba(coronaColor, 0));

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, coronaR, 0, Math.PI * 2);
    ctx.fill();
  }

  {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);

    const centreColor = lerpRgb(color, [1, 1, 1], 0.15);
    const edgeColor = lerpRgb(color, [0.9, 0.55, 0.25], 0.3);

    const discAlpha = masterAlpha;
    g.addColorStop(0, toRgba(centreColor, discAlpha));
    g.addColorStop(0.55, toRgba(color, discAlpha));
    g.addColorStop(0.82, toRgba(lerpRgb(color, edgeColor, 0.4), discAlpha * 0.92));
    g.addColorStop(0.95, toRgba(edgeColor, discAlpha * 0.7));
    g.addColorStop(1, toRgba(edgeColor, 0));

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  return { canvas, size };
};

const drawBloom = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunPos: SunScreenPos,
  elevation: number,
  brightness: number,
  sunColor: Rgb
) => {
  const elevFactor = smoothstep(-3, 12, elevation);
  const intensity = brightness * elevFactor;
  if (intensity < 0.015) return;

  const shortSide = Math.min(width, height);
  const horizonality = smoothstep(25, 0, elevation);

  {
    const r = shortSide * (0.12 + horizonality * 0.06);
    const a = intensity * 0.32;
    const c = lerpRgb(sunColor, [1, 1, 1], 0.6);
    const g = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, r);
    g.addColorStop(0, toRgba(c, a));
    g.addColorStop(0.3, toRgba(c, a * 0.45));
    g.addColorStop(0.7, toRgba(c, a * 0.08));
    g.addColorStop(1, toRgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sunPos.x - r, sunPos.y - r, r * 2, r * 2);
  }

  {
    const r = shortSide * (0.22 + horizonality * 0.1);
    const a = intensity * 0.16;
    const c = lerpRgb(sunColor, [1, 0.92, 0.78], horizonality * 0.5);
    const g = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, r);
    g.addColorStop(0, toRgba(c, a));
    g.addColorStop(0.2, toRgba(c, a * 0.55));
    g.addColorStop(0.55, toRgba(c, a * 0.12));
    g.addColorStop(1, toRgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sunPos.x - r, sunPos.y - r, r * 2, r * 2);
  }

  {
    const r = shortSide * (0.42 + horizonality * 0.18);
    const a = intensity * 0.06;
    const c = lerpRgb(sunColor, [1, 0.85, 0.65], horizonality * 0.6);
    const g = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, r);
    g.addColorStop(0, toRgba(c, a));
    g.addColorStop(0.15, toRgba(c, a * 0.6));
    g.addColorStop(0.45, toRgba(c, a * 0.15));
    g.addColorStop(0.8, toRgba(c, a * 0.03));
    g.addColorStop(1, toRgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sunPos.x - r, sunPos.y - r, r * 2, r * 2);
  }
};

const drawStarburst = (
  ctx: CanvasRenderingContext2D,
  sunPos: SunScreenPos,
  elevation: number,
  brightness: number,
  scale: number,
  color?: Rgb
) => {
  const intensity = brightness * smoothstep(-2, 8, elevation) * 0.7;
  if (intensity < 0.01) return;

  const c = color ?? sampleSunColor(elevation);
  const spikeLength = 45 * scale * (1 + smoothstep(15, 0, elevation) * 0.5);
  const spikeCount = 6;

  ctx.save();
  ctx.translate(sunPos.x, sunPos.y);

  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI;

    ctx.save();
    ctx.rotate(angle);

    const g = ctx.createLinearGradient(0, 0, spikeLength, 0);
    const a = intensity * 0.15;
    g.addColorStop(0, toRgba(c, a));
    g.addColorStop(0.15, toRgba(c, a * 0.5));
    g.addColorStop(0.5, toRgba(c, a * 0.12));
    g.addColorStop(1, toRgba(c, 0));

    ctx.strokeStyle = g;
    ctx.lineWidth = 1.2 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(spikeLength, 0);
    ctx.stroke();

    const g2 = ctx.createLinearGradient(0, 0, -spikeLength, 0);
    g2.addColorStop(0, toRgba(c, a));
    g2.addColorStop(0.15, toRgba(c, a * 0.5));
    g2.addColorStop(0.5, toRgba(c, a * 0.12));
    g2.addColorStop(1, toRgba(c, 0));

    ctx.strokeStyle = g2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-spikeLength, 0);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
};

const drawAnamorphicStreak = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunPos: SunScreenPos,
  elevation: number,
  brightness: number
) => {
  const intensity = brightness * smoothstep(-1, 5, elevation);
  if (intensity < 0.01) return;

  const streakW = width * 1.6;
  const streakH = Math.max(6, 10 * (width / 800));

  const sprite = getStreakSprite(Math.ceil(streakW), Math.ceil(streakH));

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = intensity * 0.35;
  ctx.drawImage(
    sprite,
    sunPos.x - streakW / 2,
    sunPos.y - streakH / 2
  );
  ctx.restore();
};

const drawVeilingGlare = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunPos: SunScreenPos,
  elevation: number,
  brightness: number,
  sunColor?: Rgb
) => {
  const intensity = brightness * smoothstep(-2, 10, elevation) * 0.14;
  if (intensity < 0.003) return;

  const r = Math.max(width, height) * 0.7;
  const g = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, r);
  const color = sunColor ?? sampleSunColor(elevation);
  const warm = lerpRgb(color, [1, 1, 1], 0.5);

  g.addColorStop(0, toRgba(warm, intensity));
  g.addColorStop(0.25, toRgba(warm, intensity * 0.45));
  g.addColorStop(0.6, toRgba(warm, intensity * 0.1));
  g.addColorStop(1, toRgba(warm, 0));

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

const drawLensFlare = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunPos: SunScreenPos,
  elevation: number,
  brightness: number
) => {
  const intensity = brightness * smoothstep(-1, 6, elevation);
  if (intensity < 0.01) return;

  const cx = width / 2;
  const cy = height / 2;
  const axisDx = cx - sunPos.x;
  const axisDy = cy - sunPos.y;
  const diag = Math.sqrt(width * width + height * height);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (const el of FLARE_ELEMENTS) {
    const fx = sunPos.x + axisDx * el.position;
    const fy = sunPos.y + axisDy * el.position;
    const baseR = diag * el.size;
    const alpha = el.alpha * intensity;
    const ca = el.ca ?? 0;
    const rimBias = el.rimBias ?? 0;
    const squeeze = el.squeeze ?? 1;
    const shape = el.shape ?? 'circle';

    if (alpha < 0.003) continue;

    const channels: { cMask: Rgb; rScale: number }[] = ca > 0.01
      ? [
          { cMask: [1, 0.08, 0.02], rScale: 1 + ca * 2.5 },
          { cMask: [0.08, 1, 0.08], rScale: 1 },
          { cMask: [0.02, 0.1, 1], rScale: 1 - ca * 1.8 },
        ]
      : [{ cMask: [1, 1, 1], rScale: 1 }];

    for (const ch of channels) {
      const r = baseR * ch.rScale;
      const chColor: Rgb = [
        el.color[0] * ch.cMask[0],
        el.color[1] * ch.cMask[1],
        el.color[2] * ch.cMask[2],
      ];
      const chAlpha = alpha / channels.length;

      if (shape === 'ring') {
        const innerR = r * 0.78;
        const g = ctx.createRadialGradient(fx, fy, innerR * 0.9, fx, fy, r * 1.05);
        g.addColorStop(0, toRgba(chColor, 0));
        g.addColorStop(0.15, toRgba(chColor, chAlpha * 0.3));
        g.addColorStop(0.45, toRgba(chColor, chAlpha * 0.9));
        g.addColorStop(0.6, toRgba(chColor, chAlpha));
        g.addColorStop(0.8, toRgba(chColor, chAlpha * 0.5));
        g.addColorStop(1, toRgba(chColor, 0));

        ctx.fillStyle = g;
        if (squeeze !== 1) {
          ctx.save();
          ctx.translate(fx, fy);
          ctx.scale(1, squeeze);
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(fx, fy, r * 1.05, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (shape === 'hex') {
        const fillAlpha = chAlpha * (1 - rimBias * 0.7);
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
        g.addColorStop(0, toRgba(chColor, fillAlpha * 0.3));
        g.addColorStop(0.6, toRgba(chColor, fillAlpha * 0.2));
        g.addColorStop(0.85, toRgba(chColor, fillAlpha * 0.5));
        g.addColorStop(1, toRgba(chColor, 0));

        ctx.fillStyle = g;
        hexPath(ctx, fx, fy, r, squeeze);
        ctx.fill();

        if (rimBias > 0.1) {
          ctx.strokeStyle = toRgba(chColor, chAlpha * rimBias * 0.7);
          ctx.lineWidth = Math.max(1, r * 0.08);
          hexPath(ctx, fx, fy, r * 0.92, squeeze);
          ctx.stroke();
        }
      } else {
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);

        const coreA = chAlpha * (1 - rimBias * 0.6);
        const midA = chAlpha * (0.25 + rimBias * 0.2);
        const rimA = chAlpha * (0.08 + rimBias * 0.7);

        g.addColorStop(0, toRgba(chColor, coreA));
        g.addColorStop(0.35, toRgba(chColor, midA));
        g.addColorStop(0.7, toRgba(chColor, midA * 0.6));
        g.addColorStop(0.88, toRgba(chColor, rimA));
        g.addColorStop(0.96, toRgba(chColor, rimA * 0.4));
        g.addColorStop(1, toRgba(chColor, 0));

        ctx.fillStyle = g;
        if (squeeze !== 1) {
          ctx.save();
          ctx.translate(fx, fy);
          ctx.scale(1, squeeze);
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(fx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
};

export const drawSun = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunElevation: number,
  sunAzimuth: number,
  cloudCover: number,
  fogDensity: number,
  sunPos: SunScreenPos
) => {
  if (sunElevation < -5) return;

  const dpr = width / (ctx.canvas.clientWidth || width);
  const canvasScale = Math.max(0.5, Math.min(dpr, 3));

  const key = bucketKey(sunElevation, cloudCover, fogDensity, canvasScale);
  let entry = spriteCache.get(key);

  if (!entry) {
    if (spriteCache.size >= CACHE_MAX) {
      const first = spriteCache.keys().next().value;
      if (first !== undefined) spriteCache.delete(first);
    }
    entry = buildSunSprite(sunElevation, cloudCover, fogDensity, canvasScale);
    spriteCache.set(key, entry);
  }

  const { canvas: sprite, size } = entry;
  if (size === 0) return;

  const elevVis = smoothstep(-5, 2, sunElevation);
  const cloudDim = 1 - cloudCover * 0.85;
  const fogDim = 1 - fogDensity * 0.7;
  const masterBrightness = clamp01(elevVis * cloudDim * fogDim);

  const sunColor = sampleSunColor(sunElevation);

  ctx.save();

  ctx.globalCompositeOperation = 'screen';

  const dx = sunPos.x - size / 2;
  const dy = sunPos.y - size / 2;
  ctx.drawImage(sprite, dx, dy);

  drawBloom(ctx, width, height, sunPos, sunElevation, masterBrightness, sunColor);

  if (masterBrightness > 0.02) {
    drawVeilingGlare(ctx, width, height, sunPos, sunElevation, masterBrightness, sunColor);

    drawStarburst(ctx, sunPos, sunElevation, masterBrightness, canvasScale, sunColor);

    drawAnamorphicStreak(ctx, width, height, sunPos, sunElevation, masterBrightness);

    drawLensFlare(ctx, width, height, sunPos, sunElevation, masterBrightness);

    if (sunElevation < 15 && sunElevation > -4) {
      const bandStrength = smoothstep(15, 2, sunElevation) * (1 - cloudCover * 0.7) * (1 - fogDensity * 0.5);

      if (bandStrength > 0.01) {
        const bandColor = lerpRgb(sunColor, [1.0, 0.65, 0.3], 0.4);
        const bandHeight = height * 0.25;
        const bandY = height * 0.55;

        const g = ctx.createRadialGradient(
          sunPos.x, bandY + bandHeight * 0.3,
          0,
          sunPos.x, bandY + bandHeight * 0.3,
          width * 0.6
        );

        const a = bandStrength * 0.08;
        g.addColorStop(0, toRgba(bandColor, a));
        g.addColorStop(0.4, toRgba(bandColor, a * 0.4));
        g.addColorStop(1, toRgba(bandColor, 0));

        ctx.fillStyle = g;
        ctx.fillRect(0, bandY, width, bandHeight);
      }
    }
  }

  ctx.restore();
};
