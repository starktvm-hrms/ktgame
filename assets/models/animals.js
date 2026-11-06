// Animals of Kerala: elephant (regular & festival caparisoned), cow,
// buffalo, deer (chital), monkey, peacock, egret, kingfisher, cormorant and
// flying birds. Each model exposes animated pivots in userData and an
// `animate(t, moving)` function.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;

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
  // A striped coat: wavy dark bands across a base colour (on the body
  // capsule and the legs the bands ring round, like a tiger's or a zebra's).
  const coats = {};
  function stripedMat(key, base, stripe, n, width, seed) {
    if (coats[key]) return coats[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    g.fillStyle = stripe;
    const rng = KT.makeRng(seed || 3);
    for (let i = 0; i < n; i++) {
      const y0 = (i + 0.5) * 256 / n + (rng() - 0.5) * 6, w = width * (0.6 + rng() * 0.7), ph = rng() * 6;
      g.beginPath();
      for (let x = 0; x <= 128; x += 4) g.lineTo(x, y0 + Math.sin(x / 128 * Math.PI * 4 + ph) * 5 - w / 2);
      for (let x = 128; x >= 0; x -= 4) g.lineTo(x, y0 + Math.sin(x / 128 * Math.PI * 4 + ph + 0.6) * 5 + w / 2);
      g.fill();
    }
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return (coats[key] = new T.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  }

  // Bengal tiger: orange coat with black stripes, white belly and face
  Models.tiger = function () {
    const coat = stripedMat('tigerCoat', '#d9822b', '#1c130c', 14, 7, 11);
    const white = KT.mat('tigerWhite', { color: 0xf3ead8 });
    const q = quadruped({ bodyR: 0.36, bodyLen: 1.3, legLen: 0.62, legR: 0.09, neckRise: 0.18, mat: coat, hoofMat: white, tailLen: 0.95 });
    part(q.body, G.sph(0.3, 10, 8), white, 0, q.by - 0.18, 0.05, 0, 0, 0, 0.9, 0.5, 2.2); // belly
    part(q.body, G.sph(0.34, 10, 8), coat, 0, q.by + 0.04, 0.62, 0, 0, 0, 1.05, 1, 0.9);  // shoulders
    part(q.head, G.sph(0.27, 14, 10), coat, 0, 0, 0.12, 0, 0, 0, 1.1, 0.95, 1);
    part(q.head, G.sph(0.17, 10, 8), white, 0, -0.08, 0.3, 0, 0, 0, 1.1, 0.75, 0.8);     // muzzle
    part(q.head, G.sph(0.045, 6, 5), KT.mat('tigerNose', { color: 0x9a5a50 }), 0, -0.02, 0.43);
    [-1, 1].forEach((s) => {
      part(q.head, G.sph(0.09, 8, 6), coat, s * 0.19, 0.2, 0.02, 0, 0, 0, 1, 1, 0.5);   // ears
      part(q.head, G.sph(0.06, 6, 5), white, s * 0.19, 0.2, 0.05, 0, 0, 0, 1, 1, 0.3);
      part(q.head, G.sph(0.035, 6, 5), KT.mat('tigerEye', { color: 0xc9b23a, roughness: 0.3 }), s * 0.11, 0.07, 0.34);
      part(q.head, G.sph(0.018, 5, 4), M().eyeDark, s * 0.11, 0.07, 0.365);
      part(q.head, G.sph(0.12, 8, 6), white, s * 0.2, -0.06, 0.12, 0, 0, 0, 0.6, 0.9, 0.8); // cheek ruff
    });
    q.g.userData.tail.children[0].material = stripedMat('tigerTail', '#d9822b', '#1c130c', 6, 14, 5);
    q.g.userData.tail.rotation.x = 0.9;
    bakeStatic(q.body);
    q.g.userData.radius = 1.0;
    q.g.userData.kind = 'tiger';
    return q.g;
  };

  // Plains zebra: white with bold black stripes, an upright mane
  Models.zebra = function () {
    const coat = stripedMat('zebraCoat', '#f4f1ea', '#141414', 18, 7, 21);
    const black = KT.mat('zebraBlack', { color: 0x161616 });
    const q = quadruped({ bodyR: 0.36, bodyLen: 1.15, legLen: 0.85, legR: 0.07, neckRise: 0.62, mat: coat, hoofMat: black, tailLen: 0.6 });
    const neck = part(q.body, G.cyl(0.13, 0.22, 0.8, 10), coat, 0, q.by + 0.36, 0.72, 0.75);
    void neck;
    part(q.body, G.box(0.06, 0.16, 0.78), black, 0, q.by + 0.56, 0.62, 0.75);              // mane
    part(q.head, G.box(0.2, 0.24, 0.5), coat, 0, -0.05, 0.12, 0.35);
    part(q.head, G.box(0.17, 0.17, 0.16), black, 0, -0.2, 0.36, 0.35);                     // muzzle
    [-1, 1].forEach((s) => {
      part(q.head, G.cone(0.06, 0.2, 5), coat, s * 0.09, 0.2, -0.04, -0.2, 0, -s * 0.25);   // ears
      part(q.head, G.sph(0.03, 6, 5), M().eyeDark, s * 0.1, 0.04, 0.12);
    });
    part(q.g.userData.tail, G.sph(0.06, 6, 5), black, 0, -0.6, 0, 0, 0, 0, 1, 2, 1);        // tail tuft
    bakeStatic(q.body);
    q.g.userData.radius = 1.0;
    q.g.userData.kind = 'zebra';
    return q.g;
  };

  // Black bear: shaggy black coat, a pale muzzle and a cream V on the chest
  Models.bear = function () {
    const fur = KT.mat('bearFur', { color: 0x161412, roughness: 1 });
    const pale = KT.mat('bearMuzzle', { color: 0xb59a7a });
    const q = quadruped({ bodyR: 0.5, bodyLen: 0.9, legLen: 0.45, legR: 0.14, neckRise: 0.05, mat: fur, hoofMat: fur, tailLen: 0.12 });
    part(q.body, G.sph(0.52, 12, 10), fur, 0, q.by + 0.12, 0.42, 0, 0, 0, 1.05, 1, 0.9); // hump and shoulders
    [-1, 1].forEach((s) => part(q.body, G.box(0.05, 0.3, 0.04), KT.mat('bearV', { color: 0xe8dcc0 }), s * 0.12, q.by + 0.02, 0.86, 0.3, 0, -s * 0.5));
    part(q.head, G.sph(0.3, 12, 10), fur, 0, 0, 0.12);
    part(q.head, G.sph(0.15, 10, 8), pale, 0, -0.06, 0.38, 0, 0, 0, 0.9, 0.8, 1);
    part(q.head, G.sph(0.05, 6, 5), M().black, 0, -0.02, 0.52);
    [-1, 1].forEach((s) => {
      part(q.head, G.sph(0.11, 8, 6), fur, s * 0.22, 0.24, 0.02);
      part(q.head, G.sph(0.03, 6, 5), M().eyeDark, s * 0.12, 0.08, 0.36);
    });
    bakeStatic(q.body);
    q.g.userData.radius = 1.0;
    q.g.userData.kind = 'bear';
    return q.g;
  };
  // a spotted coat (leopard rosettes)
  function spottedMat(key, base, spot, seed) {
    if (coats[key]) return coats[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    const rng = KT.makeRng(seed || 7);
    for (let i = 0; i < 70; i++) {
      const x = rng() * 128, y = rng() * 256, r = 4 + rng() * 4;
      g.strokeStyle = spot; g.lineWidth = 2.6;
      g.beginPath(); g.arc(x, y, r, rng() * 2, rng() * 2 + 4.6); g.stroke();
      if (rng() < 0.4) { g.fillStyle = spot; g.beginPath(); g.arc(x + r * 1.6, y + r, 1.8, 0, 7); g.fill(); }
    }
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return (coats[key] = new T.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  }
  // big cats share a build: lion (male with a mane), lioness, leopard
  function bigCat(kind, coat, size) {
    const k = size || 1;
    const pale = KT.mat(kind + 'Pale', { color: kind === 'leopard' ? 0xf1e6cc : 0xe6d2a8 });
    const q = quadruped({ bodyR: 0.36 * k, bodyLen: 1.25 * k, legLen: 0.62 * k, legR: 0.09 * k, neckRise: 0.2 * k, mat: coat, hoofMat: pale, tailLen: 0.95 * k });
    part(q.body, G.sph(0.28 * k, 10, 8), pale, 0, q.by - 0.18 * k, 0.05, 0, 0, 0, 0.9, 0.5, 2.1);
    part(q.body, G.sph(0.34 * k, 10, 8), coat, 0, q.by + 0.04 * k, 0.6 * k, 0, 0, 0, 1.05, 1, 0.9);
    part(q.head, G.sph(0.26 * k, 14, 10), coat, 0, 0, 0.12 * k, 0, 0, 0, 1.05, 0.95, 1.05);
    part(q.head, G.sph(0.16 * k, 10, 8), pale, 0, -0.08 * k, 0.3 * k, 0, 0, 0, 1.1, 0.75, 0.85);
    part(q.head, G.sph(0.045 * k, 6, 5), KT.mat('catNose', { color: 0x3a2622 }), 0, -0.02 * k, 0.44 * k);
    [-1, 1].forEach((s) => {
      part(q.head, G.sph(0.08 * k, 8, 6), coat, s * 0.17 * k, 0.21 * k, 0.03, 0, 0, 0, 1, 1, 0.5);
      part(q.head, G.sph(0.034 * k, 6, 5), KT.mat('catEye', { color: 0xb59a3a, roughness: 0.3 }), s * 0.1 * k, 0.07 * k, 0.33 * k);
      part(q.head, G.sph(0.017 * k, 5, 4), M().eyeDark, s * 0.1 * k, 0.07 * k, 0.355 * k);
    });
    if (kind === 'lion') {
      // the mane: a ruff of dark gold round the head and down the chest
      const mane = KT.mat('lionMane', { color: 0x7a4e24, roughness: 1 }), mane2 = KT.mat('lionMane2', { color: 0xa8763c, roughness: 1 });
      part(q.head, G.sph(0.44 * k, 14, 10), mane, 0, -0.02, -0.08 * k, 0, 0, 0, 1, 1.05, 0.85);
      part(q.head, G.sph(0.36 * k, 12, 10), mane2, 0, 0.02, 0.0, 0, 0, 0, 1.05, 1.05, 0.8);
      part(q.body, G.sph(0.32 * k, 10, 8), mane, 0, q.by + 0.02, 0.72 * k, 0, 0, 0, 1, 1.2, 0.9);
    }
    const tl = q.g.userData.tail;
    if (kind === 'leopard') tl.children[0].material = coat;
    else part(tl, G.sph(0.07 * k, 6, 5), KT.mat('lionTuft', { color: 0x3a2a1a }), 0, -0.95 * k, 0, 0, 0, 0, 1, 1.6, 1);
    tl.rotation.x = 0.9;
    bakeStatic(q.body);
    q.g.userData.radius = 1.0 * k;
    q.g.userData.kind = kind;
    return q.g;
  }
  Models.lion = (female) => bigCat('lion', KT.mat(female ? 'lioness' : 'lionCoat', { color: female ? 0xc79a5e : 0xc28f55, roughness: 0.9 }), female ? 0.92 : 1.05);
  Models.leopard = () => bigCat('leopard', spottedMat('leopardCoat', '#d6a24a', '#2a1c10', 31), 0.82);

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
    if (opts.mane) part(head, G.torus(0.17 * k, 0.07 * k, 6, 14), opts.mane, 0, -0.01 * k, 0.04 * k, 0, 0, 0, 1.05, 1.15, 1);
    if (opts.cheeks) [-1, 1].forEach((s) => part(head, G.sph(0.09 * k, 8, 6), opts.face, s * 0.15 * k, 0, 0.04 * k, 0, 0, 0, 0.6, 1.1, 0.5));
    const legs = [];
    [[-1, sh, 0.22, sh], [1, sh, 0.22, sh], [-1, hip, -0.2, hip], [1, hip, -0.2, hip]].forEach(([s, y, z, len]) => {
      legs.push(leg(g, s * 0.2 * k, y, z * k, len, 0.065 * k, 0.05 * k, fur, opts.hands));
    });
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
  Models.orangutan = (baby) => primate({ kind: 'orangutan', size: 1.5, fur: KT.mat('orangFur', { color: 0xb4501e, roughness: 1 }), face: KT.mat('orangFace', { color: 0x4a3328 }), hands: KT.mat('orangFace', { color: 0x4a3328 }), cheeks: true, baby });
  Models.lionTailedMacaque = () => primate({ kind: 'macaque', size: 0.8, fur: KT.mat('ltmFur', { color: 0x1a1a1a, roughness: 1 }), headFur: KT.mat('ltmFur', { color: 0x1a1a1a, roughness: 1 }), face: KT.mat('ltmFace', { color: 0x2c2420 }), mane: KT.mat('ltmMane', { color: 0xc9c4ba, roughness: 1 }), tail: 0.6 });

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
  const HPI = Math.PI / 2;
})();
