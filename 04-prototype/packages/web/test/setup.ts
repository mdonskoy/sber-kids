// jsdom lacks these; HeroUI hooks and react-aria collections call them.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }) as MediaQueryList;
}
if (!('ResizeObserver' in window)) {
  class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}
Element.prototype.scrollIntoView ??= () => {};
HTMLElement.prototype.scrollTo ??= () => {};
