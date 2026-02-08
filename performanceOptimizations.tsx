import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// Debounce hook for search/input events
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for scroll/resize events
export const useThrottle = <T,>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

// Image lazy loading hook
export const useLazyLoad = (
  threshold: number = 0.1,
  rootMargin: string = '50px'
): [React.RefObject<HTMLImageElement>, boolean] => {
  const ref = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin, isVisible]);

  return [ref, isVisible];
};

// Memoize expensive computations
export const useMemoizedValue = <T,>(
  factory: () => T,
  dependencies: any[],
  equalityFn?: (prev: T, next: T) => boolean
): T => {
  const previousValue = useRef<T>();
  const previousDeps = useRef<any[]>([]);

  const areDepsEqual = useCallback((prev: any[], next: any[]) => {
    if (prev.length !== next.length) return false;
    return prev.every((dep, index) => Object.is(dep, next[index]));
  }, []);

  return useMemo(() => {
    if (!areDepsEqual(previousDeps.current, dependencies)) {
      previousValue.current = factory();
      previousDeps.current = dependencies;
    }
    
    if (equalityFn && previousValue.current) {
      const newValue = factory();
      return equalityFn(previousValue.current, newValue) 
        ? previousValue.current 
        : newValue;
    }
    
    return previousValue.current || factory();
  }, [factory, dependencies, areDepsEqual, equalityFn]);
};

// Virtual scrolling optimization for large lists
export const useVirtualScroll = (
  itemCount: number,
  itemHeight: number,
  containerRef: React.RefObject<HTMLElement>,
  overscan: number = 3
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setViewportHeight(container.clientHeight);
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    handleResize(); // Initial measurement

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleItemCount = Math.ceil(viewportHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(itemCount - 1, startIndex + visibleItemCount);

  const visibleItems = Array.from(
    { length: endIndex - startIndex + 1 },
    (_, index) => startIndex + index
  );

  const totalHeight = itemCount * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight,
    offsetY,
    viewportHeight
  };
};

// Web Worker hook for expensive computations
export const useWorker = <T, R>(
  workerScript: string,
  onMessage: (result: R) => void,
  onError?: (error: Error) => void
) => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(workerScript);
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<R>) => {
      onMessage(event.data);
    };

    worker.onerror = (error) => {
      onError?.(error);
    };

    return () => {
      worker.terminate();
    };
  }, [workerScript, onMessage, onError]);

  const postMessage = useCallback((data: T) => {
    if (workerRef.current) {
      workerRef.current.postMessage(data);
    }
  }, []);

  return { postMessage };
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const mountTime = useRef(Date.now());
  const renderCount = useRef(0);

  useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 ${componentName}: Mounted in ${mountDuration}ms`);
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 ${componentName}: Unmounted after ${renderCount.current} renders`);
      }
    };
  }, [componentName]);

  useEffect(() => {
    renderCount.current += 1;
    
    if (process.env.NODE_ENV === 'development' && renderCount.current > 10) {
      console.warn(`⚠️ ${componentName}: High render count (${renderCount.current})`);
    }
  });
};

// Bundle optimization: Code splitting helper
export const lazyLoadComponent = (
  importFunc: () => Promise<{ default: React.ComponentType<any> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = React.lazy(importFunc);
  
  return (props: any) => (
    <React.Suspense fallback={fallback || <div className="p-8 text-center">Loading...</div>}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Memory optimization: Cleanup effects
export const useCleanup = () => {
  const cleanupRef = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((fn: () => void) => {
    cleanupRef.current.push(fn);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, []);

  return { addCleanup };
};

// Optimize images with WebP fallback
export const optimizeImageUrl = (
  url: string,
  width?: number,
  height?: number,
  format: 'webp' | 'jpg' | 'png' = 'webp'
): string => {
  if (!url || url.startsWith('data:')) return url;
  
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('format', format);
  params.append('quality', '80');
  
  // For Supabase storage or CDN
  if (url.includes('supabase.co')) {
    return `${url}?${params.toString()}`;
  }
  
  return url;
};

// Export all optimizations
export const PerformanceOptimizations = {
  useDebounce,
  useThrottle,
  useLazyLoad,
  useMemoizedValue,
  useVirtualScroll,
  useWorker,
  usePerformanceMonitor,
  lazyLoadComponent,
  useCleanup,
  optimizeImageUrl
};

export default PerformanceOptimizations;