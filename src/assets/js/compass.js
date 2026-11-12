// The hero's 3D compass. On a page with WebGL, scripts and no wish for less motion, a small canvas
// takes the place of the still pixel picture in the hero's frame, drawn at the same size in
// blocks (one canvas pixel is one block, enlarged without smoothing) and in the same two tones,
// dithered with the pixel pictures' four by four pattern. It leans toward the pointer, its case turns as the page scrolls, and its
// needle swings back to north. At rest it is the still picture (which `pnpm run share` makes from
// this same code). Anywhere it cannot run, the still picture simply stays.
import { buildCompass } from './compass-model.js';
import { poseFor, rest, settle, stepNeedle, isStill } from './compass-motion.js';
import { compass as settings } from './motion.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---- Drawing ----
//
// Two passes. The first draws the compass three times finer than the frame's blocks into a
// texture, as smooth shades of grey: polished metal reflects a soft studio (a large soft light
// above on the left, a narrow one on the right, a dim room), painted parts take the light
// softly, the bezel and crown are knurled, the needle casts a soft shadow on the dial, and the
// glass adds only its reflections. The second pass averages each block's nine samples and turns
// the result into ink or paper with the pixel pictures' four by four pattern ("fine" in
// scripts/images.mjs), counted from the top left block. Where less than half a block is covered,
// it stays clear, so the painted backdrop shows around the compass.

const fine = 3;

const sceneVertex = `
attribute vec3 position;
attribute vec3 normal;
attribute float tone;
attribute float kind;
attribute float grooves;
uniform mat4 turn;
uniform mat4 view;
varying vec3 place;
varying vec3 facing;
varying vec3 local;
varying vec3 around;
varying float shade;
varying float metal;
varying float knurl;
void main() {
  vec4 world = turn * vec4(position, 1.0);
  place = world.xyz;
  facing = (turn * vec4(normal, 0.0)).xyz;
  local = position;
  // The direction around the knurled part's axis, for its grooves.
  vec3 tangent = grooves < 0.0 ? vec3(position.z + 0.06, 0.0, -position.x) : vec3(-position.y, position.x, 0.0);
  around = (turn * vec4(tangent, 0.0)).xyz;
  shade = tone;
  metal = kind;
  knurl = grooves;
  gl_Position = view * world;
}`;

const sceneFragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 place;
varying vec3 facing;
varying vec3 local;
varying vec3 around;
varying float shade;
varying float metal;
varying float knurl;
uniform vec3 eye;
uniform vec2 needle;
uniform float glass;

const vec3 key = vec3(-0.5, 0.72, 0.48);
const vec3 strip = vec3(0.86, 0.05, 0.5);

// The room the metal reflects: a large soft light above on the left, a narrow one on the right,
// a dim ceiling and a darker floor.
float room(vec3 d) {
  float soft = smoothstep(0.5, 0.93, dot(d, normalize(key)));
  float narrow = smoothstep(0.9, 0.98, dot(d, normalize(strip)));
  float ceiling = 0.2 + 0.35 * clamp(d.y * 0.6 + 0.4, 0.0, 1.0);
  return ceiling + 1.1 * soft + 0.9 * narrow;
}
float highlights(vec3 d) {
  float soft = smoothstep(0.7, 0.95, dot(d, normalize(key)));
  float narrow = smoothstep(0.9, 0.98, dot(d, normalize(strip)));
  return 1.2 * soft + 0.8 * narrow;
}

void main() {
  vec3 n = normalize(facing);
  vec3 v = normalize(eye - place);
  if (dot(n, v) < 0.0) n = -n;
  if (knurl != 0.0) {
    float angle = knurl < 0.0 ? atan(local.x, local.z + 0.06) : atan(local.y, local.x);
    n = normalize(n + normalize(around) * 0.55 * sin(angle * abs(knurl)));
  }
  vec3 r = reflect(-v, n);
  float facingEye = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = pow(1.0 - facingEye, 5.0);

  // The glass: it adds what it reflects of the lights, and toward its rim, where it reflects
  // more of the dim room, it dulls what is under it a little.
  if (glass > 0.5) {
    float sheen = (0.1 + 0.9 * fresnel) * highlights(r);
    gl_FragColor = vec4(sheen * 0.85, 0.0, 0.0, 1.0 - 0.45 * fresnel);
    return;
  }

  float value;
  if (metal > 0.5) {
    float diffuse = max(dot(n, normalize(key)), 0.0);
    value = shade * (0.82 * room(r) + 0.12 * diffuse) + 0.25 * fresnel * room(r);
  } else {
    float diffuse = max(dot(n, normalize(key)) * 0.6 + 0.4, 0.0);
    float gloss = pow(max(dot(n, normalize(normalize(key) + v)), 0.0), 60.0);
    value = shade * (0.18 + 0.86 * diffuse) + 0.18 * gloss;
    // On the dial: the shadow under the bezel's rim, and the needle's soft shadow, cast a
    // little down and to the right of it.
    if (local.z < 0.07) {
      float reach = length(local.xy);
      value *= mix(1.0, 0.7, smoothstep(0.8, 0.87, reach));
      vec2 p = local.xy - vec2(0.035, -0.045);
      float along = dot(p, needle);
      float across = abs(dot(p, vec2(needle.y, -needle.x)));
      float width = along > 0.0 ? 0.085 * (1.0 - along / 0.74) : 0.075 * (1.0 + along / 0.56);
      float shadow = (along > -0.56 && along < 0.74) ? smoothstep(width + 0.03, width - 0.01, across) : 0.0;
      value *= 1.0 - 0.42 * shadow;
    }
  }
  gl_FragColor = vec4(value, 0.0, 0.0, 1.0);
}`;

const blockVertex = `
attribute vec2 corner;
void main() {
  gl_Position = vec4(corner, 0.0, 1.0);
}`;

const blockFragment = `
precision mediump float;
uniform sampler2D scene;
uniform vec2 size;
uniform vec3 ink;
uniform vec3 paper;
uniform float black;
uniform float white;
uniform float rows;
float two(vec2 at) {
  return at.x < 0.5 ? (at.y < 0.5 ? 0.0 : 3.0) : (at.y < 0.5 ? 2.0 : 1.0);
}
void main() {
  vec2 block = floor(gl_FragCoord.xy);
  float lit = 0.0;
  float covered = 0.0;
  for (int i = 0; i < ${fine}; i++) {
    for (int j = 0; j < ${fine}; j++) {
      vec4 texel = texture2D(scene, (block * ${fine}.0 + vec2(float(i), float(j)) + 0.5) / size);
      lit += texel.r * texel.a;
      covered += texel.a;
    }
  }
  if (covered < ${fine * fine}.0 * 0.5) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float stretched = clamp((lit / covered - black) / (white - black), 0.0, 1.0);
  vec2 at = vec2(block.x, rows - 1.0 - block.y);
  float step = 4.0 * two(mod(at, 2.0)) + two(mod(floor(at / 2.0), 2.0));
  gl_FragColor = vec4(stretched <= (step + 0.5) / 16.0 ? ink : paper, 1.0);
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

// The camera: a narrow lens some way off, looking at the compass from the front, so it keeps a
// touch of depth. It looks a little above the case's middle, to leave room for the crown and bow.
const lift = 0.22;
const distance = 9;
function camera(aspect) {
  const half = 1.42 / distance;
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
  const place = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -lift, -distance, 1]);
  return multiply(lens, place);
}

// A colour from the styles ("#2a2722") as three numbers from 0 to 1.
const colour = (name) => {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().slice(1);
  return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
};

// Compiles and links two shaders, or gives null.
function programOf(gl, vertexText, fragmentText) {
  const compile = (type, text) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const shaders = [
    compile(gl.VERTEX_SHADER, vertexText),
    compile(gl.FRAGMENT_SHADER, fragmentText),
  ];
  if (shaders.includes(null)) return null;
  const program = gl.createProgram();
  for (const shader of shaders) gl.attachShader(program, shader);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

// Sets up WebGL on a canvas. Returns { draw(pose, needleAngle), forget() }, or null where WebGL
// cannot be had or fails to set up.
export function compassPainter(canvas, { keep = false } = {}) {
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: keep,
    });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  const scene = programOf(gl, sceneVertex, sceneFragment);
  const blocks = programOf(gl, blockVertex, blockFragment);
  if (!scene || !blocks) return null;

  // The fine picture the first pass draws into: a texture with a depth buffer.
  const [wide, tall] = [canvas.width * fine, canvas.height * fine];
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, wide, tall, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  for (const [name, value] of [
    [gl.TEXTURE_MIN_FILTER, gl.NEAREST],
    [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
  ])
    gl.texParameteri(gl.TEXTURE_2D, name, value);
  const depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, wide, tall);
  const target = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, target);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;

  // Each part's corners go to the graphics card once.
  const parts = buildCompass();
  const fields = { positions: 3, normals: 3, tones: 1, kinds: 1, grooves: 1 };
  const names = {
    positions: 'position',
    normals: 'normal',
    tones: 'tone',
    kinds: 'kind',
    grooves: 'grooves',
  };
  const buffers = {};
  for (const [name, shape] of Object.entries(parts)) {
    buffers[name] = { count: shape.count };
    for (const key of Object.keys(fields)) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, shape[key], gl.STATIC_DRAW);
      buffers[name][key] = buffer;
    }
  }
  const sceneUniform = (name) => gl.getUniformLocation(scene, name);
  const locations = Object.fromEntries(
    Object.entries(names).map(([key, name]) => [key, gl.getAttribLocation(scene, name)]),
  );
  gl.useProgram(scene);
  gl.uniformMatrix4fv(sceneUniform('view'), false, camera(canvas.width / canvas.height));
  gl.uniform3fv(sceneUniform('eye'), [0, lift, distance]);
  const turn = sceneUniform('turn');
  const needleUniform = sceneUniform('needle');
  const glassUniform = sceneUniform('glass');

  // The second pass: one triangle that covers the canvas.
  const cover = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cover);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(blocks, 'corner');
  gl.useProgram(blocks);
  const blockUniform = (name) => gl.getUniformLocation(blocks, name);
  gl.uniform1i(blockUniform('scene'), 0);
  gl.uniform2f(blockUniform('size'), wide, tall);
  gl.uniform3fv(blockUniform('ink'), colour('--color-ink'));
  gl.uniform3fv(blockUniform('paper'), colour('--color-paper'));
  gl.uniform1f(blockUniform('black'), settings.black);
  gl.uniform1f(blockUniform('white'), settings.white);
  gl.uniform1f(blockUniform('rows'), canvas.height);

  const drawPart = (name, matrix) => {
    gl.uniformMatrix4fv(turn, false, matrix);
    for (const [key, size] of Object.entries(fields)) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name][key]);
      gl.enableVertexAttribArray(locations[key]);
      gl.vertexAttribPointer(locations[key], size, gl.FLOAT, false, 0, 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, buffers[name].count);
  };

  return {
    draw(pose, needleAngle) {
      // The fine picture.
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.viewport(0, 0, wide, tall);
      gl.useProgram(scene);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const tilted = multiply(turnX(-pose.tilt), turnY(-pose.lean));
      // Where the needle points on the dial, seen from the case: its shadow follows it.
      const onDial = needleAngle - pose.spin;
      gl.uniform2f(needleUniform, -Math.sin(onDial), Math.cos(onDial));
      gl.uniform1f(glassUniform, 0);
      drawPart('body', multiply(tilted, turnZ(pose.spin)));
      drawPart('needle', multiply(tilted, turnZ(needleAngle)));
      // The glass last: what it reflects is added to what is under it, which it dulls a little
      // (its alpha says how much shows through), and it hides nothing.
      gl.uniform1f(glassUniform, 1);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.ONE, gl.SRC_ALPHA, gl.ZERO, gl.ONE);
      drawPart('glass', multiply(tilted, turnZ(pose.spin)));
      for (const key of Object.keys(fields)) gl.disableVertexAttribArray(locations[key]);

      // The blocks.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.useProgram(blocks);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.bindBuffer(gl.ARRAY_BUFFER, cover);
      gl.enableVertexAttribArray(corner);
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(corner);
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
