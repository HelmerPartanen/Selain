
import { useEffect, useRef } from 'react';
import { SkyLayerColors, SkyStateInput } from './skyTypes';
import { computeSkyLayers } from './skyModel';
import { mixOklab } from './skyColor';
import { renderSkyGradient } from './skyRenderer';
import { PrecipitationSystem, Particle } from './precipitationSystem';
import { PRECIPITATION_CONFIG } from './precipitationConfig';
import { SkyCloudsRenderer } from './skyClouds';

const blendLayers = (from: SkyLayerColors, to: SkyLayerColors, t: number): SkyLayerColors => ({
  upperSky: mixOklab(from.upperSky, to.upperSky, t),
  midSky: mixOklab(from.midSky, to.midSky, t),
  horizonBand: mixOklab(from.horizonBand, to.horizonBand, t),
  groundBounce: mixOklab(from.groundBounce, to.groundBounce, t)
});


const sampleSkyColor = (layers: SkyLayerColors, normalizedY: number): [number, number, number] => {
  
  if (normalizedY <= 0.55) {
    
    const t = normalizedY / 0.55;
    return mixOklab(layers.upperSky, layers.midSky, t);
  } else {
    
    const t = (normalizedY - 0.55) / (1 - 0.55);
    return mixOklab(layers.midSky, layers.horizonBand, t);
  }
};

const getCanvasContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext(
    '2d',
    { colorSpace: 'display-p3', willReadFrequently: true } as CanvasRenderingContext2DSettings
  );
  return context ?? canvas.getContext('2d', { willReadFrequently: true });
};

export const useSkyBackground = (state: SkyStateInput) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cloudsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef<SkyLayerColors>(computeSkyLayers(state));
  const currentRef = useRef<SkyLayerColors>(targetRef.current);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const stateRef = useRef(state);
  const precipitationSystemRef = useRef<PrecipitationSystem | null>(null);
  const cloudsRendererRef = useRef<SkyCloudsRenderer | null>(null); 

  useEffect(() => {
    targetRef.current = computeSkyLayers(state);
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCanvasContext(canvas);
    if (!ctx) return;

    const updateSize = () => {
      const bounds = (canvas.parentElement ?? canvas).getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(bounds.width * dpr));
      const height = Math.max(1, Math.floor(bounds.height * dpr));
      if (width === sizeRef.current.width && height === sizeRef.current.height) return;
      sizeRef.current = { width, height, dpr };
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${Math.floor(bounds.width)}px`;
      canvas.style.height = `${Math.floor(bounds.height)}px`;
      
      
      if (precipitationSystemRef.current) {
        precipitationSystemRef.current.resize(width, height);
      }

      
      const cloudsCanvas = cloudsCanvasRef.current;
      if (cloudsCanvas) {
        cloudsCanvas.width = width;
        cloudsCanvas.height = height;
        cloudsCanvas.style.width = `${Math.floor(bounds.width)}px`;
        cloudsCanvas.style.height = `${Math.floor(bounds.height)}px`;
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas.parentElement ?? canvas);

    let raf = 0;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(200, now - last);
      last = now;

      const smoothing = 1 - Math.exp(-dt / 400);
      currentRef.current = blendLayers(currentRef.current, targetRef.current, smoothing);

      const { width, height } = sizeRef.current;
      
      
      const skyResult = renderSkyGradient(ctx, width, height, currentRef.current, stateRef.current, now);

      
      if (!precipitationSystemRef.current) {
        precipitationSystemRef.current = new PrecipitationSystem(width, height, stateRef.current.weather.windSpeed || 0, stateRef.current.weather.windDirection || 0);
      }

      const precipSystem = precipitationSystemRef.current;
      const precipitation = stateRef.current.weather.precipitation;
      const precipIntensity = mapPrecipitationToIntensity(stateRef.current.weather);

      
      precipSystem.updateWind(stateRef.current.weather.windSpeed || 0, stateRef.current.weather.windDirection || 0);
      precipSystem.update(dt / 1000, precipitation, precipIntensity);
      renderPrecipitation(ctx, precipSystem, precipitation, precipIntensity, currentRef.current);

      
      const cloudCover = stateRef.current.weather.cloudCover;
      if (cloudCover > 0) {
        if (!cloudsRendererRef.current) {
          const cloudsCanvas = cloudsCanvasRef.current;
          if (cloudsCanvas) {
            try {
              cloudsRendererRef.current = new SkyCloudsRenderer(cloudsCanvas);
            } catch (e) {
              console.warn('WebGL not supported for clouds:', e);
            }
          }
        }
        if (cloudsRendererRef.current) {
          cloudsRendererRef.current.render(
            now / 1000,
            width,
            height,
            currentRef.current.upperSky,
            currentRef.current.midSky,
            currentRef.current.horizonBand,
            stateRef.current.astronomy.sunElevation,
            {
              ...stateRef.current.weather,
              lightningEffect: skyResult.lightningEffect
            }
          );
        }
      } else {
        if (cloudsRendererRef.current) {
          cloudsRendererRef.current.dispose();
          cloudsRendererRef.current = null;
        }
      }

      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(raf);
      if (precipitationSystemRef.current) {
        precipitationSystemRef.current.clear();
      }
      if (cloudsRendererRef.current) {
        cloudsRendererRef.current.dispose();
      }
    };
  }, []);

  return { canvasRef, cloudsCanvasRef };
};


const mapWeatherCodeToIntensity = (code: number): 'light' | 'moderate' | 'heavy' => {
  
  if (code >= 51 && code <= 57) {
    return code === 57 ? 'moderate' : 'light'; 
  }
  
  
  if (code >= 61 && code <= 67) {
    if (code === 61) return 'light';      
    if (code === 62) return 'moderate';   
    if (code === 63) return 'heavy';      
    if (code === 64) return 'light';      
    if (code === 65) return 'moderate';   
    if (code === 66) return 'moderate';   
    if (code === 67) return 'heavy';      
    return 'moderate';
  }
  
  
  if (code >= 80 && code <= 82) {
    if (code === 80) return 'moderate';   
    if (code === 81) return 'heavy';      
    if (code === 82) return 'heavy';      
    return 'heavy';
  }
  
  
  if (code >= 85 && code <= 86) {
    return 'heavy';
  }
  
  
  if (code >= 95) {
    return code === 95 ? 'heavy' : 'heavy'; 
  }
  
  return 'moderate';
};


const mapPrecipitationToIntensity = (weather: SkyStateInput['weather']): 'light' | 'moderate' | 'heavy' => {
  
  if (weather.weatherCode !== undefined && weather.weatherCode !== null) {
    return mapWeatherCodeToIntensity(weather.weatherCode);
  }
  
  const { precipitationAmount = 0, precipitationProbability = 0 } = weather;

  
  if (precipitationAmount < 2.5 || precipitationProbability < 0.4) {
    return 'light';
  }

  
  if (precipitationAmount > 10 || precipitationProbability > 0.8) {
    return 'heavy';
  }

  
  return 'moderate';
};


const renderPrecipitation = (
  ctx: CanvasRenderingContext2D,
  system: PrecipitationSystem,
  precipitationType: 'rain' | 'snow' | 'none',
  intensity: 'light' | 'moderate' | 'heavy' = 'moderate',
  skyLayers: SkyLayerColors
) => {
  const config = PRECIPITATION_CONFIG;
  const particles = system.getParticles();
  const canvasHeight = ctx.canvas.height;

  if (particles.length === 0) return;

  
  const previousBlendMode = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighten';

  for (const particle of particles) {
    
    ctx.globalAlpha = 1.0;

    if (particle.type === 'rain') {
      renderRainStreak(ctx, particle, intensity);
    } else {
      renderSnowflake(ctx, particle, intensity, skyLayers, canvasHeight);
    }
  }

  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = previousBlendMode;
};


const renderRainStreak = (ctx: CanvasRenderingContext2D, particle: Particle, intensity: 'light' | 'moderate' | 'heavy' = 'moderate') => {
  
  let streakLength = particle.size * 8;
  if (intensity === 'moderate') streakLength = particle.size * 9;
  if (intensity === 'heavy') streakLength = particle.size * 10;

  ctx.save();
  ctx.translate(particle.x, particle.y);

  const angle = Math.atan2(particle.vy, particle.vx);
  ctx.rotate(angle);

  
  let baseOpacity = Math.max(0.4, particle.opacity * 1.5);
  let rainColor = 'rgba(255, 255, 255,';
  
  switch (intensity) {
    case 'light':
      
      baseOpacity *= 0.7;
      rainColor = 'rgba(240, 245, 250,';
      break;
    case 'moderate':
      
      rainColor = 'rgba(255, 255, 255,';
      break;
    case 'heavy':
      
      baseOpacity *= 1.2;
      rainColor = 'rgba(220, 240, 255,';
      break;
  }

  ctx.strokeStyle = `${rainColor} ${baseOpacity})`;
  ctx.lineWidth = Math.max(1.0, particle.size * 1.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-streakLength / 2, 0);
  ctx.lineTo(streakLength / 2, 0);
  ctx.stroke();

  ctx.restore();
};


const renderSnowflake = (
  ctx: CanvasRenderingContext2D, 
  particle: Particle, 
  intensity: 'light' | 'moderate' | 'heavy' = 'moderate',
  skyLayers: SkyLayerColors,
  canvasHeight: number
) => {
  ctx.save();
  ctx.translate(particle.x, particle.y);

  if (particle.rotation) {
    ctx.rotate(particle.rotation);
  }

  
  let opacity = Math.max(0.5, particle.opacity * 1.5);
  
  switch (intensity) {
    case 'light':
      
      opacity *= 0.8;
      break;
    case 'moderate':
      
      break;
    case 'heavy':
      
      opacity *= 1.1;
      break;
  }

  
  const normalizedY = particle.y / canvasHeight;
  const skyColor = sampleSkyColor(skyLayers, normalizedY);
  
  
  
  const snowTintFactor = 0.3; 
  const tintedColor: [number, number, number] = [
    1.0 - (1.0 - skyColor[0]) * snowTintFactor, 
    1.0 - (1.0 - skyColor[1]) * snowTintFactor,
    1.0 - (1.0 - skyColor[2]) * snowTintFactor
  ];

  
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 2);
  grad.addColorStop(0, `rgba(${Math.floor(tintedColor[0] * 255)}, ${Math.floor(tintedColor[1] * 255)}, ${Math.floor(tintedColor[2] * 255)}, ${opacity})`);
  grad.addColorStop(0.6, `rgba(${Math.floor(tintedColor[0] * 255)}, ${Math.floor(tintedColor[1] * 255)}, ${Math.floor(tintedColor[2] * 255)}, ${opacity * 0.6})`);
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, particle.size * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};
