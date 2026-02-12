

import { PRECIPITATION_CONFIG, PrecipitationType } from './precipitationConfig';


class PerlinNoiseGenerator {
  private seeds: number[] = [];
  private currentTime: number = 0;
  private currentValue: number = 0;
  private lastScale: number = 0;

  constructor() {
    for (let i = 0; i < 4; i++) {
      this.seeds[i] = Math.random() * 256;
    }
  }

  update(deltaTime: number, speed: number) {
    this.currentTime += deltaTime * speed;
  }

  getValue(x: number, y: number, scale: number): number {
    const t = this.currentTime;
    const s = scale;

    let value = 0;
    value += Math.sin((x * 0.005 + t * 0.3) / s) * 0.5;
    value += Math.sin((y * 0.008 + t * 0.2) / s) * 0.3;
    value += Math.sin((x * y * 0.0001 + t * 0.15) / s) * 0.2;

    return (value + 1) / 2;
  }
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  lifetime: number;
  age: number;
  rotation: number;
  rotationVelocity: number;
  type: 'rain' | 'snow';
  intensity: 'light' | 'moderate' | 'heavy';
  motionNoiseOffset: number; 
}

export class PrecipitationSystem {
  private particles: Particle[] = [];
  private width: number;
  private height: number;
  private config = PRECIPITATION_CONFIG;
  private noiseGenerator: PerlinNoiseGenerator;
  private spawnAccumulator: number = 0;
  private lastTime: number = performance.now();

  
  private windAngleRadians: number;
  private windStrength: number;

  constructor(width: number, height: number, windSpeed: number = 0, windDirection: number = 12) {
    this.width = width;
    this.height = height;
    this.noiseGenerator = new PerlinNoiseGenerator();
    this.updateWind(windSpeed, windDirection);
  }

  updateWind(windSpeed: number = 0, windDirection: number = 12) {
    const baseWind = this.config.wind;
    this.windAngleRadians = (windDirection * Math.PI) / 180;
    this.windStrength = baseWind.strength * Math.max(windSpeed, 0.5); 
  }

  update(deltaTime: number, precipitationType: 'rain' | 'snow' | 'storm' | 'none', intensity: 'light' | 'moderate' | 'heavy' = 'moderate') {
    this.noiseGenerator.update(deltaTime, this.config.motionNoise.speed);

    const dt = Math.min(0.033, deltaTime);
    const MAX_PARTICLES = 1000;

    let validParticles = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;

      if (p.age >= p.lifetime || p.y > this.height) {
        this.particles.splice(i, 1);
        continue;
      }

      validParticles++;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const noiseInfluence = this.config.motionNoise.scale;
      const noise = this.noiseGenerator.getValue(p.x, p.y, noiseInfluence);
      const noiseOffset = (noise - 0.5) * 2;

      if (p.type === 'rain') {
        const baseDrift = 20;
        const windDrift = this.windStrength * Math.cos(this.windAngleRadians) * baseDrift;
        p.vx += (windDrift + noiseOffset * baseDrift) * dt;
      } else {
        const baseDrift = this.config.types.snow.intensityLevels[intensity].drift || 15;
        const windDrift = this.windStrength * Math.cos(this.windAngleRadians) * baseDrift;
        p.vx = windDrift * 0.5 + noiseOffset * baseDrift * dt;

        if (this.config.types.snow.rotation) {
          p.rotation += p.rotationVelocity * dt;
          if (p.rotation > Math.PI * 2) p.rotation -= Math.PI * 2;
        }
      }

      const fadeInDuration = 0.2;
      const fadeOutDuration = 0.3;
      let fadeMultiplier = 1;

      if (p.age < fadeInDuration) {
        fadeMultiplier = p.age / fadeInDuration;
      } else if (p.age > p.lifetime - fadeOutDuration) {
        fadeMultiplier = (p.lifetime - p.age) / fadeOutDuration;
      }

      p.opacity *= this.config.rendering.softEdges ? fadeMultiplier : 1;
    }

    if (precipitationType !== 'none' && validParticles < MAX_PARTICLES) {
      const actualType = precipitationType === 'storm' ? 'rain' : precipitationType;
      const typeConfig = this.config.types[actualType];

      if (typeConfig) {
        const intensityConfig = typeConfig.intensityLevels[intensity];
        const spawnRate = intensityConfig.spawnRate;

        this.spawnAccumulator += spawnRate * dt;

        while (this.spawnAccumulator >= 1 && this.particles.length < MAX_PARTICLES) {
          this.spawnParticle(actualType as 'rain' | 'snow', intensity, typeConfig);
          this.spawnAccumulator -= 1;
        }
      }
    } else if (precipitationType === 'none') {
      this.spawnAccumulator = 0;
    }
  }

  private spawnParticle(
    type: 'rain' | 'snow',
    intensity: 'light' | 'moderate' | 'heavy',
    typeConfig: PrecipitationType
  ) {
    const intensityConfig = typeConfig.intensityLevels[intensity];

    
    
    const [vyMin, vyMax] = intensityConfig.velocity.y;
    const avgVy = (vyMin + vyMax) / 2;
    const avgLifetime = intensityConfig.lifetime;
    
    
    const windDriftDistance = Math.abs(Math.cos(this.windAngleRadians)) * this.windStrength * 300 * avgLifetime;
    
    
    const spawnPadding = Math.min(1.5, windDriftDistance / this.width);
    const spawnWidth = this.width * (1.0 + spawnPadding);
    const spawnOffsetX = -(spawnWidth - this.width) / 2; 
    
    const x = Math.random() * spawnWidth + spawnOffsetX;
    const y = -50; 

    
    const vy = vyMin + Math.random() * (vyMax - vyMin);

    
    const [sizeMin, sizeMax] = intensityConfig.size;
    const size = sizeMin + Math.random() * (sizeMax - sizeMin);

    const [opacityMin, opacityMax] = intensityConfig.opacity;
    const opacity = opacityMin + Math.random() * (opacityMax - opacityMin);

    
    const windVx = Math.cos(this.windAngleRadians) * this.windStrength * 50;

    
    let vx = windVx;
    if (type === 'rain' && typeConfig.angleVarianceDegrees) {
      const angleVariance = (typeConfig.angleVarianceDegrees * Math.PI) / 180;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * angleVariance;
      vx = Math.cos(angle) * 50 + windVx;
    }

    
    let rotation = Math.random() * Math.PI * 2;
    let rotationVelocity = 0;
    if (type === 'snow' && typeConfig.rotation) {
      rotationVelocity = (Math.random() - 0.5) * 4; 
    }

    const particle: Particle = {
      x,
      y,
      vx,
      vy,
      size,
      opacity,
      lifetime: intensityConfig.lifetime,
      age: 0,
      rotation,
      rotationVelocity,
      type,
      intensity,
      motionNoiseOffset: Math.random()
    };

    this.particles.push(particle);
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  clear() {
    this.particles = [];
    this.spawnAccumulator = 0;
  }
}
