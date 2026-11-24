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

  // ------------------------------------------------------ coconut trees
  // A Kerala coconut tree: a tall, slender, ringed grey trunk with a gentle
  // curve, a crown of long feather fronds (young ones standing up, the
  // middle ones arching out, old ones drooping, a dry brown one or two
  // hanging down the trunk) with their leaflets folded down in a V, and
  // bunches of green, yellow and orange coconuts under the crown.
  const frondMats = {};
  function frondTex(dead) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 512;
    const g = c.getContext('2d'), rng = KT.makeRng(dead ? 71 : 17);
    const greens = dead ? ['#8a6a3a', '#9c7a44', '#7a5a30'] : ['#3f7d2a', '#4b8a2e', '#57963a', '#356d24'];
    // leaflets: thin blades from the midrib towards the tip (the tip is at the top)
    for (let y = 504; y > 8; y -= 5.5) {
      const t = 1 - y / 512, L = (0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, t * 1.08))) * 60;
      [-1, 1].forEach((sd) => {
        if (rng() < 0.07) return; // (a torn gap)
        g.fillStyle = greens[Math.floor(rng() * greens.length)];
        g.beginPath();
        g.moveTo(64, y + 1.5); g.lineTo(64, y - 1.5);
        g.lineTo(64 + sd * L, y - L * 0.6 - 1); g.lineTo(64 + sd * L * 0.96, y - L * 0.6 + 1.2);
        g.closePath(); g.fill();
        if (!dead && rng() < 0.4) { g.fillStyle = 'rgba(200,190,90,0.6)'; g.fillRect(64 + sd * L * 0.85 - 1, y - L * 0.6 - 1, 3, 2); }
      });
    }
    // the midrib
    g.fillStyle = dead ? '#6a4a26' : '#b5ad58'; g.fillRect(62, 0, 4, 512);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    return t;
  }
  function frondMat(dead) {
    const k = dead ? 'dead' : 'live';
    if (frondMats[k]) return frondMats[k];
    const m = KT.mat(dead ? 'coconutFrondDry' : 'coconutFrond', { map: frondTex(dead), alphaTest: 0.4, side: T.DoubleSide, roughness: 0.75 });
    KT.addWind(m, 0.015);
    frondMats[k] = m;
    return m;
  }
  // one frond along +z: rising at `pitch`, bending down by `droop`, its two
  // rows of leaflets folded down by `fold`
  const frondGeos = {};
  function coconutFrond(len, pitch, droop, fold, segs) {
    const key = [len, pitch, droop, fold, segs].join(':');
    if (frondGeos[key]) return frondGeos[key];
    const pos = [], uv = [], idx = [], N = segs || 8, W = 1.05;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const z = len * Math.cos(pitch) * t, y = len * (Math.sin(pitch) * t - droop * t * t);
      const w = W * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)), 0.6);
      pos.push(-w * Math.cos(fold), y - w * Math.sin(fold), z, 0, y + 0.03, z, w * Math.cos(fold), y - w * Math.sin(fold), z);
      uv.push(0, t, 0.5, t, 1, t);
      if (i) { const a = (i - 1) * 3, b = i * 3; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    frondGeos[key] = geo;
    return geo;
  }
  function coconutTree(seed, low) {
    const rng = KT.makeRng(seed || 3);
    const g = new T.Group();
    const h = 11 + rng() * 4, lean = 1.2 + rng() * 1.6, bow = (rng() - 0.5) * 1.2;
    const pts = [new T.Vector3(0, 0, 0), new T.Vector3(lean * 0.04, h * 0.25, bow * 0.3), new T.Vector3(lean * 0.3, h * 0.55, bow * 0.6),
      new T.Vector3(lean * 0.7, h * 0.82, bow * 0.5), new T.Vector3(lean, h, bow * 0.3)];
    let trunk;
    if (low) trunk = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 6, 0.2, 5, false), KT.M.palmBark);
    else {
      trunk = new T.Mesh(trunkGeometry(pts, 0.27, 0.16, 9), KT.M.palmBark);
      const U = trunk.geometry.attributes.uv;
      for (let k = 0; k < U.count; k++) U.setXY(k, U.getX(k) * 0.5, U.getY(k) * h / 4);
      part(g, G.cyl(0.3, 0.46, 0.45, 9), KT.M.palmBark, 0, 0.18, 0); // the swollen foot
    }
    g.add(trunk);
    const top = new T.Group();
    top.position.copy(pts[4]);
    g.add(top);
    const live = low ? KT.M.frond : frondMat(false), dry = frondMat(true);
    const segs = low ? 4 : 8;
    // [count, pitch, droop, fold, length] from the youngest to the oldest
    const tiers = low ? [[3, 1.0, 0.3, 0.5, 4.2], [6, 0.35, 0.6, 0.6, 4.8], [4, -0.15, 0.75, 0.7, 4.6]]
      : [[5, 1.05, 0.3, 0.5, 4.2], [9, 0.4, 0.6, 0.6, 5.0], [8, -0.1, 0.75, 0.7, 4.8]];
    let k = 0;
    tiers.forEach(([n, pitch, droop, fold, len], ti) => {
      for (let i = 0; i < n; i++, k++) {
        const f = new T.Mesh(coconutFrond(len, pitch, droop, fold, segs), live);
        f.rotation.y = k * 2.39996 + rng() * 0.3; // (the golden angle: evenly round)
        f.position.y = -ti * 0.12;
        top.add(f);
      }
    });
    if (!low) {
      // dry fronds hanging down the trunk
      for (let i = 0; i < 2; i++) {
        const f = new T.Mesh(coconutFrond(4.2, -1.15, 0.12, 0.35, 5), dry);
        f.rotation.y = rng() * 6.28; f.position.y = -0.4;
        top.add(f);
      }
      // the coconuts, in two bunches under the crown
      const nutM = [KT.mat('nutGreen', { color: 0x5f7d1f, roughness: 0.55 }), KT.mat('nutYellow', { color: 0xc9a22c, roughness: 0.55 }), KT.mat('nutOrange', { color: 0xc8752c, roughness: 0.6 })];
      for (let b = 0; b < 2; b++) {
        const a0 = b * Math.PI + rng();
        const m = nutM[Math.floor(rng() * 3)];
        for (let i = 0; i < 6; i++) {
          const a = a0 + (i - 2.5) * 0.35;
          part(top, G.sph(0.2, 7, 5), m, Math.cos(a) * 0.42, -0.45 - (i % 2) * 0.22, Math.sin(a) * 0.42, 0, 0, 0, 1, 1.15, 1);
        }
      }
      part(top, G.sph(0.32, 8, 6), KT.mat('crownHeart', { color: 0x6d6a3a, roughness: 0.8 }), 0, -0.05, 0, 0, 0, 0, 1, 0.7, 1);
    }
    g.userData.palmTrunk = pts.map((p) => p.toArray()); // (for climbing it)
    return KT.bake(g);
  }
  Models.coconutPalm = function (seed) { return coconutTree(seed, false); };
  // Distant tree: the same shape with a fraction of the triangles.
  Models.coconutPalmLow = function (seed) { return coconutTree(seed, true); };

  // A patch of short grass: a few dozen fine blades a hand high, to carpet
  // the ground close around you.
  let grassTex = null;
  Models.shortGrass = function () {
    // (colour from a little texture: dark at the root, fresh at the tip, a
    // different green in each column; merged models keep only uvs)
    if (!grassTex) {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 16;
      const g = c.getContext('2d');
      const tips = ['#7fae45', '#6a9e3a', '#8bb84e', '#5e9234', '#9cbf5a', '#72a640', '#668f35', '#84b048'];
      for (let i = 0; i < 8; i++) {
        const gr = g.createLinearGradient(0, 16, 0, 0);
        gr.addColorStop(0, '#4d6e2c'); gr.addColorStop(1, tips[i]);
        g.fillStyle = gr; g.fillRect(i, 0, 1, 16);
      }
      grassTex = new T.CanvasTexture(c);
      grassTex.encoding = T.sRGBEncoding;
      grassTex.magFilter = T.NearestFilter;
    }
    const pos = [], uv = [], rng = KT.makeRng(404);
    for (let i = 0; i < 60; i++) {
      const a = rng() * 6.28, r = Math.sqrt(rng()) * 0.8, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = 0.06 + rng() * 0.12, w = 0.025 + rng() * 0.02, ry = rng() * 6.28, lean = (rng() - 0.5) * 0.12;
      const cx = Math.cos(ry) * w, cz = Math.sin(ry) * w, u = (Math.floor(rng() * 8) + 0.5) / 8;
      pos.push(x - cx, 0, z - cz, x + cx, 0, z + cz, x + lean, h, z + lean * 0.5);
      uv.push(u, 0.05, u, 0.05, u, 0.95);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    // (normals straight up: lit like the ground beneath)
    geo.setAttribute('normal', new T.Float32BufferAttribute(pos.map((v, i) => (i % 3 === 1 ? 1 : 0)), 3));
    const m = KT.mat('shortGrass', { map: grassTex, side: T.DoubleSide, roughness: 0.95 });
    const g = new T.Group();
    g.add(new T.Mesh(geo, m));
    return g;
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
