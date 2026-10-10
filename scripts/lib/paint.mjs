// Paints the faint texture that sits behind the hero picture: a surface like thick white paint,
// mostly calm, crossed by a few long brush strokes with a raised ridge along each edge.
// It is drawn from nothing but a seed number, so it is the site's own and comes out the same on
// every build. It works in two steps: first a "height map" (how thick the paint is at each
// point), then light from the top left, which gives every ridge a thin shadow on one side and a
// light edge on the other. The result is a list of grey values, one per pixel.

// A small repeatable random number generator: the same seed always gives the same numbers.
function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// A smooth row of random values: "smoothNoise(t)" changes gently as t grows.
function smoothNoise(random, length) {
  const points = Array.from({ length: length + 2 }, () => random() * 2 - 1);
  return (at) => {
    const index = Math.max(0, Math.min(length, at));
    const whole = Math.floor(index);
    const part = index - whole;
    const ease = part * part * (3 - 2 * part);
    return points[whole] * (1 - ease) + points[whole + 1] * ease;
  };
}

// Blurs a height map a little, sideways and then downward.
function soften(map, width, height, reach) {
  const pass = (source, stepX, stepY) => {
    const out = new Float32Array(source.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weight = 0;
        for (let offset = -reach; offset <= reach; offset++) {
          const px = Math.min(width - 1, Math.max(0, x + offset * stepX));
          const py = Math.min(height - 1, Math.max(0, y + offset * stepY));
          const share = reach + 1 - Math.abs(offset);
          sum += source[py * width + px] * share;
          weight += share;
        }
        out[y * width + x] = sum / weight;
      }
    }
    return out;
  };
  return pass(pass(map, 1, 0), 0, 1);
}

// "tones" are the greys to end up with: the usual tone of the calm areas, the darkest shadow
// allowed, the lightest edge allowed, the grey that only one pixel in twenty of the fine shading
// may be darker than, and how many grey levels the broad patches may add or take away.
export function paintTexture({ width, height, seed = 1, strokes = 11, tones = { calm: 243.5, darkest: 212, lightest: 251, mostlyAbove: 226, swell: 6 } }) {
  const random = randomFrom(seed);
  const between = (least, most) => least + random() * (most - least);
  const heights = new Float32Array(width * height);
  // The broad swells also show as soft lighter and darker patches, kept apart from the fine shading.
  const patches = new Float32Array(width * height);

  // Broad, slow swells in the paint.
  const swellAcross = smoothNoise(random, 6);
  const swellDown = smoothNoise(random, 6);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const swell = swellAcross((x / width) * 5 + (y / height) * 1.5) * swellDown((y / height) * 5 + (x / width) * 0.8);
      heights[y * width + x] = 0.6 * swell;
      patches[y * width + x] = swell;
    }
  }

  // Brush strokes. Each one is a band that follows a gently curving path. Across the band the
  // paint is streaked by the bristles, and it piles up into a ridge along both edges. A later
  // stroke covers whatever lies under it.
  const layer = new Float32Array(width * height);
  const covered = new Uint8Array(width * height);
  for (let stroke = 0; stroke < strokes; stroke++) {
    layer.fill(0);
    covered.fill(0);
    const broad = between(0.16, 0.5) * width;
    const long = between(0.7, 1.5) * height;
    let x = between(-0.2, 1.0) * width;
    let y = between(-0.2, 0.9) * height;
    // Mostly sweeping down to the right, as a hand would.
    let heading = between(0.15, 1.25);
    const turn = smoothNoise(random, 8);
    const bristles = smoothNoise(random, Math.ceil(broad / 5));
    const ridgeLeft = between(1.6, 3.4);
    const ridgeRight = between(1.6, 3.4);
    const lift = between(-0.3, 0.3);
    for (let travelled = 0; travelled < long; travelled += 0.6) {
      heading += turn((travelled / long) * 8) * 0.0016;
      x += Math.cos(heading) * 0.6;
      y += Math.sin(heading) * 0.6;
      // The paint thins out toward the end of the stroke.
      const loaded = Math.min(1, (long - travelled) / (0.25 * long));
      for (let across = -broad / 2; across <= broad / 2; across += 0.6) {
        const px = Math.round(x - Math.sin(heading) * across);
        const py = Math.round(y + Math.cos(heading) * across);
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const fromEdge = broad / 2 - Math.abs(across);
        const ridge = (across < 0 ? ridgeLeft : ridgeRight) * Math.exp(-(fromEdge * fromEdge) / 14);
        const streak = 0.34 * bristles(((across + broad / 2) / broad) * Math.ceil(broad / 5));
        const index = py * width + px;
        layer[index] = lift + (streak + ridge) * loaded;
        covered[index] = 1;
      }
    }
    for (let index = 0; index < heights.length; index++) {
      if (covered[index]) heights[index] = heights[index] * 0.25 + layer[index];
    }
  }

  // A few fine cracks: thin wandering lines cut into the surface.
  for (let crack = 0; crack < 3; crack++) {
    let x = between(0.1, 0.9) * width;
    let y = between(0.05, 0.6) * height;
    let heading = between(0.9, 2.2);
    const long = between(0.2, 0.5) * height;
    for (let travelled = 0; travelled < long; travelled++) {
      heading += between(-0.22, 0.22);
      x += Math.cos(heading);
      y += Math.sin(heading);
      const px = Math.round(x);
      const py = Math.round(y);
      if (px < 1 || py < 1 || px >= width - 1 || py >= height - 1) break;
      heights[py * width + px] -= 2.2;
    }
  }

  const surface = soften(heights, width, height, 2);

  // Light from the top left: a slope facing the light is brighter, a slope facing away is darker.
  const shade = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const before = surface[Math.max(0, y - 1) * width + Math.max(0, x - 1)];
      const after = surface[Math.min(height - 1, y + 1) * width + Math.min(width - 1, x + 1)];
      shade[y * width + x] = before - after;
    }
  }

  // Set the strength so that only one pixel in twenty is darker than "mostlyAbove".
  const sorted = Float32Array.from(shade).sort();
  const darkTwentieth = sorted[Math.floor(sorted.length * 0.05)];
  const strength = darkTwentieth < 0 ? (tones.mostlyAbove - tones.calm) / darkTwentieth : 0;
  const greys = new Uint8Array(width * height);
  for (let index = 0; index < greys.length; index++) {
    // Shadows keep their full depth; light edges are held back, since the paint is nearly white already.
    const tone = tones.calm + patches[index] * tones.swell + (shade[index] < 0 ? shade[index] * strength : shade[index] * strength * 0.45);
    greys[index] = Math.round(Math.max(tones.darkest, Math.min(tones.lightest, tone)));
  }
  return greys;
}
