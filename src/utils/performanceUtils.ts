/**
 * Performance utility functions for optimizing React apps
 */

/**
 * Debounce function to limit how often a function can fire
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function only fires once within a time window
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize expensive function calls
 * @param fn Function to memoize
 * @param getKey Function to generate cache key from arguments
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

/**
 * Request Idle Callback wrapper with fallback
 * @param callback Function to call during idle time
 * @param options Options for idle callback
 * @returns Cancel function
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): () => void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, options);
    return () => window.cancelIdleCallback(id);
  }
  
  // Fallback for browsers without requestIdleCallback
  const id = setTimeout(callback, 1);
  return () => clearTimeout(id);
}

/**
 * Batch multiple DOM reads together to avoid layout thrashing
 * @param reads Array of read functions
 * @returns Promise with all read results
 */
export async function batchReads<T>(reads: Array<() => T>): Promise<T[]> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const results = reads.map((read) => read());
      resolve(results);
    });
  });
}

/**
 * Batch multiple DOM writes together to avoid layout thrashing
 * @param writes Array of write functions
 * @returns Promise when all writes complete
 */
export async function batchWrites(writes: Array<() => void>): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      writes.forEach((write) => write());
      resolve();
    });
  });
}

/**
 * Simple LRU Cache implementation
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private capacity: number;

  constructor(capacity: number = 100) {
    this.cache = new Map();
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Remove oldest if at capacity
    else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
