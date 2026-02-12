// Auringon renderöinti. Realistinen aurinko varjoineen ja värinmuutoksilla.

// Apple Weather-style chromatic lens flare system.

import { SunScreenPos } from './skyView';
import { clamp01, smoothstep } from './skyUtils';

/* --------------------------------------------------
   Colour helpers (inline to avoid import overhead)
-------------------------------------------------- */

type Rgb = [number, number, number];

const lerpRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/* --- Cached toRgba — avoids thousands of string allocs per frame --- */
const rgbaCache = new Map<string, string>();
const RGBA_CACHE_MAX = 256;

const toRgba = (c: Rgb, a: number) => {
  const r = (c[0] * 255) | 0;
  const g = (c[1] * 255) | 0;
  const b = (c[2] * 255) | 0;
  const ab = (a * 1000 + 0.5) | 0; // bucket to 3 decimal places
  const key = (r << 24 | g << 16 | b << 8 | ab) >>> 0; // pack into one number
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
   Lens flare configuration — photorealistic

   Real lens ghosts have:
   - Chromatic aberration (R/G/B at slightly different radii)
   - Rim-bright profiles (bright edge, dim interior)
   - Hexagonal shapes from aperture blades
   - Veiling glare that washes out contrast

   position: 0 = sun, 1 = screen centre, 2 = opposite
   size:     fraction of canvas diagonal
   color:    primary chromatic tint
   alpha:    base opacity (scaled by sun brightness)
   shape:    'circle' | 'hex' | 'ring'
   ca:       chromatic aberration strength (0-1)
   rimBias:  0 = centre-bright, 1 = rim-bright
-------------------------------------------------- */

type FlareElement = {
  position: number;
  size: number;
  color: Rgb;
  alpha: number;
  shape?: 'circle' | 'hex' | 'ring';
  ca?: number;       // chromatic aberration
  rimBias?: number;  // 0 = centre-bright, 1 = edge-bright
  squeeze?: number;  // vertical squeeze (ellipse), 1 = circle
};

const FLARE_ELEMENTS: FlareElement[] = [
  // Near-sun warm ghosts
  { position: 0.12, size: 0.02, color: [1.0, 0.95, 0.8], alpha: 0.5, ca: 0.06, rimBias: 0.2 },
  { position: 0.22, size: 0.013, color: [1.0, 0.82, 0.55], alpha: 0.4, ca: 0.08, rimBias: 0.35, shape: 'hex' },

  // Mid-field chromatic orbs — the signature look
  { position: 0.38, size: 0.035, color: [0.35, 0.9, 0.5], alpha: 0.3, ca: 0.15, rimBias: 0.55 },       // green, moderate CA
  { position: 0.50, size: 0.02, color: [0.5, 0.88, 1.0], alpha: 0.28, ca: 0.12, rimBias: 0.4, shape: 'hex' }, // cyan hex
  { position: 0.65, size: 0.055, color: [0.3, 0.65, 1.0], alpha: 0.22, ca: 0.2, rimBias: 0.7, shape: 'ring' }, // blue ring, strong CA
  { position: 0.78, size: 0.016, color: [0.85, 0.45, 1.0], alpha: 0.25, ca: 0.1, rimBias: 0.3 },        // magenta

  // Centre crossing — soft warm bloom
  { position: 1.0, size: 0.07, color: [1.0, 0.9, 0.82], alpha: 0.14, ca: 0.04, rimBias: 0.1, squeeze: 0.85 },

  // Opposite-side ghosts
  { position: 1.15, size: 0.028, color: [0.82, 0.5, 1.0], alpha: 0.18, ca: 0.18, rimBias: 0.6, shape: 'hex' }, // purple hex
  { position: 1.35, size: 0.045, color: [0.3, 0.88, 0.6], alpha: 0.13, ca: 0.22, rimBias: 0.65, shape: 'ring' }, // green ring
  { position: 1.50, size: 0.017, color: [1.0, 0.55, 0.3], alpha: 0.16, ca: 0.1, rimBias: 0.4 },         // orange
  { position: 1.70, size: 0.075, color: [0.4, 0.55, 1.0], alpha: 0.10, ca: 0.25, rimBias: 0.75, shape: 'ring' }, // large blue ring
  { position: 1.88, size: 0.011, color: [1.0, 0.35, 0.45], alpha: 0.13, ca: 0.08, rimBias: 0.3 },       // red-pink
];

/* --------------------------------------------------
   Anamorphic streak sprite (horizontal light streak)
   Built once and cached.
-------------------------------------------------- */

/* --------------------------------------------------
   Hexagonal path helper — used by hex-shaped ghosts
   6-sided polygon inscribed in a circle of given radius
-------------------------------------------------- */

const hexPath = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, squeeze = 1) => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6; // flat-top hex
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a) * squeeze;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

/* --------------------------------------------------
   Anamorphic streak sprite — RGB channel separation
   Each colour channel is drawn as a separate thin
   horizontal line offset vertically by 1-2px,
   producing the signature chromatic spread.
-------------------------------------------------- */

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

  // Draw each RGB channel as a separate horizontal stripe, offset vertically
  const channels: { color: string; yOff: number; peak: number }[] = [
    { color: '255,120,80',  yOff: -1.2, peak: 0.07 }, // red — above
    { color: '255,255,240', yOff: 0,    peak: 0.13 }, // white core
    { color: '100,160,255', yOff: 1.2,  peak: 0.06 }, // blue — below
  ];

  ctx.globalCompositeOperation = 'screen';

  for (const ch of channels) {
    const y = cy + ch.yOff;
    // Horizontal luminance
    const gh = ctx.createLinearGradient(0, y, w, y);
    gh.addColorStop(0, `rgba(${ch.color},0)`);
    gh.addColorStop(0.2, `rgba(${ch.color},${ch.peak * 0.08})`);
    gh.addColorStop(0.38, `rgba(${ch.color},${ch.peak * 0.45})`);
    gh.addColorStop(0.5, `rgba(${ch.color},${ch.peak})`);
    gh.addColorStop(0.62, `rgba(${ch.color},${ch.peak * 0.45})`);
    gh.addColorStop(0.8, `rgba(${ch.color},${ch.peak * 0.08})`);
    gh.addColorStop(1, `rgba(${ch.color},0)`);

    // Vertical thinness
    const gv = ctx.createLinearGradient(cx, 0, cx, h);
    const coreY = clamp01(0.5 + (ch.yOff / Math.max(1, h)) * 10);
    // Build sorted, clamped stops
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

    // Composite: draw horiz colour, then mask with vertical
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

/* --------------------------------------------------
   Sun colour temperature by elevation
   High noon → white, golden hour → warm, sunset → deep orange/red
-------------------------------------------------- */

const SUN_COLORS: { elev: number; color: Rgb }[] = [
  { elev: -4, color: [0.85, 0.25, 0.12] },  // deep red below horizon
  { elev: -1, color: [0.95, 0.35, 0.15] },   // red at horizon
  { elev: 0, color: [1.0, 0.45, 0.18] },      // orange-red at horizon
  { elev: 3, color: [1.0, 0.6, 0.28] },       // deep orange
  { elev: 6, color: [1.0, 0.75, 0.42] },      // warm orange
  { elev: 10, color: [1.0, 0.88, 0.62] },     // golden
  { elev: 20, color: [1.0, 0.95, 0.82] },     // warm white
  { elev: 40, color: [1.0, 0.98, 0.94] },     // near white
  { elev: 90, color: [1.0, 0.99, 0.97] },     // pure white
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

/* --------------------------------------------------
   Sprite cache — keyed by bucketed params so we
   redraw only when the sun's appearance materially
   changes (~12-20 unique sprites per day).
-------------------------------------------------- */

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
  // Quantise to reduce unique keys
  const e = Math.round(elevation * 2) / 2;     // 0.5° steps
  const c = Math.round(cloudCover * 10) / 10;  // 10% steps
  const f = Math.round(fogDensity * 10) / 10;
  const s = Math.round(canvasScale * 4) / 4;
  return `${e}_${c}_${f}_${s}`;
};

/* --------------------------------------------------
   Build sprite — off-screen canvas with disc + glow
   Drawn once per unique bucket key.
-------------------------------------------------- */

const buildSunSprite = (
  elevation: number,
  cloudCover: number,
  fogDensity: number,
  canvasScale: number
): SpriteEntry => {
  const color = sampleSunColor(elevation);

  // --- Apparent size ---
  // Base radius in CSS px; grows slightly near horizon (refraction illusion)
  const horizonEnlargement = 1 + smoothstep(8, 0, elevation) * 0.25;
  const baseRadius = 14 * canvasScale * horizonEnlargement;

  // Corona / glow extent relative to disc
  const coronaScale = 3.5 + smoothstep(15, 0, elevation) * 3.0; // wider glow near horizon
  const glowRadius = baseRadius * coronaScale;

  // Sprite canvas padded for glow
  const margin = glowRadius + 4;
  const size = Math.ceil((margin) * 2);
  const cx = size / 2;
  const cy = size / 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // --- Visibility factors ---
  const elevVis = smoothstep(-5, 2, elevation);    // fade out below horizon
  const cloudDim = 1 - cloudCover * 0.85;          // clouds reduce brightness
  const fogDim = 1 - fogDensity * 0.7;             // fog dims the disc
  const masterAlpha = clamp01(elevVis * cloudDim * fogDim);

  if (masterAlpha < 0.005) {
    return { canvas, size };
  }

  // --- 1) Large atmospheric glow (additive, very soft) ---
  {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);

    // Warm diffuse scatter — more prominent near horizon
    const horizonality = smoothstep(20, 0, elevation);
    const glowColor = lerpRgb(color, [1.0, 0.7, 0.35], horizonality * 0.5);
    const glowAlpha = (0.12 + horizonality * 0.18) * masterAlpha;

    // Fog makes the glow broader and softer
    const fogSpread = 1 + fogDensity * 0.6;

    g.addColorStop(0, toRgba(glowColor, glowAlpha));
    g.addColorStop(0.15 / fogSpread, toRgba(glowColor, glowAlpha * 0.7));
    g.addColorStop(0.4 / fogSpread, toRgba(glowColor, glowAlpha * 0.25));
    g.addColorStop(0.7, toRgba(glowColor, glowAlpha * 0.06));
    g.addColorStop(1, toRgba(glowColor, 0));

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // --- 2) Inner corona (warm, tight) ---
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

  // --- 3) Sun disc with limb darkening ---
  // Limb darkening: the edge of the sun is dimmer/redder than the centre
  {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);

    // Centre: full bright colour
    const centreColor = lerpRgb(color, [1, 1, 1], 0.15); // slight white boost at centre
    const edgeColor = lerpRgb(color, [0.9, 0.55, 0.25], 0.3); // redder at edge

    const discAlpha = masterAlpha;
    g.addColorStop(0, toRgba(centreColor, discAlpha));
    g.addColorStop(0.55, toRgba(color, discAlpha));
    g.addColorStop(0.82, toRgba(lerpRgb(color, edgeColor, 0.4), discAlpha * 0.92));
    g.addColorStop(0.95, toRgba(edgeColor, discAlpha * 0.7));
    g.addColorStop(1, toRgba(edgeColor, 0)); // soft edge

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 4) Bright hotspot in centre ---
  {
    const spotR = baseRadius * 0.35;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, spotR);
    const spotAlpha = 0.4 * masterAlpha * (1 - cloudCover * 0.6);
    g.addColorStop(0, toRgba([1, 1, 1], spotAlpha));
    g.addColorStop(1, toRgba([1, 1, 1], 0));

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, spotR, 0, Math.PI * 2);
    ctx.fill();
  }

  return { canvas, size };
};

/* --------------------------------------------------
   Public draw function — called once per frame
-------------------------------------------------- */

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
  // Don't draw if sun is well below horizon
  if (sunElevation < -5) return;

  const dpr = width / (ctx.canvas.clientWidth || width);
  const canvasScale = Math.max(0.5, Math.min(dpr, 3));

  // Look up or build cached sprite
  const key = bucketKey(sunElevation, cloudCover, fogDensity, canvasScale);
  let entry = spriteCache.get(key);

  if (!entry) {
    // Evict oldest if cache full
    if (spriteCache.size >= CACHE_MAX) {
      const first = spriteCache.keys().next().value;
      if (first !== undefined) spriteCache.delete(first);
    }
    entry = buildSunSprite(sunElevation, cloudCover, fogDensity, canvasScale);
    spriteCache.set(key, entry);
  }

  const { canvas: sprite, size } = entry;
  if (size === 0) return;

  // --- Master brightness for all effects ---
  const elevVis = smoothstep(-5, 2, sunElevation);
  const cloudDim = 1 - cloudCover * 0.85;
  const fogDim = 1 - fogDensity * 0.7;
  const masterBrightness = clamp01(elevVis * cloudDim * fogDim);

  // Pre-compute sun colour once for all sub-effects
  const sunColor = sampleSunColor(sunElevation);

  // --- Draw to main canvas ---
  ctx.save();

  // Use 'screen' blend for additive glow that doesn't blow out
  ctx.globalCompositeOperation = 'screen';

  // Draw sprite centred on sun position
  const dx = sunPos.x - size / 2;
  const dy = sunPos.y - size / 2;
  ctx.drawImage(sprite, dx, dy);

  // --- Bloom — wide, soft overexposure glow ---
  drawBloom(ctx, width, height, sunPos, sunElevation, masterBrightness, sunColor);

  // Skip all lens effects when essentially invisible
  if (masterBrightness > 0.02) {
    // --- Veiling glare (soft contrast wash near sun) ---
    drawVeilingGlare(ctx, width, height, sunPos, sunElevation, masterBrightness, sunColor);

    // --- Starburst spikes ---
    drawStarburst(ctx, sunPos, sunElevation, masterBrightness, canvasScale, sunColor);

    // --- Anamorphic streak ---
    drawAnamorphicStreak(ctx, width, height, sunPos, sunElevation, masterBrightness);

    // --- Chromatic lens flare orbs ---
    drawLensFlare(ctx, width, height, sunPos, sunElevation, masterBrightness);

    // --- Horizon atmospheric band ---
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
  } // end masterBrightness > 0.02

  ctx.restore();
};

/* --------------------------------------------------
   Bloom — wide, soft overexposure glow around the sun.
   Simulates light scatter in the atmosphere and sensor
   bloom.  Three layered radial passes:
     1) Tight bright core bloom (small, intense)
     2) Medium warm bloom (moderate size, coloured)
     3) Wide atmospheric scatter (very large, faint)
   Each layer uses a slightly different colour to give
   natural depth rather than a flat circle.
-------------------------------------------------- */

const drawBloom = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunPos: SunScreenPos,
  elevation: number,
  brightness: number,
  sunColor: Rgb
) => {
  // Bloom is strongest at moderate-high elevations and fades near horizon
  // (where veiling glare and the atmosphere band already dominate)
  const elevFactor = smoothstep(-3, 12, elevation);
  const intensity = brightness * elevFactor;
  if (intensity < 0.015) return;

  const shortSide = Math.min(width, height);

  // Near-horizon bloom is warmer and wider; high-noon bloom is whiter and tighter
  const horizonality = smoothstep(25, 0, elevation);

  // --- Layer 1: tight bright core ---
  {
    const r = shortSide * (0.12 + horizonality * 0.06);
    const a = intensity * 0.32;
    const c = lerpRgb(sunColor, [1, 1, 1], 0.6); // desaturated, nearly white
    const g = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, r);
    g.addColorStop(0, toRgba(c, a));
    g.addColorStop(0.3, toRgba(c, a * 0.45));
    g.addColorStop(0.7, toRgba(c, a * 0.08));
    g.addColorStop(1, toRgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sunPos.x - r, sunPos.y - r, r * 2, r * 2);
  }

  // --- Layer 2: medium warm bloom ---
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

  // --- Layer 3: wide atmospheric scatter ---
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

/* --------------------------------------------------
   Starburst — subtle radiating spikes from sun centre
   4 or 6 thin spike lines, rotated slowly with time
-------------------------------------------------- */

const drawStarburst = (
  ctx: CanvasRenderingContext2D,
  sunPos: SunScreenPos,
  elevation: number,
  brightness: number,
  scale: number,
  color?: Rgb
) => {
  // Only visible when sun is reasonably bright
  const intensity = brightness * smoothstep(-2, 8, elevation) * 0.7;
  if (intensity < 0.01) return;

  const c = color ?? sampleSunColor(elevation);
  const spikeLength = 45 * scale * (1 + smoothstep(15, 0, elevation) * 0.5);
  const spikeCount = 6;

  ctx.save();
  ctx.translate(sunPos.x, sunPos.y);

  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI; // half-turn for symmetric pairs

    ctx.save();
    ctx.rotate(angle);

    // Each spike is a thin gradient line
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

    // Symmetric opposite direction
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

/* --------------------------------------------------
   Anamorphic streak — horizontal light smear through 
   the sun, like a cinematic lens artefact
-------------------------------------------------- */

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

/* --------------------------------------------------
   Chromatic lens flare — orbs, rings, and ghosts
   positioned along the flare axis (sun → centre → 
   opposite), just like Apple Weather.
-------------------------------------------------- */

/* --------------------------------------------------
   Veiling glare — soft overall brightness wash
   near the sun that reduces local contrast, exactly
   like stray light bouncing inside a real lens barrel.
-------------------------------------------------- */

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

/* --------------------------------------------------
   Chromatic lens flare — photorealistic orbs with:
   • Chromatic aberration (R/G/B drawn at offset radii)
   • Rim-bright ghost profiles (bright edge, dim fill)
   • Hexagonal aperture shapes
   • Per-element squeeze for slight elliptical distortion
-------------------------------------------------- */

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

    // Chromatic aberration: draw 3 passes (R, G, B) at slightly different radii
    const channels: { cMask: Rgb; rScale: number }[] = ca > 0.01
      ? [
          { cMask: [1, 0.08, 0.02], rScale: 1 + ca * 2.5 },    // red — larger, purer
          { cMask: [0.08, 1, 0.08], rScale: 1 },                // green — base
          { cMask: [0.02, 0.1, 1], rScale: 1 - ca * 1.8 },     // blue — smaller, purer
        ]
      : [{ cMask: [1, 1, 1], rScale: 1 }]; // no CA — single pass

    for (const ch of channels) {
      const r = baseR * ch.rScale;
      const chColor: Rgb = [
        el.color[0] * ch.cMask[0],
        el.color[1] * ch.cMask[1],
        el.color[2] * ch.cMask[2],
      ];
      // Per-channel alpha is divided by channel count to keep total brightness correct
      const chAlpha = alpha / channels.length;

      if (shape === 'ring') {
        // Ring: thin annulus
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
        // Hexagonal ghost with rim-bright profile
        // Centre fill (dim)
        const fillAlpha = chAlpha * (1 - rimBias * 0.7);
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
        g.addColorStop(0, toRgba(chColor, fillAlpha * 0.3));
        g.addColorStop(0.6, toRgba(chColor, fillAlpha * 0.2));
        g.addColorStop(0.85, toRgba(chColor, fillAlpha * 0.5));
        g.addColorStop(1, toRgba(chColor, 0));

        ctx.fillStyle = g;
        hexPath(ctx, fx, fy, r, squeeze);
        ctx.fill();

        // Bright rim stroke
        if (rimBias > 0.1) {
          ctx.strokeStyle = toRgba(chColor, chAlpha * rimBias * 0.7);
          ctx.lineWidth = Math.max(1, r * 0.08);
          hexPath(ctx, fx, fy, r * 0.92, squeeze);
          ctx.stroke();
        }
      } else {
        // Circular ghost with controllable rim brightness
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);

        // Profile: blend between centre-bright and rim-bright
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
