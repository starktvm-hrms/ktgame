// Player & NPC characters: stylised traveller (male / female) with outfits,
// hairstyles, accessories, facial features and a procedural animation rig
// (idle, walk, run, jump, namaskaram, paddle, wave, kathakali dance).
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};

  const C = (hex) => KT.mat('c' + hex.toString(16), { color: hex });

  Models.OUTFITS = {
    male: {
      casual: { label: 'Casual Traveller', top: 0x5f7a45, inner: 0xf1ece0, bottom: 0xb59a6c, shoes: 0x6b4a2e, sleeve: 'short', lower: 'pants', open: true, pockets: true },
      mundu: { label: 'Traditional (Mundu)', top: 0xf8f6ef, inner: 0xf8f6ef, bottom: 0xf8f6ef, shoes: 0x7a5233, sleeve: 'short', lower: 'mundu', border: 0xd4a434, sandals: true },
      hiking: { label: 'Outdoor / Hiking', top: 0x2f5f9e, inner: 0x2f5f9e, bottom: 0x55585a, shoes: 0x5a4030, sleeve: 'long', lower: 'shorts', socks: 0xf0f0f0 },
      formal: { label: 'Formal Casual', top: 0x86acd8, inner: 0x86acd8, bottom: 0xd2c19c, shoes: 0x6a3f22, sleeve: 'long', lower: 'pants' },
      rain: { label: 'Rain Wear', top: 0xf2c230, inner: 0xf2c230, bottom: 0x2a2f3a, shoes: 0x1f1f1f, sleeve: 'long', lower: 'pants', hood: true, coat: true }
    },
    female: {
      casual: { label: 'Casual Traveller', top: 0x617a48, inner: 0xf1e7d6, bottom: 0x7f7c50, shoes: 0x6b4a2e, sleeve: 'short', lower: 'pants', open: true, pockets: true },
      saree: { label: 'Kasavu Saree', top: 0xd4a434, inner: 0xd4a434, bottom: 0xf6f1e2, shoes: 0x7a5233, sleeve: 'cap', lower: 'saree', border: 0xd4a434, sandals: true },
      churidar: { label: 'Churidar', top: 0x3aa39a, inner: 0x3aa39a, bottom: 0xf2efe6, shoes: 0x7a5233, sleeve: 'long', lower: 'churidar', dupatta: 0xf3c7d4, sandals: true },
      hiking: { label: 'Outdoor / Hiking', top: 0xe0457b, inner: 0xe0457b, bottom: 0x232326, shoes: 0x5a4030, sleeve: 'long', lower: 'pants' },
      rain: { label: 'Rain Wear', top: 0xf2c230, inner: 0xf2c230, bottom: 0x2a2f3a, shoes: 0xf2c230, sleeve: 'long', lower: 'pants', hood: true, coat: true }
    }
  };
  Models.HAIR = {
    male: { default: 'Default', short: 'Short', wavy: 'Wavy', curly: 'Curly' },
    female: { default: 'Ponytail', loose: 'Loose', braid: 'Braid', bun: 'Bun' }
  };

  // Level of detail: 1 for the player / preview, lower for background NPCs.
  let SEG = 1;
  const sg = (n) => Math.max(5, Math.round(n * SEG));

  // Smooth tapered limb with rounded ends and a gentle muscle curve,
  // hanging down from its joint (y = 0 to y = -len).
  function limb(parent, len, r0, r1, mat) {
    const pts = [];
    const cap = 5;
    for (let i = 0; i <= cap; i++) { // bottom cap
      const a = (i / cap) * Math.PI / 2;
      pts.push([Math.max(0.0005, r1 * Math.sin(a)), -len - r1 * 0.45 * Math.cos(a) + r1 * 0.45]);
    }
    for (let i = 1; i < 8; i++) { // body with a slight bulge in the upper third
      const t = i / 8;
      const r = KT.lerp(r1, r0, t) * (1 + Math.sin(t * Math.PI) * 0.07 * (t > 0.4 ? 1 : 0.6));
      pts.push([r, -len + len * t]);
    }
    for (let i = 0; i <= cap; i++) { // top cap
      const a = (i / cap) * Math.PI / 2;
      pts.push([Math.max(0.0005, r0 * Math.cos(a)), -r0 * 0.45 + r0 * 0.45 * Math.sin(a)]);
    }
    return part(parent, lathe(pts, sg(20)), mat, 0, 0, 0);
  }

  // Lathe from [[radius, y], ...] (optionally a partial revolution).
  function lathe(pts, segs, phiStart, phiLen) {
    return new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), segs || 24, phiStart || 0, phiLen === undefined ? Math.PI * 2 : phiLen);
  }

  // Ellipsoid with arbitrary orientation; the workhorse for hair locks,
  // hands, feet and facial features.
  function ell(parent, mat, x, y, z, sx, sy, sz, rx, ry, rz, seg) {
    return part(parent, G.sph(1, sg(seg || 16), sg(seg ? Math.max(6, seg - 4) : 12)), mat, x, y, z, rx || 0, ry || 0, rz || 0, sx, sy, sz);
  }

  // Sculpted head: rounded cranium, tapering cheeks and a soft chin.
  // Centre of the cranium is the origin; radius ~0.2.
  const HEAD_R = 0.2;
  function headShape(female, full) {
    const g = new T.SphereGeometry(HEAD_R, full ? 36 : sg(36), full ? 28 : sg(28));
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const t = y / HEAD_R;
      // jaw taper below the cheekbones
      const k = KT.smoothstep(0.15, -1.0, t);
      const sx = 1 - k * (female ? 0.42 : 0.36);
      const sz = 1 - k * 0.16;
      x *= 0.93 * sx;
      z *= 0.97 * sz;
      // chin pushed slightly forward, back of skull rounder
      if (z > 0) z += KT.smoothstep(-0.35, -0.9, t) * 0.018;
      else z *= 1.04;
      // flatter face plane, fuller cheeks
      if (z > 0.12) z -= (z - 0.12) * 0.25;
      y *= 1.07;
      P.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  }

  // Find the face surface depth at (x, y) so features sit exactly on it.
  const faceMesh = {};
  const _ray = new T.Raycaster();
  function faceZ(female, x, y) {
    const key = female ? 'f' : 'm';
    if (!faceMesh[key]) faceMesh[key] = new T.Mesh(headShape(female, true), new T.MeshBasicMaterial());
    _ray.set(new T.Vector3(x, y, 1), new T.Vector3(0, 0, -1));
    const hit = _ray.intersectObject(faceMesh[key])[0];
    return hit ? hit.point.z : 0.15;
  }

  // Hair shell: the head shape enlarged. Below the hairline the shell
  // smoothly sinks back into the skull, giving a clean, soft hairline.
  function hairShell(female, scale, line) {
    const g = headShape(female);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const thr = line(x, z);
      const f = KT.smoothstep(thr - 0.03, thr + 0.012, y);
      const k = KT.lerp(0.92, scale, f);
      P.setXYZ(i, x * k, y * KT.lerp(0.92, scale * 1.01, f), z * k);
    }
    g.computeVertexNormals();
    return g;
  }
  // Hairline height by position: low at the nape, above the ears at the
  // sides and at the forehead in front (rounded at the temples).
  function hairline(front, side, back) {
    return (x, z) => back + KT.smoothstep(-0.16, 0.0, z) * (side - back) + KT.smoothstep(0.04, 0.16, z) * (front - side) * (1 - KT.smoothstep(0.06, 0.16, Math.abs(x)) * 0.35);
  }

  // A lock of hair: elongated ellipsoid.
  function lock(head, mat, x, y, z, len, w, rx, ry, rz) {
    return ell(head, mat, x, y, z, w, w * 0.6, len, rx, ry, rz, 10);
  }

  function buildHair(head, cfg, hairMat) {
    const female = cfg.gender === 'female';
    const style = cfg.hair || 'default';
    let tail = null;
    if (!female) {
      if (style === 'short') {
        part(head, hairShell(false, 1.035, hairline(0.11, 0.07, -0.1)), hairMat);
        ell(head, hairMat, 0.0, 0.12, 0.0, 0.185, 0.1, 0.2, -0.1, 0, 0, 18);
        ell(head, hairMat, 0.03, 0.135, 0.08, 0.15, 0.07, 0.11, -0.35, 0, -0.12, 16);
        part(head, G.box(0.006, 0.01, 0.12), C(0x5a3a28), -0.07, 0.19, 0.04, -0.3, 0, -0.35);
      } else if (style === 'curly') {
        part(head, hairShell(false, 1.05, hairline(0.095, 0.06, -0.11)), hairMat);
        const rng = KT.makeRng(4);
        for (let i = 0; i < (SEG < 1 ? 45 : 80); i++) {
          const a = rng() * Math.PI * 2, e = 0.2 + rng() * 1.3;
          const r = 0.2;
          const x = Math.cos(a) * Math.cos(e) * r, y = Math.sin(e) * r * 1.05 + 0.02, z = Math.sin(a) * Math.cos(e) * r - 0.01;
          if (z > 0.12 && y < 0.11) continue;
          if (Math.abs(x) > 0.15 && y < 0.06 && z > -0.05) continue;
          ell(head, hairMat, x, y, z, 0.042, 0.042, 0.042, 0, 0, 0, 10);
        }
      } else {
        // default (tousled with a forelock) and wavy (fuller)
        const wavy = style === 'wavy';
        const v = wavy ? 1.15 : 1;
        part(head, hairShell(false, 1.05, hairline(0.1, 0.065, -0.12)), hairMat);
        ell(head, hairMat, 0.0, 0.12, -0.02, 0.2 * v, 0.12 * v, 0.21, -0.12, 0, 0, 18);
        ell(head, hairMat, 0.035, 0.15, 0.08, 0.16, 0.085 * v, 0.11, -0.45, 0.1, -0.18, 16);
        ell(head, hairMat, -0.07, 0.165, 0.03, 0.11, 0.08 * v, 0.12, -0.2, -0.4, 0.3, 14);
        ell(head, hairMat, 0.09, 0.16, -0.06, 0.1, 0.08 * v, 0.12, 0.1, 0.4, -0.3, 14);
        // forelock curling down onto the forehead
        ell(head, hairMat, -0.03, 0.1, faceZ(false, -0.03, 0.1) + 0.004, 0.042, 0.05, 0.022, -0.2, 0, 0.7, 12);
        ell(head, hairMat, 0.03, 0.11, faceZ(false, 0.03, 0.11) + 0.002, 0.036, 0.04, 0.02, -0.2, 0, -0.5, 12);
        // temple sweeps
        [-1, 1].forEach((s) => ell(head, hairMat, s * 0.145, 0.1, 0.04, 0.07, 0.07, 0.12, 0, s * 0.35, s * 0.25, 12));
        if (wavy) {
          [-1, 0, 1].forEach((k) => ell(head, hairMat, k * 0.09, 0.0, -0.17, 0.07, 0.09, 0.06, 0.5, 0, k * 0.3, 12));
        }
      }
      // sideburns
      [-1, 1].forEach((s) => ell(head, hairMat, s * 0.168, -0.005, 0.04, 0.008, 0.035, 0.016, 0, s * 0.3, 0));
      return null;
    }
    // ---- female: centre-parted shell with side curtains
    part(head, hairShell(true, 1.055, hairline(0.12, 0.05, -0.13)), hairMat);
    // centre part: soft volumes sweeping to either side
    [-1, 1].forEach((s) => {
      // swept fringe from the centre part, then strands framing the face
      ell(head, hairMat, s * 0.148, 0.02, 0.035, 0.03, 0.13, 0.055, 0.1, s * 0.25, s * 0.06, 14);
      ell(head, hairMat, s * 0.15, -0.09, -0.02, 0.032, 0.1, 0.06, 0.3, s * 0.2, s * 0.02, 14);
    });
    tail = new T.Group();
    tail.position.set(0, 0.08, -0.19);
    head.add(tail);
    if (style === 'loose') {
      // long hair flowing down the back and over the shoulders
      ell(head, hairMat, 0, -0.06, -0.12, 0.2, 0.2, 0.12);
      ell(tail, hairMat, 0, -0.2, 0.02, 0.17, 0.26, 0.07, 0.15, 0, 0);
      ell(tail, hairMat, 0, -0.42, 0.06, 0.15, 0.14, 0.06, 0.25, 0, 0);
      [-1, 1].forEach((s) => {
        lock(head, hairMat, s * 0.19, -0.12, -0.02, 0.17, 0.06, 1.45, 0, s * 0.12);
        lock(tail, hairMat, s * 0.12, -0.25, 0.04, 0.2, 0.06, 1.35, 0, s * 0.1);
      });
      tail.rotation.x = 0.1;
      return tail;
    }
    if (style === 'bun') {
      ell(head, hairMat, 0, 0.21, -0.14, 0.11, 0.1, 0.1);
      part(head, G.torus(0.085, 0.015, 6, 18), C(0xd4a434), 0, 0.2, -0.12, -0.7);
      return null;
    }
    // ponytail (default) or braid hanging from the crown
    ell(tail, hairMat, 0, 0.02, 0.02, 0.07, 0.06, 0.06);
    part(tail, G.torus(0.05, 0.016, 6, 14), C(style === 'braid' ? 0x6a3a1a : 0xb3261e), 0, 0, -0.01, 0.4);
    if (style === 'braid') {
      for (let i = 0; i < 9; i++) {
        const y = -0.06 - i * 0.065;
        ell(tail, hairMat, (i % 2 ? 0.018 : -0.018), y, -0.02 - i * 0.008, 0.045 - i * 0.002, 0.045, 0.04, 0, 0, (i % 2 ? 0.5 : -0.5), 10);
      }
      ell(tail, hairMat, 0, -0.68, -0.08, 0.035, 0.06, 0.03);
    } else {
      // wavy ponytail: overlapping tapered locks
      const N = 7;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const w = 0.075 - t * 0.04;
        ell(tail, hairMat, Math.sin(t * 5) * 0.02, -0.05 - t * 0.42, -0.05 - Math.sin(t * 2.5) * 0.04, w, 0.09, w * 0.8, 0.1, 0, Math.sin(t * 5) * 0.2, 10);
      }
    }
    tail.rotation.x = 0.35;
    return tail;
  }

  function buildFace(head, cfg, skin) {
    const female = cfg.gender === 'female';
    const fz = (x, y) => faceZ(female, x, y);
    const white = C(0xfbfbf8), iris = C(female ? 0x5a3418 : 0x3d2412), pupil = C(0x0a0605), lash = C(0x1a100a);
    const browMat = C(cfg.hairColor || 0x22150d);
    const skinCol = new T.Color(cfg.skin || (female ? 0xd29a72 : 0xc68a62));
    const shade = (k) => C(skinCol.clone().multiplyScalar(k).getHex());
    const blush = C(skinCol.clone().lerp(new T.Color(0xe07070), female ? 0.22 : 0.08).getHex());
    const rig = head.userData.rig;
    const EY = 0.0, EX = 0.072;
    [-1, 1].forEach((s) => {
      const ez = fz(s * EX, EY);
      // eye socket: the eye sits slightly sunk into the face
      const eye = new T.Group();
      eye.position.set(s * EX, EY, ez - 0.022);
      eye.rotation.y = s * 0.22;
      head.add(eye);
      rig['eye' + (s > 0 ? 'L' : 'R')] = eye;
      const ew = 0.043, eh = female ? 0.05 : 0.046;
      ell(eye, white, 0, 0, 0, ew, eh, 0.03, 0, 0, 0, 18);
      ell(eye, iris, 0, -0.003, 0.024, 0.03, 0.034, 0.012, 0, 0, 0, 18);
      ell(eye, C(female ? 0x8a5a2c : 0x6a4426), 0, -0.012, 0.03, 0.02, 0.016, 0.008, 0, 0, 0, 12);
      ell(eye, pupil, 0, -0.002, 0.033, 0.015, 0.017, 0.006, 0, 0, 0, 12);
      ell(eye, white, 0.011, 0.012, 0.037, 0.008, 0.008, 0.004, 0, 0, 0, 8);
      ell(eye, white, -0.009, -0.014, 0.036, 0.004, 0.004, 0.003, 0, 0, 0, 6);
      // upper lid and lash line
      part(eye, new T.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), skin, 0, 0.0, 0.0, -0.25, 0, 0, ew * 1.08, eh * 1.12, 0.034);
      part(eye, G.torus(1, 0.13, 6, 20, Math.PI * 0.9), lash, 0, 0.004, 0.006, 0.2, 0, Math.PI * 0.05, ew * 1.04, eh * (female ? 1.12 : 1.05), 0.055);
      if (female) {
        part(eye, G.cone(0.006, 0.028, 5), lash, s * 0.043, 0.026, 0.012, 0, 0, -s * 0.95);
        part(eye, G.cone(0.005, 0.022, 5), lash, s * 0.033, 0.042, 0.014, 0, 0, -s * 0.55);
      }
      // brow: a curved, tapered stroke following the brow ridge
      const bx = s * 0.074, by = EY + (female ? 0.068 : 0.064);
      const browG = new T.Group();
      browG.position.set(bx, by, fz(bx, by) + 0.004);
      browG.rotation.set(-0.15, s * 0.25, s * (female ? -0.08 : -0.05));
      head.add(browG);
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const w = female ? 0.008 - t * 0.004 : 0.014 - t * 0.006;
        ell(browG, browMat, s * (-0.03 + t * 0.06), Math.sin(t * Math.PI) * 0.01 - t * 0.004, 0, 0.018, w, 0.008, 0, 0, s * (0.35 - t * 0.6), 8);
      }
      // ears
      ell(head, skin, s * 0.17, -0.03, -0.015, 0.02, 0.05, 0.034, 0, s * 0.35, 0, 12);
      ell(head, shade(0.82), s * 0.177, -0.03, -0.006, 0.008, 0.03, 0.019, 0, s * 0.35, 0, 8);
      if (female) {
        part(head, G.sph(0.011, 8, 6), C(0xd4a434), s * 0.172, -0.085, -0.008);
        part(head, G.cone(0.017, 0.024, 10), C(0xd4a434), s * 0.172, -0.105, -0.008);
      }
      // soft blush
      const cx = s * 0.1, cy = -0.06;
      const cheek = ell(head, blush, cx, cy, fz(cx, cy) - 0.0085, 0.03, 0.018, 0.01, 0, s * 0.55, 0, 12);
      cheek.rotation.x = 0.1;
    });
    // nose: soft bridge and rounded tip with nostrils
    ell(head, skin, 0, -0.03, fz(0, -0.03) - 0.004, 0.012, 0.032, 0.014, -0.25, 0, 0, 10);
    const nz = fz(0, -0.062);
    ell(head, skin, 0, -0.062, nz + 0.004, female ? 0.019 : 0.022, 0.016, 0.017, 0, 0, 0, 14);
    [-1, 1].forEach((s) => ell(head, shade(0.7), s * 0.009, -0.073, nz + 0.012, 0.0045, 0.003, 0.003, 0, 0, 0, 6));
    // mouth: smile curve, lips and corner dimples
    const mz = fz(0, -0.108);
    const lipCol = female ? 0xc0565e : 0x9a4a3c;
    part(head, G.torus(0.033, 0.0065, 6, 18, Math.PI), C(0x4a1a14), 0, -0.1, mz - 0.002, -0.2, 0, Math.PI, 1, 0.55, 0.8);
    ell(head, C(lipCol), 0, -0.121, fz(0, -0.121) - 0.003, 0.022, 0.009, 0.009, -0.3, 0, 0, 12);
    if (female) ell(head, C(lipCol), 0, -0.098, mz - 0.002, 0.024, 0.006, 0.008, 0, 0, 0, 10);
    [-1, 1].forEach((s) => ell(head, shade(0.8), s * 0.037, -0.097, fz(s * 0.037, -0.097) - 0.002, 0.004, 0.007, 0.004));
    // chin crease
    ell(head, shade(0.9), 0, -0.145, fz(0, -0.145) - 0.004, 0.018, 0.005, 0.006);
    if (female) part(head, G.sph(0.008, 8, 6), C(0xb3261e), 0, EY + 0.1, fz(0, EY + 0.1));
  }

  const roundBox = KT.roundBox;

  // Torso profiles [[radius, y]] from the waist (y=0) to the neck.
  const TORSO_M = [[0.001, -0.02], [0.152, -0.02], [0.158, 0.08], [0.175, 0.18], [0.198, 0.29], [0.208, 0.37], [0.2, 0.42], [0.165, 0.465], [0.1, 0.49], [0.06, 0.5], [0.001, 0.5]];
  const TORSO_F = [[0.001, -0.02], [0.14, -0.02], [0.132, 0.08], [0.155, 0.19], [0.182, 0.27], [0.178, 0.34], [0.175, 0.4], [0.15, 0.455], [0.09, 0.485], [0.055, 0.495], [0.001, 0.495]];
  function scaled(pts, k, dy) { return pts.map((p) => [p[0] === 0.001 ? 0.001 : p[0] * k, p[1] + (dy || 0)]); }

  // cfg: {gender, outfit, hair, acc:{backpack,camera,hat,sunglasses}, skin, colors:{top,bottom}}
  Models.character = function (cfg) {
    cfg = Object.assign({ gender: 'male', outfit: 'casual', hair: 'default', acc: { backpack: true } }, cfg || {});
    SEG = cfg.lite ? 0.62 : 1;
    const female = cfg.gender === 'female';
    const of = Object.assign({}, Models.OUTFITS[cfg.gender][cfg.outfit] || Models.OUTFITS[cfg.gender].casual, cfg.colors || {});
    const skinHex = cfg.skin || (female ? 0xd29a72 : 0xc68a62);
    const skin = C(skinHex);
    const hairMat = C(cfg.hairColor || (female ? 0x2a1a12 : 0x1d130e));
    const topM = C(of.top), innerM = C(of.inner), botM = C(of.bottom), shoeM = C(of.shoes);
    const seam = C(new T.Color(of.bottom).multiplyScalar(0.8).getHex());
    const dark = C(0x3a2a1c);
    const root = new T.Group();
    const rig = {};
    const shoulderW = female ? 0.2 : 0.235;
    const torso = female ? TORSO_F : TORSO_M;
    const legsCovered = of.lower === 'pants' || of.lower === 'churidar';

    // ---------------------------------------------------------- hips
    const hips = rig.hips = new T.Group();
    hips.position.y = 0.93;
    root.add(hips);
    part(hips, lathe([[0.001, -0.13], [0.1, -0.13], [0.148, -0.08], [0.156, 0.0], [0.152, 0.1], [0.001, 0.1]], 20), botM, 0, 0, 0, 0, 0, 0, 1, 1, 0.8);
    if (of.lower === 'pants' || of.lower === 'shorts') {
      part(hips, G.cyl(0.156, 0.158, 0.045, 20), C(0x4a3020), 0, 0.075, 0, 0, 0, 0, 1, 1, 0.82);
      part(hips, G.box(0.05, 0.035, 0.02), C(0xb8a070), 0, 0.075, 0.13);
      if (of.pockets) [-1, 1].forEach((s) => part(hips, G.box(0.08, 0.09, 0.02), seam, s * 0.08, -0.03, -0.128));
    }

    // ---------------------------------------------------------- legs
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const hip = rig['hip' + side] = new T.Group();
      hip.position.set(s * 0.092, -0.02, 0);
      hips.add(hip);
      const shorts = of.lower === 'shorts';
      ell(hip, botM, -s * 0.01, -0.03, 0, 0.084, 0.08, 0.088);
      if (shorts) {
        limb(hip, 0.25, 0.1, 0.092, botM);
        part(hip, G.cyl(0.095, 0.095, 0.02, 14), seam, 0, -0.25, 0);
        part(hip, G.cyl(0.074, 0.08, 0.2, 14), skin, 0, -0.33, 0);
      } else {
        limb(hip, 0.43, 0.098, 0.08, botM);
      }
      if (of.pockets && !shorts) {
        part(hip, roundBox(0.11, 0.13, 0.03, 0.01), botM, s * 0.09, -0.25, 0, 0, Math.PI / 2, 0);
        part(hip, roundBox(0.115, 0.032, 0.034, 0.01), seam, s * 0.092, -0.19, 0, 0, Math.PI / 2, 0);
      }
      const knee = rig['knee' + side] = new T.Group();
      knee.position.y = -0.43;
      hip.add(knee);
      const shinMat = (legsCovered || of.lower === 'mundu' || of.lower === 'saree') ? (of.lower === 'mundu' || of.lower === 'saree' ? skin : botM) : skin;
      ell(knee, shinMat, 0, 0, 0.005, 0.079, 0.07, 0.079);
      limb(knee, 0.36, 0.078, 0.062, shinMat);
      if (of.socks) part(knee, G.cyl(0.064, 0.066, 0.08, sg(18)), C(of.socks), 0, -0.3, 0);
      // feet hang from an ankle joint so they can roll heel-to-toe
      const ankle = rig['ankle' + side] = new T.Group();
      ankle.position.y = -0.41;
      knee.add(ankle);
      const soleG = roundBox(0.125, 0.27, 0.026, 0.012);
      if (of.sandals) {
        ell(ankle, skin, 0, -0.025, 0.045, 0.05, 0.036, 0.11);
        [-1, 1, 0].forEach((k, i) => ell(ankle, skin, k * 0.025, -0.035, 0.15 + (i === 2 ? 0.005 : 0), 0.016, 0.014, 0.02, 0, 0, 0, 8));
        part(ankle, soleG, shoeM, 0, -0.058, 0.045, -Math.PI / 2);
        part(ankle, G.torus(0.05, 0.008, 6, 14, Math.PI), shoeM, 0, -0.04, 0.1, 0, Math.PI / 2, 0, 1, 0.6, 1);
      } else {
        const bootDark = C(new T.Color(of.shoes).multiplyScalar(0.7).getHex());
        part(ankle, lathe([[0.0005, -0.04], [0.074, -0.04], [0.078, 0.02], [0.074, 0.09], [0.079, 0.1], [0.0005, 0.1]], sg(20)), shoeM, 0, 0, 0);
        part(ankle, G.torus(0.075, 0.012, 8, sg(20)), bootDark, 0, 0.095, 0, Math.PI / 2);
        ell(ankle, shoeM, 0, -0.03, 0.045, 0.07, 0.05, 0.13, 0, 0, 0, 20);
        ell(ankle, shoeM, 0, -0.024, 0.108, 0.062, 0.044, 0.068, 0, 0, 0, 18);
        ell(ankle, bootDark, 0, -0.022, 0.15, 0.05, 0.03, 0.03, 0, 0, 0, 12);
        part(ankle, soleG, C(0x2a1d14), 0, -0.058, 0.045, -Math.PI / 2);
        part(ankle, roundBox(0.06, 0.12, 0.014, 0.006), bootDark, 0, 0.03, 0.06, -0.85);
        for (let i = 0; i < 4; i++) part(ankle, G.cyl(0.004, 0.004, 0.05, 5), C(0xd9c39a), 0, 0.075 - i * 0.026, 0.074 + i * 0.012, -0.85, 0, Math.PI / 2);
      }
    });

    // ------------------------------------------- garments from the waist
    if (of.lower === 'mundu' || of.lower === 'saree') {
      const len = of.lower === 'saree' ? 0.9 : 0.84;
      const flare = of.lower === 'saree' ? 0.26 : 0.215;
      const pts = [[0.001, 0.1], [0.165, 0.1], [0.175, 0.0], [0.19, -0.2], [flare * 0.95, -len * 0.6], [flare, -len + 0.05], [flare - 0.01, -len + 0.03], [0.001, -len + 0.03]];
      part(hips, lathe(pts, 24), botM, 0, 0, 0.01, 0, 0, 0, 1, 1, 0.85);
      part(hips, G.cyl(flare + 0.004, flare + 0.002, 0.07, 24), C(of.border), 0, -len + 0.1, 0.01, 0, 0, 0, 1, 1, 0.85);
      part(hips, G.cyl(flare - 0.006, flare - 0.004, 0.015, 24), C(of.border), 0, -len + 0.165, 0.01, 0, 0, 0, 1, 1, 0.85);
      if (of.lower === 'mundu') {
        part(hips, G.box(0.04, len - 0.14, 0.012), C(of.border), 0.07, -len / 2 + 0.03, 0.17, -0.05, 0, 0.06);
        part(hips, G.cyl(0.178, 0.178, 0.04, 24), botM, 0, 0.07, 0.01, 0, 0, 0, 1, 1, 0.85);
      } else {
        for (let i = 0; i < 5; i++) part(hips, G.box(0.028, len - 0.16, 0.022), C(new T.Color(of.bottom).multiplyScalar(0.92).getHex()), -0.05 + i * 0.026, -len / 2 + 0.0, 0.19 + (i % 2) * 0.006, -0.13);
        part(hips, G.box(0.135, 0.06, 0.024), C(of.border), 0.0, -len + 0.12, 0.215 + 0.03, -0.13);
      }
    } else if (of.lower === 'churidar') {
      const pts = [[0.001, 0.1], [0.165, 0.1], [0.18, -0.05], [0.22, -0.3], [0.26, -0.5], [0.255, -0.52], [0.001, -0.52]];
      part(hips, lathe(pts, 24), topM, 0, 0, 0, 0, 0, 0, 1, 1, 0.85);
      part(hips, G.cyl(0.262, 0.258, 0.045, 24), C(0xd4a434), 0, -0.48, 0, 0, 0, 0, 1, 1, 0.85);
      for (let i = 0; i < 5; i++) part(hips, G.sph(0.012, 6, 4), C(0xd4a434), -0.1 + i * 0.05, -0.43, 0.215);
    } else if (of.coat) {
      const pts = [[0.001, 0.1], [0.17, 0.1], [0.185, -0.05], [0.205, -0.3], [0.21, -0.36], [0.001, -0.36]];
      part(hips, lathe(pts, 24), topM, 0, 0, 0, 0, 0, 0, 1, 1, 0.84);
    }

    // ---------------------------------------------------------- torso
    const spine = rig.spine = new T.Group();
    spine.position.y = 0.08;
    hips.add(spine);
    if (of.open) {
      // tee underneath, open overshirt with lapels hanging below the belt
      part(spine, lathe(torso, 24), innerM, 0, 0, 0, 0, 0, 0, 1, 1, 0.72);
      const shirt = scaled(torso, 1.05, 0).map((p, i) => (i === 1 ? [p[0] * 1.16, -0.12] : p));
      shirt[0] = [0.001, -0.12];
      part(spine, lathe(shirt, 24, 0.32, Math.PI * 2 - 0.64), topM, 0, 0, 0, 0, 0, 0, 1, 1, 0.74);
      [-1, 1].forEach((s) => {
        part(spine, G.box(0.05, 0.16, 0.012), topM, s * 0.05, 0.37, 0.142, -0.25, 0, -s * 0.38);
        part(spine, G.box(0.012, 0.5, 0.012), seam === topM ? topM : C(new T.Color(of.top).multiplyScalar(0.8).getHex()), s * 0.048, 0.18, 0.152, -0.05);
      });
      // chest pockets
      [-1, 1].forEach((s) => {
        part(spine, roundBox(0.07, 0.075, 0.012, 0.005), C(new T.Color(of.top).multiplyScalar(0.9).getHex()), s * 0.1, 0.3, 0.135, -0.18);
        part(spine, roundBox(0.074, 0.022, 0.014, 0.005), C(new T.Color(of.top).multiplyScalar(0.82).getHex()), s * 0.1, 0.34, 0.14, -0.18);
      });
      part(spine, G.torus(0.075, 0.016, 6, 16, Math.PI), topM, 0, 0.47, -0.02, Math.PI / 2 + 0.25, 0, Math.PI);
    } else {
      const k = of.coat ? 1.07 : 1.02;
      part(spine, lathe(scaled(torso, k), 24), topM, 0, 0, 0, 0, 0, 0, 1, 1, 0.73);
      // collar & buttons on shirts
      if (!of.coat && of.lower !== 'saree' && of.lower !== 'churidar' && cfg.outfit !== 'hiking') {
        [-1, 1].forEach((s) => part(spine, G.box(0.06, 0.05, 0.012), topM, s * 0.04, 0.46, 0.115, -0.6, 0, -s * 0.5));
        for (let i = 0; i < 4; i++) part(spine, G.sph(0.008, 6, 4), C(0xeeeeee), 0, 0.4 - i * 0.09, 0.152 - (i === 0 ? 0.01 : 0));
        part(spine, G.box(0.008, 0.42, 0.01), C(new T.Color(of.top).multiplyScalar(0.88).getHex()), 0.014, 0.2, 0.152);
      }
      if (cfg.outfit === 'hiking' || of.coat) {
        part(spine, G.box(0.012, 0.45, 0.012), C(of.coat ? 0xc79a1f : 0x222222), 0, 0.22, 0.155);
        part(spine, G.cyl(0.085, 0.09, 0.07, 16), topM, 0, 0.48, 0);
      }
    }
    if (of.lower === 'saree') {
      // bare midriff, blouse and the pallu draped over the left shoulder
      part(spine, G.cyl(0.135, 0.14, 0.09, 18), skin, 0, 0.02, 0, 0, 0, 0, 1, 1, 0.72);
      part(spine, G.box(0.11, 0.56, 0.03), botM, 0.04, 0.2, 0.135, 0.05, 0, 0.6);
      part(spine, G.box(0.115, 0.03, 0.035), C(of.border), 0.11, 0.39, 0.13, 0.05, 0, 0.6);
      part(spine, G.box(0.13, 0.62, 0.03), botM, 0.1, 0.12, -0.135, -0.05, 0, 0.12);
      part(spine, G.box(0.135, 0.05, 0.035), C(of.border), 0.135, -0.18, -0.13, -0.05, 0, 0.12);
    }
    if (of.dupatta) {
      part(spine, G.torus(0.16, 0.03, 6, 18), C(of.dupatta), 0, 0.43, 0.01, Math.PI / 2 + 0.25, 0, 0, 1, 0.75, 1);
      [-1, 1].forEach((s) => part(spine, G.box(0.075, 0.5, 0.02), C(of.dupatta), s * 0.17, 0.15, -0.1, 0.08, 0, s * 0.05));
    }
    // neck
    part(spine, G.cyl(0.055, 0.062, 0.12, 14), skin, 0, 0.52, 0.0);

    // ---------------------------------------------------------- head
    const head = rig.head = new T.Group();
    head.position.set(0, 0.56, 0.0);
    spine.add(head);
    const face = new T.Group(); // centre of cranium
    face.position.y = 0.2;
    head.add(face);
    face.userData.rig = rig;
    part(face, headShape(female), skin);
    buildFace(face, cfg, skin);
    if (of.hood) {
      // hood up: hair tucked inside, only the fringe line shows
      part(face, hairShell(female, 1.03, hairline(0.11, 0.06, -0.1)), hairMat);
      part(face, new T.SphereGeometry(0.245, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), topM, 0, 0.0, -0.04, -0.55, 0, 0, 1.0, 1.06, 1.08);
      part(face, G.torus(0.205, 0.022, 8, 24), topM, 0, -0.03, 0.06, -0.55 + Math.PI / 2, 0, 0, 0.92, 1.08, 1);
      rig.tail = null;
    } else rig.tail = buildHair(face, cfg, hairMat);
    const acc = cfg.acc || {};
    if (acc.hat && !of.hood) {
      const hc = C(0xd2b48c), band = C(0x5a3a22);
      part(face, lathe([[0.001, 0.0], [0.32, 0.0], [0.33, 0.018], [0.2, 0.012], [0.19, 0.03], [0.001, 0.03]], 28), hc, 0, 0.15, -0.01, -0.08);
      part(face, lathe([[0.17, 0.0], [0.17, 0.08], [0.15, 0.13], [0.06, 0.15], [0.001, 0.13]], 24), hc, 0, 0.17, -0.02, -0.08);
      part(face, G.cyl(0.173, 0.173, 0.035, 24), band, 0, 0.19, -0.02, -0.08);
    }
    if (acc.sunglasses) {
      const gl = C(0x0d0d0d);
      [-1, 1].forEach((s) => {
        ell(face, gl, s * 0.072, 0.0, 0.192, 0.048, 0.035, 0.01, 0, s * 0.15, 0);
        part(face, G.box(0.01, 0.01, 0.16), gl, s * 0.165, 0.015, 0.1, 0, s * 0.12, 0);
      });
      part(face, G.box(0.04, 0.01, 0.012), gl, 0, 0.018, 0.2);
    }

    // ---------------------------------------------------------- arms
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const sh = rig['sh' + side] = new T.Group();
      sh.position.set(s * shoulderW, 0.425, 0);
      spine.add(sh);
      const longSleeve = of.sleeve === 'long';
      const armTop = of.sleeve === 'cap' ? skin : longSleeve ? topM : skin;
      ell(sh, topM, -s * 0.005, -0.005, 0, 0.074, 0.068, 0.072);
      limb(sh, 0.28, female ? 0.063 : 0.072, female ? 0.054 : 0.062, armTop);
      if (of.sleeve === 'short') {
        part(sh, G.cyl(0.08, 0.084, 0.16, 16), topM, 0, -0.07, 0);
        part(sh, G.torus(0.078, 0.016, 6, 16), topM, 0, -0.15, 0, Math.PI / 2);
      } else if (of.sleeve === 'cap') {
        part(sh, G.cyl(0.074, 0.078, 0.08, 16), topM, 0, -0.03, 0);
        part(sh, G.torus(0.072, 0.008, 6, 16), C(of.border || 0xd4a434), 0, -0.07, 0, Math.PI / 2);
      }
      const el = rig['el' + side] = new T.Group();
      el.position.y = -0.28;
      sh.add(el);
      ell(el, longSleeve ? topM : skin, 0, 0, 0, female ? 0.052 : 0.058, 0.055, female ? 0.052 : 0.058);
      limb(el, 0.25, female ? 0.05 : 0.056, female ? 0.042 : 0.046, longSleeve ? topM : skin);
      if (longSleeve) part(el, G.torus(0.048, 0.012, 6, 14), topM, 0, -0.24, 0, Math.PI / 2);
      // hand with thumb
      ell(el, skin, 0, -0.3, 0.004, 0.036, 0.055, 0.024);
      ell(el, skin, 0, -0.345, 0.008, 0.032, 0.032, 0.02);
      ell(el, skin, -s * 0.026, -0.29, 0.02, 0.012, 0.03, 0.012, 0.3, 0, -s * 0.5);
      if (side === 'L' && !female) {
        part(el, G.cyl(0.05, 0.05, 0.028, 14), C(0x1e1e1e), 0, -0.215, 0);
        ell(el, C(0x3a3a3a), 0.0, -0.215, 0.05, 0.022, 0.022, 0.008);
      }
      if (female) part(el, G.torus(0.046, 0.007, 4, 14), C(0xd4a434), 0, -0.235, 0, Math.PI / 2);
      sh.rotation.z = s * 0.08;
    });

    // ---------------------------------------------------- accessories
    if (acc.backpack) {
      const bp = C(0x5b4330), bpDark = C(0x3e2c1f), buckle = C(0xb08a50);
      part(spine, roundBox(0.34, 0.44, 0.17, 0.05), bp, 0, 0.25, -0.22);
      part(spine, roundBox(0.24, 0.16, 0.07, 0.025), bpDark, 0, 0.13, -0.32);
      part(spine, G.box(0.25, 0.03, 0.075), bp, 0, 0.215, -0.32);
      [-1, 1].forEach((s) => part(spine, roundBox(0.06, 0.2, 0.08, 0.02), bpDark, s * 0.19, 0.18, -0.22));
      part(spine, G.cyl(0.065, 0.065, 0.38, 16), C(0x7a6650), 0, 0.5, -0.21, 0, 0, Math.PI / 2);
      [-1, 1].forEach((s) => {
        part(spine, G.box(0.012, 0.13, 0.13), bpDark, s * 0.1, 0.5, -0.21);
        part(spine, G.box(0.032, 0.3, 0.015), bpDark, s * 0.105, 0.29, 0.15, -0.12, 0, 0);
        part(spine, G.box(0.04, 0.2, 0.02), bpDark, s * 0.11, 0.46, 0.0, -1.2);
        part(spine, G.box(0.03, 0.025, 0.02), buckle, s * 0.105, 0.22, 0.155, -0.12);
      });
    }
    if (acc.camera) {
      part(spine, roundBox(0.12, 0.08, 0.06, 0.012), C(0x1b1b1b), 0, 0.22, 0.175);
      part(spine, G.cyl(0.032, 0.032, 0.05, 14), C(0x2b2b2b), 0.01, 0.22, 0.21, Math.PI / 2);
      part(spine, G.cyl(0.024, 0.024, 0.052, 14), C(0x4a6a8a), 0.01, 0.22, 0.212, Math.PI / 2);
      part(spine, G.torus(0.13, 0.007, 4, 14, Math.PI), C(0x1b1b1b), 0, 0.33, 0.12, -0.3, 0, Math.PI);
    }
    root.scale.setScalar(cfg.scale || 0.95);
    rig.root = root;
    root.userData.rig = rig;
    root.userData.anim = { phase: 0, t: 0, blink: 2 + Math.random() * 3 };
    SEG = 1;
    KT.skinify(root);
    return root;
  };

  // Kathakali performer (pacha vesham): green face, white chutti, golden
  // kireedam and voluminous skirt.
  Models.kathakaliDancer = function () {
    const root = new T.Group();
    const rig = {};
    const red = C(0xc8322a), white = C(0xf6f1e2), gold = C(0xd4a434), green = C(0x2f9a45), skin = C(0xa86f4c), black = C(0x111111);
    const hips = rig.hips = new T.Group();
    hips.position.y = 0.9;
    root.add(hips);
    // the big round skirt (koshavam)
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new T.Vector2(0.18 + Math.sin(t * Math.PI * 0.9) * 0.45 + t * 0.05, -t * 0.8));
    }
    part(hips, new T.LatheGeometry(pts, 20), white, 0, 0.1, 0);
    for (let k = 0; k < 3; k++) part(hips, G.torus(0.6 - k * 0.05, 0.02, 4, 24), k === 1 ? gold : red, 0, -0.35 - k * 0.12, 0, Math.PI / 2);
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const hip = rig['hip' + side] = new T.Group();
      hip.position.set(s * 0.12, -0.05, 0);
      hips.add(hip);
      limb(hip, 0.43, 0.08, 0.07, white);
      const knee = rig['knee' + side] = new T.Group();
      knee.position.y = -0.43;
      hip.add(knee);
      limb(knee, 0.4, 0.065, 0.055, red);
      part(knee, G.torus(0.065, 0.02, 4, 10), gold, 0, -0.38, 0, Math.PI / 2);
      part(knee, G.box(0.12, 0.05, 0.22), skin, 0, -0.45, 0.04);
    });
    const spine = rig.spine = new T.Group();
    spine.position.y = 0.08;
    hips.add(spine);
    part(spine, G.cyl(0.21, 0.17, 0.46, 14), red, 0, 0.22, 0, 0, 0, 0, 1, 1, 0.75);
    for (let i = 0; i < 5; i++) part(spine, G.sph(0.03, 6, 5), gold, -0.12 + i * 0.06, 0.38, 0.14);
    part(spine, G.torus(0.16, 0.03, 6, 16), gold, 0, 0.42, 0.03, Math.PI / 2 + 0.3);
    for (let i = 0; i < 6; i++) part(spine, G.box(0.05, 0.4, 0.02), [white, red, gold][i % 3], -0.15 + i * 0.06, 0.05, 0.17, -0.2);
    const head = rig.head = new T.Group();
    head.position.set(0, 0.52, 0.01);
    spine.add(head);
    part(head, G.sph(0.19, 18, 14), green, 0, 0.19, 0, 0, 0, 0, 0.95, 1, 0.95);
    // chutti (white paper frame around the jaw)
    part(head, G.torus(0.2, 0.045, 6, 20, Math.PI), white, 0, 0.17, 0.05, 0, 0, Math.PI, 1, 0.9, 0.6);
    part(head, G.box(0.16, 0.025, 0.02), red, 0, 0.1, 0.185);
    [-1, 1].forEach((s) => {
      part(head, G.sph(0.04, 10, 8), C(0xffffff), s * 0.07, 0.22, 0.165, 0, 0, 0, 1.2, 0.8, 0.5);
      part(head, G.sph(0.022, 8, 6), C(0xb3261e), s * 0.07, 0.22, 0.186);
      part(head, G.box(0.09, 0.018, 0.02), black, s * 0.075, 0.27, 0.18, 0, 0, s * 0.3);
    });
    part(head, G.box(0.03, 0.08, 0.02), C(0xf2c230), 0, 0.31, 0.18);
    // kireedam - golden halo crown
    part(head, G.cyl(0.21, 0.19, 0.16, 16), gold, 0, 0.4, 0);
    part(head, G.cyl(0.42, 0.42, 0.04, 24), gold, 0, 0.45, -0.12, Math.PI / 2 - 0.15);
    part(head, G.cyl(0.36, 0.36, 0.05, 24), red, 0, 0.45, -0.1, Math.PI / 2 - 0.15);
    part(head, G.cone(0.12, 0.25, 10), gold, 0, 0.6, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(head, G.sph(0.035, 6, 5), i % 2 ? C(0x1b8fd6) : C(0xd8203a), Math.cos(a) * 0.4, 0.45 + Math.sin(a) * 0.4, -0.07);
    }
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const sh = rig['sh' + side] = new T.Group();
      sh.position.set(s * 0.25, 0.42, 0);
      spine.add(sh);
      part(sh, G.sph(0.09, 10, 8), red, 0, 0, 0);
      limb(sh, 0.29, 0.065, 0.055, red);
      const el = rig['el' + side] = new T.Group();
      el.position.y = -0.29;
      sh.add(el);
      limb(el, 0.26, 0.052, 0.045, white);
      part(el, G.torus(0.05, 0.02, 4, 10), gold, 0, -0.24, 0, Math.PI / 2);
      part(el, G.sph(0.055, 10, 8), green, 0, -0.31, 0, 0, 0, 0, 0.8, 1.1, 1);
      for (let k = 0; k < 3; k++) part(el, G.cone(0.008, 0.1, 4), C(0xdedede), -0.02 + k * 0.02, -0.39, 0, Math.PI);
    });
    rig.root = root;
    root.userData.rig = rig;
    root.userData.anim = { phase: 0, t: 0 };
    root.userData.dancer = true;
    KT.skinify(root);
    return root;
  };

  // --------------------------------------------------------- animation
  // Poses return target Euler angles per joint. Ankles keep the feet flat
  // on the ground during stance (ankle = -(hip + knee)).
  function flat(h, k) { return -(h + k); }
  const POSES = {
    idle: function (p, a) {
      const b = Math.sin(a.t * 1.8);
      const shift = Math.sin(a.t * 0.4) * 0.03;
      return {
        spine: [0.02 + b * 0.015, 0, -shift], hips: [0, 0, shift], hipL: [0, 0, -shift], hipR: [0, 0, -shift],
        shL: [0.05 + b * 0.02, 0, 0.12], shR: [0.05 + b * 0.02, 0, -0.12], elL: [-0.18, 0, 0], elR: [-0.18, 0, 0],
        head: [Math.sin(a.t * 0.6) * 0.04, Math.sin(a.t * 0.35) * 0.3, 0], bob: b * 0.004
      };
    },
    walk: function (p) {
      const s = Math.sin(p), c = Math.cos(p);
      const hL = -s * 0.52, hR = s * 0.52;
      const kL = 0.07 + 0.85 * Math.pow(Math.max(0, c), 1.6), kR = 0.07 + 0.85 * Math.pow(Math.max(0, -c), 1.6);
      // stance foot flat; swing foot lifts toes, push-off points them
      const aL = c < 0 ? flat(hL, kL) - 0.15 * Math.max(0, -s) : -0.25 + 0.35 * Math.max(0, -s);
      const aR = c > 0 ? flat(hR, kR) - 0.15 * Math.max(0, s) : -0.25 + 0.35 * Math.max(0, s);
      return {
        hipL: [hL, 0, 0], hipR: [hR, 0, 0], kneeL: [kL, 0, 0], kneeR: [kR, 0, 0], ankleL: [aL, 0, 0], ankleR: [aR, 0, 0],
        hips: [0, -s * 0.12, c * 0.035],
        shL: [s * 0.45, 0, 0.09], shR: [-s * 0.45, 0, -0.09],
        elL: [-0.25 - 0.3 * Math.max(0, -s), 0, 0], elR: [-0.25 - 0.3 * Math.max(0, s), 0, 0],
        spine: [0.04, s * 0.1, -c * 0.02], head: [-0.03, -s * 0.07, c * 0.02], bob: Math.abs(c) * 0.035
      };
    },
    run: function (p) {
      const s = Math.sin(p), c = Math.cos(p);
      const hL = -s * 0.95 - 0.15, hR = s * 0.95 - 0.15;
      const kL = 0.25 + 1.55 * Math.pow(Math.max(0, c), 1.2), kR = 0.25 + 1.55 * Math.pow(Math.max(0, -c), 1.2);
      return {
        hipL: [hL, 0, 0], hipR: [hR, 0, 0], kneeL: [kL, 0, 0], kneeR: [kR, 0, 0],
        ankleL: [c < 0 ? flat(hL, kL) * 0.6 : 0.4, 0, 0], ankleR: [c > 0 ? flat(hR, kR) * 0.6 : 0.4, 0, 0],
        hips: [0, -s * 0.18, c * 0.05],
        shL: [s * 1.0 - 0.1, 0, 0.14], shR: [-s * 1.0 - 0.1, 0, -0.14], elL: [-1.45, 0, 0], elR: [-1.45, 0, 0],
        spine: [0.26, s * 0.16, 0], head: [-0.18, -s * 0.1, 0], bob: Math.abs(c) * 0.075 - 0.02
      };
    },
    // airborne: style chosen at take-off (reach | star | tuck | flip)
    jump: function (p, a) {
      const t = a.air || 0;
      if (t < 0.09) return POSES.land(p, a); // take-off crouch
      const st = a.jumpStyle || 'reach';
      if (st === 'star') {
        return { hipL: [-0.15, 0, 0.55], hipR: [-0.15, 0, -0.55], kneeL: [0.15, 0, 0], kneeR: [0.15, 0, 0], ankleL: [0.5, 0, 0], ankleR: [0.5, 0, 0],
          shL: [-0.3, 0, 2.3], shR: [-0.3, 0, -2.3], elL: [-0.1, 0, 0], elR: [-0.1, 0, 0], spine: [-0.12, 0, 0], head: [-0.25, 0, 0], hips: [0, 0, 0], bob: 0.05 };
      }
      if (st === 'tuck' || st === 'flip') {
        return { hipL: [-1.75, 0, 0.12], hipR: [-1.75, 0, -0.12], kneeL: [2.1, 0, 0], kneeR: [2.1, 0, 0], ankleL: [0.4, 0, 0], ankleR: [0.4, 0, 0],
          shL: [-1.1, 0, 0.25], shR: [-1.1, 0, -0.25], elL: [-1.3, 0, 0], elR: [-1.3, 0, 0], spine: [0.45, 0, 0], head: [0.3, 0, 0], hips: [0, 0, 0], bob: 0.25 };
      }
      return { hipL: [-1.0, 0, 0.05], hipR: [0.25, 0, -0.05], kneeL: [1.35, 0, 0], kneeR: [0.5, 0, 0], ankleL: [0.3, 0, 0], ankleR: [0.5, 0, 0],
        shL: [-2.7, 0, 0.25], shR: [-0.4, 0, -0.9], elL: [-0.2, 0, 0], elR: [-0.6, 0, 0], spine: [-0.1, 0.1, 0], head: [-0.3, 0, 0], hips: [0, 0.1, 0], bob: 0.05 };
    },
    fall: function (p, a) {
      const w = Math.sin((a.t || 0) * 9) * 0.25; // arms windmill for balance
      return { hipL: [-0.45, 0, 0.1], hipR: [-0.1, 0, -0.1], kneeL: [0.7, 0, 0], kneeR: [0.35, 0, 0], ankleL: [-0.1, 0, 0], ankleR: [0.1, 0, 0],
        shL: [-0.5 + w, 0, 1.05], shR: [-0.5 - w, 0, -1.05], elL: [-0.4, 0, 0], elR: [-0.4, 0, 0], spine: [0.05, 0, 0], head: [0.15, 0, 0], hips: [0, 0, 0], bob: 0 };
    },
    land: function () {
      return { hipL: [-0.95, 0, 0.12], hipR: [-0.95, 0, -0.12], kneeL: [1.7, 0, 0], kneeR: [1.7, 0, 0], ankleL: [flat(-0.95, 1.7), 0, 0], ankleR: [flat(-0.95, 1.7), 0, 0],
        shL: [-0.7, 0, 0.35], shR: [-0.7, 0, -0.35], elL: [-0.5, 0, 0], elR: [-0.5, 0, 0], spine: [0.4, 0, 0], head: [-0.25, 0, 0], hips: [0, 0, 0], bob: -0.24 };
    },
    namaskaram: function (p, a) {
      return { shL: [-0.42, 0, 0.0], shR: [-0.42, 0, 0.0], elL: [-1.95, 0, -0.62], elR: [-1.95, 0, 0.62], spine: [0.12, 0, 0], head: [0.25, 0, 0], bob: 0 };
    },
    wave: function (p, a) {
      return { shR: [-0.2, 0, -2.6], elR: [-0.3, 0, Math.sin(a.t * 9) * 0.45], shL: [0.05, 0, 0.1], elL: [-0.15, 0, 0], head: [-0.05, 0, 0.1], spine: [0, 0, 0], bob: 0 };
    },
    sit: function (p, a) {
      return { hipL: [-1.45, 0, 0.12], hipR: [-1.45, 0, -0.12], kneeL: [1.35, 0, 0], kneeR: [1.35, 0, 0], ankleL: [0.1, 0, 0], ankleR: [0.1, 0, 0], shL: [0.05, 0, 0.1], shR: [0.05, 0, -0.1], elL: [-0.8, 0, 0], elR: [-0.8, 0, 0], spine: [0, 0, 0], head: [0, Math.sin(a.t * 0.4) * 0.4, 0], bob: -0.42 };
    },
    paddle: function (p, a) {
      const s = Math.sin(p), c = Math.cos(p);
      return {
        hipL: [-1.45, 0, 0.12], hipR: [-1.45, 0, -0.12], kneeL: [1.35, 0, 0], kneeR: [1.35, 0, 0], ankleL: [0.1, 0, 0], ankleR: [0.1, 0, 0],
        shL: [-0.9 + s * 0.5, 0, -0.2], shR: [-0.6 + s * 0.6, 0, 0.1 + c * 0.3], elL: [-0.9, 0, 0], elR: [-0.6, 0, 0],
        spine: [0.15 + s * 0.08, c * 0.25, 0], head: [-0.1, -c * 0.15, 0], bob: -0.42
      };
    },
    dance: function (p, a) {
      const t = a.t;
      const s = Math.sin(t * 2.2), c = Math.cos(t * 1.1);
      return {
        hipL: [-0.5, 0, 0.45], hipR: [-0.5, 0, -0.45], kneeL: [0.9, 0, 0], kneeR: [0.9, 0, 0],
        shL: [-0.6 + s * 0.5, 0, 1.0 + c * 0.4], shR: [-0.6 - s * 0.5, 0, -1.0 + c * 0.4], elL: [-1.4 + c * 0.4, 0, 0], elR: [-1.4 - c * 0.4, 0, 0],
        spine: [0.05, Math.sin(t * 1.1) * 0.35, Math.sin(t * 2.2) * 0.08], head: [Math.sin(t * 4.4) * 0.12, Math.sin(t * 2.2) * 0.4, Math.sin(t * 3.3) * 0.15], bob: -0.12 + Math.abs(s) * 0.05
      };
    }
  };
  const JOINTS = ['hips', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shL', 'shR', 'elL', 'elR', 'spine', 'head'];

  // state: idle|walk|run|jump|fall|namaskaram|wave|sit|paddle|dance
  Models.animateCharacter = function (ch, state, dt, speedFactor) {
    const rig = ch.userData.rig, a = ch.userData.anim;
    a.t += dt;
    const rate = state === 'run' ? 10.5 : state === 'walk' ? 7.2 : state === 'paddle' ? 3 : 0;
    a.phase += dt * rate * (speedFactor || 1);
    const pose = (POSES[state] || POSES.idle)(a.phase, a);
    const k = 1 - Math.exp(-dt * (state === 'jump' || state === 'land' ? 16 : 12));
    JOINTS.forEach((j) => {
      const bone = rig[j];
      if (!bone) return;
      if (j === 'hips' && a.flipping) return;
      const tgt = pose[j] || (j.indexOf('sh') === 0 ? [0.05, 0, j === 'shL' ? 0.08 : -0.08] : [0, 0, 0]);
      bone.rotation.x += (tgt[0] - bone.rotation.x) * k;
      bone.rotation.y += (tgt[1] - bone.rotation.y) * k;
      bone.rotation.z += (tgt[2] - bone.rotation.z) * k;
    });
    // blinking
    if (rig.eyeL) {
      a.blink -= dt;
      let sy = 1;
      if (a.blink < 0) { sy = Math.max(0.08, Math.abs(a.blink + 0.07) / 0.07); if (a.blink < -0.14) a.blink = 2 + Math.random() * 4; }
      rig.eyeL.scale.y = rig.eyeR.scale.y = sy;
    }
    const baseY = 0.93;
    rig.hips.position.y += (baseY + (pose.bob || 0) - rig.hips.position.y) * k;
    if (rig.tail) {
      rig.tail.rotation.x = 0.25 + (state === 'run' ? 0.5 : state === 'walk' ? 0.2 : 0) + Math.sin(a.phase * 2) * 0.08;
      rig.tail.rotation.z = Math.sin(a.phase) * 0.12;
    }
  };
})();
