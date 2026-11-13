// Tests for compass-pace.js: whether the graphics can carry the hero's compass, how often it
// draws, and when a frame would show nothing new.
import { describe, expect, it } from 'vite-plus/test';
import { inSoftware, frameDue, sameView } from './compass-pace.js';
import { compass as settings } from './motion.js';

describe('inSoftware', () => {
  it('knows the graphics drawn by the processor, with no graphics card', () => {
    for (const name of [
      // Chrome's own (PageSpeed's test machine, and headless browsers).
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
      'Google SwiftShader',
      // Linux without a driver.
      'llvmpipe (LLVM 17.0.6, 256 bits)',
      'ANGLE (Mesa, llvmpipe (LLVM 15.0.7 256 bits), OpenGL 4.5)',
      'softpipe',
      // Windows without a driver.
      'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
    ])
      expect(inSoftware(name), name).toBe(true);
  });

  it('lets every real graphics card through, and a name it cannot read', () => {
    for (const name of [
      'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
      'Apple GPU',
      'Mesa Intel(R) UHD Graphics 620 (KBL GT2)',
      'Intel(R) HD Graphics, or similar',
      'Adreno (TM) 740',
      'Mali-G78',
      'WebKit WebGL',
      '',
      undefined,
    ])
      expect(inSoftware(name), String(name)).toBe(false);
  });
});

// Runs one second of a screen refreshing "hertz" times a second and counts the drawings.
const drawingsIn = (hertz, start = 1000) => {
  let last = start;
  let drawn = 0;
  for (let frame = 1; frame <= hertz; frame++) {
    const next = frameDue(last, start + (frame * 1000) / hertz);
    if (next !== null) {
      drawn++;
      last = next;
    }
  }
  return drawn;
};

describe('frameDue', () => {
  it('keeps to the frame rate set in motion.js', () => {
    expect(settings.fps).toBe(60);
  });

  it('draws every frame of a 60 or 30 Hz screen', () => {
    expect(drawingsIn(60)).toBe(60);
    expect(drawingsIn(30)).toBe(30);
  });

  it('draws a frame that comes a little early, as frames do', () => {
    expect(frameDue(0, 16)).not.toBeNull();
    expect(frameDue(0, 15.8)).not.toBeNull();
  });

  it('draws about 60 times a second on faster screens, not every frame', () => {
    for (const hertz of [75, 90, 120, 144, 165, 240]) {
      const drawn = drawingsIn(hertz);
      expect(drawn, `${hertz} Hz`).toBeGreaterThanOrEqual(55);
      expect(drawn, `${hertz} Hz`).toBeLessThanOrEqual(61);
    }
  });

  it('skips a frame that comes too soon', () => {
    expect(frameDue(0, 8.3)).toBeNull();
  });

  it('starts afresh after a long pause, such as a hidden tab', () => {
    expect(frameDue(0, 60000)).toBeGreaterThan(60000 - 1000 / settings.fps);
  });
});

describe('sameView', () => {
  const turn = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  it('is true when the pose and the needle are exactly as last drawn', () => {
    expect(sameView({ turn, needle: 0.5 }, { turn: [...turn], needle: 0.5 })).toBe(true);
  });

  it('is false when anything moved, however little', () => {
    expect(sameView({ turn, needle: 0.5 }, { turn, needle: 0.5000001 })).toBe(false);
    const moved = [...turn];
    moved[4] = 0.9999999;
    expect(sameView({ turn, needle: 0.5 }, { turn: moved, needle: 0.5 })).toBe(false);
  });

  it('is false before anything is drawn', () => {
    expect(sameView(null, { turn, needle: 0.5 })).toBe(false);
  });
});
