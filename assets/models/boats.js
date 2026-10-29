// Boats & water transport: houseboat (kettuvallam), canoe, snake boat
// (chundan vallam), motor boat and ferry. Origin sits at the water line,
// boats point along +z.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;

  // Lofted wooden hull. sheer(t) gives gunwale height along the length.
  function hullGeometry(L, W, depth, sheerFn, widthPow) {
    const N = 28, K = 10;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const z = (t - 0.5) * L;
      const w = W / 2 * Math.pow(Math.max(Math.sin(Math.PI * t), 0.0001), widthPow || 0.55);
      const sheer = sheerFn(t);
      const keel = -depth * Math.pow(Math.sin(Math.PI * t), 0.3) + sheer * 0.15;
      for (let k = 0; k <= K; k++) {
        const a = -Math.PI / 2 + (Math.PI * k) / K;
        const x = w * Math.sin(a);
        const y = keel + (sheer - keel) * (1 - Math.cos(a));
        pos.push(x, y, z);
        uv.push(t * L * 0.4, k / K);
      }
    }
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < K; k++) {
        const a = i * (K + 1) + k, b = a + K + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function hullMat() {
    return KT.mat('hull', { map: KT.tex('wood', 1, 1), color: 0x6e4a2e, side: T.DoubleSide });
  }

  Models.canoe = function () {
    const g = new T.Group();
    const L = 5.6;
    part(g, hullGeometry(L, 0.9, 0.42, (t) => 0.3 + Math.pow(Math.abs(t * 2 - 1), 4) * 0.35), hullMat(), 0, 0, 0);
    part(g, G.box(0.7, 0.04, 0.25), M().woodLight, 0, 0.12, -1.2);
    part(g, G.box(0.75, 0.04, 0.25), M().woodLight, 0, 0.12, 1.2);
    part(g, G.box(0.05, 0.05, L * 0.9), M().woodDark, 0.43, 0.3, 0);
    part(g, G.box(0.05, 0.05, L * 0.9), M().woodDark, -0.43, 0.3, 0);
    return KT.bake(g);
  };

  Models.paddle = function () {
    const g = new T.Group();
    part(g, G.cyl(0.025, 0.025, 1.6, 6), M().woodLight, 0, 0, 0);
    part(g, G.box(0.18, 0.5, 0.03), M().wood, 0, -0.95, 0);
    return g;
  };

  // Kettuvallam: long wooden hull with an arched woven-bamboo cabin.
  Models.houseboat = function () {
    const g = new T.Group();
    const L = 20, W = 4;
    part(g, hullGeometry(L, W, 1.1, (t) => 0.6 + Math.pow(Math.abs(t * 2 - 1), 5) * 1.6, 0.45), hullMat(), 0, 0, 0);
    part(g, G.box(W * 0.85, 0.1, L * 0.78), M().woodLight, 0, 0.55, 0);
    // cabin walls (woven bamboo) with dark windows
    const cabinL = 12.5, cabinW = 3.2, cabinH = 2.0;
    part(g, G.box(cabinW, cabinH, cabinL), M().bamboo, 0, 0.6 + cabinH / 2, -1);
    for (let i = 0; i < 6; i++) {
      const z = -1 - cabinL / 2 + 1.2 + i * 2.0;
      [-1, 1].forEach((s) => {
        part(g, G.box(0.06, 0.8, 1.2), M().windowDark, s * (cabinW / 2 + 0.02), 1.75, z);
        part(g, G.box(0.08, 0.1, 1.3), M().woodDark, s * (cabinW / 2 + 0.04), 2.2, z);
      });
    }
    // arched thatched roofs (two sections, front one higher)
    const roofGeo = (len, r) => {
      const geo = new T.CylinderGeometry(r, r, len, 16, 1, true, -Math.PI / 2, Math.PI);
      geo.rotateX(-Math.PI / 2);
      return geo;
    };
    part(g, roofGeo(8.5, 2.1), M().thatch, 0, 2.3, -3.3, 0, 0, 0, 1, 0.75, 1);
    part(g, roofGeo(6.5, 2.25), M().thatch, 0, 2.35, 4.0, 0, 0, 0, 1, 0.85, 1);
    // ribs
    for (let i = 0; i < 7; i++) part(g, G.torus(2.12, 0.05, 4, 12, Math.PI), M().woodDark, 0, 2.3, -7.4 + i * 2.6, 0, 0, 0, 1, 0.78, 1);
    // front open sitting deck with railing & chairs
    for (let i = 0; i < 9; i++) [-1, 1].forEach((s) => part(g, G.box(0.06, 0.7, 0.06), M().woodDark, s * 1.55, 0.95, 5.6 + i * 0.4));
    [-1, 1].forEach((s) => part(g, G.box(0.08, 0.08, 3.6), M().woodDark, s * 1.55, 1.3, 7.2));
    [[-0.7, 6.4], [0.7, 6.4], [0, 7.6]].forEach((p) => {
      part(g, G.box(0.6, 0.08, 0.6), M().red, p[0], 1.0, p[1]);
      part(g, G.box(0.6, 0.6, 0.08), M().woodDark, p[0], 1.3, p[1] - 0.3);
    });
    // lanterns & life rings
    part(g, G.box(0.2, 0.3, 0.2), M().lampGlow, 0, 2.6, 7.8);
    part(g, G.torus(0.35, 0.09, 6, 14), M().orange, 1.62, 1.6, 2.5, 0, Math.PI / 2);
    // rudder pole at stern
    part(g, G.cyl(0.06, 0.06, 2.2, 6), M().woodDark, 0, 1.6, -9.1, 0.4);
    const baked = KT.bake(g);
    baked.userData.radius = 10;
    return baked;
  };

  Models.snakeBoat = function () {
    const g = new T.Group();
    const L = 32;
    // tall stern at t=0, low bow at t=1
    part(g, hullGeometry(L, 1.3, 0.5, (t) => 0.3 + Math.pow(1 - t, 7) * 5.0 + Math.pow(t, 10) * 0.6, 0.4), hullMat(), 0, 0, 0);
    // brass decoration on the stern
    part(g, G.cyl(0.12, 0.05, 1.2, 6), M().brass, 0, 5.4, -15.6, -0.5);
    part(g, G.box(0.2, 0.2, 1.2), M().red, 0, 4.9, -15.3);
    // flag
    part(g, G.cyl(0.03, 0.03, 2.2, 5), M().woodDark, 0, 2.0, -11);
    part(g, G.plane(1.0, 0.6), M().red, 0.5, 2.8, -11, 0, Math.PI / 2);
    const baked = KT.bake(g);
    // rowers (not baked so their oars can animate)
    const crew = new T.Group();
    baked.add(crew);
    const shirt = KT.mat('rowerShirt', { color: 0xf1ede2 });
    const head = KT.mat('rowerHead', { color: 0x9a6643 });
    const band = KT.mat('rowerBand', { color: 0xd02e2e });
    const oars = [];
    for (let i = 0; i < 16; i++) {
      const z = -10 + i * 1.45;
      [-1, 1].forEach((s) => {
        const r = new T.Group();
        r.position.set(s * 0.3, 0.35, z);
        crew.add(r);
        part(r, G.cyl(0.12, 0.16, 0.55, 6), shirt, 0, 0.3, 0);
        part(r, G.sph(0.12, 8, 6), head, 0, 0.7, 0);
        part(r, G.cyl(0.125, 0.125, 0.05, 8), band, 0, 0.76, 0);
        const oar = new T.Group();
        oar.position.set(s * 0.25, 0.45, 0);
        r.add(oar);
        part(oar, G.cyl(0.02, 0.02, 1.4, 4), M().woodLight, s * 0.35, -0.45, 0, 0, 0, s * 0.6);
        part(oar, G.box(0.12, 0.35, 0.03), M().wood, s * 0.72, -1.0, 0, 0, Math.PI / 2, s * 0.6);
        oars.push({ g: oar, s: s, i: i });
      });
    }
    baked.userData.oars = oars;
    baked.userData.radius = 16;
    return baked;
  };

  Models.motorBoat = function () {
    const g = new T.Group();
    part(g, hullGeometry(7, 2.2, 0.7, (t) => 0.45 + Math.pow(t, 6) * 0.5, 0.5), KT.mat('hullWhite', { color: 0xf3f3f0, side: T.DoubleSide }), 0, 0, 0);
    part(g, hullGeometry(7.05, 2.25, 0.3, (t) => -0.05 + Math.pow(t, 6) * 0.2, 0.5), KT.mat('hullBlue', { color: 0x1f5aa6, side: T.DoubleSide }), 0, 0, 0);
    part(g, G.box(1.8, 0.06, 5), M().woodLight, 0, 0.3, 0);
    [[-0.8, -1.5], [0.8, -1.5], [-0.8, 1], [0.8, 1]].forEach((p) => part(g, G.cyl(0.04, 0.04, 1.6, 5), M().white, p[0], 1.1, p[1]));
    part(g, G.box(2.0, 0.1, 3.0), KT.mat('canopyBlue', { color: 0x2a73c2 }), 0, 1.9, -0.25);
    part(g, G.box(1.4, 0.4, 0.6), M().white, 0, 0.55, -1.8);
    return KT.bake(g);
  };

  Models.ferryBoat = function () {
    const g = new T.Group();
    part(g, hullGeometry(12, 3.6, 1.0, (t) => 0.6 + Math.pow(t, 6) * 0.4, 0.35), KT.mat('ferryBlue', { color: 0x234f8f, side: T.DoubleSide }), 0, 0, 0);
    part(g, G.box(3.2, 0.12, 9), M().woodLight, 0, 0.55, 0);
    part(g, G.box(3.0, 1.8, 7), M().white, 0, 1.5, -0.6);
    for (let i = 0; i < 6; i++) [-1, 1].forEach((s) => part(g, G.box(0.06, 0.7, 0.8), M().glass, s * 1.52, 1.8, -3.4 + i * 1.12));
    part(g, G.box(3.4, 0.15, 8), KT.mat('ferryRoof', { color: 0xe6e3da }), 0, 2.5, -0.6);
    part(g, G.box(1.4, 0.9, 1.2), M().white, 0, 3.0, 2.2);
    part(g, G.torus(0.35, 0.09, 6, 14), M().orange, 1.62, 1.6, 3.2, 0, Math.PI / 2);
    return KT.bake(g);
  };
})();
