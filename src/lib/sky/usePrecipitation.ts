

import React, { useEffect, useRef } from 'react';
import { PrecipitationSystem, Particle } from '@/lib/sky/precipitationSystem';
import { PRECIPITATION_CONFIG } from '@/lib/sky/precipitationConfig';

const RAIN_GRADIENT_CACHE = new Map<string, CanvasGradient>();
const SNOW_TEXTURE_CACHE = new Map<string, HTMLCanvasElement>();


function createRainGradient(ctx: CanvasRenderingContext2D, length: number): CanvasGradient {
  const cacheKey = `rain-${length}`;
  if (RAIN_GRADIENT_CACHE.has(cacheKey)) {
    return RAIN_GRADIENT_CACHE.get(cacheKey)!;
  }

  const grad = ctx.createLinearGradient(0, 0, 0, length);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  RAIN_GRADIENT_CACHE.set(cacheKey, grad);
  return grad;
}


function createSnowflakeTexture(size: number): HTMLCanvasElement {
  const cacheKey = `snow-${size}`;
  if (SNOW_TEXTURE_CACHE.has(cacheKey)) {
    return SNOW_TEXTURE_CACHE.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  const actualSize = Math.ceil(size * 4); 
  canvas.width = actualSize;
  canvas.height = actualSize;

  const ctx = canvas.getContext('2d')!;

  
  const centerX = actualSize / 2;
  const centerY = actualSize / 2;
  const radius = actualSize / 4;

  
  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  SNOW_TEXTURE_CACHE.set(cacheKey, canvas);
  return canvas;
}

interface UsePrecipitationProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  precipitationType: 'rain' | 'snow' | 'none';
  intensity: 'light' | 'moderate' | 'heavy';
  windSpeed?: number;
  enabled?: boolean;
}

export const usePrecipitation = ({
  canvasRef,
  precipitationType,
  intensity,
  windSpeed = 0,
  enabled = true
}: UsePrecipitationProps) => {
  const systemRef = useRef<PrecipitationSystem | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    
    if (!systemRef.current) {
      systemRef.current = new PrecipitationSystem(canvas.width, canvas.height, windSpeed, 0); 
    } else {
      systemRef.current.updateWind(windSpeed, 0); 
    }

    const system = systemRef.current;
    let lastTime = performance.now();
    const config = PRECIPITATION_CONFIG;

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.033); 
      lastTime = currentTime;

      
      system.update(deltaTime, precipitationType, intensity);

      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      
      const blendMode = config.rendering.blendMode;
      ctx.globalCompositeOperation =
        blendMode === 'screen'
          ? 'screen'
          : blendMode === 'multiply'
          ? 'multiply'
          : blendMode === 'overlay'
          ? 'overlay'
          : 'source-over';

      
      const particles = system.getParticles();
      for (const particle of particles) {
        ctx.globalAlpha = particle.opacity;

        if (particle.type === 'rain') {
          renderRainStreak(ctx, particle);
        } else {
          renderSnowflake(ctx, particle);
        }
      }

      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    
    const handleResize = () => {
      if (canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        system.resize(canvas.width, canvas.height);
      }
    };

    
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef, precipitationType, intensity, windSpeed, enabled]);

  
  useEffect(() => {
    return () => {
      if (systemRef.current) {
        systemRef.current.clear();
      }
    };
  }, []);
};


function renderRainStreak(ctx: CanvasRenderingContext2D, particle: Particle) {
  const streakLength = particle.size * 12; 

  ctx.save();
  ctx.translate(particle.x, particle.y);

  
  const angle = Math.atan2(particle.vy, particle.vx);
  ctx.rotate(angle);

  
  ctx.strokeStyle = `rgba(255, 255, 255, ${particle.opacity})`;
  ctx.lineWidth = particle.size * 0.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-streakLength / 2, 0);
  ctx.lineTo(streakLength / 2, 0);
  ctx.stroke();

  ctx.restore();
}


function renderSnowflake(ctx: CanvasRenderingContext2D, particle: Particle) {
  const texture = createSnowflakeTexture(particle.size);

  ctx.save();
  ctx.translate(particle.x, particle.y);

  
  if (particle.rotation) {
    ctx.rotate(particle.rotation);
  }

  
  ctx.drawImage(
    texture,
    -particle.size * 2,
    -particle.size * 2,
    particle.size * 4,
    particle.size * 4
  );

  ctx.restore();
}

export interface PrecipitationRenderState {
  type: 'rain' | 'snow' | 'none';
  intensity: 'light' | 'moderate' | 'heavy';
}
