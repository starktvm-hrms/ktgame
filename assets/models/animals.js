// Animals of Kerala: elephant (regular & festival caparisoned), cow,
// buffalo, deer (chital), monkey, peacock, egret, kingfisher, cormorant and
// flying birds. Each model exposes animated pivots in userData and an
// `animate(t, moving)` function.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;
  const HPI = Math.PI / 2;

  // Bake static meshes of a group but keep pivots (groups flagged anim).
  function bakeStatic(root) {
    const statics = new T.Group();
    const toMove = [];
    root.children.forEach((c) => { if (c.isMesh) toMove.push(c); });
    toMove.forEach((c) => { root.remove(c); statics.add(c); });
    const baked = KT.bake(statics);
    root.add(baked);
    return root;
  }

  function leg(parent, x, y, z, len, r0, r1, mat, footMat) {
    const p = new T.Group();
    p.position.set(x, y, z);
    parent.add(p);
    part(p, G.cyl(r0, r1, len, 8), mat, 0, -len / 2, 0);
    if (footMat) part(p, G.cyl(r1 * 1.08, r1 * 1.1, 0.12, 8), footMat, 0, -len + 0.06, 0);
    return p;
  }

  Models.elephant = function (festival, seed) {
    const g = new T.Group();
    const rng = KT.makeRng(seed || 1);
    const skin = KT.mat('elephantSkin', { color: 0x5e5a58, roughness: 0.95 });
    const skinDark = KT.mat('elephantSkinDark', { color: 0x4b4745, roughness: 0.95 });
    const ivory = KT.mat('ivory', { color: 0xf1ead8, roughness: 0.4 });
    const body = new T.Group();
    g.add(body);
    part(body, G.sph(1, 20, 14), skin, 0, 2.05, 0, 0, 0, 0, 1.2, 1.05, 1.85);
    part(body, G.sph(0.9, 16, 12), skin, 0, 2.2, 1.05, 0, 0, 0, 1.15, 1.05, 0.9);
    // head
    const head = new T.Group();
    head.position.set(0, 2.55, 1.85);
    g.add(head);
    part(head, G.sph(0.82, 18, 14), skin, 0, 0, 0.1, 0, 0, 0, 0.95, 1.05, 0.9);
    part(head, G.sph(0.42, 12, 10), skin, -0.3, 0.6, 0.05);
    part(head, G.sph(0.42, 12, 10), skin, 0.3, 0.6, 0.05);
    part(head, G.sph(0.07, 8, 6), M().eyeDark, -0.55, 0.15, 0.55);
    part(head, G.sph(0.07, 8, 6), M().eyeDark, 0.55, 0.15, 0.55);
    // tusks
    [-1, 1].forEach((s) => {
      const tk = part(head, G.cone(0.09, 1.0, 8), ivory, s * 0.32, -0.55, 0.85, 1.9, 0, s * 0.15);
      tk.scale.set(1, 1, 1);
    });
    // ears (pivots)
    const ears = [];
    [-1, 1].forEach((s) => {
      const ep = new T.Group();
      ep.position.set(s * 0.68, 0.15, -0.15);
      head.add(ep);
      part(ep, G.sph(0.7, 12, 10), skinDark, s * 0.08, -0.1, -0.2, 0, 0, 0, 0.12, 1.0, 0.8);
      ears.push(ep);
    });
    // trunk chain
    const trunk = [];
    let parent = head;
    let len = 0.55, r = 0.26;
    const t0 = new T.Group();
    t0.position.set(0, -0.35, 0.75);
    head.add(t0);
    parent = t0;
    for (let i = 0; i < 5; i++) {
      const seg = new T.Group();
      if (i > 0) seg.position.y = -len;
      parent.add(seg);
      part(seg, G.cyl(r * 0.85, r, len, 10), skin, 0, -len / 2, 0);
      for (let k = 0; k < 2; k++) part(seg, G.torus(r * 0.9, 0.015, 4, 12), skinDark, 0, -len * (0.3 + k * 0.4), 0, Math.PI / 2);
      seg.rotation.x = 0.12;
      trunk.push(seg);
      parent = seg;
      r *= 0.8;
      len *= 0.92;
    }
    // legs
    const legs = [];
    [[-0.62, 1.35], [0.62, 1.35], [-0.62, -1.2], [0.62, -1.2]].forEach((p) => {
      legs.push(leg(g, p[0], 1.75, p[1], 1.75, 0.36, 0.33, skin, skinDark));
    });
    // tail
    const tail = new T.Group();
    tail.position.set(0, 2.5, -1.8);
    g.add(tail);
    part(tail, G.cyl(0.04, 0.07, 1.2, 6), skin, 0, -0.6, 0);
    part(tail, G.cone(0.08, 0.25, 6), M().black, 0, -1.25, 0, Math.PI);
    tail.rotation.x = 0.25;

    if (festival) {
      // nettipattam: golden caparison on the forehead and trunk
      const np = new T.Group();
      np.position.set(0, 0.35, 0.78);
      np.rotation.x = 0.25;
      head.add(np);
      const s = new T.Shape();
      s.moveTo(0, 0.55);
      s.quadraticCurveTo(0.58, 0.55, 0.58, 0.05);
      s.lineTo(0.22, -1.25);
      s.lineTo(0, -1.45);
      s.lineTo(-0.22, -1.25);
      s.lineTo(-0.58, 0.05);
      s.quadraticCurveTo(-0.58, 0.55, 0, 0.55);
      part(np, new T.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }), M().gold, 0, 0, 0);
      for (let row = 0; row < 7; row++) {
        const n = Math.max(1, 6 - row);
        for (let k = 0; k < n; k++) {
          const x = (k - (n - 1) / 2) * 0.17;
          part(np, G.sph(0.05, 6, 5), row % 2 ? M().red : M().gold, x, 0.35 - row * 0.2, 0.07);
        }
      }
      // red and gold back caparison
      part(body, G.box(2.0, 0.08, 2.4), M().red, 0, 3.12, 0.2);
      part(body, G.box(0.08, 1.3, 2.4), M().red, 1.02, 2.5, 0.2);
      part(body, G.box(0.08, 1.3, 2.4), M().red, -1.02, 2.5, 0.2);
      part(body, G.box(0.1, 0.12, 2.42), M().gold, 1.05, 1.85, 0.2);
      part(body, G.box(0.1, 0.12, 2.42), M().gold, -1.05, 1.85, 0.2);
      for (let i = 0; i < 9; i++) {
        part(body, G.sph(0.06, 6, 5), M().gold, 1.08, 1.75, -0.8 + i * 0.25);
        part(body, G.sph(0.06, 6, 5), M().gold, -1.08, 1.75, -0.8 + i * 0.25);
      }
      // neck bells
      for (let i = 0; i < 7; i++) {
        const a = -1.2 + i * 0.4;
        part(body, G.sph(0.08, 6, 5), M().brass, Math.sin(a) * 0.95, 1.6, 1.55 + Math.cos(a) * 0.15);
      }
      // rider and muthukuda (ornate parasol)
      part(body, G.cyl(0.14, 0.18, 0.6, 8), M().white, 0, 3.55, 0.4);
      part(body, G.sph(0.13, 8, 6), M().skinMid, 0, 4.0, 0.4);
      part(body, G.cyl(0.03, 0.03, 1.6, 5), M().woodDark, 0.2, 4.3, 0.4);
      const colors = [M().red, M().purple, M().teal, M().orange, M().pink];
      const pc = colors[Math.floor(rng() * colors.length)];
      part(body, G.sph(0.75, 16, 8, 0), pc, 0.2, 5.0, 0.4, 0, 0, 0, 1, 0.45, 1);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        part(body, G.cone(0.06, 0.35, 5), M().gold, 0.2 + Math.cos(a) * 0.75, 4.85, 0.4 + Math.sin(a) * 0.75, Math.PI);
      }
      part(body, G.sph(0.12, 8, 6), M().gold, 0.2, 5.4, 0.4);
    }
    bakeStatic(body);
    bakeStatic(head);
    g.userData = { legs, ears, trunk, tail, head, kind: 'elephant' };
    g.userData.animate = function (t, moving) {
      const sw = moving ? Math.sin(t * 3.2) * 0.32 : 0;
      legs[0].rotation.x = sw; legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw; legs[2].rotation.x = -sw;
      ears.forEach((e, i) => { e.rotation.y = (i ? -1 : 1) * (0.15 + Math.sin(t * 1.7 + i) * 0.18); });
      trunk.forEach((s, i) => {
        s.rotation.x = 0.12 + Math.sin(t * 1.1 + i * 0.6) * 0.07 + (i === 4 ? 0.2 : 0);
        s.rotation.z = Math.sin(t * 0.8 + i * 0.4) * 0.06;
      });
      tail.rotation.z = Math.sin(t * 2.3) * 0.3;
      head.rotation.x = Math.sin(t * 0.7) * 0.03;
    };
    g.userData.radius = 2.2;
    return g;
  };

  function quadruped(opts) {
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    const by = opts.legLen + opts.bodyR * 0.6;
    part(body, G.capsule(opts.bodyR, opts.bodyLen, 6, 12), opts.mat, 0, by, 0, Math.PI / 2, 0, 0, 1, 1, opts.bodyFlat || 1);
    const head = new T.Group();
    head.position.set(0, by + opts.neckRise, opts.bodyLen / 2 + opts.bodyR * 0.6);
    g.add(head);
    const legs = [];
    const lx = opts.bodyR * 0.55, lz = opts.bodyLen / 2;
    [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]].forEach((p) => legs.push(leg(g, p[0], by - opts.bodyR * 0.3, p[1], by - opts.bodyR * 0.3, opts.legR, opts.legR * 0.75, opts.legMat || opts.mat, opts.hoofMat)));
    const tail = new T.Group();
    tail.position.set(0, by + opts.bodyR * 0.4, -lz - opts.bodyR * 0.9);
    g.add(tail);
    part(tail, G.cyl(0.025, 0.035, opts.tailLen || 0.6, 5), opts.mat, 0, -(opts.tailLen || 0.6) / 2, 0);
    tail.rotation.x = 0.3;
    g.userData = { legs, head, tail, body };
    // resting: legs folded under, the body down on the ground
    g.userData.lie = function () {
      legs[0].rotation.x = legs[1].rotation.x = -1.45;
      legs[2].rotation.x = legs[3].rotation.x = 1.35;
      g.userData.resting = true;
      return opts.legLen * 0.85;
    };
    g.userData.animate = function (t, moving, speed) {
      if (g.userData.resting) { tail.rotation.z = Math.sin(t * 1.3) * 0.25; head.rotation.y = Math.sin(t * 0.4) * 0.35; return; }
      const f = (speed || 6);
      const sw = moving ? Math.sin(t * f) * 0.45 : 0;
      legs[0].rotation.x = sw; legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw; legs[2].rotation.x = -sw;
      tail.rotation.z = Math.sin(t * 2.6) * 0.35;
      if (!moving) head.rotation.x = 0.5 + Math.sin(t * 0.6) * 0.1; // grazing
      else head.rotation.x = 0;
    };
    return { g, body, head, by };
  }

  Models.cow = function () {
    const white = KT.mat('cowWhite', { color: 0xefe9de });
    const brown = KT.mat('cowBrown', { color: 0x7a4425 });
    const q = quadruped({ bodyR: 0.42, bodyLen: 1.1, legLen: 0.75, legR: 0.08, neckRise: 0.25, mat: white, hoofMat: M().black, tailLen: 0.7 });
    part(q.body, G.sph(0.3, 10, 8), brown, 0.3, q.by + 0.15, 0.2, 0, 0, 0, 0.5, 1, 1.3);
    part(q.body, G.sph(0.28, 10, 8), brown, -0.28, q.by + 0.05, -0.4, 0, 0, 0, 0.6, 1, 1.2);
    part(q.head, G.box(0.36, 0.38, 0.55), brown, 0, 0, 0.2);
    part(q.head, G.box(0.32, 0.22, 0.2), KT.mat('muzzle', { color: 0xd8a08a }), 0, -0.08, 0.5);
    [-1, 1].forEach((s) => {
      part(q.head, G.cone(0.04, 0.2, 5), M().white, s * 0.17, 0.25, 0.05, 0, 0, -s * 0.6);
      part(q.head, G.box(0.18, 0.08, 0.12), brown, s * 0.26, 0.08, 0.0);
      part(q.head, G.sph(0.035, 6, 5), M().eyeDark, s * 0.18, 0.08, 0.38);
    });
    part(q.body, G.sph(0.18, 8, 6), brown, 0, q.by + 0.4, 0.55, 0, 0, 0, 1, 0.6, 1);
    bakeStatic(q.body);
    q.g.userData.radius = 1.0;
    q.g.userData.kind = 'cow';
    return q.g;
  };

  Models.buffalo = function () {
    const dark = KT.mat('buffalo', { color: 0x2f2b2a, roughness: 0.8 });
    const q = quadruped({ bodyR: 0.48, bodyLen: 1.2, legLen: 0.7, legR: 0.1, neckRise: 0.05, mat: dark, hoofMat: M().black, tailLen: 0.7 });
    part(q.head, G.box(0.42, 0.4, 0.6), dark, 0, 0, 0.2);
    [-1, 1].forEach((s) => {
      const horn = part(q.head, G.torus(0.3, 0.05, 5, 10, Math.PI * 0.9), KT.mat('horn', { color: 0x575049 }), s * 0.32, 0.2, -0.05, 0, 0, s > 0 ? 0 : Math.PI);
      horn.rotation.y = s * 0.3;
      part(q.head, G.sph(0.04, 6, 5), M().eyeDark, s * 0.2, 0.05, 0.4);
    });
    bakeStatic(q.body);
    q.g.userData.radius = 1.1;
    q.g.userData.kind = 'buffalo';
    return q.g;
  };

  Models.deer = function (doe) {
    const fur = KT.mat('deerFur', { color: 0xb5662c });
    const q = quadruped({ bodyR: 0.28, bodyLen: 0.8, legLen: 0.75, legR: 0.045, neckRise: 0.45, mat: fur, hoofMat: M().black, tailLen: 0.2 });
    const rng = KT.makeRng(5);
    for (let i = 0; i < 22; i++) {
      const a = rng() * Math.PI, z = (rng() - 0.5) * 0.9;
      part(q.body, G.sph(0.035, 5, 4), M().white, Math.cos(a) * 0.28, q.by + Math.sin(a) * 0.2, z, 0, 0, 0, 0.4, 1, 1);
    }
    part(q.body, G.cyl(0.08, 0.12, 0.5, 8), fur, 0, q.by + 0.22, 0.6, 0.6);
    part(q.head, G.box(0.18, 0.2, 0.36), fur, 0, 0, 0.12);
    part(q.head, G.sph(0.05, 6, 5), M().black, 0, -0.03, 0.31);
    [-1, 1].forEach((s) => {
      part(q.head, G.cone(0.06, 0.2, 5), fur, s * 0.12, 0.15, -0.02, 0, 0, -s * 1.0);
      part(q.head, G.sph(0.028, 6, 5), M().eyeDark, s * 0.09, 0.05, 0.16);
      if (doe) return;
      const a1 = part(q.head, G.cyl(0.015, 0.02, 0.55, 4), KT.mat('antler', { color: 0xd9c8a0 }), s * 0.08, 0.35, -0.05, -0.3, 0, -s * 0.3);
      a1.userData.x = 1;
      part(q.head, G.cyl(0.012, 0.015, 0.25, 4), KT.mat('antler', { color: 0xd9c8a0 }), s * 0.12, 0.4, 0.08, 0.5, 0, -s * 0.2);
    });
    bakeStatic(q.body);
    q.g.userData.radius = 0.7;
    q.g.userData.kind = 'deer';
    return q.g;
  };

  Models.monkey = function () {
    const g = new T.Group();
    const fur = KT.mat('monkeyFur', { color: 0x8b6b48 });
    const face = KT.mat('monkeyFace', { color: 0xd3a088 });
    const body = new T.Group();
    g.add(body);
    part(body, G.sph(0.25, 10, 8), fur, 0, 0.35, 0, 0, 0, 0, 1, 1.3, 0.9);
    [-1, 1].forEach((s) => {
      part(body, G.cyl(0.05, 0.05, 0.35, 6), fur, s * 0.15, 0.12, 0.12, 1.3);
      part(body, G.cyl(0.04, 0.04, 0.35, 6), fur, s * 0.2, 0.3, 0.15, 0.5, 0, s * 0.2);
    });
    const head = new T.Group();
    head.position.set(0, 0.72, 0.05);
    g.add(head);
    part(head, G.sph(0.16, 10, 8), fur, 0, 0, 0);
    part(head, G.sph(0.11, 10, 8), face, 0, -0.03, 0.08, 0, 0, 0, 1, 0.9, 0.8);
    [-1, 1].forEach((s) => part(head, G.sph(0.022, 6, 4), M().eyeDark, s * 0.045, 0.01, 0.17));
    const tail = new T.Group();
    tail.position.set(0, 0.15, -0.2);
    g.add(tail);
    part(tail, G.torus(0.3, 0.025, 4, 12, Math.PI), fur, 0, 0, -0.3, 0, Math.PI / 2, 0);
    bakeStatic(body);
    g.userData = { head, tail, kind: 'monkey', radius: 0.4, legs: [] };
    g.userData.animate = function (t) {
      head.rotation.y = Math.sin(t * 0.9) * 0.6;
      head.rotation.x = Math.sin(t * 1.7) * 0.1;
      tail.rotation.z = Math.sin(t * 1.3) * 0.2;
    };
    return g;
  };

  Models.peacock = function () {
    const g = new T.Group();
    const blue = KT.mat('peaBlue', { color: 0x1747a8, roughness: 0.35, metalness: 0.2 });
    const green = KT.mat('peaGreen', { color: 0x1f7a4d, roughness: 0.4, metalness: 0.2 });
    const eyeGold = KT.mat('peaGold', { color: 0xc9a83a, roughness: 0.4 });
    const eyeBlue = KT.mat('peaEye', { color: 0x0b2a6a, roughness: 0.3 });
    const body = new T.Group();
    g.add(body);
    part(body, G.sph(0.22, 12, 10), blue, 0, 0.62, 0, 0, 0, 0, 0.9, 1, 1.4);
    part(body, G.cyl(0.05, 0.08, 0.45, 8), blue, 0, 0.9, 0.18, 0.35);
    part(body, G.sph(0.08, 10, 8), blue, 0, 1.12, 0.26);
    part(body, G.cone(0.025, 0.1, 5), KT.mat('beak', { color: 0x8a7a60 }), 0, 1.1, 0.36, Math.PI / 2);
    for (let i = 0; i < 5; i++) part(body, G.cyl(0.005, 0.005, 0.12, 3), blue, (i - 2) * 0.015, 1.24, 0.24);
    for (let i = 0; i < 5; i++) part(body, G.sph(0.016, 5, 4), blue, (i - 2) * 0.015, 1.3, 0.24);
    [-1, 1].forEach((s) => {
      part(body, G.cyl(0.015, 0.012, 0.45, 4), KT.mat('birdLeg', { color: 0x9a8f80 }), s * 0.07, 0.25, 0);
      part(body, G.sph(0.02, 5, 4), M().white, s * 0.05, 1.14, 0.31);
    });
    part(body, G.sph(0.18, 10, 8), KT.mat('peaWing', { color: 0xa98a5a }), 0, 0.64, -0.1, 0, 0, 0, 1.05, 0.7, 1.1);
    // tail - folded train
    const train = new T.Group();
    train.position.set(0, 0.6, -0.25);
    g.add(train);
    part(train, G.cone(0.22, 1.4, 8), green, 0, 0, -0.7, -Math.PI / 2 - 0.15, 0, 0, 1, 1, 0.3);
    // fan (display)
    const fan = new T.Group();
    fan.position.set(0, 0.7, -0.25);
    g.add(fan);
    const n = 34;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.55 + (i / (n - 1)) * Math.PI * 1.1;
      const f = new T.Group();
      f.rotation.z = a;
      fan.add(f);
      part(f, G.box(0.1, 1.25, 0.01), green, 0, 0.62, 0);
      part(f, G.cyl(0.075, 0.075, 0.02, 10), eyeGold, 0, 1.18, 0.01, Math.PI / 2);
      part(f, G.cyl(0.04, 0.04, 0.03, 10), eyeBlue, 0, 1.18, 0.02, Math.PI / 2);
    }
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI * 0.5 + (i / 19) * Math.PI;
      const f = new T.Group();
      f.rotation.z = a;
      fan.add(f);
      part(f, G.box(0.08, 0.75, 0.01), green, 0, 0.38, 0.03);
      part(f, G.cyl(0.055, 0.055, 0.02, 8), eyeGold, 0, 0.72, 0.04, Math.PI / 2);
      part(f, G.cyl(0.03, 0.03, 0.03, 8), eyeBlue, 0, 0.72, 0.05, Math.PI / 2);
    }
    const fanBaked = KT.bake(fan);
    g.remove(fan);
    fanBaked.position.copy(fan.position);
    g.add(fanBaked);
    fanBaked.rotation.x = -0.25;
    bakeStatic(body);
    g.userData = { fan: fanBaked, train, kind: 'peacock', radius: 0.5, legs: [] };
    g.userData.animate = function (t) {
      const display = Math.max(0, Math.sin(t * 0.25));
      const s = KT.smoothstep(0.3, 0.7, display);
      fanBaked.scale.set(0.001 + s, 0.001 + s, 0.001 + s);
      const tr = s < 0.6 ? 1 : 0.001;
      train.scale.set(tr, tr, tr);
      fanBaked.rotation.z = Math.sin(t * 8) * 0.02 * s;
    };
    return g;
  };

  function bird(opts) {
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    const s = opts.size;
    part(body, G.sph(0.1 * s, 10, 8), opts.body, 0, opts.legH + 0.08 * s, 0, -0.3, 0, 0, 0.9, 1, 1.7);
    if (opts.belly) part(body, G.sph(0.09 * s, 10, 8), opts.belly, 0, opts.legH + 0.05 * s, 0.02 * s, -0.3, 0, 0, 0.85, 0.9, 1.5);
    const head = new T.Group();
    head.position.set(0, opts.legH + 0.08 * s + opts.neck, 0.13 * s);
    g.add(head);
    if (opts.neck > 0.05) part(body, G.cyl(0.025 * s, 0.035 * s, opts.neck, 6), opts.body, 0, opts.legH + 0.08 * s + opts.neck / 2, 0.12 * s, 0.15);
    part(head, G.sph(0.055 * s, 10, 8), opts.headMat || opts.body, 0, 0, 0);
    part(head, G.cone(0.018 * s, opts.beak * s, 6), opts.beakMat, 0, -0.01 * s, (0.05 + opts.beak / 2) * s, Math.PI / 2);
    part(head, G.sph(0.012 * s, 5, 4), M().eyeDark, 0.035 * s, 0.015 * s, 0.03 * s);
    part(head, G.sph(0.012 * s, 5, 4), M().eyeDark, -0.035 * s, 0.015 * s, 0.03 * s);
    [-1, 1].forEach((k) => part(body, G.cyl(0.006 * s, 0.006 * s, opts.legH, 4), opts.legMat || M().black, k * 0.03 * s, opts.legH / 2, 0));
    part(body, G.cone(0.05 * s, 0.18 * s, 5), opts.body, 0, opts.legH + 0.06 * s, -0.2 * s, -Math.PI / 2 + 0.3);
    bakeStatic(body);
    g.userData = { head, kind: opts.kind, radius: 0.3, legs: [] };
    g.userData.animate = function (t) {
      const peck = Math.max(0, Math.sin(t * 0.8 + opts.size)) > 0.92;
      head.rotation.x = peck ? 0.9 : Math.sin(t * 0.5) * 0.1;
      head.rotation.y = Math.sin(t * 0.37) * 0.5;
    };
    return g;
  }

  Models.egret = function () {
    return bird({ kind: 'egret', size: 2.6, legH: 0.55, neck: 0.42, beak: 0.13, body: KT.mat('egret', { color: 0xfafaf5 }), beakMat: M().yellow, legMat: M().black });
  };
  Models.kingfisher = function () {
    return bird({ kind: 'kingfisher', size: 1.2, legH: 0.04, neck: 0.02, beak: 0.12, body: KT.mat('kfBlue', { color: 0x1b8fd6, roughness: 0.3 }), belly: KT.mat('kfOrange', { color: 0xd9632a }), headMat: KT.mat('kfHead', { color: 0x6a3b1e }), beakMat: M().red });
  };
  Models.cormorant = function () {
    return bird({ kind: 'cormorant', size: 2.2, legH: 0.12, neck: 0.18, beak: 0.08, body: KT.mat('cormorant', { color: 0x1f2222, roughness: 0.4 }), beakMat: M().darkGrey });
  };

  Models.flyingBird = function (white) {
    const g = new T.Group();
    const mat = white ? KT.mat('egret', { color: 0xfafaf5 }) : KT.mat('crow', { color: 0x2a2a2a });
    part(g, G.sph(0.12, 8, 6), mat, 0, 0, 0, 0, 0, 0, 0.8, 0.8, 2);
    part(g, G.sph(0.07, 8, 6), mat, 0, 0.04, 0.24);
    part(g, G.cone(0.02, 0.12, 4), M().yellow, 0, 0.03, 0.34, Math.PI / 2);
    const wings = [];
    [-1, 1].forEach((s) => {
      const w = new T.Group();
      w.position.set(s * 0.06, 0.02, 0);
      g.add(w);
      part(w, G.box(0.55, 0.015, 0.22), mat, s * 0.28, 0, 0);
      wings.push(w);
    });
    g.userData = { wings };
    g.userData.animate = function (t) {
      const a = Math.sin(t * 9) * 0.6;
      wings[0].rotation.z = a;
      wings[1].rotation.z = -a;
    };
    return g;
  };
  // ------------------------------------------------- zoo animals
  // Detailed mammals: a shaped torso (lathe: haunch, waist, deep chest), a
  // neck, two-jointed legs that bend at the knee and hock as they walk,
  // muscled thighs, paws or hooves, a curving tail and a species head; the
  // coats are painted textures laid round the body (u runs round it with
  // the belly at the edges and the spine down the middle, v along it).
  const coats = {};
  function coatMat(key, w, h, draw) {
    if (coats[key]) return coats[key];
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h, KT.makeRng(key.length * 97 + 13));
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 4;
    return (coats[key] = new T.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
  }
  // fine fur grain: short strokes a shade lighter and darker
  function fur(g, w, h, rng, n, a) {
    for (let i = 0; i < n; i++) {
      const x = rng() * w, y = rng() * h, l = 2 + rng() * 4;
      g.strokeStyle = rng() < 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 1.5, y + l); g.stroke();
    }
  }
  // the pale belly: both edges of the canvas fade to the belly colour
  function belly(g, w, h, col, frac) {
    [[0, frac * w], [w, w - frac * w]].forEach(([x0, x1]) => {
      const gr = g.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, col); gr.addColorStop(0.45, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), h);
    });
  }
  // a tapering brush stroke from the spine down one flank
  function stripe(g, w, x0, y, len, th, dir, wob, rng) {
    g.beginPath();
    const n = 10;
    for (let i = 0; i <= n; i++) { const t = i / n; g.lineTo(x0 + dir * len * t, y + Math.sin(t * 5 + wob) * 4 - th * (1 - t * 0.85)); }
    for (let i = n; i >= 0; i--) { const t = i / n; g.lineTo(x0 + dir * len * t, y + Math.sin(t * 5 + wob) * 4 + th * (1 - t * 0.85) * (0.6 + rng() * 0.2)); }
    g.fill();
  }
  const COATS = {
    tiger: () => coatMat('tigerCoat2', 256, 512, (g, w, h, rng) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#e9a55a'); gr.addColorStop(0.5, '#cf6d1f'); gr.addColorStop(1, '#e9a55a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      belly(g, w, h, '#f4ecdc', 0.2);
      g.fillStyle = '#17110c';
      for (let i = 0; i < 26; i++) {
        const y = (i + 0.5) * h / 26 + (rng() - 0.5) * 8, th = 4 + rng() * 4;
        [-1, 1].forEach((d) => { stripe(g, w, w / 2, y, w * (0.2 + rng() * 0.18), th, d, rng() * 6, rng); if (rng() < 0.35) stripe(g, w, w / 2 + d * w * 0.12, y + 9, w * 0.12, th * 0.6, d, rng() * 6, rng); });
      }
      fur(g, w, h, rng, 2600, 0.08);
    }),
    lion: (fem) => coatMat(fem ? 'lionessCoat2' : 'lionCoat2', 128, 256, (g, w, h, rng) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#e8d3a6'); gr.addColorStop(0.5, fem ? '#c08a4e' : '#b98247'); gr.addColorStop(1, '#e8d3a6');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      belly(g, w, h, '#efe1c2', 0.16);
      fur(g, w, h, rng, 1500, 0.07);
    }),
    leopard: () => coatMat('leopardCoat2', 256, 512, (g, w, h, rng) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#f1e3c4'); gr.addColorStop(0.5, '#cf9a44'); gr.addColorStop(1, '#f1e3c4');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      belly(g, w, h, '#f3ead6', 0.17);
      for (let i = 0; i < 230; i++) {
        const x = rng() * w, y = rng() * h, r = 4 + rng() * 5, edge = Math.min(x, w - x) / w;
        if (edge < 0.18) { g.fillStyle = '#1c130b'; g.beginPath(); g.arc(x, y, r * 0.45, 0, 7); g.fill(); continue; }
        g.fillStyle = 'rgba(150,90,30,0.55)'; g.beginPath(); g.arc(x, y, r * 0.75, 0, 7); g.fill();     // rosette centre
        g.fillStyle = '#1c130b';
        for (let k = 0; k < 4 + Math.floor(rng() * 2); k++) {                                         // broken ring
          const a = k * 1.4 + rng() * 0.5;
          g.beginPath(); g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.3, 1.5, a + 1.57, 0, 7); g.fill();
        }
      }
      fur(g, w, h, rng, 2200, 0.07);
    }),
    zebra: () => coatMat('zebraCoat2', 256, 512, (g, w, h, rng) => {
      g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#121212';
      for (let i = 0; i < 30; i++) {
        const y = (i + 0.5) * h / 30, th = 5 + (i < 9 ? 3 : 0) + rng() * 2;
        [-1, 1].forEach((d) => stripe(g, w, w / 2, y, w * 0.46, th, d, i * 0.7, rng));
      }
      g.fillRect(w / 2 - 3, 0, 6, h); // the dark line along the spine
      fur(g, w, h, rng, 1200, 0.05);
    }),
    zebraLeg: () => coatMat('zebraLeg2', 64, 256, (g, w, h) => {
      g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#121212';
      for (let y = 6; y < h; y += 17) g.fillRect(0, y, w, 8);
    }),
    deer: () => coatMat('chitalCoat2', 256, 512, (g, w, h, rng) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#f2ebe0'); gr.addColorStop(0.5, '#a9561f'); gr.addColorStop(1, '#f2ebe0');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      belly(g, w, h, '#f4efe6', 0.15);
      g.fillStyle = '#5a2c10'; g.fillRect(w / 2 - 4, 0, 8, h);                 // dark line down the back
      g.fillStyle = '#fbf6ec';
      for (let row = 0; row < 7; row++) for (let i = 0; i < 26; i++) {            // rows of white spots
        [-1, 1].forEach((d) => {
          const x = w / 2 + d * (14 + row * 13 + (rng() - 0.5) * 5), y = (i + (row % 2) * 0.5) * h / 26 + (rng() - 0.5) * 6;
          g.beginPath(); g.ellipse(x, y, 3.2, 2.6, 0, 0, 7); g.fill();
        });
      }
      fur(g, w, h, rng, 1800, 0.06);
    }),
    tigerLeg: () => coatMat('tigerLeg2', 64, 256, (g, w, h, rng) => {
      g.fillStyle = '#d27424'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#17110c';
      for (let y = 8; y < h * 0.7; y += 26 + rng() * 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w * 0.45, y + 4); g.lineTo(w * 0.45, y + 9); g.lineTo(0, y + 7); g.fill(); g.beginPath(); g.moveTo(w, y + 6); g.lineTo(w * 0.6, y + 9); g.lineTo(w * 0.6, y + 13); g.lineTo(w, y + 13); g.fill(); }
      fur(g, w, h, rng, 300, 0.08);
    }),
    leopardLeg: () => coatMat('leopardLeg2', 64, 256, (g, w, h, rng) => {
      g.fillStyle = '#d4a04c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1c130b';
      for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(rng() * w, rng() * h, 1.5 + rng() * 2.2, 0, 7); g.fill(); }
      fur(g, w, h, rng, 300, 0.07);
    }),
    bear: () => coatMat('bearCoat2', 128, 256, (g, w, h, rng) => {
      g.fillStyle = '#141210'; g.fillRect(0, 0, w, h);
      fur(g, w, h, rng, 2600, 0.12);
    })
  };

  // a tapered piece from point A to point B (in the parent's space)
  const _ya = new T.Vector3(0, 1, 0);
  function between(parent, A, B, r0, r1, mat, seg) {
    const d = new T.Vector3(B[0] - A[0], B[1] - A[1], B[2] - A[2]), len = d.length();
    const m = new T.Mesh(new T.CylinderGeometry(r1, r0, len, seg || 10), mat);
    m.position.set((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2);
    m.quaternion.setFromUnitVectors(_ya, d.normalize());
    parent.add(m);
    return m;
  }
  function mammal(o) {
    const g = new T.Group(), body = new T.Group();
    g.add(body);
    const L = o.len, r = o.r, sx = o.sx || 0.82;
    // the legs: upper and lower parts, rest angles bend the hind hocks
    const fa = o.front || [0.06, -0.08], ha = o.hind || [-0.32, 0.62];
    const legH = o.legH, fu = legH * 0.52 / Math.cos(0.06), fl = legH * 0.48 / Math.cos(0.06);
    const hu = legH * 0.5 / Math.cos(0.32), hl = legH * 0.5 / Math.cos(0.3);
    const yb = legH + r * 0.32;
    // torso
    const pts = (o.profile || [[0, 0.02], [0.03, 0.62], [0.12, 0.9], [0.25, 0.95], [0.45, 0.84], [0.62, 0.9], [0.8, 1.0], [0.93, 0.92], [1, 0.45], [1.0, 0.02]])
      .map(([t, f]) => new T.Vector2(Math.max(0.001, f * r), (t - 0.5) * L));
    const tg = new T.LatheGeometry(pts, 26);
    tg.rotateX(HPI); tg.scale(sx, 1, 1);
    const torso = new T.Mesh(tg, o.coat);
    torso.position.y = yb;
    body.add(torso);
    // neck up to the head
    const N0 = [0, yb + r * 0.35, L / 2 - r * 0.25], hp = o.headAt;
    between(body, N0, [0, hp[0], hp[1]], r * (o.neckR0 || 0.62), r * (o.neckR1 || 0.42), o.neckMat || o.coat, 12);
    const head = new T.Group();
    head.position.set(0, hp[0], hp[1]);
    g.add(head);
    o.head(head);
    // legs
    const legs = [], knees = [];
    const mk = (x, z, up, lo, rest, front) => {
      const hip = new T.Group();
      hip.position.set(x, yb - r * 0.3, z);
      g.add(hip);
      const t0 = r * (front ? o.legR0 || 0.3 : o.legR0h || 0.36);
      part(hip, G.cyl(t0 * 0.72, t0 * 1.1, up, 10), o.legMat || o.coat, 0, -up / 2, 0);
      part(hip, G.sph(t0 * 1.6, 12, 10), o.legMat || o.coat, 0, -up * 0.12, front ? 0.03 : -0.04, 0, 0, 0, 0.75, 1.5, 1.15);  // shoulder / thigh muscle
      const knee = new T.Group();
      knee.position.y = -up;
      hip.add(knee);
      const t1 = t0 * (o.lowerK || 0.66);
      part(knee, G.cyl(t1 * 0.75, t1, lo, 8), o.legMat || o.coat, 0, -lo / 2, 0);
      if (o.kneeBall !== false) part(knee, G.sph(t1 * 1.05, 8, 6), o.legMat || o.coat, 0, 0, 0);
      o.foot(knee, lo, front, t1);
      hip.rotation.x = rest[0]; knee.rotation.x = rest[1];
      hip.userData.rest = rest[0]; knee.userData.rest = rest[1];
      bakeStatic(hip); bakeStatic(knee);
      legs.push(hip); knees.push(knee);
    };
    const lx = r * sx * 0.55, fz = L / 2 - r * 0.55, hz = -L / 2 + r * 0.6;
    mk(-lx, fz, fu, fl, fa, true); mk(lx, fz, fu, fl, fa, true); mk(-lx, hz, hu, hl, ha, false); mk(lx, hz, hu, hl, ha, false);
    // tail: a chain of pieces
    const tail = new T.Group();
    tail.position.set(0, yb + r * 0.45, -L / 2 + 0.02);
    g.add(tail);
    const segs = [];
    let parent = tail;
    const n = 4, sl = o.tailLen / n;
    for (let i = 0; i < n; i++) {
      const sg = new T.Group();
      if (i) sg.position.y = -sl;
      parent.add(sg);
      part(sg, G.cyl(o.tailR * (1 - (i + 1) * 0.15), o.tailR * (1 - i * 0.15), sl, 6), o.tailMat || o.coat, 0, -sl / 2, 0);
      segs.push(sg); parent = sg;
    }
    if (o.tailTip) o.tailTip(parent, sl);
    tail.rotation.x = o.tailRest || 2.6;
    segs.forEach((sg, i) => { if (i) sg.rotation.x = -(o.tailCurl || 0.18); });
    if (o.decorate) o.decorate(body, yb);
    bakeStatic(body); bakeStatic(head);
    g.userData = { legs, head, tail, body, kind: o.kind, radius: L * 0.6 };
    g.userData.lie = function () {
      legs[0].rotation.x = legs[1].rotation.x = -1.5; knees[0].rotation.x = knees[1].rotation.x = 0.1;
      legs[2].rotation.x = legs[3].rotation.x = -1.2; knees[2].rotation.x = knees[3].rotation.x = 2.5;
      g.userData.resting = true;
      return yb - r * 0.9;
    };
    const hx0 = head.rotation.x;
    g.userData.animate = function (t, moving, speed) {
      const f = speed || 6;
      segs.forEach((sg, i) => { sg.rotation.z = Math.sin(t * 1.6 - i * 0.6) * (0.1 + i * 0.04); });
      if (g.userData.resting) { head.rotation.y = Math.sin(t * 0.35) * 0.4; head.rotation.x = hx0 + Math.sin(t * 0.5) * 0.05; return; }
      for (let i = 0; i < 4; i++) {
        const ph = t * f + (i === 0 || i === 3 ? 0 : Math.PI), sw = moving ? Math.sin(ph) : 0, lift = moving ? Math.max(0, Math.cos(ph)) : 0;
        legs[i].rotation.x = legs[i].userData.rest + sw * 0.38;
        knees[i].rotation.x = knees[i].userData.rest + (i < 2 ? -1 : 1) * lift * 0.55;
      }
      // grazing (or sniffing) when still, a slight nod when walking
      head.rotation.x = moving ? hx0 + Math.sin(t * f * 2) * 0.04 : hx0 + (o.grazes ? 0.25 + Math.max(0, Math.sin(t * 0.3)) * 0.6 : Math.sin(t * 0.5) * 0.08);
      head.rotation.y = moving ? 0 : Math.sin(t * 0.37) * 0.45;
    };
    return g;
  }
  const pale = (k, c) => KT.mat(k, { color: c, roughness: 0.9 });
  const eyes = (h, x, y, z, r, iris) => [-1, 1].forEach((s) => {
    part(h, G.sph(r, 10, 8), KT.mat('eyeIris' + iris.toString(16), { color: iris, roughness: 0.25 }), s * x, y, z);
    part(h, G.sph(r * 0.55, 8, 6), M().eyeDark, s * x * 1.02, y, z + r * 0.6);
    part(h, G.sph(r * 0.18, 5, 4), KT.mat('eyeGlint', { color: 0xffffff, roughness: 0.1 }), s * x * 1.02 + 0.006, y + r * 0.3, z + r * 0.85);
  });
  // a cat's head: broad skull, muzzle pads, nose, chin, round ears, whiskers
  function catHead(h, k, coat, light, opts) {
    part(h, G.sph(0.24 * k, 16, 12), coat, 0, 0.02 * k, 0, 0, 0, 0, 1.08, 0.92, 1.0);
    part(h, G.sph(0.14 * k, 12, 10), light, 0, -0.07 * k, 0.17 * k, 0, 0, 0, 1.25, 0.8, 0.95);        // muzzle
    [-1, 1].forEach((s) => part(h, G.sph(0.075 * k, 10, 8), light, s * 0.06 * k, -0.08 * k, 0.24 * k)); // whisker pads
    part(h, G.sph(0.06 * k, 8, 6), light, 0, -0.15 * k, 0.16 * k, 0, 0, 0, 1.1, 0.7, 1);              // chin
    part(h, G.sph(0.048 * k, 8, 6), KT.mat('catNose2', { color: opts.nose || 0x8a4c40, roughness: 0.5 }), 0, -0.03 * k, 0.29 * k, 0, 0, 0, 1.2, 0.8, 0.8);
    part(h, G.sph(0.05 * k, 8, 6), coat, 0, 0.0, 0.2 * k, 0, 0, 0, 0.9, 0.7, 1.4);                     // bridge of the nose
    eyes(h, 0.1 * k, 0.05 * k, 0.19 * k, 0.03 * k, opts.iris || 0xc9a23a);
    [-1, 1].forEach((s) => {
      part(h, G.sph(0.045 * k, 8, 6), light, s * 0.1 * k, 0.1 * k, 0.2 * k, 0, 0, 0, 1, 0.45, 0.35);  // pale mark over the eye
      const ear = part(h, G.cyl(0.075 * k, 0.085 * k, 0.03 * k, 12), coat, s * 0.16 * k, 0.2 * k, -0.02 * k, HPI - 0.2, 0, s * 0.35);
      void ear;
      part(h, G.cyl(0.05 * k, 0.06 * k, 0.032 * k, 10), opts.earBack || light, s * 0.165 * k, 0.2 * k, -0.04 * k, HPI - 0.2, 0, s * 0.35);
      part(h, G.sph(0.1 * k, 10, 8), opts.ruff || coat, s * 0.17 * k, -0.05 * k, 0.0, 0, 0, 0, 0.45, 0.85, 0.8); // cheek ruff
      for (let w = 0; w < 4; w++) part(h, G.cyl(0.003 * k, 0.003 * k, 0.26 * k, 3), KT.mat('whisker', { color: 0xf8f6f0 }), s * (0.17 * k), -0.08 * k - w * 0.012 * k, 0.24 * k, 0, 0, s * (HPI - 0.15 + w * 0.08));
    });
    if (opts.stripes) {
      // forehead and cheek stripes
      const dk = KT.mat('catStripe', { color: 0x17110c });
      [[0, 0.17, 0.12, 0], [-0.07, 0.15, 0.12, 0.5], [0.07, 0.15, 0.12, -0.5]].forEach(([x, y, z, a]) => part(h, G.box(0.018 * k, 0.09 * k, 0.03 * k), dk, x * k, y * k, z * k, -0.5, 0, a));
      [-1, 1].forEach((s) => [0, 1, 2].forEach((i) => part(h, G.box(0.13 * k, 0.016 * k, 0.03 * k), dk, s * 0.2 * k, (0.02 - i * 0.05) * k, 0.04 * k, 0, s * 1.2, s * (0.3 - i * 0.12))));
    }
  }
  const paw = (light) => (knee, lo, front, t1) => part(knee, G.sph(t1 * 1.35, 10, 8), light, 0, -lo - t1 * 0.2, t1 * 0.5, 0, 0, 0, 1, 0.55, 1.4);
  const hoof = (mat) => (knee, lo, front, t1) => part(knee, G.cyl(t1 * 0.85, t1 * 1.05, t1 * 1.6, 8), mat, 0, -lo - t1 * 0.4, 0.01);

  // Bengal tiger
  Models.tiger = function () {
    const coat = COATS.tiger(), white = pale('tigerWhite2', 0xf3ecdc);
    return mammal({
      kind: 'tiger', len: 1.75, r: 0.38, sx: 0.86, legH: 0.6, headAt: [1.0, 1.12], coat, legMat: COATS.tigerLeg(), tailLen: 0.95, tailR: 0.065,
      tailMat: coatMat('tigerTail2', 64, 256, (g, w, h, rng) => { g.fillStyle = '#cf6d1f'; g.fillRect(0, 0, w, h); g.fillStyle = '#17110c'; for (let y = 10; y < h; y += 30) g.fillRect(0, y, w, 12); g.fillRect(0, h - 26, w, 26); fur(g, w, h, rng, 300, 0.08); }),
      tailCurl: 0.25, legR0: 0.34, legR0h: 0.4,
      head: (h) => catHead(h, 1.3, coat, white, { stripes: true, earBack: KT.mat('earBlack', { color: 0x1a1410 }), ruff: white }),
      foot: paw(COATS.tigerLeg())
    });
  };
  Models.lion = function (female) {
    const coat = COATS.lion(female), light = pale('lionLight2', 0xead8b2), leg = KT.mat(female ? 'lionessLeg2' : 'lionLeg2', { color: female ? 0xc08a4e : 0xb98247, roughness: 0.9 });
    const k = female ? 1 : 1.12;
    return mammal({
      kind: 'lion', len: 1.7 * k, r: 0.37 * k, sx: 0.86, legH: 0.64 * k, headAt: [1.06 * k, 1.08 * k], coat, legMat: leg, tailLen: 0.9 * k, tailR: 0.05, legR0: 0.34, legR0h: 0.4,
      tailTip: (p, sl) => { for (let i = 0; i < 5; i++) part(p, KT.blob(0.06, 1, 0.3, 30 + i), KT.mat('lionTuft2', { color: 0x2e2216 }), (i % 2 - 0.5) * 0.03, -sl - 0.05 - i * 0.02, 0); },
      head: (h) => {
        catHead(h, 1.25 * k, coat, light, { iris: 0xb0893a, nose: 0x5a3a30 });
        if (female) return;
        // the mane: shaggy clumps round the face, over the head and down the chest
        const m1 = KT.mat('lionManeA', { color: 0x6e4420, roughness: 1 }), m2 = KT.mat('lionManeB', { color: 0x9c6a34, roughness: 1 }), m3 = KT.mat('lionManeC', { color: 0x3e2614, roughness: 1 });
        for (let i = 0; i < 26; i++) {
          const a = i / 26 * Math.PI * 2, rr = 0.33 + (i % 3) * 0.03;
          part(h, KT.blob(0.19, 2, 0.3, 40 + i), i % 3 === 0 ? m3 : i % 2 ? m1 : m2, Math.cos(a) * rr * 1.15, Math.sin(a) * rr * 1.1 + 0.02, -0.14 - (i % 2) * 0.06, 0, 0, a, 1, 1.5, 1.1);
        }
        part(h, KT.blob(0.42, 2, 0.18, 66), m1, 0, 0.0, -0.32, 0, 0, 0, 1.05, 1.1, 0.9);   // the mass of the mane behind the face
        for (let i = 0; i < 12; i++) part(h, KT.blob(0.22, 2, 0.3, 70 + i), i % 2 ? m1 : m3, (i % 4 - 1.5) * 0.13, -0.3 - Math.floor(i / 4) * 0.14, -0.3 - Math.floor(i / 4) * 0.1);
      },
      foot: paw(leg)
    });
  };
  Models.leopard = function () {
    const coat = COATS.leopard(), light = pale('leopardLight2', 0xf1e6cc);
    return mammal({
      kind: 'leopard', len: 1.35, r: 0.28, sx: 0.84, legH: 0.48, headAt: [0.8, 0.88], coat, legMat: COATS.leopardLeg(), tailLen: 1.0, tailR: 0.045, tailCurl: 0.32, tailRest: 2.4, legR0: 0.33, legR0h: 0.38,
      head: (h) => catHead(h, 1.0, coat, light, { iris: 0x9fae4a, nose: 0x8a5a50 }),
      foot: paw(COATS.leopardLeg())
    });
  };
  // Plains zebra: a horse's build, an upright striped mane
  Models.zebra = function () {
    const coat = COATS.zebra(), legs = COATS.zebraLeg(), black = KT.mat('zebraBlack2', { color: 0x141414 });
    return mammal({
      kind: 'zebra', len: 1.55, r: 0.4, sx: 0.78, legH: 0.86, headAt: [1.62, 1.12], coat, legMat: legs, neckR0: 0.6, neckR1: 0.36, neckMat: legs,
      tailLen: 0.7, tailR: 0.035, tailRest: 2.9, tailCurl: 0.05, legR0: 0.24, legR0h: 0.3, lowerK: 0.55, kneeBall: false, grazes: true,
      profile: [[0, 0.02], [0.03, 0.66], [0.12, 0.92], [0.28, 0.95], [0.5, 0.92], [0.72, 0.95], [0.88, 0.9], [0.97, 0.7], [1, 0.3], [1, 0.02]],
      tailTip: (p, sl) => part(p, G.cone(0.06, 0.32, 6), black, 0, -sl - 0.12, 0, Math.PI),
      decorate: (body) => {
        // the mane, standing up along the neck
        const mn = coatMat('zebraMane2', 64, 64, (g, w, h) => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h); g.fillStyle = '#121212'; for (let x = 0; x < w; x += 12) g.fillRect(x, 0, 6, h); });
        for (let i = 0; i < 9; i++) { const t = i / 8; part(body, G.box(0.04, 0.16, 0.07), mn, 0, 1.36 + t * 0.4, 0.62 + t * 0.46, 0.75); }
      },
      head: (h) => {
        h.rotation.x = 0.55;
        part(h, G.cyl(0.075, 0.14, 0.56, 12), legs, 0, -0.02, 0.24, HPI);
        part(h, G.sph(0.12, 10, 8), black, 0, -0.03, 0.52, 0, 0, 0, 0.75, 0.75, 0.6);              // dark muzzle
        [-1, 1].forEach((s) => {
          part(h, G.sph(0.018, 6, 4), M().eyeDark, s * 0.045, -0.02, 0.6);                         // nostrils
          part(h, G.cone(0.065, 0.24, 7), coat, s * 0.08, 0.15, -0.03, -0.25, 0, -s * 0.3);         // ears
          part(h, G.cone(0.03, 0.08, 6), black, s * 0.11, 0.25, -0.05, -0.25, 0, -s * 0.3);
        });
        eyes(h, 0.12, 0.05, 0.05, 0.026, 0x3a2414);
      },
      foot: hoof(black)
    });
  };
  // Black bear: heavy and shaggy, a pale muzzle and a white crescent on the chest
  Models.bear = function () {
    const coat = COATS.bear(), shag = KT.mat('bearShag2', { color: 0x1b1816, roughness: 1 }), tan = pale('bearTan2', 0xb69774);
    return mammal({
      kind: 'bear', len: 1.25, r: 0.5, legH: 0.48, headAt: [0.92, 0.95], coat, tailLen: 0.1, tailR: 0.05, legR0: 0.36, legR0h: 0.38,
      front: [0.02, -0.02], hind: [-0.12, 0.25],
      decorate: (body, yb) => {
        for (let i = 0; i < 10; i++) part(body, KT.blob(0.36, 2, 0.16, 90 + i), shag, (i % 2 ? 1 : -1) * 0.1, yb + 0.12 + (i % 3) * 0.05, -0.46 + i * 0.1, 0, 0, 0, 1, 0.85, 1);
        // the white crescent ("V") on the chest
        [-1, 1].forEach((s) => part(body, G.box(0.06, 0.04, 0.32), KT.mat('bearV2', { color: 0xefe6d2 }), s * 0.13, yb + 0.05, 0.66, 0.3, s * 0.55, 0));
      },
      head: (h) => {
        h.scale.setScalar(1.25);
        part(h, KT.blob(0.27, 2, 0.12, 120), coat, 0, 0.02, 0);
        part(h, G.sph(0.13, 10, 8), tan, 0, -0.06, 0.24, 0, 0, 0, 0.95, 0.8, 1.15);
        part(h, G.sph(0.05, 8, 6), KT.mat('bearNose2', { color: 0x0e0d0c, roughness: 0.4 }), 0, -0.02, 0.38, 0, 0, 0, 1.2, 0.8, 0.8);
        eyes(h, 0.1, 0.07, 0.2, 0.024, 0x3a2a1a);
        [-1, 1].forEach((s) => { part(h, G.sph(0.11, 10, 8), coat, s * 0.2, 0.22, -0.02, 0, 0, 0, 1, 1, 0.55); part(h, KT.blob(0.14, 2, 0.2, 130 + s), shag, s * 0.24, -0.06, -0.06); });
      },
      foot: (knee, lo, front, t1) => {
        part(knee, G.sph(t1 * 1.45, 10, 8), coat, 0, -lo - t1 * 0.15, t1 * 0.4, 0, 0, 0, 1, 0.55, 1.5);
        for (let c = -1; c <= 1; c++) part(knee, G.cone(0.012, 0.05, 4), KT.mat('claw', { color: 0xd9d0c0 }), c * t1 * 0.5, -lo - t1 * 0.35, t1 * 1.9, HPI);
      }
    });
  };
  // Chital (spotted deer); stags carry lyre-shaped antlers with three tines
  Models.deer = function (doe) {
    const coat = COATS.deer(), white = pale('deerWhite2', 0xf4efe6), dark = KT.mat('deerHoof2', { color: 0x231a14 });
    const brown = KT.mat('deerHead2', { color: 0x9a5524, roughness: 0.9 });
    const g = mammal({
      kind: 'deer', len: 1.0, r: 0.27, legH: 0.68, headAt: [1.12, 0.78], coat, legMat: KT.mat('deerLeg2', { color: 0xa8662c, roughness: 0.9 }), neckMat: KT.mat('deerNeck2', { color: 0xa45a22, roughness: 0.9 }), neckR0: 0.58, neckR1: 0.4,
      tailLen: 0.2, tailR: 0.04, tailRest: 2.9, legR0: 0.26, legR0h: 0.32, lowerK: 0.5, kneeBall: false, grazes: true,
      tailTip: (p, sl) => part(p, G.sph(0.045, 6, 5), white, 0, -sl, -0.02, 0, 0, 0, 1, 1.6, 0.6),
      decorate: (body) => part(body, G.sph(0.06, 8, 6), white, 0, 1.0, 0.94, 0.6, 0, 0, 0.9, 1, 0.5), // white throat patch
      head: (h) => {
        h.rotation.x = 0.35;
        h.scale.setScalar(1.2);
        part(h, G.cyl(0.05, 0.1, 0.34, 10), brown, 0, -0.01, 0.13, HPI);
        part(h, G.sph(0.05, 8, 6), dark, 0, -0.02, 0.31, 0, 0, 0, 1, 0.8, 0.8);
        eyes(h, 0.075, 0.04, 0.05, 0.022, 0x2a1a10);
        [-1, 1].forEach((s) => {
          part(h, G.sph(0.026, 6, 5), white, s * 0.07, 0.04, 0.045, 0, 0, 0, 0.6, 1.1, 1);       // pale eye ring
          const ear = part(h, G.sph(0.09, 8, 6), brown, s * 0.1, 0.11, -0.06, 0, 0, s * 0.9, 0.35, 1, 0.55);
          void ear;
          if (doe) return;
          const ant = KT.mat('antler2', { color: 0xcdb991, roughness: 0.6 });
          between(h, [s * 0.05, 0.1, -0.04], [s * 0.18, 0.42, -0.12], 0.022, 0.016, ant, 5);
          between(h, [s * 0.18, 0.42, -0.12], [s * 0.12, 0.7, -0.02], 0.016, 0.01, ant, 5);
          between(h, [s * 0.07, 0.14, -0.04], [s * 0.1, 0.2, 0.14], 0.014, 0.008, ant, 4);       // brow tine
          between(h, [s * 0.18, 0.42, -0.12], [s * 0.26, 0.6, -0.22], 0.012, 0.007, ant, 4);
        });
      },
      foot: hoof(dark)
    });
    g.userData.kind = 'deer';
    return g;
  };

  // a primate walking on its knuckles: long arms in front, short legs behind
  function primate(opts) {
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    const k = opts.size, fur = opts.fur;
    const hip = 0.42 * k, sh = 0.62 * k;
    part(body, G.sph(0.3 * k, 12, 10), fur, 0, (hip + sh) / 2 + 0.05 * k, 0, -0.55, 0, 0, 0.95, 1.35, 0.9);
    const head = new T.Group();
    head.position.set(0, sh + 0.2 * k, 0.32 * k);
    g.add(head);
    part(head, G.sph(0.17 * k, 12, 10), opts.headFur || fur, 0, 0, 0);
    part(head, G.sph(0.12 * k, 10, 8), opts.face, 0, -0.02 * k, 0.1 * k, 0, 0, 0, 1.1, 1, 0.7);
    [-1, 1].forEach((s) => part(head, G.sph(0.02 * k, 6, 4), M().eyeDark, s * 0.05 * k, 0.03 * k, 0.17 * k));
    if (opts.mane) {
      // a full silver-grey ruff round the face
      part(head, KT.blob(0.2 * k, 2, 0.22, 149), opts.mane, 0, -0.02 * k, -0.07 * k, 0, 0, 0, 1.05, 1.15, 0.7);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; part(head, KT.blob(0.06 * k, 1, 0.35, 150 + i), opts.mane, Math.cos(a) * 0.19 * k, Math.sin(a) * 0.21 * k - 0.02 * k, -0.03 * k, 0, 0, a, 1, 1.6, 0.8); }
    }
    if (opts.cheeks) [-1, 1].forEach((s) => part(head, G.sph(0.09 * k, 8, 6), opts.face, s * 0.15 * k, 0, 0.04 * k, 0, 0, 0, 0.6, 1.1, 0.5));
    const legs = [];
    [[-1, sh, 0.22, sh], [1, sh, 0.22, sh], [-1, hip, -0.2, hip], [1, hip, -0.2, hip]].forEach(([s, y, z, len]) => {
      legs.push(leg(g, s * 0.2 * k, y, z * k, len, 0.065 * k, 0.05 * k, fur, opts.hands));
    });
    if (opts.shaggy) {
      // long hair hanging from the arms and the body
      legs.slice(0, 2).forEach((l, i) => { for (let j = 0; j < 6; j++) part(l, G.cone(0.05 * k, 0.28 * k, 4), fur, (i ? 1 : -1) * 0.05 * k, -0.15 * k - j * 0.1 * k, -0.07 * k, Math.PI + 0.3, 0, (j % 2 - 0.5) * 0.4); });
      for (let j = 0; j < 8; j++) part(body, G.cone(0.06 * k, 0.3 * k, 4), fur, ((j % 4) - 1.5) * 0.12 * k, (hip + sh) / 2 - 0.22 * k, -0.15 * k + Math.floor(j / 4) * 0.2 * k, Math.PI, 0, (j % 2 - 0.5) * 0.3); // hair hanging under the belly
    }
    let tail = null;
    if (opts.tail) {
      tail = new T.Group();
      tail.position.set(0, hip + 0.05 * k, -0.25 * k);
      g.add(tail);
      part(tail, G.cyl(0.02 * k, 0.025 * k, opts.tail, 5), fur, 0, -opts.tail / 2, 0);
      part(tail, G.sph(0.05 * k, 6, 5), fur, 0, -opts.tail, 0, 0, 0, 0, 1, 1.8, 1);
      tail.rotation.x = 2.3;
    }
    if (opts.baby) {
      // a baby riding on its mother's back
      part(body, G.sph(0.13 * k, 10, 8), fur, 0, sh + 0.12 * k, -0.08 * k, -0.4, 0, 0, 0.9, 1.2, 0.9);
      part(body, G.sph(0.08 * k, 10, 8), fur, 0, sh + 0.28 * k, 0.04 * k);
      part(body, G.sph(0.055 * k, 8, 6), opts.face, 0, sh + 0.27 * k, 0.1 * k);
    }
    bakeStatic(body);
    g.userData = { legs, head, tail, kind: opts.kind, radius: 0.6 * k };
    g.userData.animate = function (t, moving, speed) {
      const sw = moving ? Math.sin(t * (speed || 4)) * 0.4 : 0;
      legs[0].rotation.x = sw; legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw; legs[2].rotation.x = -sw;
      head.rotation.y = Math.sin(t * 0.6 + k) * (moving ? 0.2 : 0.7);
      head.rotation.x = Math.sin(t * 0.9) * 0.1;
      if (tail) tail.rotation.z = Math.sin(t * 1.4) * 0.2;
    };
    return g;
  }
  Models.orangutan = (baby) => primate({ kind: 'orangutan', size: 1.5, fur: KT.mat('orangFur', { color: 0xb4501e, roughness: 1 }), face: KT.mat('orangFace', { color: 0x4a3328 }), hands: KT.mat('orangFace', { color: 0x4a3328 }), cheeks: true, shaggy: true, baby });
  Models.lionTailedMacaque = () => primate({ kind: 'macaque', size: 0.8, fur: KT.mat('ltmFur', { color: 0x1a1a1a, roughness: 1 }), headFur: KT.mat('ltmFur', { color: 0x1a1a1a, roughness: 1 }), face: KT.mat('ltmFace', { color: 0x2c2420 }), mane: KT.mat('ltmMane', { color: 0xa9a59c, roughness: 1 }), tail: 0.6 });

  // greater adjutant stork: tall grey and white with a bare pink head and neck,
  // a huge pale bill and a hanging pouch
  Models.adjutant = function () {
    const g = new T.Group(), body = new T.Group();
    g.add(body);
    const white = KT.mat('adjWhite', { color: 0xe9e6de }), grey = KT.mat('adjGrey', { color: 0x4f5458, roughness: 0.8 });
    const pink = KT.mat('adjPink', { color: 0xd99a86 }), bill = KT.mat('adjBill', { color: 0xd8c9a0, roughness: 0.5 }), legM = KT.mat('adjLeg', { color: 0xc9bfb4 });
    const legH = 0.85;
    [-1, 1].forEach((s) => part(body, G.cyl(0.025, 0.03, legH, 5), legM, s * 0.1, legH / 2, 0));
    part(body, G.sph(0.32, 12, 10), white, 0, legH + 0.22, 0, -0.25, 0, 0, 0.85, 0.85, 1.35);
    [-1, 1].forEach((s) => part(body, G.sph(0.3, 10, 8), grey, s * 0.12, legH + 0.32, -0.08, -0.35, 0, 0, 0.45, 0.6, 1.5)); // wings
    part(body, G.cone(0.16, 0.35, 6), grey, 0, legH + 0.22, -0.48, -HPI + 0.4);
    part(body, G.sph(0.11, 8, 6), pink, 0, legH + 0.32, 0.36, 0, 0, 0, 1, 1.5, 0.8); // pouch
    part(body, G.cyl(0.05, 0.08, 0.35, 6), pink, 0, legH + 0.5, 0.28, 0.4);           // neck
    const head = new T.Group();
    head.position.set(0, legH + 0.7, 0.36);
    g.add(head);
    part(head, G.sph(0.09, 8, 6), pink, 0, 0, 0);
    part(head, G.cone(0.065, 0.5, 6), bill, 0, -0.08, 0.24, HPI + 0.45);
    [-1, 1].forEach((s) => part(head, G.sph(0.016, 5, 4), M().eyeDark, s * 0.07, 0.03, 0.04));
    bakeStatic(body);
    g.userData = { head, kind: 'stork', radius: 0.5, legs: [] };
    g.userData.animate = function (t) {
      head.rotation.x = Math.max(0, Math.sin(t * 0.5)) * 0.4;
      head.rotation.y = Math.sin(t * 0.31) * 0.4;
    };
    return g;
  };
})();
