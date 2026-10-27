import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@/core/i18n/i18n.config';
import { createMatchMedia } from './match-media';

// Lazy routes import their page on first render, which can exceed the default 1 s
// while Vitest transforms the module under load.
configure({ asyncUtilTimeout: 5000 });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: createMatchMedia(1280),
});

// jsdom lacks ResizeObserver, which Ant Design popups and virtual lists use.
class ResizeObserverStub {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverStub,
});

afterEach(cleanup);
