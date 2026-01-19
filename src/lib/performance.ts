// Performance monitoring utility for Phase 3
// Tracks and reports performance metrics

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'api' | 'render' | 'custom';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  // Track API call performance
  trackAPI(name: string, duration: number) {
    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      type: 'api',
    });
  }

  // Track component render time
  trackRender(componentName: string, duration: number) {
    this.addMetric({
      name: componentName,
      value: duration,
      timestamp: Date.now(),
      type: 'render',
    });
  }

  // Track navigation time
  trackNavigation(route: string, duration: number) {
    this.addMetric({
      name: route,
      value: duration,
      timestamp: Date.now(),
      type: 'navigation',
    });
  }

  // Track custom metrics
  trackCustom(name: string, value: number) {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'custom',
    });
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift(); // Remove oldest
    }

    // Log slow operations in development
    if (import.meta.env.DEV && metric.value > 1000) {
      console.warn(`[Performance] Slow ${metric.type}: ${metric.name} took ${metric.value}ms`);
    }
  }

  // Get average performance for a metric type
  getAverage(type: PerformanceMetric['type']): number {
    const filtered = this.metrics.filter(m => m.type === type);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  // Get all metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Clear metrics
  clear() {
    this.metrics = [];
  }

  // Get performance report
  getReport() {
    const apiAvg = this.getAverage('api');
    const renderAvg = this.getAverage('render');
    const navAvg = this.getAverage('navigation');

    return {
      api: {
        average: apiAvg,
        count: this.metrics.filter(m => m.type === 'api').length,
      },
      render: {
        average: renderAvg,
        count: this.metrics.filter(m => m.type === 'render').length,
      },
      navigation: {
        average: navAvg,
        count: this.metrics.filter(m => m.type === 'navigation').length,
      },
      total: this.metrics.length,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Helper to measure async function performance
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  type: PerformanceMetric['type'] = 'api'
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    performanceMonitor.trackAPI(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.trackAPI(`${name} (error)`, duration);
    throw error;
  }
}

// Helper to measure sync function performance
export function measureSyncPerformance<T>(
  name: string,
  fn: () => T,
  type: PerformanceMetric['type'] = 'render'
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    performanceMonitor.trackRender(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.trackRender(`${name} (error)`, duration);
    throw error;
  }
}
