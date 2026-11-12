// The shapes of the hero's 3D compass, as lists of triangles: a polished case with rounded edges,
// a knurled bezel, a crown and a bow on top, a painted dial with a track of marks and a rose of
// eight raised points, a needle (dark blued half north, bright half south) with a jewelled cap,
// and a slightly domed glass over it all. The needle and the glass are kept apart: the needle
// turns on its own, the glass is drawn last, as reflections only.
// Each corner of a triangle has a place, the direction its surface faces (its normal), a tone
// (0 ink to 1 paper: how light the material is), what it is made of ("kind": 0 painted, 1 polished
// metal) and, for knurled metal, how many grooves run around it ("grooves": around the dial's axis,
// or around the crown's when negative).
// The case has a radius of 1, its dial looks toward +z, and north (the bow) is up, +y.
// compass.js draws these with WebGL.

const PAINT = 0;
const METAL = 1;

// A growing list of triangles.
function part() {
  const positions = [];
  const normals = [];
  const tones = [];
  const kinds = [];
  const grooves = [];
  return {
    // One triangle: its three corners, each [place, normal], all in one material.
    add(corners, { tone, kind = PAINT, knurl = 0 }) {
      for (const [place, normal] of corners) {
        positions.push(...place);
        const length = Math.hypot(...normal) || 1;
        normals.push(...normal.map((value) => value / length));
        tones.push(tone);
        kinds.push(kind);
        grooves.push(knurl);
      }
    },
    // A triangle with one flat normal, worked out from its corners (counter-clockwise from the
    // side it faces).
    flat(a, b, c, material) {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const normal = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      this.add(
        [
          [a, normal],
          [b, normal],
          [c, normal],
        ],
        material,
      );
    },
    done() {
      return {
        positions: Float32Array.from(positions),
        normals: Float32Array.from(normals),
        tones: Float32Array.from(tones),
        kinds: Float32Array.from(kinds),
        grooves: Float32Array.from(grooves),
        count: tones.length,
      };
    },
  };
}

// The normal at each point of a profile of [radius, z] points, turned about the z axis: the
// average of the two stretches that meet there, so a rounded edge shades smoothly. A point given
// twice in a row makes a sharp corner instead.
function profileNormals(profile) {
  const stretch = (a, b) => {
    const [dr, dz] = [b[0] - a[0], b[1] - a[1]];
    const length = Math.hypot(dr, dz) || 1;
    return [dz / length, -dr / length];
  };
  return profile.map((point, index) => {
    const before = index > 0 && profile[index - 1];
    const after = index < profile.length - 1 && profile[index + 1];
    const sameAsBefore = before && before[0] === point[0] && before[1] === point[1];
    const sameAsAfter = after && after[0] === point[0] && after[1] === point[1];
    const parts = [];
    if (before && !sameAsBefore) parts.push(stretch(before, point));
    if (after && !sameAsAfter) parts.push(stretch(point, after));
    if (sameAsAfter && before) return stretch(before, point);
    if (sameAsBefore && after) return stretch(point, after);
    const sum = parts.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
    return sum;
  });
}

// A shape turned around the z axis from a profile of [radius, z] points, with smooth normals.
// "place" can move the result (for the crown, which stands along y).
function lathe(into, profile, material, segments = 120, place = (point) => point) {
  const normals = profileNormals(profile);
  for (let index = 0; index < profile.length - 1; index++) {
    const [r0, z0] = profile[index];
    const [r1, z1] = profile[index + 1];
    if (r0 === r1 && z0 === z1) continue;
    const [n0, n1] = [normals[index], normals[index + 1]];
    for (let step = 0; step < segments; step++) {
      const a0 = (step / segments) * Math.PI * 2;
      const a1 = ((step + 1) / segments) * Math.PI * 2;
      const corner = (r, z, [nr, nz], angle) => [
        place([r * Math.cos(angle), r * Math.sin(angle), z]),
        place([nr * Math.cos(angle), nr * Math.sin(angle), nz], true),
      ];
      const p00 = corner(r0, z0, n0, a0);
      const p01 = corner(r0, z0, n0, a1);
      const p10 = corner(r1, z1, n1, a0);
      const p11 = corner(r1, z1, n1, a1);
      into.add([p00, p10, p11], material);
      into.add([p00, p11, p01], material);
    }
  }
}

// A flat ring (or a disc, with "inner" 0) facing +z.
function annulus(into, z, inner, outer, material, segments = 120) {
  lathe(
    into,
    [
      [inner, z],
      [outer, z],
    ],
    material,
    segments,
    (point, isNormal) => (isNormal ? [0, 0, 1] : point),
  );
}

// A flat four-cornered mark lying on the dial, from its direction, where it starts and ends, and
// its width.
function mark(into, z, angle, from, to, width, material) {
  const [dx, dy] = [Math.sin(angle), Math.cos(angle)];
  const [sx, sy] = [dy * (width / 2), -dx * (width / 2)];
  const a = [dx * from - sx, dy * from - sy, z];
  const b = [dx * from + sx, dy * from + sy, z];
  const c = [dx * to + sx, dy * to + sy, z];
  const d = [dx * to - sx, dy * to - sy, z];
  into.flat(a, c, b, material);
  into.flat(a, d, c, material);
}

// A long, low pyramid lying on the dial or standing for the needle: a diamond from "back" to
// "tip" along "angle", "width" across, with a ridge "height" above "z". Its two long sides catch
// the light differently, which is what makes a rose or a needle read as raised.
function ridge(into, z, angle, back, tip, width, height, left, right) {
  const [dx, dy] = [Math.sin(angle), Math.cos(angle)];
  const [sx, sy] = [dy * width, -dx * width];
  const end = [dx * tip, dy * tip, z];
  const start = [dx * back, dy * back, z];
  const top = [0, 0, z + height];
  const [l, r] = [
    [sx, sy, z],
    [-sx, -sy, z],
  ];
  into.flat(top, l, end, left);
  into.flat(top, end, r, right);
  if (back !== 0) {
    into.flat(top, start, l, left);
    into.flat(top, r, start, right);
  }
}

// A ring of round wire around "centre", lying in the dial's plane (x and y): "big" is its radius,
// "thick" the wire's.
function torus(into, centre, big, thick, material, around = 64, tube = 20) {
  const at = (u, v) => {
    const [cu, su, cv, sv] = [Math.cos(u), Math.sin(u), Math.cos(v), Math.sin(v)];
    return [
      [
        centre[0] + (big + thick * cv) * cu,
        centre[1] + (big + thick * cv) * su,
        centre[2] + thick * sv,
      ],
      [cv * cu, cv * su, sv],
    ];
  };
  for (let i = 0; i < around; i++) {
    for (let j = 0; j < tube; j++) {
      const [u0, u1] = [(i / around) * Math.PI * 2, ((i + 1) / around) * Math.PI * 2];
      const [v0, v1] = [(j / tube) * Math.PI * 2, ((j + 1) / tube) * Math.PI * 2];
      into.add([at(u0, v0), at(u1, v0), at(u1, v1)], material);
      into.add([at(u0, v0), at(u1, v1), at(u0, v1)], material);
    }
  }
}

// The materials. Polished brass reads light, blued steel dark; the dial is paper with ink marks.
const brass = { tone: 0.78, kind: METAL };
const knurled = { tone: 0.72, kind: METAL, knurl: 84 };
// A negative count: grooves around the crown's own axis (up, +y) instead of the dial's (+z).
const crownKnurl = { tone: 0.72, kind: METAL, knurl: -36 };
const dial = { tone: 0.96, kind: PAINT };
const ink = { tone: 0.05, kind: PAINT };
const roseDark = { tone: 0.3, kind: PAINT };
const roseLight = { tone: 0.9, kind: PAINT };
const blued = { tone: 0.16, kind: METAL };
const steel = { tone: 0.92, kind: METAL };
const glass = { tone: 1, kind: METAL };

export const dialZ = 0.05;

export function buildCompass() {
  const body = part();

  // The case: a rounded back, a polished side, and a stepped bezel whose rim is knurled, then
  // the bezel's inner wall down to the dial. Points given twice make sharp corners.
  lathe(
    body,
    [
      [0, -0.3],
      [0.62, -0.3],
      [0.82, -0.285],
      [0.93, -0.245],
      [0.985, -0.18],
      [1, -0.1],
      [1, -0.02],
      [1, -0.02],
      [0.985, 0.0],
      [0.985, 0.0],
    ],
    brass,
  );
  lathe(
    body,
    [
      [0.985, 0.0],
      [0.995, 0.03],
      [0.995, 0.09],
      [0.985, 0.115],
    ],
    knurled,
  );
  lathe(
    body,
    [
      [0.985, 0.115],
      [0.965, 0.135],
      [0.935, 0.148],
      [0.905, 0.145],
      [0.885, 0.13],
      [0.885, 0.13],
      [0.875, 0.09],
      [0.87, dialZ],
    ],
    brass,
  );

  // The dial: paper, with a track of marks between two rings, a bold mark at each quarter, a
  // thin inner ring, and a small north pointer on the track.
  annulus(body, dialZ, 0, 0.87, dial);
  const onDial = dialZ + 0.002;
  annulus(body, onDial, 0.832, 0.848, ink);
  annulus(body, onDial, 0.743, 0.755, ink);
  annulus(body, onDial, 0.567, 0.579, ink);
  for (let degree = 0; degree < 360; degree += 5) {
    const angle = (degree * Math.PI) / 180;
    if (degree % 90 === 0) continue;
    const ten = degree % 10 === 0;
    const thirty = degree % 30 === 0;
    mark(
      body,
      onDial,
      angle,
      thirty ? 0.7 : ten ? 0.752 : 0.79,
      0.836,
      thirty ? 0.028 : 0.017,
      ink,
    );
  }
  for (let quarter = 0; quarter < 4; quarter++) {
    const angle = (quarter * Math.PI) / 2;
    const [dx, dy] = [Math.sin(angle), Math.cos(angle)];
    const [sx, sy] = [dy * 0.05, -dx * 0.05];
    const outer = 0.836;
    const inner = quarter === 0 ? 0.64 : 0.69;
    into(body, [
      [dx * outer - sx, dy * outer - sy, onDial],
      [dx * outer + sx, dy * outer + sy, onDial],
      [dx * inner, dy * inner, onDial],
    ]);
  }

  // The rose: four long raised points and four short ones between them, each with a dark side
  // and a light side, as roses are drawn.
  for (let point = 0; point < 8; point++) {
    const long = point % 2 === 0;
    ridge(
      body,
      dialZ + 0.003,
      (point * Math.PI) / 4,
      0,
      long ? 0.56 : 0.34,
      long ? 0.075 : 0.055,
      long ? 0.03 : 0.022,
      roseDark,
      roseLight,
    );
  }

  // The crown on top: a short stem, a knurled button, and the bow, a ring of round wire.
  const stand = (point, isNormal) =>
    isNormal ? [point[0], point[2], point[1]] : [point[0], point[2] + 0.98, point[1] - 0.06];
  lathe(
    body,
    [
      [0, 0],
      [0.07, 0],
      [0.07, 0.08],
      [0.07, 0.08],
      [0.12, 0.085],
      [0.125, 0.1],
      [0.125, 0.18],
      [0.12, 0.195],
      [0.12, 0.195],
      [0.06, 0.2],
      [0.06, 0.24],
      [0, 0.24],
    ],
    brass,
    48,
    stand,
  );
  lathe(
    body,
    [
      [0.1255, 0.1],
      [0.1255, 0.18],
    ],
    crownKnurl,
    64,
    stand,
  );
  torus(body, [0, 1.42, -0.06], 0.2, 0.042, brass);

  // The needle: a long blued north half and a bright south half with a round end, both raised
  // along their middle, and a jewelled cap on the pivot.
  const needle = part();
  const needleZ = 0.13;
  ridge(needle, needleZ, 0, 0, 0.74, 0.085, 0.03, blued, { ...blued, tone: 0.3 });
  ridge(
    needle,
    needleZ,
    Math.PI,
    0,
    0.56,
    0.075,
    0.025,
    { ...steel, tone: 0.62 },
    { ...steel, tone: 0.42 },
  );
  lathe(
    needle,
    [
      [0.055, needleZ - 0.01],
      [0.055, needleZ + 0.02],
      [0.04, needleZ + 0.045],
      [0, needleZ + 0.055],
    ],
    { tone: 0.85, kind: METAL },
    32,
  );
  lathe(
    needle,
    [
      [0.03, needleZ - 0.005],
      [0.03, needleZ + 0.005],
      [0, needleZ + 0.012],
    ],
    steel,
    24,
    (point) => [point[0], point[1] - 0.5, point[2]],
  );

  // The glass: a shallow dome resting on the bezel, above everything on the dial.
  const cover = part();
  const glassProfile = [];
  for (let step = 0; step <= 12; step++) {
    const r = (0.89 * step) / 12;
    glassProfile.push([r, 0.24 - 0.04 * (r / 0.89) ** 2]);
  }
  lathe(cover, glassProfile.reverse(), glass, 96);

  return { body: body.done(), needle: needle.done(), glass: cover.done() };

  // A flat triangle of ink lying on the dial (the quarter marks).
  function into(target, [a, b, c]) {
    target.flat(a, b, c, ink);
  }
}
