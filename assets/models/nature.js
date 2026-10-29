// Trees & plants: coconut palm, banana, areca, mango, jackfruit, banyan,
// tea bush, mangrove, flowering bush, rocks, grass & flowers.
// Every builder returns a THREE.Group whose origin sits on the ground.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};

  // A bendy frond card: plane bent downwards along its length with a V fold.
  function frondGeometry(width, length, droop, fold) {
    const g = new T.PlaneGeometry(width, length, 2, 6);
    g.translate(0, length / 2, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i);
      const t = y / length;
      // lay frond out along +z, rising then drooping
      const z = y;
      const yy = Math.sin(t * Math.PI * 0.55) * length * 0.25 - t * t * droop;
      P.setXYZ(i, x, yy + Math.abs(x) * fold, z);
    }
    g.computeVertexNormals();
    return g;
  }

  // Curved tapering trunk using a tube whose radius shrinks with height.
  function trunkGeometry(points, r0, r1, radial) {
    const curve = new T.CatmullRomCurve3(points);
    const tub = 16, rad = radial || 12;
    const g = new T.TubeGeometry(curve, tub, 1, rad, false);
    const P = g.attributes.position;
    const c = new T.Vector3(), v = new T.Vector3();
    for (let i = 0; i <= tub; i++) {
      const t = i / tub;
      curve.getPointAt(t, c);
      const r = KT.lerp(r0, r1, t);
      for (let j = 0; j <= rad; j++) {
        const k = i * (rad + 1) + j;
        v.fromBufferAttribute(P, k).sub(c).multiplyScalar(r).add(c);
        P.setXYZ(k, v.x, v.y, v.z);
      }
    }
    // uv: v along height for bark rings
    const U = g.attributes.uv;
    for (let k = 0; k < U.count; k++) U.setXY(k, U.getX(k) * 2, U.getY(k));
    g.computeVertexNormals();
    return g;
  }

  Models.coconutPalm = function (seed) {
    const rng = KT.makeRng(seed || 3);
    const g = new T.Group();
    const h = 8.5;
    const lean = 1.2 + rng() * 0.6;
    const pts = [
      new T.Vector3(0, 0, 0), new T.Vector3(lean * 0.1, h * 0.3, 0),
      new T.Vector3(lean * 0.45, h * 0.65, 0), new T.Vector3(lean, h, 0)
    ];
    const trunk = new T.Mesh(trunkGeometry(pts, 0.3, 0.18), KT.M.palmBark);
    // bark uv: stretch rings along height
    const U = trunk.geometry.attributes.uv;
    for (let k = 0; k < U.count; k++) U.setXY(k, U.getX(k) * 0.5, U.getY(k) * 1.0);
    g.add(trunk);
    // root flare
    part(g, G.cyl(0.32, 0.5, 0.5, 8), KT.M.palmBark, 0, 0.2, 0);
    const top = new T.Group();
    top.position.set(lean, h, 0);
    g.add(top);
    const fg = frondGeometry(1.6, 4.6, 2.6, 0.25);
    const n = 11;
    for (let i = 0; i < n; i++) {
      const f = new T.Mesh(fg, KT.M.frond);
      f.rotation.y = (i / n) * Math.PI * 2 + rng() * 0.3;
      f.rotation.x = -0.25 + rng() * 0.35 - (i % 2) * 0.25;
      top.add(f);
    }
    for (let i = 0; i < 3; i++) {
      const f = new T.Mesh(frondGeometry(1.0, 2.6, 0.2, 0.2), KT.M.frond);
      f.rotation.y = i * 2.1;
      f.rotation.x = -1.0;
      top.add(f);
    }
    // coconuts
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(top, G.sph(0.2, 8, 6), KT.M.coconut, Math.cos(a) * 0.32, -0.35 - (i % 2) * 0.15, Math.sin(a) * 0.32);
    }
    part(top, G.sph(0.3, 8, 6), KT.M.barkLight, 0, -0.1, 0, 0, 0, 0, 1, 0.6, 1);
    return KT.bake(g);
  };

  // Distant palm: same silhouette with a fraction of the triangles.
  Models.coconutPalmLow = function (seed) {
    const rng = KT.makeRng(seed || 3);
    const g = new T.Group();
    const h = 8.5;
    const lean = 1.2 + rng() * 0.6;
    const pts = [new T.Vector3(0, 0, 0), new T.Vector3(lean * 0.1, h * 0.3, 0), new T.Vector3(lean * 0.45, h * 0.65, 0), new T.Vector3(lean, h, 0)];
    const curve = new T.CatmullRomCurve3(pts);
    g.add(new T.Mesh(new T.TubeGeometry(curve, 5, 0.22, 5, false), KT.M.palmBark));
    const top = new T.Group();
    top.position.set(lean, h, 0);
    g.add(top);
    const fg = new T.PlaneGeometry(1.6, 4.6, 1, 3);
    fg.translate(0, 2.3, 0);
    const P = fg.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i), t = y / 4.6;
      P.setXYZ(i, P.getX(i), Math.sin(t * Math.PI * 0.55) * 1.15 - t * t * 2.6, y);
    }
    fg.computeVertexNormals();
    for (let i = 0; i < 8; i++) {
      const f = new T.Mesh(fg, KT.M.frond);
      f.rotation.y = (i / 8) * Math.PI * 2;
      f.rotation.x = -0.2;
      top.add(f);
    }
    return KT.bake(g);
  };

  Models.arecaPalm = function () {
    const g = new T.Group();
    const h = 10;
    part(g, G.cyl(0.11, 0.14, h, 7), KT.M.barkLight, 0, h / 2, 0);
    // green crown shaft
    part(g, G.cyl(0.13, 0.13, 1.4, 7), KT.M.leafLight, 0, h + 0.6, 0);
    const top = new T.Group();
    top.position.set(0, h + 1.2, 0);
    g.add(top);
    const fg = frondGeometry(1.1, 2.8, 1.4, 0.2);
    for (let i = 0; i < 7; i++) {
      const f = new T.Mesh(fg, KT.M.frond);
      f.rotation.y = (i / 7) * Math.PI * 2;
      f.rotation.x = -0.6;
      top.add(f);
    }
    for (let i = 0; i < 5; i++) part(g, G.sph(0.08, 6, 4), KT.M.orange, Math.cos(i) * 0.18, h - 0.1, Math.sin(i) * 0.18);
    return KT.bake(g);
  };

  Models.bananaTree = function () {
    const g = new T.Group();
    part(g, G.cyl(0.16, 0.22, 2.4, 8), KT.mat('bananaStem', { color: 0x7d8f45 }), 0, 1.2, 0);
    const leafG = frondGeometry(1.0, 2.8, 1.6, 0.05);
    for (let i = 0; i < 7; i++) {
      const l = new T.Mesh(leafG, KT.M.banana);
      l.position.y = 2.3;
      l.rotation.y = (i / 7) * Math.PI * 2 + i * 0.3;
      l.rotation.x = -0.9 + (i % 3) * 0.25;
      g.add(l);
    }
    // bunch of bananas + purple flower
    const bunch = new T.Group();
    bunch.position.set(0.35, 1.9, 0);
    g.add(bunch);
    for (let i = 0; i < 4; i++) part(bunch, G.cyl(0.18 - i * 0.02, 0.18 - i * 0.02, 0.18, 8), KT.mat('bananaFruit', { color: 0x9fb83a }), 0, -i * 0.2, 0);
    part(bunch, G.cone(0.08, 0.3, 6), KT.M.purple, 0, -0.95, 0, Math.PI);
    return KT.bake(g);
  };

  // Crossed alpha-tested leaf cards that break up a canopy's silhouette.
  const cardGeo = new T.PlaneGeometry(1, 1);
  function leafCards(g, x, y, z, size, seed) {
    for (let k = 0; k < 3; k++) {
      const c = new T.Mesh(cardGeo, KT.M.foliage);
      c.position.set(x, y + (k - 1) * size * 0.12, z);
      c.rotation.set((k === 2 ? Math.PI / 2 : 0.2), k * Math.PI / 3 + seed, 0);
      c.scale.set(size * 2, size * 1.6, 1);
      c.castShadow = true;
      g.add(c);
    }
  }

  function canopyTree(opts) {
    const g = new T.Group();
    const rng = KT.makeRng(opts.seed || 5);
    const th = opts.trunkH;
    part(g, G.cyl(opts.trunkR * 0.7, opts.trunkR, th, 8), KT.M.bark, 0, th / 2, 0);
    // a few branches
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      part(g, G.cyl(opts.trunkR * 0.25, opts.trunkR * 0.45, th * 0.6, 6), KT.M.bark,
        Math.cos(a) * 0.5, th * 0.95, Math.sin(a) * 0.5, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    }
    const mats = [KT.M.leaf, KT.M.leafDark, KT.M.leafLight];
    for (let i = 0; i < opts.blobs; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * opts.spread;
      const s = opts.blobR * (0.7 + rng() * 0.5);
      const bx = Math.cos(a) * r, by = th + opts.blobR * 0.6 + rng() * opts.blobR * 0.9, bz = Math.sin(a) * r;
      part(g, KT.blob(s, opts.detail === undefined ? 2 : opts.detail, 0.16, i + (opts.seed || 1)), mats[i % 3], bx, by, bz, 0, 0, 0, 1, 0.8, 1);
      leafCards(g, bx, by, bz, s * 1.25, i);
    }
    return g;
  }

  Models.mangoTree = function () {
    const g = canopyTree({ trunkH: 2.6, trunkR: 0.32, blobs: 9, blobR: 1.6, spread: 1.8, seed: 11 });
    for (let i = 0; i < 8; i++) {
      const a = i * 0.8;
      part(g, G.sph(0.12, 6, 5), KT.mat('mango', { color: 0xe7b521 }), Math.cos(a) * 2.2, 3.2 + (i % 3) * 0.6, Math.sin(a) * 2.2, 0, 0, 0, 0.8, 1.2, 0.8);
    }
    return KT.bake(g);
  };

  Models.jackfruitTree = function () {
    const g = canopyTree({ trunkH: 3.4, trunkR: 0.35, blobs: 7, blobR: 1.5, spread: 1.3, seed: 21 });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      part(g, G.sph(0.28, 8, 6), KT.mat('jackfruit', { color: 0x9aae3c, flatShading: true }), Math.cos(a) * 0.4, 1.4 + (i % 3) * 0.6, Math.sin(a) * 0.4, 0, 0, 0, 0.9, 1.4, 0.9);
    }
    return KT.bake(g);
  };

  Models.banyanTree = function () {
    const g = canopyTree({ trunkH: 3.5, trunkR: 0.9, blobs: 16, blobR: 2.6, spread: 5.5, seed: 31, detail: 1 });
    const rng = KT.makeRng(77);
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2, r = 1.5 + rng() * 5;
      const len = 3 + rng() * 1.8;
      part(g, G.cyl(0.04, 0.07, len, 4), KT.M.barkLight, Math.cos(a) * r, 5.4 - len / 2, Math.sin(a) * r);
    }
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26;
      part(g, G.cyl(0.25, 0.45, 1.2, 6), KT.M.bark, Math.cos(a) * 0.9, 0.3, Math.sin(a) * 0.9, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    }
    return KT.bake(g);
  };

  Models.forestTree = function (seed) {
    const g = new T.Group();
    const h = 7;
    part(g, G.cyl(0.22, 0.4, h, 7), KT.M.bark, 0, h / 2, 0);
    for (let i = 0; i < 4; i++) {
      part(g, KT.blob(2.2 - i * 0.35, 1, 0.18, (seed || 1) + i), i % 2 ? KT.M.leafDark : KT.M.leaf, 0, h - 1 + i * 1.4, 0, 0, i, 0, 1, 0.65, 1);
      leafCards(g, 0, h - 1 + i * 1.4, 0, (2.2 - i * 0.35) * 1.1, i);
    }
    return KT.bake(g);
  };

  Models.teaBush = function () {
    const g = new T.Group();
    part(g, KT.blob(0.5, 1, 0.1, 3), KT.M.teaLeaf, 0, 0.45, 0, 0, 0, 0, 1.5, 0.78, 1.3);
    return KT.bake(g);
  };

  Models.mangrove = function () {
    const g = new T.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      part(g, G.cyl(0.05, 0.08, 1.8, 5), KT.M.bark, Math.cos(a) * 0.7, 0.6, Math.sin(a) * 0.7, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    }
    part(g, G.cyl(0.15, 0.22, 2.4, 6), KT.M.bark, 0, 2.2, 0);
    part(g, KT.blob(1.6, 1, 0.22, 4), KT.M.leaf, 0, 3.8, 0, 0, 0, 0, 1.2, 0.7, 1.2);
    part(g, KT.blob(1.1, 1, 0.2, 5), KT.M.leafLight, 0.6, 4.4, 0.3, 0, 0, 0, 1, 0.7, 1);
    return KT.bake(g);
  };

  // Five-lobed blossom as a single light lathe-like disc.
  const flowerGeo = (function () {
    const shape = new T.Shape();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const r = 0.075 * (0.65 + 0.35 * Math.abs(Math.cos(a * 2.5)));
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new T.ExtrudeGeometry(shape, { depth: 0.014, bevelEnabled: false });
  })();

  Models.floweringBush = function (flowerMat) {
    const g = new T.Group();
    const rng = KT.makeRng(9);
    part(g, KT.blob(0.8, 1, 0.18, 7), KT.M.leafDark, 0, 0.6, 0, 0, 0, 0, 1.2, 0.85, 1.2);
    const fm = flowerMat || KT.M.flowerRed;
    for (let i = 0; i < 12; i++) {
      const a = rng() * Math.PI * 2, e = rng() * 1.2;
      const r = 0.92;
      // hibiscus-like blossom: five rounded petals around a golden centre
      const fl = new T.Group();
      fl.position.set(Math.cos(a) * Math.cos(e) * r * 1.2, 0.6 + Math.sin(e) * r * 0.85, Math.sin(a) * Math.cos(e) * r * 1.2);
      fl.lookAt(fl.position.x * 3, fl.position.y * 2, fl.position.z * 3);
      g.add(fl);
      part(fl, flowerGeo, fm, 0, 0, 0);
      part(fl, G.sph(0.022, 4, 3), KT.M.flowerYellow, 0, 0, 0.02);
    }
    return KT.bake(g);
  };

  Models.rock = function (seed) {
    const g = new T.Group();
    part(g, KT.blob(1, 2, 0.22, seed || 2), KT.M.rock, 0, 0.35, 0, 0, 0, 0, 1.2, 0.7, 1);
    return KT.bake(g);
  };

  Models.boulders = function () {
    const g = new T.Group();
    part(g, KT.blob(1.4, 2, 0.2, 12), KT.M.rock, 0, 0.7, 0, 0, 0, 0, 1, 0.9, 1);
    part(g, KT.blob(0.9, 2, 0.2, 13), KT.M.rockMoss, 1.5, 0.45, 0.5);
    part(g, KT.blob(0.6, 2, 0.22, 14), KT.M.rock, -1.1, 0.3, 0.7);
    return KT.bake(g);
  };

  Models.grassTuft = function () {
    const g = new T.Group();
    const geo = new T.ConeGeometry(0.05, 0.6, 3, 1, true);
    geo.translate(0, 0.3, 0);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      part(g, geo, KT.M.grassBlade, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35, 1, 0.8 + (i % 3) * 0.25, 1);
    }
    return KT.bake(g, { castShadow: false });
  };

  Models.flowerPatch = function () {
    const g = new T.Group();
    const geo = new T.ConeGeometry(0.04, 0.4, 3, 1, true);
    geo.translate(0, 0.2, 0);
    const mats = [KT.M.flowerRed, KT.M.flowerYellow, KT.M.flowerPink, KT.M.flowerWhite];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, r = 0.15 + (i % 3) * 0.15;
      part(g, geo, KT.M.grassBlade, Math.cos(a) * r, 0, Math.sin(a) * r);
      part(g, G.ico(0.07, 0), mats[i % 4], Math.cos(a) * r, 0.42, Math.sin(a) * r);
    }
    return KT.bake(g, { castShadow: false });
  };

  Models.fallenLog = function () {
    const g = new T.Group();
    part(g, G.cyl(0.35, 0.4, 4, 9), KT.M.bark, 0, 0.35, 0, 0, 0, Math.PI / 2);
    part(g, G.cyl(0.33, 0.33, 0.02, 9), KT.mat('logEnd', { color: 0xc9a37a }), 2.0, 0.35, 0, 0, 0, Math.PI / 2);
    part(g, KT.blob(0.3, 0, 0.2, 3), KT.M.leafLight, 0.8, 0.7, 0, 0, 0, 0, 1.6, 0.4, 1);
    return KT.bake(g);
  };

  Models.treeStump = function () {
    const g = new T.Group();
    part(g, G.cyl(0.45, 0.6, 0.8, 9), KT.M.bark, 0, 0.4, 0);
    part(g, G.cyl(0.44, 0.44, 0.02, 9), KT.mat('logEnd', { color: 0xc9a37a }), 0, 0.81, 0);
    return KT.bake(g);
  };

  Models.paddyRice = function () {
    const g = new T.Group();
    const geo = new T.ConeGeometry(0.03, 0.7, 3, 1, true);
    geo.translate(0, 0.35, 0);
    const m = KT.mat('rice', { color: 0x9ccc3c, roughness: 0.9, side: T.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(g, geo, m, Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    }
    return KT.bake(g, { castShadow: false });
  };
})();
