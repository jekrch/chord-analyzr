import { describe, it, expect } from 'vitest';
import App from './App';

// Smoke test: the original CRA test asserted a "learn react" link that no
// longer exists. This instead verifies that App's full module graph loads
// (which pulls in stores, services, and the audio-constructing piano modules)
// and that App is exported as a renderable component.
describe('App', () => {
  it('imports and exposes a component', () => {
    expect(App).toBeTypeOf('function');
  });
});
