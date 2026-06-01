interface MetricsBatch {
  pageLoadSeconds?: number;
  apiRequests: number;
  apiErrors: number;
  jsErrors: number;
  page: string;
}

class FrontendMonitor {
  private apiRequests = 0;
  private apiErrors = 0;
  private jsErrors = 0;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  init() {
    this.measurePageLoad();
    this.trackJsErrors();
    this.scheduleFlush();
    window.addEventListener('beforeunload', () => this.flush());
  }

  private measurePageLoad() {
    if (typeof PerformanceObserver === 'undefined') return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const nav = entry as PerformanceNavigationTiming;
        const loadTime = (nav.loadEventEnd - nav.startTime) / 1000;
        if (loadTime > 0) {
          this.send({ pageLoadSeconds: loadTime, apiRequests: 0, apiErrors: 0, jsErrors: 0, page: location.pathname });
        }
      }
    });
    observer.observe({ entryTypes: ['navigation'] });
  }

  private trackJsErrors() {
    window.onerror = () => { this.jsErrors++; return false; };
    window.addEventListener('unhandledrejection', () => { this.jsErrors++; });
  }

  recordApiRequest(isError: boolean) {
    this.apiRequests++;
    if (isError) this.apiErrors++;
  }

  private scheduleFlush() {
    this.flushInterval = setInterval(() => this.flush(), 30_000);
  }

  private flush() {
    if (this.apiRequests === 0 && this.jsErrors === 0) return;
    const batch: MetricsBatch = {
      apiRequests: this.apiRequests,
      apiErrors: this.apiErrors,
      jsErrors: this.jsErrors,
      page: location.pathname,
    };
    this.apiRequests = 0;
    this.apiErrors = 0;
    this.jsErrors = 0;
    this.send(batch);
  }

  private send(batch: MetricsBatch) {
    const base = (import.meta.env.VITE_API_BASE_URL as string || '/api').replace(/\/$/, '');
    fetch(`${base}/metrics/frontend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      keepalive: true,  // vẫn gửi khi tab đóng
    }).catch(() => {});
  }

  destroy() {
    if (this.flushInterval) clearInterval(this.flushInterval);
  }
}

export const monitor = new FrontendMonitor();