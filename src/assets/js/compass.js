// The hero's 3D compass. On a page with WebGL, scripts and no wish for less motion, a small canvas
// takes the place of the still pixel picture in the hero's frame, drawn at the same size in
// blocks (one canvas pixel is one block, enlarged without smoothing) and in the same two tones,
// dithered the same way. It leans toward the pointer, its case turns as the page scrolls, and its
// needle swings back to north. At rest it is the still picture (which `pnpm run share` makes from
// this same code). Anywhere it cannot run, the still picture simply stays.
import { buildCompass } from './compass-model.js';
import { poseFor, rest, settle, stepNeedle, isStill } from './compass-motion.js';
import { compass as settings } from './motion.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---- Drawing ----

const vertexShader = `
attribute vec3 position;
attribute vec3 normal;
attribute float tone;
uniform mat4 turn;
uniform mat4 view;
varying vec3 seen;
varying float shade;
void main() {
  seen = (turn * vec4(normal, 0.0)).xyz;
  shade = tone;
  gl_Position = view * turn * vec4(position, 1.0);
}`;

// Light from the upper left, in front. The tone is lit, then made ink or paper with the same two
// by two pattern of thresholds as the pixel pictures (scripts/images.mjs, "checker"), counted
// from the top left block.
const fragmentShader = `
precision mediump float;
varying vec3 seen;
varying float shade;
uniform vec3 ink;
uniform vec3 paper;
uniform float black;
uniform float white;
uniform float rows;
void main() {
  vec3 n = normalize(seen);
  if (n.z < 0.0) n = -n;
  vec3 light = normalize(vec3(-0.55, 0.7, 0.75));
  float diffuse = max(dot(n, light), 0.0);
  float glint = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 18.0);
  float value = shade * (0.38 + 0.72 * diffuse) + glint * (0.25 + 0.5 * shade);
  float stretched = clamp((value - black) / (white - black), 0.0, 1.0);
  vec2 at = mod(vec2(floor(gl_FragCoord.x), rows - 1.0 - floor(gl_FragCoord.y)), 2.0);
  float step = at.x < 0.5 ? (at.y < 0.5 ? 0.0 : 3.0) : (at.y < 0.5 ? 2.0 : 1.0);
  float threshold = (step + 0.5) / 4.0;
  gl_FragColor = vec4(stretched <= threshold ? ink : paper, 1.0);
}`;

// 4 by 4 matrices, column by column, as WebGL takes them.
const multiply = (a, b) => {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
  return out;
};
const turnX = (angle) => {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
};
const turnY = (angle) => {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
};
const turnZ = (angle) => {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
};

// The camera: a narrow lens a little way off, looking at the compass from the front, so it keeps
// a touch of depth. The compass is drawn a little low, to leave room for its ring.
function camera(aspect) {
  const distance = 8;
  const half = 1.34 / distance;
  const [near, far] = [distance - 3, distance + 3];
  const f = 1 / half;
  const lens = new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ]);
  const place = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -0.2, -distance, 1]);
  return multiply(lens, place);
}

// A colour from the styles ("#2a2722") as three numbers from 0 to 1.
const colour = (name) => {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().slice(1);
  return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
};

// Sets up WebGL on a canvas. Returns { draw(pose, needleAngle), forget() }, or null where WebGL
// cannot be had or fails to set up.
export function compassPainter(canvas, { keep = false } = {}) {
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: keep,
    });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  const compile = (type, text) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const program = gl.createProgram();
  const shaders = [
    compile(gl.VERTEX_SHADER, vertexShader),
    compile(gl.FRAGMENT_SHADER, fragmentShader),
  ];
  if (shaders.includes(null)) return null;
  for (const shader of shaders) gl.attachShader(program, shader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // Each part's corners go to the graphics card once.
  const parts = buildCompass();
  const buffers = {};
  for (const [name, shape] of Object.entries(parts)) {
    buffers[name] = { count: shape.count };
    for (const key of ['positions', 'normals', 'tones']) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, shape[key], gl.STATIC_DRAW);
      buffers[name][key] = buffer;
    }
  }
  const attributes = {
    positions: [gl.getAttribLocation(program, 'position'), 3],
    normals: [gl.getAttribLocation(program, 'normal'), 3],
    tones: [gl.getAttribLocation(program, 'tone'), 1],
  };
  const uniform = (name) => gl.getUniformLocation(program, name);
  gl.uniform3fv(uniform('ink'), colour('--color-ink'));
  gl.uniform3fv(uniform('paper'), colour('--color-paper'));
  gl.uniform1f(uniform('black'), settings.black);
  gl.uniform1f(uniform('white'), settings.white);
  gl.uniform1f(uniform('rows'), canvas.height);
  gl.uniformMatrix4fv(uniform('view'), false, camera(canvas.width / canvas.height));
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  const turn = uniform('turn');

  return {
    draw(pose, needleAngle) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const tilted = multiply(turnX(-pose.tilt), turnY(-pose.lean));
      const wholes = [
        ['body', multiply(tilted, turnZ(pose.spin))],
        ['needle', multiply(tilted, turnZ(needleAngle))],
      ];
      for (const [name, matrix] of wholes) {
        gl.uniformMatrix4fv(turn, false, matrix);
        for (const [key, [where, size]] of Object.entries(attributes)) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name][key]);
          gl.enableVertexAttribArray(where);
          gl.vertexAttribPointer(where, size, gl.FLOAT, false, 0, 0);
        }
        gl.drawArrays(gl.TRIANGLES, 0, buffers[name].count);
      }
    },
    forget() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// The still picture: the compass at rest, as `pnpm run share` saves it.
export function drawStill(canvas) {
  const painter = compassPainter(canvas, { keep: true });
  if (!painter) throw new Error('WebGL is not available here.');
  painter.draw(rest, 0);
  return painter;
}

// ---- Moving ----

// Starts the compass in the hero inside "root", if there is one and it can run. Returns a
// function that stops it and puts the still picture back.
export function startCompass(root = document) {
  const frame = root.querySelector('.hero__image');
  const still = frame?.querySelector('.picture--pixels');
  if (!frame || !still || reduceMotion.matches) return () => {};

  let stopped = false;
  let stop = () => {
    stopped = true;
  };
  // Waits until the page has loaded and the browser is idle, so the compass never slows the
  // first view of the page.
  const begin = () => {
    if (stopped) return;
    stop = run(frame, still);
  };
  const later = () =>
    'requestIdleCallback' in window
      ? requestIdleCallback(begin, { timeout: 1500 })
      : setTimeout(begin, 200);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });

  // Asking for less motion part-way through puts the still picture back at once.
  const calm = () => {
    if (reduceMotion.matches) stop();
  };
  reduceMotion.addEventListener('change', calm);
  return () => {
    reduceMotion.removeEventListener('change', calm);
    stop();
  };
}

function run(frame, still) {
  const canvas = document.createElement('canvas');
  canvas.width = Number(still.getAttribute('width'));
  canvas.height = Number(still.getAttribute('height'));
  canvas.className = 'hero__compass';
  canvas.setAttribute('aria-hidden', 'true');
  (still.closest('picture') || still).after(canvas);
  const painter = compassPainter(canvas);
  if (!painter) {
    canvas.remove();
    return () => {};
  }

  let pose = rest;
  let target = rest;
  let needle = { angle: 0, speed: 0, spin: 0 };
  let pointer = { x: 0, y: 0 };
  let inView = true;
  let frameId = 0;
  let last = 0;

  // The canvas takes the still picture's place once its first drawing is on the screen. The
  // still picture stays in the page, unseen, so screen readers still read its description.
  painter.draw(pose, needle.angle);
  requestAnimationFrame(() => frame.classList.add('hero__image--live'));

  // How far the hero has scrolled away: 0 at the top of the page, 1 once the frame has left the
  // top of the window.
  const scrolled = () => {
    const box = frame.getBoundingClientRect();
    return Math.min(1, Math.max(0, window.scrollY / (box.bottom + window.scrollY)));
  };
  const aim = () => {
    target = poseFor(pointer, scrolled());
    wake();
  };
  const tick = (now) => {
    frameId = 0;
    const seconds = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    pose = settle(pose, target, seconds);
    needle = stepNeedle(needle, pose.spin, seconds);
    painter.draw(pose, needle.angle);
    if (isStill(needle, pose, target)) last = 0;
    else wake();
  };
  const wake = () => {
    if (!frameId && inView && !document.hidden) frameId = requestAnimationFrame(tick);
  };

  // The pointer, measured from the middle of the window: right and up count as positive. A
  // finger is left out: on a touch screen the page's scrolling turns the compass instead.
  const onPointer = (event) => {
    if (event.pointerType === 'touch') return;
    pointer = {
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: 1 - (event.clientY / window.innerHeight) * 2,
    };
    aim();
  };
  const onLeave = () => {
    pointer = { x: 0, y: 0 };
    aim();
  };
  const watcher = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) aim();
  });
  watcher.observe(frame);
  const onVisible = () => {
    last = 0;
    wake();
  };
  // If the graphics card drops the drawing, the still picture comes back.
  const onLost = () => {
    frame.classList.remove('hero__image--live');
    stop();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('scroll', aim, { passive: true });
  document.addEventListener('visibilitychange', onVisible);
  canvas.addEventListener('webglcontextlost', onLost);

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    watcher.disconnect();
    window.removeEventListener('pointermove', onPointer);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('scroll', aim);
    document.removeEventListener('visibilitychange', onVisible);
    canvas.removeEventListener('webglcontextlost', onLost);
    frame.classList.remove('hero__image--live');
    painter.forget();
    canvas.remove();
  }
  return stop;
}
