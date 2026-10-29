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
    g.userData.animate = function (t, moving, speed) {
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

  Models.deer = function () {
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
})();
