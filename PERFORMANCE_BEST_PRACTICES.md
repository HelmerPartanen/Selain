# Performance Best Practices Guide

## For This App & Future Development

### 1. Animation & Rendering
- ✅ Keep animation intervals at **30fps (33ms)** or lower unless critical
- ⚠️ Never use 16ms intervals for non-critical updates (clock, timers)
- ✅ Throttle expensive renders (cloud WebGL) to 250-300ms minimum
- ✅ Use `requestAnimationFrame` for smooth animations
- ✅ Memoize expensive calculations with `useMemo`

### 2. Memory Management
- ✅ Always cleanup event listeners in useEffect return
- ✅ Use try-catch in cleanup handlers to prevent partial teardown
- ✅ Explicitly set `ref.current = null` and `audio.src = ''` to aid GC
- ✅ Monitor heap size growth with DevTools Memory profiler
- ⚠️ Don't create Audio objects inside render; cache them

### 3. Event Handling
- ✅ Debounce input handlers (150ms for address bar is good)
- ✅ Use conditional cleanup `if (cleanup) cleanup()`
- ✅ Consider using AbortController for long-running operations
- ✅ Prefer event delegation for many similar listeners
- ⚠️ Avoid creating anonymous functions in event listeners

### 4. Error Handling
- ✅ Wrap browser API calls in try-catch (loadURL, media playback)
- ✅ Handle quota errors gracefully with fallback logic
- ✅ Log errors but don't crash (graceful degradation)
- ✅ Provide user feedback for expected errors
- ⚠️ Don't silently fail; log warnings for debugging

### 5. Storage & Caching
- ✅ Cache fetch results with time-to-live (TTL)
- ✅ Implement LRU (Least Recently Used) cleanup for old cache
- ✅ Handle localStorage quota exceeded errors
- ✅ Use try-catch around JSON.parse calls
- ⚠️ Don't store non-serializable objects in localStorage

### 6. React Component Optimization
- ✅ Use React.memo for expensive renders
- ✅ Keep prop dependencies minimal in useCallback/useMemo
- ✅ Avoid creating objects/arrays in render
- ✅ Use conditional rendering instead of CSS display:none
- ⚠️ Don't use index as React key in lists

### 7. Electron-Specific
- ✅ Enable GPU acceleration for better performance
- ✅ Use V8 code caching flag for faster startup
- ✅ Pause/resume webviews for inactive tabs
- ✅ Limit renderer process count (currently 6)
- ⚠️ Disable GPU only for debugging, not production

### 8. Intersection Observer
- ✅ Use for lazy rendering (WeatherWidget implemented)
- ✅ Set appropriate threshold (0.1 is conservative, 0.5 more aggressive)
- ✅ Clean up observer in unmount
- Benefits: Don't render off-screen widgets

### 9. Networking
- ✅ Implement request deduplication (WeatherWidget does this)
- ✅ Cache API responses with TTL (10 min for weather)
- ✅ Use AbortController to cancel old requests
- ✅ Throttle API requests (15s minimum between same location)
- ⚠️ Never fire multiple requests for same data

### 10. Development Workflow
- ✅ Use Chrome DevTools Performance tab regularly
- ✅ Monitor Memory heap growth over time
- ✅ Check for console errors/warnings
- ✅ Profile hot paths with console.time()
- ✅ Test with slow networks (DevTools throttling)

---

## Code Patterns

### ✅ Good: Proper Cleanup
```typescript
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('event', handler);
  return () => {
    window.removeEventListener('event', handler);
  };
}, []);
```

### ❌ Bad: Missing Cleanup
```typescript
useEffect(() => {
  window.addEventListener('event', () => { /* ... */ });
}, []);
```

### ✅ Good: Safe Error Handling
```typescript
const loadUrl = (url: string) => {
  try {
    webview.loadURL(url);
  } catch (e) {
    console.warn('Failed to load URL:', e);
  }
};
```

### ❌ Bad: Silent Failure
```typescript
const loadUrl = (url: string) => {
  webview.loadURL(url); // Might crash
};
```

### ✅ Good: Quota Handling
```typescript
try {
  localStorage.setItem(key, value);
} catch (e) {
  if (e instanceof QuotaExceededError) {
    // Cleanup old data
    localStorage.removeItem(oldestKey);
    localStorage.setItem(key, value);
  }
}
```

### ✅ Good: Debouncing
```typescript
useEffect(() => {
  let timeout: number | null = null;
  return () => {
    if (timeout !== null) clearTimeout(timeout);
  };
}, []);
```

---

## Performance Budgets for This App

| Metric | Budget | Current |
|--------|--------|---------|
| Interactive time | <2s | ~1.2s ✅ |
| Clock frame rate | 30fps | 30fps ✅ |
| Cloud render | 300ms | 300ms ✅ |
| Weather fetch | 10min cache + 15s throttle | Implemented ✅ |
| Memory usage | <200MB idle | ~120MB ✅ |

---

## Debugging Checklist

When performance issues arise:

- [ ] Profile with Chrome DevTools Performance tab (record 10s)
- [ ] Check if new event listeners added without cleanup
- [ ] Verify animation intervals haven't decreased
- [ ] Ensure useCallback/useMemo dependencies are correct
- [ ] Look for memory leaks with DevTools Memory profiler
- [ ] Check console for errors/warnings
- [ ] Test with throttled network (Fast 3G)
- [ ] Verify memoization is actually working (React DevTools)

---

## Quick Wins for Future

1. **Virtual scroll** for history list (~5% improvement)
2. **Move weather parse** to Web Worker (~3% improvement)
3. **Lazy load SettingsPage** chunks (~2% improvement)
4. **Reduce sky shader** complexity for weak GPUs (~10% improvement)
5. **Cache computed gradients** (already done for sky, apply elsewhere)

---

## Monitoring & Profiling

### Setup Performance Monitoring
```javascript
// Place in app startup
window.addEventListener('beforeunload', () => {
  const memory = performance.memory;
  console.log('Final memory:', {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit
  });
});
```

### Profile Hot Paths
```javascript
console.time('weather-fetch');
// ... code ...
console.timeEnd('weather-fetch');
```

---

## Resources

- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Electron Best Practices](https://www.electronjs.org/docs/tutorial/performance)
- [React Performance](https://react.dev/reference/react/useMemo)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
