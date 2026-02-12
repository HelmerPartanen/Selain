

import type { Rgb } from './skyColor';

export const SUN = {
  discRadiusFrac: 0.05,

  
  haloBase: 6,
  haloCloudK: 4,
  haloFogK: 6,

  
  squashMin: 0.50,
  squashPow: 1.7,

  
  edgeInner: 0.72,
  edgeOuter: 1.02,
  edgeNoiseAmp: 0.003,

  limbLayers: 3,

  
  granuleAlpha: 0.05,
  granuleMinRadius: 18,

  
  bloomBase: 0.18,
  bloomFogK: 0.35,
  bloomPasses: 3,

  
  haloWarmA0: 0.11,
  haloWarmA1: 0.055,
  haloCoolA0: 0.03,
  haloCoolA1: 0.012,

  
  ghostBase: 0.035
} as const;

export type SunConfig = typeof SUN;
