

import type { Rgb } from './skyColor';
import { mixColor, smoothstep, lerp, clamp01 } from './skyUtils';
import type { SkyLayerColors } from './skyTypes';
import { SUN } from './sunConstants';

const luminance = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

export const sampleSkyColorAtY = (layers: SkyLayerColors, y01: number): Rgb => {
  const t = clamp01(y01);
  if (t <= 0.55) return mixColor(layers.upperSky, layers.midSky, t / 0.55);
  return mixColor(layers.midSky, layers.horizonBand, (t - 0.55) / 0.45);
};

export interface SunColorParams {
  sunElevation: number;
  extinction: number;
  layers: SkyLayerColors;
  sunPos: { x: number; y: number };
}

export interface SunColorResult {
  elevT: number;
  extinction: number;
  discRadius: number;
  squash: number;
  finalSunRGB: Rgb;
  skyLum: number;
  discToneScale: number;
  discBaseAlpha: number;
  haloRadius: number;
}


export const calculateSunColor = (
  height: number,
  sunElevation: number,
  extinction: number,
  cloudCover: number,
  fogDensity: number,
  sunVisibility: number,
  layers: SkyLayerColors,
  sunPos: { x: number; y: number }
): SunColorResult => {
  
  const elevT = smoothstep(-2, 10, sunElevation);

  
  const squash = lerp(SUN.squashMin, 1.0, Math.pow(extinction, SUN.squashPow));

  
  const warmRGB: Rgb = [1.0, 0.70, 0.50];
  const neutralRGB: Rgb = [1.0, 0.96, 0.88];
  const sunRGB = mixColor(warmRGB, neutralRGB, elevT);

  
  const extinctionRGB: Rgb = [
    1.0,
    lerp(0.85, 1.0, extinction),
    lerp(0.58, 1.0, extinction)
  ];
  const finalSunRGB = mixColor(sunRGB, extinctionRGB, 0.38);

  
  const skyAtSun = sampleSkyColorAtY(layers, sunPos.y / Math.max(1, height));
  const skyLum = luminance(skyAtSun);
  const discToneScale = lerp(1.15, 0.55, smoothstep(0.35, 0.92, skyLum));

  
  const discBaseAlpha = 0.95 * sunVisibility * elevT * discToneScale;

  
  const baseRadius = height * SUN.discRadiusFrac;
  const discRadius = baseRadius * lerp(0.6, 1.0, extinction);

  
  const haloRadius =
    discRadius * (SUN.haloBase + cloudCover * SUN.haloCloudK + fogDensity * SUN.haloFogK);

  return {
    elevT,
    extinction,
    discRadius,
    squash,
    finalSunRGB,
    skyLum,
    discToneScale,
    discBaseAlpha,
    haloRadius
  };
};
