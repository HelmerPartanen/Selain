

import type { SkyLayerColors } from './skyTypes';
import type { SunScreenPos } from './skyView';
import { lerp } from './skyUtils';
import { calculateSunColor, sampleSkyColorAtY } from './sunCalculations';
import { getSunSprite } from './sunSprite';
import { drawCloudOcclusion, drawLensGhosts } from './sunEffects';


export const drawSunDisc = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  sunPos: SunScreenPos,
  sunElevation: number,
  sunVisibility: number,
  cloudCover: number,
  fogDensity: number,
  time: number,
  windSpeed: number
) => {
  if (sunVisibility <= 0.25 || sunElevation <= -2) return;

  
  const extinction = Math.max(0, Math.min(1, (sunElevation + 1.5) / 8));

  
  const colorResult = calculateSunColor(
    height,
    sunElevation,
    extinction,
    cloudCover,
    fogDensity,
    sunVisibility,
    layers,
    sunPos
  );

  const {
    discRadius,
    squash,
    finalSunRGB,
    discBaseAlpha,
    haloRadius
  } = colorResult;

  
  const jitter =
    Math.sin(time * 12.7 + sunPos.x * 0.01 + sunPos.y * 0.02) * discRadius * 0.006;

  
  const sprite = getSunSprite({
    discRadius,
    haloRadius,
    extinction,
    elevT: colorResult.elevT,
    fogDensity,
    cloudCover,
    skyLum: colorResult.skyLum,
    finalSunRGB,
    discToneScale: colorResult.discToneScale,
    timeSeed: Math.floor(sunPos.x * 0.2 + sunPos.y * 0.2) 
  });

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(jitter, jitter);

  
  ctx.translate(sunPos.x, sunPos.y);
  ctx.scale(1.0, squash);
  ctx.translate(-sunPos.x, -sunPos.y);

  
  ctx.globalAlpha = discBaseAlpha;
  ctx.drawImage(sprite.canvas, sunPos.x - sprite.half, sunPos.y - sprite.half);

  
  const skyAtSun = sampleSkyColorAtY(layers, sunPos.y / Math.max(1, height));
  drawCloudOcclusion(ctx, sunPos, sprite, cloudCover, fogDensity, time, windSpeed, skyAtSun);

  
  drawLensGhosts(
    ctx,
    width,
    height,
    sunPos,
    sprite,
    sunVisibility,
    cloudCover,
    fogDensity,
    colorResult.elevT,
    finalSunRGB
  );

  ctx.restore(); 
};
