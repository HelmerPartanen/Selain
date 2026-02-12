

export interface IntensityLevel {
  spawnRate: number; 
  lifetime: number; 
  velocity: { y: [number, number] }; 
  size: [number, number]; 
  opacity: [number, number]; 
  drift?: number; 
  description: string;
}

export interface PrecipitationType {
  visualModel: 'streak' | 'flake';
  gravity: number;
  angleVarianceDegrees?: number;
  rotation?: boolean;
  intensityLevels: {
    light: IntensityLevel;
    moderate: IntensityLevel;
    heavy: IntensityLevel;
  };
}

export interface MotionNoiseConfig {
  type: 'perlin';
  scale: number; 
  speed: number; 
  smoothness: number; 
  appliesTo: {
    rain: string[];
    snow: string[];
  };
}

export interface RenderingConfig {
  blendMode: 'screen' | 'multiply' | 'overlay' | 'normal';
  softEdges: boolean;
  depthFade: boolean;
  motionBlur: {
    enabled: boolean;
    strength: {
      rain: number;
      snow: number;
    };
  };
}

export interface WindConfig {
  directionDegrees: number;
  strength: number; 
  affects: string[]; 
  gusts: boolean;
}

export interface PrecipitationSystemConfig {
  philosophy: {
    goal: string;
    rules: string[];
  };

  global: {
    coordinateSystem: 'screen-space';
    spawnArea: 'top';
    despawnRule: 'below-screen';
    timeScale: number;
  };

  wind: WindConfig;
  motionNoise: MotionNoiseConfig;
  rendering: RenderingConfig;

  types: {
    rain: PrecipitationType;
    snow: PrecipitationType;
  };

  confidenceEncoding: {
    highConfidence: {
      edges: 'crisp';
      opacityStability: 'stable';
      motion: 'linear';
    };
    lowConfidence: {
      edges: 'soft';
      opacityStability: 'variable';
      motion: 'slightly dampened';
    };
  };

  transitions: {
    rainToSnow: {
      allowed: boolean;
      blendMethod: 'crossfade';
      temperatureThresholdC: [number, number];
      notes: string;
    };
  };

  nonGoals: string[];
}

export const PRECIPITATION_CONFIG: PrecipitationSystemConfig = {
  philosophy: {
    goal: 'Perceptual realism over physical simulation',
    rules: [
      'Intensity is expressed by density and motion, not particle size',
      'Motion must be smooth and predictable',
      'No chaotic turbulence or sudden changes',
      'Snow prioritizes depth ambiguity and gentle nonlinearity'
    ]
  },

  global: {
    coordinateSystem: 'screen-space',
    spawnArea: 'top',
    despawnRule: 'below-screen',
    timeScale: 1.0
  },

  wind: {
    directionDegrees: 12,
    strength: 0.2,
    affects: ['velocity.x'],
    gusts: false
  },

  motionNoise: {
    type: 'perlin',
    scale: 0.25,        
    speed: 0.08,        
    smoothness: 0.95,   
    appliesTo: {
      rain: ['x'],
      snow: ['x', 'rotation', 'velocity.y']
    }
  },

  rendering: {
    blendMode: 'screen',
    softEdges: true,
    depthFade: true,
    motionBlur: {
      enabled: true,
      strength: {
        rain: 0.25,
        snow: 0.02
      }
    }
  },

  types: {
    rain: {
      visualModel: 'streak',
      gravity: 0,
      angleVarianceDegrees: 5,
      intensityLevels: {
        light: {
          spawnRate: 80,
          lifetime: 1.2,
          velocity: { y: [1000, 1300] },
          size: [1.0, 1.2],
          opacity: [0.12, 0.2],
          description: 'Sparse drizzle, low confidence precipitation'
        },
        moderate: {
          spawnRate: 160,
          lifetime: 1.0,
          velocity: { y: [1300, 1800] },
          size: [1.0, 1.5],
          opacity: [0.2, 0.3],
          description: 'Steady rainfall with clear radar signal'
        },
        heavy: {
          spawnRate: 300,
          lifetime: 0.9,
          velocity: { y: [1800, 2400] },
          size: [1.2, 1.8],
          opacity: [0.25, 0.4],
          description: 'Dense downpour, strong radar reflectivity'
        }
      }
    },

    snow: {
  visualModel: 'flake',
  gravity: 0,
  rotation: true,
  intensityLevels: {
    light: {
      spawnRate: 45,
      lifetime: 7.5,
      velocity: { y: [35, 90] },
      size: [0.69, 1.27], 
      opacity: [0.3, 0.55],
      drift: 30,
      description: 'Sparse, floating flakes with high depth ambiguity'
    },
    moderate: {
      spawnRate: 110,
      lifetime: 8.0,
      velocity: { y: [45, 120] },
      size: [0.86, 1.55], 
      opacity: [0.35, 0.65],
      drift: 50,
      description: 'Layered snowfall with visible depth separation'
    },
    heavy: {
      spawnRate: 180,
      lifetime: 9.0,
      velocity: { y: [60, 150] },
      size: [0.98, 1.84], 
      opacity: [0.4, 0.7],
      drift: 65,
      description: 'Dense snowfall with foreground/background velocity stratification'
    }
  }
}

  },

  confidenceEncoding: {
    highConfidence: {
      edges: 'crisp',
      opacityStability: 'stable',
      motion: 'linear'
    },
    lowConfidence: {
      edges: 'soft',
      opacityStability: 'variable',
      motion: 'slightly dampened'
    }
  },

  transitions: {
    rainToSnow: {
      allowed: true,
      blendMethod: 'crossfade',
      temperatureThresholdC: [0, 2],
      notes: 'Never hard-switch precipitation types'
    }
  },

  nonGoals: [
    'No splashes',
    'No ground interaction',
    'No thunder or extreme events',
    'No microbursts or gust fronts'
  ]
};
