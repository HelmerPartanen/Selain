

export const storageUtils = {
  
  getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      if (typeof window === 'undefined') return defaultValue || null;
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : (defaultValue || null);
    } catch {
      console.warn(`Failed to retrieve ${key} from storage`);
      return defaultValue || null;
    }
  },

  
  setItem<T>(key: string, value: T): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`Failed to save ${key} to storage`);
    }
  },

  
  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch {
      console.warn(`Failed to remove ${key} from storage`);
    }
  },

  
  clear(): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.clear();
    } catch {
      console.warn('Failed to clear storage');
    }
  },

  
  getString(key: string, defaultValue: string = ''): string {
    try {
      if (typeof window === 'undefined') return defaultValue;
      return localStorage.getItem(key) || defaultValue;
    } catch {
      return defaultValue;
    }
  },

  
  setString(key: string, value: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch {
      console.warn(`Failed to save string ${key} to storage`);
    }
  },

  
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  
  setBoolean(key: string, value: boolean): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`Failed to save boolean ${key} to storage`);
    }
  }
};
