
import { SkyLayerColors } from './skyTypes';
import { toCssRgb } from './skyColor';
import { SunScreenPos } from './skyView';
import { clamp01, mixColor } from './skyUtils';




export const drawAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  fogDensity: number,
  cloudCover: number,
  sunElevation: number,
  sunPos?: SunScreenPos,
  sunVisibility?: number,
  lightningEffect?: { intensity: number; centers: { x: number; y: number; intensity: number }[]; radius: number; color?: string }
) => {
  
  

  
  if (fogDensity > 0.01) {
    const fogHeight = height * (0.2 + fogDensity * 0.8);
    const fogGrad = ctx.createLinearGradient(0, height, 0, height - fogHeight);
    
    const fogBoost = lightningEffect ? Math.min(1, lightningEffect.intensity * 1.2) : 0
    fogGrad.addColorStop(0, toCssRgb(layers.horizonBand, Math.min(1, fogDensity + fogBoost * 0.65)));
    fogGrad.addColorStop(1, toCssRgb(layers.horizonBand, 0));
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, height - fogHeight, width, fogHeight);
  }

  
  
};
