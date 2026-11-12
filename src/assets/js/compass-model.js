// The shapes of the hero's 3D compass, as lists of triangles: a round brass case with a ring on
// top, a light face with a compass rose and marks around its edge, a pivot, and a needle (dark
// half north, light half south) kept apart so it can turn on its own. Each corner of a triangle
// has a place, a direction its surface faces (its normal) and a tone: 0 is ink, 1 is paper.
// The case has a radius of 1, its face looks toward +z, and north (the ring) is up, +y.
// compass.js draws these with WebGL.

// A growing list of triangles.
function part() {
  const positions = [];
  const normals = [];
  const tones = [];
  return {
    positions,
    normals,
    tones,
    // One triangle, its three corners each [place, normal], all in one tone.
    add(corners, tone) {
      for (const [place, normal] of corners) {
        positions.push(...place);
        const length = Math.hypot(...normal) || 1;
        normals.push(...normal.map((value) => value / length));
        tones.push(tone);
      }
    },
    // A triangle with one flat normal, worked out from its corners (counter-clockwise from the
    // side it faces).
    flat(a, b, c, tone) {
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
        tone,
      );
    },
    done() {
      return {
        positions: Float32Array.from(positions),
        normals: Float32Array.from(normals),
        tones: Float32Array.from(tones),
        count: tones.length,
      };
    },
  };
}

// A shape turned around the z axis from a profile of [radius, z] points. Each stretch of the
// profile gets its own normal, so the case shows clear bands of light and shade.
// "place" can move the result (for the ring's stem, which stands along y).
function lathe(into, profile, tone, segments = 72, place = (point) => point) {
  for (let index = 0; index < profile.length - 1; index++) {
    const [r0, z0] = profile[index];
    const [r1, z1] = profile[index + 1];
    const [nr, nz] = [z1 - z0, -(r1 - r0)];
    for (let step = 0; step < segments; step++) {
      const a0 = (step / segments) * Math.PI * 2;
      const a1 = ((step + 1) / segments) * Math.PI * 2;
      const corner = (r, z, angle) => [
        place([r * Math.cos(angle), r * Math.sin(angle), z]),
        place([nr * Math.cos(angle), nr * Math.sin(angle), nz], true),
      ];
      const [p00, p01, p10, p11] = [
        corner(r0, z0, a0),
        corner(r0, z0, a1),
        corner(r1, z1, a0),
        corner(r1, z1, a1),
      ];
      into.add([p00, p10, p11], tone);
      into.add([p00, p11, p01], tone);
    }
  }
}

// A flat ring (or a disc, with "inner" 0) facing +z.
function annulus(into, z, inner, outer, tone, segments = 72) {
  lathe(
    into,
    [
      [inner, z],
      [outer, z],
    ],
    tone,
    segments,
    (point, isNormal) => (isNormal ? [0, 0, 1] : point),
  );
}

// A flat four-cornered piece lying on the face, from its middle, its direction and its size.
function mark(into, z, angle, from, to, width, tone) {
  const [dx, dy] = [Math.sin(angle), Math.cos(angle)];
  const [sx, sy] = [dy * (width / 2), -dx * (width / 2)];
  const a = [dx * from - sx, dy * from - sy, z];
  const b = [dx * from + sx, dy * from + sy, z];
  const c = [dx * to + sx, dy * to + sy, z];
  const d = [dx * to - sx, dy * to - sy, z];
  into.flat(a, c, b, tone);
  into.flat(a, d, c, tone);
}

// A ring of round wire: "big" is its radius, "thick" the wire's, lying in the face's plane.
function ring(into, centre, big, thick, tone, around = 40, tube = 12) {
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
      into.add([at(u0, v0), at(u1, v0), at(u1, v1)], tone);
      into.add([at(u0, v0), at(u1, v1), at(u0, v1)], tone);
    }
  }
}

// One point of the compass rose: a long thin diamond lying on the face, split down its length
// into a darker and a lighter half, as roses are drawn.
function rosePoint(into, z, angle, length, width, dark, light) {
  const [dx, dy] = [Math.sin(angle), Math.cos(angle)];
  const [sx, sy] = [dy * width, -dx * width];
  const tip = [dx * length, dy * length, z];
  const centre = [0, 0, z];
  into.flat(centre, [sx, sy, z], tip, dark);
  into.flat(centre, tip, [-sx, -sy, z], light);
}

export function buildCompass() {
  const body = part();
  const brass = 0.36;
  const faceZ = 0.06;

  // The case: a shallow drum with a rounded back, a rolled edge and a lip around the face.
  lathe(
    body,
    [
      [0, -0.24],
      [0.8, -0.24],
      [0.93, -0.21],
      [0.99, -0.13],
      [1, -0.04],
      [1, 0.05],
      [0.98, 0.11],
      [0.94, 0.145],
      [0.9, 0.145],
      [0.885, faceZ],
    ],
    brass,
  );

  // The face, light, with a thin ring and marks around its edge.
  annulus(body, faceZ, 0, 0.885, 0.97);
  annulus(body, faceZ + 0.001, 0.655, 0.675, 0.04);
  annulus(body, faceZ + 0.001, 0.845, 0.885, 0.12);
  for (let degree = 0; degree < 360; degree += 10) {
    const cardinal = degree % 90 === 0;
    const angle = (degree * Math.PI) / 180;
    mark(body, faceZ + 0.002, angle, cardinal ? 0.69 : 0.72, 0.83, cardinal ? 0.06 : 0.026, 0.04);
  }
  // The rose under the needle: four long points and four short ones between them.
  for (let quarter = 0; quarter < 8; quarter++) {
    const long = quarter % 2 === 0;
    rosePoint(
      body,
      faceZ + (long ? 0.004 : 0.003),
      (quarter * Math.PI) / 4,
      long ? 0.62 : 0.38,
      long ? 0.1 : 0.07,
      long ? 0.42 : 0.55,
      0.92,
    );
  }

  // The pivot the needle turns on: a small brass dome.
  lathe(
    body,
    [
      [0.075, faceZ],
      [0.075, 0.12],
      [0.05, 0.15],
      [0, 0.16],
    ],
    0.4,
    24,
  );

  // The ring on top, on a short stem.
  const back = -0.06;
  lathe(
    body,
    [
      [0.075, 0.97],
      [0.075, 1.13],
    ],
    brass,
    20,
    (point, isNormal) =>
      isNormal ? [point[0], point[2], point[1]] : [point[0], point[2], point[1] + back],
  );
  ring(body, [0, 1.3, back], 0.16, 0.04, brass);

  // The needle: two flat diamonds with a raised ridge down the middle, so each half catches the
  // light on one side. The dark half points north.
  const needle = part();
  const z = 0.135;
  const ridge = z + 0.03;
  const width = 0.1;
  const halves = [
    [0.66, 0.04],
    [-0.58, 0.9],
  ];
  for (const [reach, tone] of halves) {
    const tip = [0, reach, z];
    const top = [0, 0, ridge];
    const [left, right] = [
      [-width, 0, z],
      [width, 0, z],
    ];
    if (reach > 0) {
      needle.flat(left, top, tip, tone);
      needle.flat(top, right, tip, tone);
    } else {
      needle.flat(top, left, tip, tone);
      needle.flat(right, top, tip, tone);
    }
  }

  return { body: body.done(), needle: needle.done() };
}
