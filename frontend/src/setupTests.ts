// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom has no Web Audio API. Several modules construct an AudioContext at
// import time (e.g. piano/PianoControl), so provide a minimal stub.
class MockAudioContext {
  createGain() {
    return { connect() {}, gain: { value: 1, setValueAtTime() {} } };
  }
  createOscillator() {
    return { connect() {}, start() {}, stop() {}, frequency: { value: 440 } };
  }
  get destination() {
    return {};
  }
  get currentTime() {
    return 0;
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

if (typeof window !== 'undefined') {
  const w = window as unknown as {
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
  };
  w.AudioContext = w.AudioContext || MockAudioContext;
  w.webkitAudioContext = w.webkitAudioContext || MockAudioContext;
}
