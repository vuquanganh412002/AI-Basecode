/**
 * Global Vitest setup for frontend.
 *
 * jsdom doesn't ship the browser APIs that Ant Design Vue relies on; stub
 * them here so every spec can mount components without boilerplate.
 */

// matchMedia — used by Ant Design for dark mode detection.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ResizeObserver — required by Ant's a-table, a-select dropdowns.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

// IntersectionObserver — used by a few Ant components + lazy images.
class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds = [];
}
(
  globalThis as unknown as { IntersectionObserver: typeof IntersectionObserverStub }
).IntersectionObserver = IntersectionObserverStub;
