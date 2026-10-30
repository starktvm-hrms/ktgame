// Player & NPC characters: stylised traveller (male / female) with outfits,
// hairstyles, accessories, facial features and a procedural animation rig
// (idle, walk, run, jump, namaskaram, paddle, wave, kathakali dance).
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};

  const C = (hex) => KT.mat('c' + hex.toString(16), { color: hex });

  // ------------------------------------------------------------ wardrobe
  // top:    tee | open (shirt/cardigan/jacket over a tee) | sweater | shirt |
  //         coat | raincoat | blouse | kurta
  // bottom: pants | jeans | shorts | overalls | mundu | saree | leggings
  // shoes:  sneaker | boot | sandal | loafer
  Models.OUTFITS = {
    male: {
      casual: { label: 'Casual Traveller', topType: 'open', top: 0x6b8a4e, inner: 0xf3efe6, bottom: 0xc9b083, bottomType: 'pants', shoeType: 'boot', shoes: 0x7a5233, sleeve: 'rolled' },
      mundu: { label: 'Traditional (Mundu)', topType: 'shirt', top: 0xf8f6ef, bottom: 0xf8f6ef, bottomType: 'mundu', border: 0xd4a434, shoeType: 'sandal', shoes: 0x7a5233, sleeve: 'short' },
      hiking: { label: 'Outdoor / Hiking', topType: 'open', top: 0x2f62a8, inner: 0x2f62a8, zip: true, bottom: 0x5d6266, bottomType: 'shorts', shoeType: 'sneaker', shoes: 0x55606a, sleeve: 'long' },
      formal: { label: 'Formal Casual', topType: 'shirt', top: 0x8fb6e0, bottom: 0xd6c39c, bottomType: 'pants', shoeType: 'loafer', shoes: 0x6a3f22, sleeve: 'rolled' },
      rain: { label: 'Rain Wear', topType: 'raincoat', top: 0xf2c230, bottom: 0x2a2f3a, bottomType: 'pants', shoeType: 'boot', shoes: 0x1f1f1f, sleeve: 'long', hood: true },
      sweater: { label: 'Sweater & Jeans', topType: 'sweater', top: 0xf0b21a, bottom: 0x7fbde8, bottomType: 'jeans', shoeType: 'sneaker', shoes: 0x1e1e1e, sleeve: 'long' },
      tee: { label: 'Tee & Shorts', topType: 'tee', top: 0x1f9a9a, bottom: 0xe2e2df, bottomType: 'shorts', shoeType: 'sneaker', shoes: 0x4a7088, sleeve: 'short' },
      coat: { label: 'Long Coat', topType: 'coat', top: 0xf2c776, inner: 0xf6f4ee, bottom: 0x2e2e2e, bottomType: 'pants', shoeType: 'loafer', shoes: 0x5a3020, sleeve: 'long' }
    },
    female: {
      casual: { label: 'Casual Traveller', topType: 'open', top: 0x6b8a4e, inner: 0xf3ead8, bottom: 0x868356, bottomType: 'pants', shoeType: 'boot', shoes: 0x7a5233, sleeve: 'rolled' },
      saree: { label: 'Kasavu Saree', topType: 'blouse', top: 0xd4a434, bottom: 0xf7f2e4, bottomType: 'saree', border: 0xd4a434, shoeType: 'sandal', shoes: 0x7a5233, sleeve: 'short' },
      churidar: { label: 'Churidar', topType: 'kurta', top: 0x3aa39a, bottom: 0xf2efe6, bottomType: 'leggings', dupatta: 0xf3c7d4, shoeType: 'sandal', shoes: 0x7a5233, sleeve: 'long' },
      hiking: { label: 'Cardigan & Jeans', topType: 'open', top: 0xe0337a, inner: 0xbfbfbf, bottom: 0x2f6fd0, bottomType: 'jeans', shoeType: 'sneaker', shoes: 0x2b2b2b, sleeve: 'long' },
      rain: { label: 'Rain Wear', topType: 'raincoat', top: 0xf2c230, bottom: 0x2a2f3a, bottomType: 'pants', shoeType: 'boot', shoes: 0xf2c230, sleeve: 'long', hood: true },
      overalls: { label: 'Overalls', topType: 'tee', top: 0xf6f6f2, bottom: 0x3ea0e8, bottomType: 'overalls', shoeType: 'sneaker', shoes: 0xf0f0f0, sleeve: 'short' }
    }
  };
  Models.HAIR = {
    male: { default: 'Side Swept', short: 'Short Cap', wavy: 'Wavy', curly: 'Curly' },
    female: { default: 'Ponytail', bun: 'Top Bun', loose: 'Loose', braid: 'Braid', curly: 'Curly' }
  };

  // Level of detail: 1 for the player / preview, lower for background NPCs.
  let SEG = 1;
  const sg = (n) => Math.max(5, Math.round(n * SEG));
  const roundBox = KT.roundBox;

  function lathe(pts, segs, phiStart, phiLen) {
    return new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), segs || sg(24), phiStart || 0, phiLen === undefined ? Math.PI * 2 : phiLen);
  }
  // Ellipsoid: the workhorse for hands, shoes, hair and facial features.
  function ell(parent, mat, x, y, z, sx, sy, sz, rx, ry, rz, seg) {
    return part(parent, G.sph(1, sg(seg || 18), sg(seg ? Math.max(6, seg - 4) : 14)), mat, x, y, z, rx || 0, ry || 0, rz || 0, sx, sy, sz);
  }
  // Smooth tapered limb with rounded ends (joint at y = 0, down to -len).
  function limb(parent, len, r0, r1, mat) {
    const pts = [];
    const cap = 5;
    for (let i = 0; i <= cap; i++) {
      const a = (i / cap) * Math.PI / 2;
      pts.push([Math.max(0.0005, r1 * Math.sin(a)), -len - r1 * 0.5 * Math.cos(a) + r1 * 0.5]);
    }
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      pts.push([KT.lerp(r1, r0, t) * (1 + Math.sin(t * Math.PI) * 0.05), -len + len * t]);
    }
    for (let i = 0; i <= cap; i++) {
      const a = (i / cap) * Math.PI / 2;
      pts.push([Math.max(0.0005, r0 * Math.cos(a)), -r0 * 0.5 + r0 * 0.5 * Math.sin(a)]);
    }
    return part(parent, lathe(pts, sg(22)), mat, 0, 0, 0);
  }
  // Open tube (sleeves, trouser legs) from y0 down to y1 with a soft flare.
  function tube(parent, mat, y0, y1, r0, r1, phiStart, phiLen) {
    const pts = [];
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([KT.lerp(r1, r0, t) * (1 + Math.sin(t * Math.PI) * 0.04), KT.lerp(y1, y0, t)]);
    }
    return part(parent, lathe(pts, sg(22), phiStart, phiLen), mat, 0, 0, 0);
  }
  // A soft cloth strip following a path (saree pallu, sashes).
  function ribbon(path, width, thick) {
    const pos = [], idx = [];
    const n = path.length;
    for (let i = 0; i < n; i++) {
      const p = path[i];
      const tng = path[Math.min(n - 1, i + 1)].clone().sub(path[Math.max(0, i - 1)]).normalize();
      const side = new T.Vector3().crossVectors(tng, new T.Vector3(0, 0, 1)).normalize().multiplyScalar(width / 2);
      const out = new T.Vector3(0, 0, thick);
      [[1, 0], [-1, 0], [-1, 1], [1, 1]].forEach((c) => {
        pos.push(p.x + side.x * c[0] + out.x * c[1], p.y + side.y * c[0] + out.y * c[1], p.z + side.z * c[0] + out.z * c[1]);
      });
      if (i < n - 1) {
        const a = i * 4, b = a + 4;
        for (let k = 0; k < 4; k++) {
          const k2 = (k + 1) % 4;
          idx.push(a + k, b + k, a + k2, a + k2, b + k, b + k2);
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Rolled cuff / rib band.
  function band(parent, mat, y, r, thick, rx, sz) {
    return part(parent, G.torus(r, thick, sg(10), sg(24)), mat, 0, y, 0, rx === undefined ? Math.PI / 2 : rx, 0, 0, 1, 1, sz || 1);
  }
  const shade = (hex, k) => C(new T.Color(hex).multiplyScalar(k).getHex());
  const tint = (hex, toward, k) => C(new T.Color(hex).lerp(new T.Color(toward), k).getHex());

  // ------------------------------------------------------------- head
  // Tall soft oval with full cheeks and a rounded chin (toy-figure style).
  const HEAD = { rx: 0.1, ry: 0.128, rz: 0.11 };
  function headShape(female, full, ws, hs) {
    const g = new T.SphereGeometry(1, ws || (full ? 40 : sg(40)), hs || (full ? 30 : sg(30)));
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const wx = 1 + 0.08 * KT.smoothstep(0.5, -0.35, y) - 0.22 * KT.smoothstep(-0.55, -1, y) - 0.06 * KT.smoothstep(0.4, 1, y);
      const wz = 1 - 0.1 * KT.smoothstep(-0.5, -1, y);
      if (z > 0) z *= 0.94;
      x *= HEAD.rx * wx * (female ? 0.95 : 1);
      y *= HEAD.ry;
      z *= HEAD.rz * wz;
      P.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  }
  const faceMesh = {};
  const _ray = new T.Raycaster();
  function faceZ(female, x, y) {
    const key = female ? 'f' : 'm';
    if (!faceMesh[key]) faceMesh[key] = new T.Mesh(headShape(female, true), new T.MeshBasicMaterial());
    _ray.set(new T.Vector3(x, y, 1), new T.Vector3(0, 0, -1));
    const hit = _ray.intersectObject(faceMesh[key])[0];
    return hit ? hit.point.z : 0.1;
  }

  // Point on the (deformed) head surface for polar angle th, azimuth ph.
  function headPoint(female, th, ph, out) {
    let x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph);
    const wx = 1 + 0.08 * KT.smoothstep(0.5, -0.35, y) - 0.22 * KT.smoothstep(-0.55, -1, y) - 0.06 * KT.smoothstep(0.4, 1, y);
    const wz = 1 - 0.1 * KT.smoothstep(-0.5, -1, y);
    if (z > 0) z *= 0.94;
    out.set(x * HEAD.rx * wx * (female ? 0.95 : 1), y * HEAD.ry, z * HEAD.rz * wz);
    return out;
  }

  // Hair cap built as its own surface: its lower boundary follows the
  // hairline exactly and finishes in a rounded lip, like sculpted toy hair.
  function hairShell(female, scale, line) {
    const NP = sg(72), NV = sg(26);
    const pos = [], idx = [];
    const p = new T.Vector3();
    for (let i = 0; i <= NP; i++) {
      const ph = (i / NP) * Math.PI * 2;
      // find the polar angle where the surface meets the hairline
      let lo = 0.05, hi = Math.PI * 0.95;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        headPoint(female, mid, ph, p);
        if (p.y > line(p.x, p.z)) lo = mid; else hi = mid;
      }
      const edge = (lo + hi) / 2;
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        const vv = v * v * 0.6 + v * 0.4; // more rows near the edge
        headPoint(female, KT.lerp(edge, 0.0001, vv), ph, p);
        const r = KT.lerp(0.995, scale, Math.sin(Math.min(1, vv / 0.1) * Math.PI / 2));
        pos.push(p.x * r, p.y * KT.lerp(0.995, scale * 1.01, Math.min(1, vv / 0.1)), p.z * r);
      }
    }
    for (let i = 0; i < NP; i++) {
      for (let j = 0; j < NV; j++) {
        const a = i * (NV + 1) + j, b = a + NV + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function hairline(front, side, back) {
    return (x, z) => back + KT.smoothstep(-0.09, 0.0, z) * (side - back) + KT.smoothstep(0.03, 0.09, z) * (front - side) * (1 - KT.smoothstep(0.03, 0.09, Math.abs(x)) * 0.25);
  }
  function coils(head, mat, n, seed, minY, rad, keepFace) {
    const rng = KT.makeRng(seed);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, e = minY + rng() * (Math.PI / 2 - minY);
      const x = Math.cos(a) * Math.cos(e) * HEAD.rx * 1.12, y = Math.sin(e) * HEAD.ry * 1.08, z = Math.sin(a) * Math.cos(e) * HEAD.rz * 1.1;
      if (keepFace && z > 0.05 && y < 0.07 && Math.abs(x) < 0.08) continue;
      part(head, G.torus(rad, rad * 0.55, sg(8), sg(14)), mat, x, y, z, rng() * 3, rng() * 3, rng() * 3);
    }
  }

  function buildHair(face, cfg, hairMat) {
    const female = cfg.gender === 'female';
    const style = cfg.hair || 'default';
    const hl = shade(cfg.hairColor || 0x2a1a12, 1.35);
    if (!female) {
      if (style === 'curly') {
        part(face, hairShell(false, 1.04, hairline(0.07, 0.02, -0.07)), hairMat);
        coils(face, hairMat, SEG < 1 ? 40 : 70, 7, -0.1, 0.022, true);
      } else if (style === 'short') {
        part(face, hairShell(false, 1.07, hairline(0.078, 0.035, -0.06)), hairMat);
        ell(face, hairMat, 0.01, 0.09, 0.055, 0.08, 0.035, 0.05, -0.4, 0, -0.1);
      } else {
        // default: thick sculpted cap with a side-swept fringe; wavy adds lobes
        part(face, hairShell(false, 1.13, hairline(0.072, 0.025, -0.075)), hairMat);
        ell(face, hairMat, 0.005, 0.085, 0.0, 0.098, 0.055, 0.108, -0.15, 0, -0.06);
        part(face, G.torus(0.06, 0.004, 6, 16, Math.PI * 0.6), shade(cfg.hairColor || 0x24170f, 0.7), -0.03, 0.125, 0.0, Math.PI / 2, 0, 0.3);
        if (style === 'wavy') {
          [-0.05, 0.0, 0.05].forEach((x, i) => ell(face, hairMat, x, 0.115 - Math.abs(x) * 0.3, 0.05 - i * 0.004, 0.035, 0.035, 0.055, -0.5, 0, x * 4));
          ell(face, hairMat, 0, -0.03, -0.1, 0.09, 0.05, 0.03, 0.4, 0, 0);
        }
      }
      [-1, 1].forEach((s) => ell(face, hairMat, s * 0.095, 0.012, 0.022, 0.006, 0.016, 0.01, 0, s * 0.3, 0));
      return null;
    }
    if (style === 'curly') {
      part(face, hairShell(true, 1.04, hairline(0.075, 0.0, -0.1)), hairMat);
      coils(face, hairMat, SEG < 1 ? 55 : 95, 11, -0.55, 0.026, true);
      // curls tumbling down to the jaw line
      const rng = KT.makeRng(5);
      [-1, 1].forEach((s) => {
        for (let i = 0; i < (SEG < 1 ? 6 : 10); i++) part(face, G.torus(0.026, 0.014, sg(8), sg(14)), hairMat, s * (0.1 + rng() * 0.03), -0.04 - rng() * 0.09, -0.04 + rng() * 0.06, rng() * 3, rng() * 3, 0);
      });
      return null;
    }
    part(face, hairShell(true, 1.08, hairline(0.075, 0.01, -0.095), 0.008), hairMat);
    // centre part and side sweeps
    [-1, 1].forEach((s) => {
      ell(face, hairMat, s * 0.088, -0.02, -0.03, 0.02, 0.07, 0.035, 0.15, 0, s * 0.06);
    });
    const tail = new T.Group();
    if (style === 'bun') {
      ell(face, hairMat, 0, 0.165, -0.01, 0.06, 0.055, 0.06);
      ell(face, hl, 0.02, 0.185, 0.02, 0.025, 0.012, 0.02, -0.5, 0, -0.4, 8);
      band(face, C(0xd4a434), 0.125, 0.04, 0.008, 0);
      return null;
    }
    tail.position.set(0, 0.06, -0.1);
    face.add(tail);
    if (style === 'loose') {
      ell(face, hairMat, 0, -0.04, -0.07, 0.11, 0.12, 0.07);
      ell(tail, hairMat, 0, -0.2, 0.0, 0.11, 0.15, 0.05, 0.12, 0, 0);
      [-1, 1].forEach((s) => ell(tail, hairMat, s * 0.08, -0.15, 0.03, 0.03, 0.13, 0.04, 0.1, 0, s * 0.1));
      tail.rotation.x = 0.1;
      return tail;
    }
    ell(tail, hairMat, 0, 0.0, 0.0, 0.04, 0.035, 0.035);
    band(tail, C(style === 'braid' ? 0x6a3a1a : 0xb3261e), -0.02, 0.028, 0.01, 0.3);
    if (style === 'braid') {
      for (let i = 0; i < 10; i++) ell(tail, hairMat, (i % 2 ? 0.01 : -0.01), -0.05 - i * 0.045, -0.01 - i * 0.004, 0.027 - i * 0.001, 0.03, 0.022, 0, 0, i % 2 ? 0.5 : -0.5, 12);
      band(tail, C(0xb3261e), -0.5, 0.016, 0.007, Math.PI / 2);
    } else {
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        ell(tail, hairMat, Math.sin(t * 4) * 0.012, -0.05 - t * 0.27, -0.025 - Math.sin(t * 2.5) * 0.03, 0.045 - t * 0.022, 0.06, 0.04 - t * 0.016, 0.1, 0, Math.sin(t * 4) * 0.2, 14);
      }
    }
    tail.rotation.x = 0.35;
    return tail;
  }

  function buildFace(face, cfg, skinHex) {
    const female = cfg.gender === 'female';
    const fz = (x, y) => faceZ(female, x, y);
    const rig = face.userData.rig;
    const dark = C(0x1a120c), white = C(0xffffff);
    const browMat = C(cfg.beard ? 0xd8d4cc : (cfg.hairColor || 0x2a1a12));
    // the cel-shaded (Ghibli) look: bigger, glossier eyes, a small soft
    // nose and a rosy blush
    const toon = KT.Toon && KT.Toon.enabled;
    const nose = tint(skinHex, 0xe06a5a, toon ? 0.1 : 0.18);
    // eyes: small glossy ovals (blink via joint scale)
    [-1, 1].forEach((s) => {
      const x = s * 0.04, y = 0.012;
      const eye = new T.Group();
      eye.position.set(x, y, fz(x, y) - 0.003);
      eye.rotation.y = s * 0.3;
      face.add(eye);
      rig['eye' + (s > 0 ? 'L' : 'R')] = eye;
      if (toon) {
        ell(eye, dark, 0, -0.001, 0, 0.0125, female ? 0.02 : 0.0175, 0.0075, 0, 0, 0, 14);
        ell(eye, white, s * 0.0038, 0.0068, 0.006, 0.0042, 0.0042, 0.002, 0, 0, 0, 8);
        ell(eye, white, -s * 0.003, -0.0065, 0.006, 0.0019, 0.0019, 0.001, 0, 0, 0, 6);
      } else {
        ell(eye, dark, 0, 0, 0, 0.0105, female ? 0.015 : 0.0135, 0.007, 0, 0, 0, 12);
        ell(eye, white, s * 0.003, 0.005, 0.005, 0.003, 0.003, 0.002, 0, 0, 0, 6);
      }
      if (female) part(eye, G.cone(0.003, 0.012, 5), dark, s * 0.011, 0.008, 0.002, 0, 0, -s * 0.9);
      // brows: thick soft strokes
      const bx = s * 0.045, by = female ? 0.046 : 0.044;
      const brow = new T.Group();
      brow.position.set(bx, by, fz(bx, by));
      brow.rotation.set(-0.2, s * 0.3, s * (female ? -0.12 : -0.05));
      face.add(brow);
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const w = (female ? 0.0045 : 0.0065) * (1 - Math.abs(t - 0.35) * 0.6);
        ell(brow, browMat, s * (-0.017 + t * 0.034), Math.sin(t * Math.PI) * 0.0045, 0, 0.008, w, 0.004, 0, 0, s * (0.3 - t * 0.6), 8);
      }
      // ears
      ell(face, C(skinHex), s * 0.098, -0.005, -0.012, 0.014, 0.03, 0.022, 0, s * 0.4, 0, 12);
      ell(face, tint(skinHex, 0xc0604a, 0.25), s * 0.104, -0.005, -0.006, 0.006, 0.018, 0.012, 0, s * 0.4, 0, 8);
      if (female) {
        part(face, G.sph(0.007, 8, 6), C(0xd4a434), s * 0.1, -0.04, -0.008);
        part(face, G.cone(0.01, 0.016, 10), C(0xd4a434), s * 0.1, -0.053, -0.008);
      }
      // cheeks
      const cx = s * 0.058, cy = -0.032;
      if (toon) ell(face, tint(skinHex, 0xff8a8a, female ? 0.34 : 0.22), cx, cy - 0.004, fz(cx, cy - 0.004) - 0.005, 0.024, 0.013, 0.008, 0, s * 0.5, 0, 10);
      else ell(face, tint(skinHex, 0xff7a7a, female ? 0.22 : 0.12), cx, cy, fz(cx, cy) - 0.006, 0.022, 0.014, 0.008, 0, s * 0.5, 0, 10);
    });
    // nose: soft bridge and a round bulb
    const nk = toon ? 0.62 : 1;
    ell(face, nose, 0, -0.03, fz(0, -0.03) + 0.004 * nk, (female ? 0.017 : 0.02) * nk, (female ? 0.016 : 0.019) * nk, 0.016 * nk, 0, 0, 0, 14);
    // mouth
    const my = -0.066;
    if (female) {
      ell(face, C(0xd8333b), 0, my + 0.004, fz(0, my + 0.004) - 0.002, 0.018, 0.0055, 0.005, 0, 0, 0, 10);
      ell(face, C(0xe0444a), 0, my - 0.005, fz(0, my - 0.005) - 0.002, 0.016, 0.006, 0.005, 0, 0, 0, 10);
    } else {
      part(face, G.torus(0.017, 0.0032, 6, 14, Math.PI), C(0x5a2a20), 0, my + 0.004, fz(0, my) - 0.002, -0.15, 0, Math.PI, 1, 0.6, 0.7);
    }
    if (cfg.beard) {
      const bm = C(0xe4e0d8);
      ell(face, bm, 0, -0.09, fz(0, -0.09) - 0.025, 0.07, 0.045, 0.04, 0.2, 0, 0, 16);
      [-1, 1].forEach((s) => ell(face, bm, s * 0.06, -0.06, fz(s * 0.06, -0.06) - 0.022, 0.03, 0.04, 0.03, 0, 0, s * 0.3, 12));
      ell(face, bm, 0, -0.05, fz(0, -0.05) + 0.003, 0.03, 0.009, 0.01, 0, 0, 0, 10);
      part(face, G.torus(0.014, 0.004, 6, 12, Math.PI), C(0x5a2a20), 0, my - 0.002, fz(0, my) + 0.002, -0.15, 0, Math.PI, 1, 0.6, 0.7);
    }
    if (cfg.mustache && !cfg.beard && !female) {
      // a thick Kerala moustache
      const mm = C(cfg.hairColor || 0x1d140e);
      [-1, 1].forEach((s) => ell(face, mm, s * 0.017, my + 0.016, fz(s * 0.017, my + 0.016) + 0.001, 0.02, 0.0065, 0.008, 0, 0, s * 0.28, 10));
    }
    if (cfg.glasses) {
      const fr = C(0x8a5a3a);
      [-1, 1].forEach((s) => part(face, G.torus(0.024, 0.0025, 6, 20), fr, s * 0.04, 0.012, fz(s * 0.04, 0.012) + 0.012));
      part(face, G.torus(0.012, 0.0025, 6, 12, Math.PI), fr, 0, 0.018, fz(0, 0.018) + 0.014);
    }
    if (female && cfg.bindi !== false) part(face, G.sph(0.0055, 8, 6), C(0xb3261e), 0, 0.062, fz(0, 0.062));
  }

  // Torso profiles [[radius, y]] from the waist (y=0) to the neck.
  const TORSO_M = [[0.001, -0.03], [0.138, -0.03], [0.142, 0.08], [0.155, 0.2], [0.168, 0.3], [0.172, 0.36], [0.158, 0.405], [0.115, 0.435], [0.055, 0.448], [0.001, 0.452]];
  const TORSO_F = [[0.001, -0.03], [0.125, -0.03], [0.118, 0.08], [0.135, 0.2], [0.15, 0.28], [0.148, 0.35], [0.138, 0.405], [0.1, 0.432], [0.05, 0.444], [0.001, 0.448]];
  function scaled(pts, k, hemY, hemK) {
    const out = pts.map((p) => [p[0] === 0.001 ? 0.001 : p[0] * k, p[1]]);
    if (hemY !== undefined) {
      out[0] = [0.001, hemY];
      out[1] = [pts[1][0] * k * (hemK || 1.1), hemY];
      // long garments: keep them clear of the hips on the way down
      if (hemY < -0.2) out.splice(2, 0, [Math.max(0.16, pts[1][0] * 1.2) * k, -0.12]);
    }
    return out;
  }

  function buildShoe(ankle, of, skin, side) {
    const type = of.shoeType || 'sneaker';
    const col = of.shoes;
    const m = C(col), dark = shade(col, 0.72);
    if (type === 'sandal') {
      ell(ankle, skin, 0, -0.07, 0.035, 0.038, 0.03, 0.09);
      [-1, 0, 1].forEach((k) => ell(ankle, skin, k * 0.02, -0.08, 0.115, 0.013, 0.012, 0.018, 0, 0, 0, 8));
      part(ankle, roundBox(0.1, 0.25, 0.022, 0.01), m, 0, -0.109, 0.035, -Math.PI / 2);
      part(ankle, G.torus(0.04, 0.007, 6, 14, Math.PI), m, 0, -0.085, 0.07, 0, Math.PI / 2, 0, 1, 0.6, 1);
      return;
    }
    if (type === 'boot') {
      part(ankle, lathe([[0.0005, -0.09], [0.06, -0.09], [0.064, -0.02], [0.062, 0.04], [0.066, 0.05], [0.0005, 0.05]]), m, 0, 0, 0);
      band(ankle, dark, 0.045, 0.063, 0.01);
      ell(ankle, m, 0, -0.075, 0.04, 0.06, 0.045, 0.12, 0, 0, 0, 20);
      ell(ankle, dark, 0, -0.07, 0.11, 0.05, 0.035, 0.05, 0, 0, 0, 14);
      part(ankle, roundBox(0.12, 0.27, 0.03, 0.012), C(0x2a1d14), 0, -0.105, 0.04, -Math.PI / 2);
      for (let i = 0; i < 4; i++) part(ankle, G.cyl(0.0035, 0.0035, 0.045, 5), C(0xd9c39a), 0, 0.02 - i * 0.022, 0.058 + i * 0.01, -0.7, 0, Math.PI / 2);
      return;
    }
    if (type === 'loafer') {
      ell(ankle, m, 0, -0.085, 0.04, 0.052, 0.035, 0.12, 0, 0, 0, 18);
      ell(ankle, dark, 0, -0.07, 0.07, 0.035, 0.012, 0.04, -0.2, 0, 0, 10);
      part(ankle, roundBox(0.105, 0.26, 0.022, 0.01), C(0x2a1a12), 0, -0.109, 0.04, -Math.PI / 2);
      return;
    }
    // sneaker: chunky upper, white cupsole, laces, side stripe
    const sole = C(0xf6f6f2);
    ell(ankle, m, 0, -0.06, 0.03, 0.06, 0.055, 0.12, 0, 0, 0, 20);
    ell(ankle, m, 0, -0.072, 0.1, 0.057, 0.042, 0.065, 0, 0, 0, 16);
    band(ankle, shade(col, 0.6), -0.01, 0.045, 0.012);
    ell(ankle, shade(col, 1.15), 0, -0.035, 0.07, 0.03, 0.012, 0.05, -0.5, 0, 0, 10);
    for (let i = 0; i < 4; i++) part(ankle, G.cyl(0.004, 0.004, 0.05, 5), sole, 0, -0.03 - i * 0.012, 0.045 + i * 0.022, -0.6, 0, Math.PI / 2);
    part(ankle, roundBox(0.128, 0.29, 0.042, 0.016), sole, 0, -0.1, 0.04, -Math.PI / 2);
    part(ankle, roundBox(0.13, 0.292, 0.008, 0.004), shade(0xf6f6f2, 0.82), 0, -0.083, 0.04, -Math.PI / 2);
    part(ankle, G.torus(0.035, 0.005, 6, 16, Math.PI), sole, side * 0.06, -0.065, 0.03, 0, side * Math.PI / 2, 0.4, 1, 0.8, 1);
  }

  // Hand: mitten-like palm, gently curled fingers and a thumb.
  function buildHand(el, skin, s, female) {
    const h = new T.Group();
    h.position.y = -0.25;
    el.add(h);
    const k = female ? 0.9 : 1;
    ell(h, skin, 0, -0.045 * k, 0.004, 0.027 * k, 0.05 * k, 0.017 * k);
    ell(h, skin, 0, -0.095 * k, 0.012, 0.025 * k, 0.036 * k, 0.015 * k, 0.25, 0, 0);
    ell(h, skin, -s * 0.024 * k, -0.04 * k, 0.016, 0.009 * k, 0.026 * k, 0.01 * k, 0.3, 0, -s * 0.55);
    return h;
  }

  // cfg: {gender, outfit, hair, acc:{backpack,camera,hat,sunglasses}, skin,
  //       hairColor, colors:{top,bottom,inner,shoes,border,dupatta}, beard,
  //       glasses, lite, scale}
  Models.character = function (cfg) {
    cfg = Object.assign({ gender: 'male', outfit: 'casual', hair: 'default', acc: { backpack: true } }, cfg || {});
    SEG = cfg.lite === 'far' ? 0.3 : cfg.lite ? 0.6 : 1;
    const female = cfg.gender === 'female';
    const of = Object.assign({}, Models.OUTFITS[cfg.gender][cfg.outfit] || Models.OUTFITS[cfg.gender].casual, cfg.colors || {});
    if (!of.inner) of.inner = of.top;
    const skinHex = cfg.skin || (female ? 0xe2ae8a : 0xd9a27c);
    const skin = C(skinHex);
    const hairMat = C(cfg.hairColor || (female ? 0x2a1a12 : 0x24170f));
    const topM = C(of.top), innerM = C(of.inner), botM = C(of.bottom);
    const topDark = shade(of.top, 0.85), botDark = shade(of.bottom, 0.86);
    const root = new T.Group();
    const rig = {};
    const torso = female ? TORSO_F : TORSO_M;
    const bt = of.bottomType, tt = of.topType;
    const skirt = bt === 'mundu' || bt === 'saree';
    const longTop = tt === 'coat' || tt === 'raincoat' || tt === 'kurta';
    const shoulderX = female ? 0.158 : 0.178;

    // ---------------------------------------------------------- hips
    const hips = rig.hips = new T.Group();
    hips.position.y = 0.93;
    root.add(hips);
    const pelvisM = bt === 'overalls' || bt === 'leggings' || skirt ? botM : botM;
    part(hips, lathe([[0.001, -0.15], [0.06, -0.15], [0.115, -0.11], [0.13, -0.05], [0.134, 0.02], [0.134, 0.09], [0.001, 0.09]]), pelvisM, 0, 0, 0, 0, 0, 0, 1, 1, 0.76);
    if ((bt === 'pants' || bt === 'jeans' || bt === 'shorts') && !longTop) {
      band(hips, shade(of.bottom, 0.8), 0.07, 0.134, 0.012, Math.PI / 2, 0.78);
      if (tt !== 'open') [-1, 1].forEach((s) => part(hips, roundBox(0.07, 0.08, 0.014, 0.006), botDark, s * 0.065, -0.02, -0.106));
      if (bt === 'jeans') [-1, 1].forEach((s) => part(hips, G.torus(0.04, 0.003, 4, 12, Math.PI / 2), C(0xe0a040), s * 0.07, 0.02, 0.1, 0, 0, s > 0 ? Math.PI : -Math.PI / 2));
    }

    // ---------------------------------------------------------- legs
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const hip = rig['hip' + side] = new T.Group();
      hip.position.set(s * 0.078, -0.02, 0);
      hips.add(hip);
      // bare legs only where they can be seen
      const covered = bt === 'pants' || bt === 'jeans' || bt === 'overalls' || bt === 'leggings';
      if (!covered && !skirt) limb(hip, 0.43, 0.068, 0.055, skin);
      const knee = rig['knee' + side] = new T.Group();
      knee.position.y = -0.42;
      hip.add(knee);
      if (!covered && !skirt) limb(knee, 0.37, 0.053, 0.04, skin);
      // under a mundu or saree only the ankles ever show
      if (skirt) { const g = new T.Group(); g.position.y = -0.2; knee.add(g); limb(g, 0.17, 0.046, 0.04, skin); }
      if (bt === 'shorts') {
        tube(hip, botM, 0.02, -0.36, 0.088, 0.082);
        band(hip, shade(of.bottom, 0.8), -0.345, 0.081, 0.013);
      } else if (bt === 'pants' || bt === 'jeans' || bt === 'overalls' || bt === 'leggings') {
        const r0 = bt === 'leggings' ? 0.072 : 0.086, rk = bt === 'leggings' ? 0.058 : 0.072, ra = bt === 'leggings' ? 0.045 : 0.066;
        tube(hip, botM, 0.02, -0.43, r0, rk);
        ell(knee, botM, 0, 0, 0, rk, rk * 0.9, rk);
        tube(knee, botM, 0.0, -0.31, rk * 0.98, ra);
        if (bt !== 'leggings') band(knee, bt === 'jeans' || bt === 'overalls' ? shade(of.bottom, 1.12) : botDark, -0.3, ra + 0.002, 0.016);
        if (side === 'L' && bt === 'jeans') part(hip, G.box(0.004, 0.4, 0.004), shade(of.bottom, 0.75), s * 0.084, -0.22, 0);
        if (cfg.outfit === 'casual') {
          part(hip, roundBox(0.1, 0.11, 0.026, 0.01), botM, s * 0.085, -0.24, 0, 0, Math.PI / 2, 0);
          part(hip, roundBox(0.104, 0.03, 0.03, 0.01), botDark, s * 0.087, -0.19, 0, 0, Math.PI / 2, 0);
        }
      }
      const ankle = rig['ankle' + side] = new T.Group();
      ankle.position.y = -0.37;
      knee.add(ankle);
      buildShoe(ankle, of, skin, s);
    });

    // ------------------------------------------ garments from the waist
    if (skirt) {
      const n0 = hips.children.length;
      const len = bt === 'saree' ? 0.91 : 0.86;
      const flare = bt === 'saree' ? 0.2 : 0.17;
      const pts = [[0.001, -len + 0.03], [flare - 0.005, -len + 0.03], [flare, -len + 0.06], [flare * 0.94, -len * 0.55], [0.15, -0.2], [0.14, 0.0], [0.132, 0.09], [0.001, 0.09]];
      part(hips, lathe(pts), botM, 0, 0, 0.005, 0, 0, 0, 1, 1, 0.82);
      part(hips, G.cyl(flare + 0.004, flare + 0.003, 0.06, sg(26)), C(of.border), 0, -len + 0.09, 0.005, 0, 0, 0, 1, 1, 0.82);
      part(hips, G.cyl(flare - 0.002, flare, 0.012, sg(26)), C(of.border), 0, -len + 0.145, 0.005, 0, 0, 0, 1, 1, 0.82);
      if (bt === 'mundu') {
        part(hips, roundBox(0.032, len - 0.14, 0.01, 0.004), C(of.border), 0.05, -len / 2 + 0.03, 0.142, -0.05, 0, 0.06);
        band(hips, botM, 0.075, 0.137, 0.014, Math.PI / 2, 0.82);
      } else {
        for (let i = 0; i < 5; i++) part(hips, roundBox(0.024, len - 0.17, 0.016, 0.006), shade(of.bottom, 0.93), -0.045 + i * 0.022, -len / 2 - 0.01, 0.155 + (i % 2) * 0.005, -0.12);
        part(hips, roundBox(0.12, 0.05, 0.018, 0.006), C(of.border), 0, -len + 0.13, 0.205, -0.12);
      }
      // the cloth follows the legs (see KT.skinify)
      const sk = { hipL: rig.hipL, hipR: rig.hipR, kneeL: rig.kneeL, kneeR: rig.kneeR };
      hips.children.slice(n0).forEach((m) => { if (m.isMesh) m.userData.skirt = sk; });
      rig.skirt = true;
    }

    // ---------------------------------------------------------- torso
    const spine = rig.spine = new T.Group();
    spine.position.y = 0.08;
    hips.add(spine);
    const neckTop = female ? 0.448 : 0.452;
    if (tt === 'open' || tt === 'coat') {
      // tee underneath, open jacket / cardigan / coat over it
      part(spine, lathe(torso), innerM, 0, 0, 0, 0, 0, 0, 1, 1, 0.74);
      band(spine, innerM, 0.432, 0.06, 0.012, Math.PI / 2 + 0.1, 0.85);
      const hemY = tt === 'coat' ? -0.5 : -0.12;
      const jacket = scaled(torso, 1.07, hemY, tt === 'coat' ? 1.35 : 1.12);
      part(spine, lathe(jacket, sg(26), 0.42, Math.PI * 2 - 0.84), topM, 0, 0, 0, 0, 0, 0, 1, 1, tt === 'coat' ? 0.86 : 0.78);
      // edges, lapels and collar
      [-1, 1].forEach((s) => {
        // folded lapel lying flat on the chest
        part(spine, roundBox(0.045, 0.15, 0.012, 0.005), topDark, s * 0.072, 0.355, 0.112, -0.32, s * 0.25, -s * 0.38);
        if (of.zip) part(spine, roundBox(0.01, 0.38 - hemY, 0.01, 0.004), C(0x333333), s * 0.068, (0.36 + hemY) / 2, 0.128 - (hemY < -0.1 ? 0 : 0), 0.02, 0, 0);
      });
      part(spine, G.torus(0.075, 0.022, sg(10), sg(22), Math.PI * 1.25), topM, 0, 0.425, -0.01, Math.PI / 2 + 0.25, 0, Math.PI * 1.38);
      if (tt === 'coat') [-1, 1].forEach((s) => part(spine, roundBox(0.08, 0.07, 0.014, 0.006), topDark, s * 0.11, -0.18, 0.13, -0.15, s * 0.5, 0));
      if (tt === 'open' && cfg.outfit === 'casual') [-1, 1].forEach((s) => part(spine, roundBox(0.06, 0.065, 0.012, 0.005), topDark, s * 0.085, 0.28, 0.122, -0.18, s * 0.35, 0));
    } else {
      const k = tt === 'sweater' ? 1.08 : tt === 'raincoat' ? 1.09 : tt === 'kurta' ? 1.04 : 1.03;
      const hemY = tt === 'raincoat' ? -0.42 : tt === 'kurta' ? -0.5 : tt === 'sweater' ? -0.1 : tt === 'blouse' ? 0.16 : -0.06;
      const prof = scaled(torso, k, hemY, tt === 'raincoat' || tt === 'kurta' ? 1.4 : 1.08);
      if (tt === 'blouse') { // bare midriff below a short blouse
        part(spine, lathe(torso), skin, 0, 0, 0, 0, 0, 0, 1, 1, 0.72);
        part(spine, lathe(prof.filter((p, i) => i === 0 || p[1] >= 0.16)), topM, 0, 0, 0, 0, 0, 0, 1, 1, 0.74);
      } else part(spine, lathe(prof), topM, 0, 0, 0, 0, 0, 0, 1, 1, longTop ? 0.86 : 0.74);
      if (tt === 'sweater') {
        band(spine, topDark, hemY + 0.015, prof[1][0] * 0.98, 0.02, Math.PI / 2, 0.74);
        band(spine, topDark, 0.432, 0.062, 0.016, Math.PI / 2 + 0.1, 0.85);
      } else if (tt === 'tee') {
        band(spine, topDark, 0.432, 0.06, 0.011, Math.PI / 2 + 0.1, 0.85);
      } else if (tt === 'shirt' || tt === 'raincoat') {
        [-1, 1].forEach((s) => ell(spine, topM, s * 0.04, 0.43, 0.075, 0.042, 0.03, 0.012, -0.9, s * 0.2, -s * 0.5, 12));
        part(spine, roundBox(0.012, 0.42 - hemY, 0.012, 0.005), tt === 'raincoat' ? C(0xc79a1f) : topDark, 0.006, (0.42 + hemY) / 2, 0.123);
        for (let i = 0; i < 4; i++) part(spine, G.sph(0.006, 8, 6), tt === 'raincoat' ? C(0x333333) : C(0xf4f4f4), 0, 0.38 - i * 0.1, 0.13);
        if (tt === 'shirt') {
          // chest pocket with a pen
          part(spine, roundBox(0.06, 0.065, 0.008, 0.003), topDark, 0.06, 0.3, 0.124, -0.12, 0.25, 0);
          part(spine, G.cyl(0.004, 0.004, 0.06, 6), C(0x1f4fa0), 0.045, 0.335, 0.128, -0.12, 0, 0);
        }
      } else if (tt === 'kurta') {
        band(spine, C(0xd4a434), hemY + 0.02, prof[1][0] * 0.98, 0.012, Math.PI / 2, 0.74);
        part(spine, roundBox(0.02, 0.16, 0.01, 0.004), C(0xd4a434), 0, 0.36, 0.118);
      } else if (tt === 'blouse') {
        band(spine, C(of.border || 0xd4a434), 0.17, prof[1][0] * 0.98, 0.008, Math.PI / 2, 0.74);
      }
    }
    if (bt === 'overalls') {
      part(spine, roundBox(0.19, 0.23, 0.03, 0.012), botM, 0, 0.18, 0.1, -0.08);
      part(spine, roundBox(0.09, 0.07, 0.008, 0.004), botDark, 0, 0.19, 0.118, -0.08);
      [-1, 1].forEach((s) => {
        part(spine, roundBox(0.04, 0.32, 0.012, 0.005), botM, s * 0.075, 0.33, 0.0, -0.1, 0, -s * 0.12);
        part(spine, G.cyl(0.011, 0.011, 0.008, sg(12)), C(0xc0c0c0), s * 0.07, 0.28, 0.12, Math.PI / 2 - 0.08);
      });
      part(spine, lathe(scaled(torso, 1.03).filter((p, i) => i === 0 || p[1] <= 0.08).concat([[0.001, 0.08]])), botM, 0, 0, 0, 0, 0, 0, 1, 1, 0.74);
    }
    if (bt === 'saree') {
      // the pallu: draped from the right hip over the left shoulder
      const pallu = C(of.bottom), gold = C(of.border);
      const path = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const y = KT.lerp(-0.02, 0.43, t), x = KT.lerp(-0.12, 0.115, t);
        path.push(new T.Vector3(x, y, 0.1 + Math.sin(t * Math.PI) * 0.03 - (t > 0.85 ? (t - 0.85) * 0.5 : 0)));
      }
      part(spine, ribbon(path, 0.1, 0.006), pallu, 0, 0, 0);
      part(spine, ribbon(path.map((p) => p.clone().add(new T.Vector3(0.042, -0.03, 0.007))), 0.018, 0.004), gold, 0, 0, 0);
      part(spine, roundBox(0.1, 0.55, 0.018, 0.008), pallu, 0.1, 0.13, -0.115, 0.05, 0, 0.1);
      part(spine, roundBox(0.104, 0.05, 0.02, 0.008), gold, 0.125, -0.13, -0.118, 0.05, 0, 0.1);
    }
    if (of.dupatta) {
      const d = C(of.dupatta);
      part(spine, G.torus(0.085, 0.022, sg(10), sg(24)), d, 0, 0.41, 0.01, Math.PI / 2 + 0.3, 0, 0, 1.05, 0.8, 1);
      [-1, 1].forEach((s) => part(spine, roundBox(0.06, 0.42, 0.012, 0.005), d, s * 0.13, 0.16, -0.095, 0.08, 0, s * 0.06));
    }
    // neck
    part(spine, lathe([[0.0005, 0.38], [0.04, 0.38], [0.036, 0.46], [0.038, 0.53], [0.0005, 0.53]]), skin, 0, 0, 0);

    // ---------------------------------------------------------- head
    const head = rig.head = new T.Group();
    head.position.set(0, 0.5, 0.0);
    spine.add(head);
    const face = new T.Group();
    face.position.set(0, HEAD.ry * 0.92, 0.005);
    head.add(face);
    face.userData.rig = rig;
    part(face, headShape(female), skin);
    buildFace(face, cfg, skinHex);
    if (of.hood) {
      part(face, hairShell(female, 1.03, hairline(0.07, 0.03, -0.06)), hairMat);
      part(face, new T.SphereGeometry(1, sg(26), sg(16), 0, Math.PI * 2, 0, Math.PI * 0.62), topM, 0, 0.0, -0.015, -0.55, 0, 0, HEAD.rx * 1.3, HEAD.ry * 1.22, HEAD.rz * 1.28);
      part(face, G.torus(1, 0.12, sg(8), sg(24)), topM, 0, -0.02, 0.035, -0.55 + Math.PI / 2, 0, 0, HEAD.rx * 1.18, HEAD.ry * 1.15, 0.2);
      rig.tail = null;
    } else rig.tail = buildHair(face, cfg, hairMat);
    const acc = cfg.acc || {};
    if (female && cfg.jasmine && !of.hood) {
      // a string of jasmine flowers round the back of the hair
      const jw = C(0xfbfaf2), jg = C(0x6a8a3a);
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * (0.2 + i * 0.6 / 12) + Math.PI;
        const x = Math.cos(a) * 0.085, z = Math.sin(a) * 0.075 - 0.01;
        part(face, G.sph(0.009, 6, 5), i % 4 === 0 ? jg : jw, x, -0.005 + Math.sin(i) * 0.004, z);
      }
    }
    if (acc.hat && !of.hood) {
      const hc = C(0xd8b98e), hb = C(0x5a3a22);
      part(face, lathe([[0.001, 0.0], [0.2, 0.0], [0.205, 0.012], [0.12, 0.009], [0.115, 0.02], [0.001, 0.02]], sg(30)), hc, 0, 0.095, -0.005, -0.08);
      part(face, lathe([[0.108, 0.0], [0.108, 0.06], [0.095, 0.095], [0.04, 0.11], [0.001, 0.1]], sg(26)), hc, 0, 0.105, -0.008, -0.08);
      part(face, G.cyl(0.11, 0.11, 0.024, sg(26)), hb, 0, 0.12, -0.008, -0.08);
    }
    if (acc.sunglasses) {
      const gl = C(0x0d0d0d);
      [-1, 1].forEach((s) => {
        ell(face, gl, s * 0.041, 0.01, faceZ(female, s * 0.041, 0.01) + 0.012, 0.028, 0.02, 0.006, 0, s * 0.2, 0, 14);
        part(face, G.box(0.006, 0.006, 0.09), gl, s * 0.09, 0.02, 0.04, 0, s * 0.15, 0);
      });
      part(face, G.box(0.024, 0.005, 0.006), gl, 0, 0.022, faceZ(female, 0, 0.022) + 0.014);
    }

    // ---------------------------------------------------------- arms
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const sh = rig['sh' + side] = new T.Group();
      sh.position.set(s * shoulderX, 0.385, 0);
      spine.add(sh);
      const ra = female ? 0.042 : 0.048;
      limb(sh, 0.27, ra, ra * 0.86, skin);
      const sleeveM = tt === 'open' || tt === 'coat' || tt === 'raincoat' || tt === 'sweater' || tt === 'shirt' || tt === 'tee' || tt === 'kurta' || tt === 'blouse' ? topM : topM;
      ell(sh, sleeveM, 0, -0.012, 0, ra * 1.42, ra * 1.25, ra * 1.4);
      const longS = of.sleeve === 'long', rolled = of.sleeve === 'rolled';
      const sr = ra * (tt === 'sweater' || tt === 'coat' || tt === 'raincoat' ? 1.6 : 1.45);
      if (of.sleeve === 'short') {
        tube(sh, sleeveM, 0.0, tt === 'blouse' ? -0.08 : -0.14, sr, sr * 0.97);
        if (tt !== 'blouse') band(sh, shade(of.top, 0.88), tt === 'blouse' ? -0.075 : -0.135, sr * 0.97, 0.012);
        else band(sh, C(of.border || 0xd4a434), -0.075, sr * 0.97, 0.007);
      } else tube(sh, sleeveM, 0.0, -0.27, sr, sr * 0.93);
      const el = rig['el' + side] = new T.Group();
      el.position.y = -0.27;
      sh.add(el);
      limb(el, 0.25, ra * 0.86, ra * 0.68, skin);
      if (longS || rolled) {
        ell(el, sleeveM, 0, 0, 0, sr * 0.93, sr * 0.8, sr * 0.93);
        const end = rolled ? -0.11 : -0.21;
        tube(el, sleeveM, 0.0, end, sr * 0.92, sr * (rolled ? 0.86 : 0.78));
        band(el, rolled ? shade(of.top, 0.9) : (tt === 'sweater' ? shade(of.top, 0.85) : sleeveM), end + 0.005, sr * (rolled ? 0.9 : 0.74), rolled ? 0.02 : 0.014);
      }
      if (side === 'L' && !female && (cfg.outfit === 'casual' || cfg.outfit === 'hiking')) {
        band(el, C(0x1e1e1e), -0.215, ra * 0.72, 0.008);
        ell(el, C(0x4a4a4a), 0, -0.215, ra * 0.72 + 0.004, 0.014, 0.014, 0.005);
      }
      if (female) band(el, C(0xd4a434), -0.225, ra * 0.7, 0.004);
      buildHand(el, skin, s, female);
      sh.rotation.z = s * 0.08;
    });

    // ------------------------------------------------- things they carry
    if (cfg.carry === 'shopping' && rig.elR) {
      // a cloth shopping bag in the right hand
      const bagM = C([0x2a9d8f, 0xd8203a, 0xf2c230, 0x6b3fa0][(cfg.seed || 0) % 4]);
      part(rig.elR, roundBox(0.17, 0.2, 0.08, 0.02), bagM, 0, -0.43, 0);
      part(rig.elR, G.torus(0.04, 0.006, 4, 10, Math.PI), bagM, 0, -0.33, 0, 0, Math.PI / 2, 0);
      part(rig.elR, G.sph(0.03, 6, 5), C(0x3f7f2c), 0.03, -0.31, 0.01);
    } else if (cfg.carry === 'handbag' && rig.shL) {
      const hb = C([0x7a3b24, 0x1d1d1f, 0xb3261e][(cfg.seed || 0) % 3]);
      part(rig.shL, roundBox(0.15, 0.11, 0.05, 0.015), hb, 0.04, -0.3, 0.02);
      part(rig.shL, G.box(0.01, 0.3, 0.01), hb, 0.0, -0.13, 0.03, 0, 0, -0.1);
    } else if (cfg.carry === 'phone' && rig.elL) {
      part(rig.elL, roundBox(0.04, 0.078, 0.008, 0.003), C(0x111111), 0, -0.3, 0.035, -0.4, 0, 0);
    }

    // ---------------------------------------------------- accessories
    if (acc.backpack) {
      const bp = C(0x6b4a33), bpDark = C(0x4a3424), buckle = C(0xb08a50);
      part(spine, roundBox(0.28, 0.36, 0.14, 0.05), bp, 0, 0.22, -0.18);
      part(spine, roundBox(0.2, 0.13, 0.06, 0.025), bpDark, 0, 0.13, -0.26);
      [-1, 1].forEach((s) => part(spine, roundBox(0.05, 0.16, 0.07, 0.02), bpDark, s * 0.155, 0.17, -0.18));
      part(spine, G.cyl(0.05, 0.05, 0.3, sg(18)), C(0x8a7458), 0, 0.42, -0.17, 0, 0, Math.PI / 2);
      [-1, 1].forEach((s) => {
        part(spine, roundBox(0.028, 0.26, 0.012, 0.005), bpDark, s * 0.085, 0.28, 0.122, -0.12, 0, 0);
        part(spine, roundBox(0.03, 0.17, 0.016, 0.006), bpDark, s * 0.09, 0.4, -0.02, -1.25);
        part(spine, roundBox(0.026, 0.02, 0.016, 0.004), buckle, s * 0.085, 0.2, 0.13, -0.12);
      });
    }
    if (acc.camera) {
      part(spine, roundBox(0.1, 0.065, 0.05, 0.01), C(0x1b1b1b), 0, 0.2, 0.15);
      part(spine, G.cyl(0.026, 0.026, 0.04, sg(16)), C(0x2b2b2b), 0.008, 0.2, 0.18, Math.PI / 2);
      part(spine, G.cyl(0.019, 0.019, 0.042, sg(16)), C(0x4a6a8a), 0.008, 0.2, 0.182, Math.PI / 2);
      part(spine, G.torus(0.1, 0.005, 4, 16, Math.PI), C(0x1b1b1b), 0, 0.29, 0.1, -0.3, 0, Math.PI);
    }
    root.scale.setScalar(cfg.scale || 1);
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
    drive: function (p, a) {
      return { hipL: [-1.45, 0, 0.1], hipR: [-1.45, 0, -0.1], kneeL: [1.3, 0, 0], kneeR: [1.3, 0, 0], ankleL: [0.2, 0, 0], ankleR: [0.2, 0, 0],
        shL: [-1.15, 0, -0.2], shR: [-1.15, 0, 0.2], elL: [-0.5, 0, 0], elR: [-0.5, 0, 0], spine: [0.05, 0, 0], head: [0, Math.sin(a.t * 0.3) * 0.15, 0], bob: -0.42 };
    },
    // astride a scooter: feet on the floorboard, hands on the handlebar
    ride: function (p, a) {
      return { hipL: [-1.2, 0, 0.18], hipR: [-1.2, 0, -0.18], kneeL: [1.45, 0, 0], kneeR: [1.45, 0, 0], ankleL: [0.1, 0, 0], ankleR: [0.1, 0, 0],
        shL: [-1.0, 0, -0.12], shR: [-1.0, 0, 0.12], elL: [-0.45, 0, 0], elR: [-0.45, 0, 0], spine: [0.12, 0, 0], head: [-0.08, Math.sin(a.t * 0.3) * 0.12, 0], bob: -0.18 };
    },
    // pedalling a bicycle: legs turn the crank with the wheel speed
    cycle: function (p, a) {
      const s = Math.sin(p), c = Math.cos(p);
      const hL = -0.95 - s * 0.38, hR = -0.95 + s * 0.38;
      const kL = 1.05 + c * 0.5, kR = 1.05 - c * 0.5;
      return { hipL: [hL, 0, 0.06], hipR: [hR, 0, -0.06], kneeL: [kL, 0, 0], kneeR: [kR, 0, 0], ankleL: [flat(hL, kL) * 0.5, 0, 0], ankleR: [flat(hR, kR) * 0.5, 0, 0],
        shL: [-1.05, 0, -0.1], shR: [-1.05, 0, 0.1], elL: [-0.35, 0, 0], elR: [-0.35, 0, 0], spine: [0.32, -s * 0.05, 0], head: [-0.25, 0, 0], hips: [0, s * 0.06, 0], bob: -0.1 };
    },
    // throwing a fishing net: wind up, then swing both arms forward
    cast: function (p, a) {
      const t = Math.min(1, (a.t % 10) * 1.6);
      const w = t < 0.45 ? t / 0.45 : 1 - (t - 0.45) / 0.55 * 1.6;
      return { shL: [-0.6 + w * 2.0, 0, 0.25], shR: [-0.6 + w * 2.0, 0, -0.25], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0],
        spine: [0.1 - w * 0.25, w * 0.4, 0], hipL: [-0.2, 0, 0], hipR: [0.15, 0, 0], kneeL: [0.3, 0, 0], kneeR: [0.1, 0, 0], head: [0.1, 0, 0], bob: -0.04 };
    },
    // hauling the net in, hand over hand
    haul: function (p, a) {
      const s = Math.sin(a.t * 7);
      return { shL: [-1.2 + s * 0.45, 0, 0.15], shR: [-1.2 - s * 0.45, 0, -0.15], elL: [-0.9, 0, 0], elR: [-0.9, 0, 0],
        spine: [0.3, 0, 0], hipL: [-0.45, 0, 0.1], hipR: [-0.45, 0, -0.1], kneeL: [0.7, 0, 0], kneeR: [0.7, 0, 0], ankleL: [flat(-0.45, 0.7), 0, 0], ankleR: [flat(-0.45, 0.7), 0, 0], head: [0.2, 0, 0], bob: -0.12 };
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
    const rate = state === 'run' ? 10.5 : state === 'walk' ? 7.2 : state === 'paddle' ? 3 : state === 'cycle' ? 2.6 : 0;
    a.phase += dt * rate * (speedFactor || 1);
    const pose = (POSES[state] || POSES.idle)(a.phase, a);
    const k = 1 - Math.exp(-dt * (state === 'jump' || state === 'land' ? 16 : 12));
    // shorter steps in a mundu or saree
    if (rig.skirt && (state === 'walk' || state === 'run')) ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'].forEach((j) => { if (pose[j]) pose[j] = [pose[j][0] * 0.75, pose[j][1], pose[j][2]]; });
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
