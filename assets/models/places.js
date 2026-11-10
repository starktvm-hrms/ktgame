// Kerala attractions with their own models: Kuttanad's paddy below the
// water line, Marari's fishing boats, Kollam's Gandhi park and breakwater,
// Illikkal Kallu's umbrella rock, Eravikulam's grass hills with Nilgiri
// tahr, Marayoor's sandalwood and dolmens, Kochi's Marine Drive with the
// Rainbow Bridge, Parambikulam's giant teak, Kottakkunnu's hill park,
// Beypore's uru (dhow) yard, Kadalundi's railway bridge, Parassinikkadavu's
// snake park, the Thrissur zoo aviary, Chembra's heart-shaped lake, the
// Malampuzha Yakshi and ropeway, Thenmala's hanging bridge, the Mananchira
// tank and others. Every model faces +z (towards the road) with its origin
// on the ground at its centre.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;
  const mt = (n, c, r, extra) => KT.mat('pl_' + n, Object.assign({ color: c, roughness: r === undefined ? 0.85 : r }, extra || {}));
  const water = () => (KT.Highway && KT.Highway.waterMaterial ? KT.Highway.waterMaterial() : mt('water', 0x3d7f8a, 0.15));

  function canvasTex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry || rx);
    return t;
  }
  function add(g, obj, x, y, z, rot, s) {
    obj.position.set(x, y, z);
    obj.rotation.y = rot || 0;
    if (s) obj.scale.setScalar(s);
    g.add(obj);
    return obj;
  }
  function rail(g, x0, z0, x1, z1, y, h, mat) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= n; i++) part(g, G.box(0.08, h, 0.08), mat, KT.lerp(x0, x1, i / n), y + h / 2, KT.lerp(z0, z1, i / n));
    part(g, G.box(0.07, 0.07, len), mat, (x0 + x1) / 2, y + h, (z0 + z1) / 2, 0, ang, 0);
    part(g, G.box(0.05, 0.05, len), mat, (x0 + x1) / 2, y + h * 0.5, (z0 + z1) / 2, 0, ang, 0);
  }
  function waterPlane(g, w, d, x, y, z) {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), water());
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }
  function waterDiscM(g, r, x, y, z, sx, sz) {
    const m = new T.Mesh(new T.CircleGeometry(r, 36), water());
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.scale.set(sx || 1, sz || 1, 1);
    g.add(m);
    return m;
  }
  let sprayTex = null;
  function mist(g, x, y, z, s, op) {
    if (!sprayTex) sprayTex = canvasTex(64, 64, (c, w) => {
      const gr = c.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, w);
    });
    const sp = new T.Sprite(new T.SpriteMaterial({ map: sprayTex, transparent: true, depthWrite: false, opacity: op || 0.5 }));
    sp.position.set(x, y, z);
    sp.scale.set(s, s * 0.5, 1);
    g.add(sp);
    return sp;
  }
  // a big sign board on two posts
  function bigSign(lines, w, bg) {
    const g = new T.Group();
    const sm = KT.signMaterial(lines, { width: 900, height: 240, bg: bg || '#1f5f3f', color: '#fff6d8', borderColor: '#d4a434' });
    const board = new T.Mesh(G.box(w || 5, (w || 5) * 0.27, 0.12), [M().woodDark, M().woodDark, M().woodDark, M().woodDark, sm, sm]);
    board.position.y = 2.6;
    board.userData.noBake = true;
    g.add(board);
    [-1, 1].forEach((s) => part(g, G.box(0.16, 2.6, 0.16), M().woodDark, s * (w || 5) * 0.42, 1.3, 0));
    return g;
  }
  Models.placeSign = bigSign;

  // ------------------------------------------------------ small pieces
  // a long wooden fishing boat (vallam), painted, with upturned ends
  Models.vallam = function (seed) {
    const g = new T.Group(), rng = KT.makeRng(seed || 3);
    const cols = [0x2c5fa8, 0xd8203a, 0x2a9d8f, 0xf2c230, 0x3f7f2c];
    const hull = mt('vallamWood', 0x6b4a2e, 0.8), band = mt('vallamBand' + (seed % 5), cols[(seed || 0) % 5], 0.6);
    const L = 8 + rng() * 2;
    for (let i = 0; i < 12; i++) {
      const t = i / 11, z = (t - 0.5) * L, w = 0.25 + Math.sin(t * Math.PI) * 0.75, lift = Math.pow(Math.abs(t - 0.5) * 2, 3) * 0.7;
      part(g, G.box(w * 2, 0.14, L / 11 + 0.05), hull, 0, 0.12 + lift, z);
      [-1, 1].forEach((s) => {
        part(g, G.box(0.08, 0.55, L / 11 + 0.05), hull, s * w, 0.42 + lift, z);
        part(g, G.box(0.09, 0.14, L / 11 + 0.05), band, s * (w + 0.01), 0.6 + lift, z);
      });
    }
    for (let k = -2; k <= 2; k++) part(g, G.box(1.4, 0.06, 0.2), hull, 0, 0.55, k * L / 6);
    // nets heaped in the middle and an outboard motor
    part(g, KT.blob(0.55, 1, 0.3, seed || 7), mt('netHeap', 0x2f6a7a, 0.95), 0, 0.5, -0.6, 0, 0, 0, 1.2, 0.5, 1.6);
    part(g, G.box(0.25, 0.6, 0.3), mt('motor', 0x1d1d1f, 0.5), 0, 0.7, -L / 2 + 0.2);
    return KT.bake(g);
  };
  // a Nilgiri tahr: stocky brown wild goat with short curved horns
  Models.tahr = function (male) {
    const g = new T.Group();
    const fur = mt(male ? 'tahrM' : 'tahrF', male ? 0x4a3a2c : 0x8a6e50, 0.95), pale = mt('tahrSaddle', 0xb9a487, 0.95), horn = mt('tahrHorn', 0x2a2420, 0.6);
    part(g, G.capsule(0.28, 0.75, 4, 8), fur, 0, 0.85, 0, Math.PI / 2, 0, 0);
    if (male) part(g, G.box(0.42, 0.2, 0.5), pale, 0, 1.08, -0.05);
    [[-0.17, 0.35], [0.17, 0.35], [-0.17, -0.35], [0.17, -0.35]].forEach(([x, z]) => part(g, G.cyl(0.06, 0.05, 0.7, 6), fur, x, 0.36, z));
    part(g, G.cyl(0.13, 0.17, 0.4, 8), fur, 0, 1.12, 0.52, -0.7, 0, 0);
    part(g, G.box(0.2, 0.22, 0.38), fur, 0, 1.3, 0.72, 0.4, 0, 0);
    [-1, 1].forEach((s) => part(g, G.cone(0.04, 0.32, 5), horn, s * 0.07, 1.5, 0.6, -0.9, 0, 0));
    part(g, G.cone(0.05, 0.14, 5), fur, 0, 0.85, -0.6, -2.0, 0, 0);
    return KT.bake(g);
  };
  // a snake: a tube along a wiggle; a cobra rears up with its hood spread
  Models.snake = function (seed, cobra) {
    const g = new T.Group(), rng = KT.makeRng(seed || 1);
    const col = [0x2a2a22, 0x7a6a3a, 0x4f6b2a, 0x8a5a2a][(seed || 0) % 4];
    const m = mt('snake' + col.toString(16), col, 0.5);
    const pts = [];
    for (let i = 0; i < 9; i++) pts.push(new T.Vector3(Math.sin(i * 1.3 + rng()) * 0.35, 0.05, i * 0.22 - 0.9));
    if (cobra) { pts.push(new T.Vector3(0, 0.25, 1.15)); pts.push(new T.Vector3(0, 0.6, 1.2)); }
    const tube = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.05, 6);
    g.add(new T.Mesh(tube, m));
    const head = pts[pts.length - 1];
    if (cobra) part(g, G.sph(0.2, 10, 6), m, head.x, head.y - 0.02, head.z + 0.02, 0, 0, 0, 1, 1.1, 0.25);
    part(g, G.sph(0.07, 8, 6), m, head.x, head.y + (cobra ? 0.1 : 0), head.z + 0.06, 0, 0, 0, 1, 0.7, 1.4);
    return KT.bake(g);
  };
  Models.crocodile = function () {
    const g = new T.Group(), m = mt('croc', 0x4a5a32, 0.7), belly = mt('crocBelly', 0x8a8a5a, 0.8);
    part(g, G.box(0.6, 0.3, 1.6), m, 0, 0.2, 0);
    part(g, G.box(0.36, 0.18, 0.8), m, 0, 0.16, 1.15);
    part(g, G.box(0.5, 0.06, 1.5), belly, 0, 0.05, 0);
    part(g, G.cone(0.24, 1.8, 6), m, 0, 0.16, -1.65, -Math.PI / 2, 0, 0, 1, 1, 0.5);
    [[-0.38, 0.5], [0.38, 0.5], [-0.38, -0.5], [0.38, -0.5]].forEach(([x, z]) => part(g, G.box(0.18, 0.12, 0.3), m, x, 0.08, z, 0, x > 0 ? 0.5 : -0.5, 0));
    for (let i = 0; i < 6; i++) part(g, G.cone(0.05, 0.1, 4), m, 0, 0.38, 0.6 - i * 0.25);
    return KT.bake(g);
  };
  // a mesh sack stuffed with tea leaf
  Models.teaSack = function (k) {
    const g = new T.Group(), cols = [0xd8742a, 0xc95a2a, 0xe0903a, 0x8a4a6a, 0x3f7f6a];
    part(g, KT.blob(0.5, 1, 0.18, 30 + (k || 0)), mt('sack' + ((k || 0) % 5), cols[(k || 0) % 5], 0.95), 0, 0.45, 0, 0, 0, 0, 1, 1.0, 0.85);
    part(g, G.cone(0.18, 0.3, 6), mt('sack' + ((k || 0) % 5), cols[(k || 0) % 5], 0.95), 0, 1.0, 0);
    return KT.bake(g);
  };
  // ---------------------------------------------- St. Francis Church
  // Fort Kochi (1503): a plain hall with a tall cream façade, its gable in
  // stepped, scrolled Dutch curves with finials, a round window, three
  // arched windows with red-brown shutters and a little belfry on top
  Models.stFrancis = function () {
    const g = new T.Group();
    const cream = mt('sfCream', 0xeee4c8, 0.85), trim = mt('sfTrim', 0xd9cba6, 0.85), shut = mt('sfShutter', 0x8a3b24, 0.7), roofM = M().roof;
    part(g, G.box(11, 8, 22), cream, 0, 4, -10);
    part(g, KT.gableRoofGeometry ? KT.gableRoofGeometry(12, 23, 4) : G.box(12, 1, 23), roofM, 0, 8, -10);
    // the façade: a wide base, stepped scrolled gable above
    part(g, G.box(13, 9, 0.8), cream, 0, 4.5, 1);
    part(g, G.box(9, 2.6, 0.8), cream, 0, 10.3, 1);
    part(g, G.box(5, 2.0, 0.8), cream, 0, 12.6, 1);
    [-1, 1].forEach((sd) => {
      part(g, new T.CylinderGeometry(1.3, 1.3, 0.8, 16, 1, false, 0, Math.PI), cream, sd * 4.5, 9.0, 1, Math.PI / 2, 0, sd > 0 ? Math.PI / 2 : -Math.PI / 2);
      part(g, new T.CylinderGeometry(1.0, 1.0, 0.8, 16, 1, false, 0, Math.PI), cream, sd * 2.5, 11.6, 1, Math.PI / 2, 0, sd > 0 ? Math.PI / 2 : -Math.PI / 2);
      // pilasters and finials
      [6.3, 2.8].forEach((x, k) => part(g, G.box(0.6, 9 - k * 0, 0.9), trim, sd * x, 4.5, 1.1));
      part(g, G.cone(0.35, 1.4, 8), trim, sd * 6.2, 9.7, 1.1);
      part(g, G.cone(0.3, 1.1, 8), trim, sd * 4.4, 12.1, 1.1);
    });
    part(g, G.box(13.6, 0.3, 1.0), trim, 0, 9.05, 1.1);
    // belfry with a cross
    part(g, G.box(2.0, 2.0, 0.8), cream, 0, 14.6, 1);
    part(g, KT.roundBox(1.0, 1.2, 0.3, 0.45), mt('sfDark', 0x3a2a24, 0.7), 0, 14.5, 1.3);
    part(g, G.box(0.18, 1.2, 0.15), trim, 0, 16.2, 1);
    part(g, G.box(0.7, 0.16, 0.15), trim, 0, 16.4, 1);
    // windows and door
    part(g, G.cyl(0.7, 0.7, 0.3, 16), mt('sfDark', 0x3a2a24, 0.7), 0, 10.4, 1.35, Math.PI / 2, 0, 0);
    [-3.6, 0, 3.6].forEach((x) => { part(g, G.box(1.4, 2.2, 0.2), shut, x, 6.2, 1.45); part(g, G.cyl(0.7, 0.7, 0.2, 12, 1), shut, x, 7.3, 1.45, Math.PI / 2, 0, 0); });
    part(g, G.box(2.2, 3.4, 0.2), mt('sfDoor', 0x5a3a24, 0.7), 0, 1.7, 1.45);
    part(g, G.cyl(1.1, 1.1, 0.2, 14), mt('sfDoor', 0x5a3a24, 0.7), 0, 3.4, 1.45, Math.PI / 2, 0, 0);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: -9.5, hw: 6.6, hd: 11.5 }];
    return baked;
  };
  // ------------------------------------------- Mattancherry Palace gate
  // a cream archway with orange-red trim, trefoil openings over the side
  // piers and a round medallion in the gable
  Models.mattancherryGate = function () {
    const g = new T.Group(), cream = mt('mgCream', 0xf0dca0, 0.85), red = mt('mgRed', 0xc4502a, 0.75);
    [-1, 1].forEach((sd) => {
      part(g, G.box(2.0, 4.2, 2.6), cream, sd * 2.6, 2.1, 0);
      part(g, G.box(2.2, 0.3, 2.8), red, sd * 2.6, 4.25, 0);
      part(g, G.cyl(0.25, 0.25, 4.0, 10), red, sd * 3.7, 2.0, 1.35);
      [0, 0.45, -0.45].forEach((dx, k) => part(g, G.cyl(0.32, 0.32, 0.3, 12), mt('mgDark', 0x4a3a2a, 0.7), sd * 2.6 + dx, 3.2 + (k ? -0.25 : 0.15), 1.32, Math.PI / 2, 0, 0));
      part(g, G.box(1.6, 0.5, 2.8), red, sd * 2.6, 0.25, 0);
    });
    part(g, new T.TorusGeometry(1.6, 0.35, 8, 20, Math.PI), red, 0, 4.2, 1.15);
    part(g, G.box(7.4, 1.6, 2.6), cream, 0, 5.4, 0);
    // the gable with a red border and medallion
    const sh = new T.Shape(); sh.moveTo(-3.8, 0); sh.lineTo(3.8, 0); sh.lineTo(0, 2.2); sh.lineTo(-3.8, 0);
    part(g, new T.ExtrudeGeometry(sh, { depth: 2.6, bevelEnabled: false }), cream, 0, 6.2, -1.3);
    [-1, 1].forEach((sd) => part(g, G.box(4.5, 0.3, 2.8), red, sd * 1.9, 7.3, 0, 0, 0, sd * -0.52));
    part(g, G.cyl(0.6, 0.6, 0.2, 16), red, 0, 7.0, 1.35, Math.PI / 2, 0, 0);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: -2.6, z: 0, hw: 1.1, hd: 1.4 }, { type: 'box', x: 2.6, z: 0, hw: 1.1, hd: 1.4 }];
    return baked;
  };
  // a teak plantation: tall straight trunks in rows, thin crowns, leaf litter
  Models.teakGrove = function () {
    const g = new T.Group(), bark = mt('teakBark', 0x5a4632, 0.95), leaf = mt('teakCrown', 0x7a8a3a, 0.9), litter = mt('teakLitter', 0x9a7a52, 1);
    part(g, G.cyl(14, 14, 0.06, 28), litter, 0, 0.03, 0);
    part(g, G.box(2.4, 0.07, 28), mt('teakTrack', 0xc4a47a, 1), 0, 0.05, 0);
    const rng = KT.makeRng(1840);
    for (let x = -12; x <= 12; x += 3.4) for (let z = -12; z <= 12; z += 3.4) {
      if (Math.abs(x) < 2 || x * x + z * z > 150) continue;
      const h = 13 + rng() * 5, xx = x + (rng() - 0.5) * 0.8, zz = z + (rng() - 0.5) * 0.8;
      part(g, G.cyl(0.18, 0.32, h, 6), bark, xx, h / 2, zz);
      part(g, KT.blob(1.4 + rng(), 1, 0.35, Math.round(x * 7 + z)), leaf, xx, h + 0.4, zz, 0, 0, 0, 1.3, 0.55, 1.3);
    }
    return KT.bake(g);
  };
  // a raft of bamboo poles lashed together, with a pole for punting
  Models.bambooRaft = function () {
    const g = new T.Group(), bam = mt('bamboo', 0xb9a45a, 0.7);
    for (let i = 0; i < 10; i++) part(g, G.cyl(0.12, 0.12, 5, 6), bam, -1.2 + i * 0.26, 0.12, 0, Math.PI / 2, 0, 0);
    [-1.8, 1.8].forEach((z) => part(g, G.box(2.8, 0.08, 0.12), mt('lashing', 0x6b4a2e, 0.9), 0, 0.26, z));
    part(g, G.cyl(0.04, 0.04, 4.5, 5), bam, 0.6, 1.4, 0.4, 0.3, 0, 0.2);
    return KT.bake(g);
  };
  // a clump of bamboo
  Models.bambooClump = function (k) {
    const g = new T.Group(), cane = mt('bambooCane', 0x6f8a3a, 0.7), leaf = mt('bambooLeaf', 0x5a8a34, 0.9);
    const rng = KT.makeRng(500 + (k || 0));
    for (let i = 0; i < 14; i++) {
      const a = rng() * 6.28, lean = 0.1 + rng() * 0.25, h = 7 + rng() * 4;
      part(g, G.cyl(0.07, 0.09, h, 5), cane, Math.cos(a) * 0.5 + Math.cos(a) * lean * h / 2, h / 2, Math.sin(a) * 0.5 + Math.sin(a) * lean * h / 2, Math.sin(a) * lean, 0, -Math.cos(a) * lean);
      part(g, KT.blob(0.9, 1, 0.4, 900 + i), leaf, Math.cos(a) * (0.5 + lean * h), h - 0.4, Math.sin(a) * (0.5 + lean * h), 0, 0, 0, 1.2, 0.6, 1.2);
    }
    return KT.bake(g);
  };
  // Chembra and Ranipuram: long bare grassy ridges with a narrow trekking
  // trail up the spine, a few trekkers' marks and clouds drifting below
  Models.grassRidge = function (shola) {
    const g = new T.Group();
    const grass = mt('ridgeGrass', 0x8db84a, 0.95), grass2 = mt('ridgeGrass2', 0x7aa646, 0.95), trail = mt('ridgeTrail', 0x8a6a46, 1);
    [[0, -4, 16, 9], [-14, 6, 10, 6], [14, 4, 11, 6.5]].forEach(([x, z, r, h], i) => part(g, G.sph(r, 28, 14), i ? grass2 : grass, x, -r + h, z, 0, i * 0.5, 0, 1.4, 1, 0.8));
    const hy = (x, z) => { let y = 0; [[0, -4, 16, 9], [-14, 6, 10, 6], [14, 4, 11, 6.5]].forEach(([cx, cz, r, h]) => { const dx = (x - cx) / 1.4, dz = (z - cz) / 0.8, d = Math.sqrt(dx * dx + dz * dz); if (d < r) y = Math.max(y, Math.sqrt(r * r - d * d) - r + h); }); return y; };
    for (let i = 0; i < 40; i++) { const t = i / 39, x = -20 + t * 26, z = 12 - t * 15 + Math.sin(t * 6) * 2; part(g, G.box(0.9, 0.06, 1.2), trail, x, hy(x, z) + 0.04, z, 0, -0.5, 0); }
    // tufts of tall grass
    const rng = KT.makeRng(31);
    for (let i = 0; i < 120; i++) { const x = (rng() - 0.5) * 44, z = (rng() - 0.5) * 24; part(g, G.cone(0.08, 0.9, 3), rng() < 0.5 ? grass : grass2, x, hy(x, z) + 0.4, z); }
    if (shola) for (let i = 0; i < 6; i++) part(g, KT.blob(2 + rng(), 1, 0.3, 940 + i), mt('shola', 0x2f5a2a, 0.9), -18 + i * 7, 1.5, 10 + (i % 2) * 2);
    // Ranipuram's summit: a great dark rock on the top of the grass
    if (shola) { part(g, KT.blob(3.2, 1, 0.3, 960), mt('summitRock', 0x3a3632, 0.9), 2, 10, -6, 0, 0, 0, 1.2, 0.85, 1); part(g, KT.blob(2, 1, 0.3, 961), mt('summitRock', 0x3a3632, 0.9), -1, 9.2, -4); }
    for (let i = 0; i < 30; i++) { const x = (rng() - 0.5) * 36, z = (rng() - 0.5) * 18; part(g, G.sph(0.14, 5, 4), mt(i % 2 ? 'wildflowerW' : 'wildflowerV', i % 2 ? 0xf4f2f8 : 0x9a7ac8, 0.7), x, hy(x, z) + 0.6, z); }
    const baked = KT.bake(g);
    for (let i = 0; i < 3; i++) mist(baked, -24 + i * 22, 1.2, 22, 16, 0.25); // clouds below, in the valley
    baked.userData.colliders = [{ type: 'circle', x: 0, z: -4, r: 14 }];
    return baked;
  };
  // a square temple tank: laterite steps down on every side to the water
  Models.templeTank = function (W, D) {
    const g = new T.Group(), lat = KT.mat('pl_tankLat', { map: KT.tex('laterite', 2, 2), color: 0x9a7058 }, 0.2);
    for (let i = 0; i < 5; i++) {
      const w = W - i * 1.6, d = D - i * 1.6, y = (4 - i) * 0.3; // stepping down to water at ground level
      [[0, -d / 2, w, 0.8], [0, d / 2, w, 0.8], [-w / 2, 0, 0.8, d], [w / 2, 0, 0.8, d]].forEach(([x, z, sx, sz]) => part(g, G.box(sx, 0.35, sz), lat, x, y + 0.17, z));
    }
    waterPlane(g, W - 7, D - 7, 0, 0.1, 0);
    // lotus leaves
    for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 4 + (i % 5) * 1.6; part(g, G.cyl(0.45, 0.45, 0.03, 10), mt('lotusLeaf', 0x3f7a2a, 0.8), Math.cos(a) * r, 0.13, Math.sin(a) * r * 0.8); }
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: (W - 8) / 2, hd: (D - 8) / 2 }];
    return baked;
  };
  // ------------------------------------------------------- Bekal Fort
  // Kerala's largest fort, of laterite, on a headland: its walls (12 m)
  // trace a giant keyhole, a round observation tower stands within, and
  // bastions with gun loops look out over the sea on three sides
  Models.bekalFort = function () {
    const g = new T.Group();
    const lat = KT.mat('pl_bekalLat', { map: KT.tex('laterite', 2, 1), color: 0xd08a5a }, 0.2), grass = mt('bekalGrass', 0x7aa04a, 1), path = mt('bekalPath', 0xa86a44, 0.95);
    const H = 7, R = 22;
    part(g, G.cyl(R - 1, R - 1, 0.1, 40), grass, 0, 0.05, -6);
    // the round head of the keyhole (open at the front)
    for (let k = 0; k < 30; k++) {
      const a = Math.PI * 0.62 + (k / 30) * Math.PI * 1.76, a2 = a + Math.PI * 1.76 / 30;
      const x = Math.sin(a) * R, z = Math.cos(a) * R - 6, len = 2 * R * Math.sin(Math.PI * 1.76 / 60) + 0.3;
      part(g, G.box(len, H, 1.8), lat, x, H / 2, z, 0, (a + a2) / 2 + Math.PI / 2, 0);
      if (k % 2 === 0) part(g, G.box(1.0, 0.9, 1.8), lat, x, H + 0.45, z, 0, (a + a2) / 2 + Math.PI / 2, 0);
    }
    // the neck of the keyhole towards the land, with the zigzag gate
    [-1, 1].forEach((sd) => {
      part(g, G.box(1.8, H, 14), lat, sd * 7, H / 2, R - 6 + 2);
      for (let z = R - 4; z < R + 9; z += 2) part(g, G.box(1.8, 0.9, 1.0), lat, sd * 7, H + 0.45, z - 4);
    });
    part(g, G.box(5, H - 1, 1.8), lat, -2, (H - 1) / 2, R + 8);
    part(g, G.box(1.8, H - 1, 5), lat, 2.4, (H - 1) / 2, R + 6.5);
    // bastions round the head, with gun loops
    [-2.2, -1.2, 0, 1.2, 2.2].forEach((a) => {
      const x = Math.sin(a + Math.PI) * (R + 1.5), z = Math.cos(a + Math.PI) * (R + 1.5) - 6;
      part(g, G.cyl(3.2, 3.6, H + 0.6, 18), lat, x, (H + 0.6) / 2, z);
      for (let k = 0; k < 4; k++) part(g, G.box(0.5, 0.35, 0.3), M().windowDark, x + Math.sin(a + Math.PI + (k - 1.5) * 0.4) * 3.4, H - 1.5, z + Math.cos(a + Math.PI + (k - 1.5) * 0.4) * 3.4);
    });
    // the observation tower in the middle, a ramp winding up it
    part(g, G.cyl(4.5, 5, 10, 24), lat, 0, 5, -8);
    for (let k = 0; k < 14; k++) { const a = k * 0.45; part(g, G.box(2.2, 0.3, 1.6), path, Math.cos(a) * 5.6, 0.6 + k * 0.68, -8 + Math.sin(a) * 5.6, 0, -a, 0); }
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; part(g, G.box(0.9, 0.8, 0.9), lat, Math.cos(a) * 4.4, 10.4, -8 + Math.sin(a) * 4.4); }
    // a path in from the gate
    part(g, G.box(3, 0.08, 20), path, 0, 0.1, 6);
    const baked = KT.bake(g);
    const C = [];
    for (let k = 0; k <= 16; k++) { const a = Math.PI * 0.62 + (k / 16) * Math.PI * 1.76; C.push({ type: 'circle', x: Math.sin(a) * R, z: Math.cos(a) * R - 6, r: 2 }); }
    C.push({ type: 'circle', x: 0, z: -8, r: 5.2 }, { type: 'box', x: -7, z: R - 4, hw: 0.9, hd: 7 }, { type: 'box', x: 7, z: R - 4, hw: 0.9, hd: 7 });
    baked.userData.colliders = C;
    return baked;
  };
  // ------------------------------------------------- St. Angelo Fort
  // Kannur (1505): a triangular laterite fort facing the sea, with a moat
  // on the land side, bastions at the corners and cannons on the ramparts
  Models.angeloFort = function () {
    const g = new T.Group();
    const lat = KT.mat('pl_angeloLat', { map: KT.tex('laterite', 2, 1), color: 0x8f6448 }, 0.2), grass = mt('angGrass', 0x7aa04a, 1);
    const H = 6, P = [[-20, 12], [20, 12], [0, -22]];
    part(g, new T.ShapeGeometry(new T.Shape(P.map(([x, z]) => new T.Vector2(x, -z)))).rotateX(-Math.PI / 2), grass, 0, 0.06, 0);
    const C = [];
    for (let i = 0; i < 3; i++) {
      const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % 3];
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
      const gate = i === 0;
      const segs = gate ? [[0, 0.42], [0.58, 1]] : [[0, 1]];
      segs.forEach(([t0, t1]) => {
        const cx = x0 + (x1 - x0) * (t0 + t1) / 2, cz = z0 + (z1 - z0) * (t0 + t1) / 2, l2 = len * (t1 - t0);
        part(g, G.box(l2, H, 1.8), lat, cx, H / 2, cz, 0, ang, 0);
        for (let t = 0; t < l2; t += 2) part(g, G.box(0.9, 0.9, 1.8), lat, cx + Math.cos(ang) * (t - l2 / 2), H + 0.45, cz - Math.sin(ang) * (t - l2 / 2), 0, ang, 0);
        C.push({ type: 'box', x: cx, z: cz, hw: l2 / 2, hd: 0.9, rot: ang });
      });
      // corner bastion and a cannon on it
      part(g, G.cyl(3.4, 3.8, H + 1.2, 16), lat, x0, (H + 1.2) / 2, z0);
      part(g, G.cyl(0.25, 0.32, 2.4, 10), M().darkGrey, x0, H + 1.6, z0 + (z0 < 0 ? -1.2 : 1.2), Math.PI / 2 - 0.15, 0, 0);
      part(g, G.box(0.8, 0.5, 1.2), M().woodDark, x0, H + 1.45, z0);
      C.push({ type: 'circle', x: x0, z: z0, r: 3.8 });
    }
    // gate arch
    part(g, G.box(5.4, 1.2, 2.2), lat, 0, H - 0.4, 12);
    // the tall gabled stone building inside, its walls hung with creepers
    part(g, G.box(7, 7, 6), lat, 0, 3.5, -4);
    const gab = new T.Shape(); gab.moveTo(-3.6, 0); gab.lineTo(3.6, 0); gab.lineTo(0, 2.6); gab.lineTo(-3.6, 0);
    part(g, new T.ExtrudeGeometry(gab, { depth: 6, bevelEnabled: false }), lat, 0, 7, -7);
    part(g, G.box(1.0, 1.0, 0.2), M().windowDark, 0, 8.0, -0.95);
    part(g, G.box(1.2, 2.2, 0.2), M().windowDark, 1.2, 1.1, -0.95);
    for (let i = 0; i < 10; i++) part(g, KT.blob(0.6, 1, 0.35, 990 + i), mt('creeper', 0x3f7a32, 0.9), -3.2 + (i % 5) * 0.4, 1 + i * 0.5, -0.9 + (i % 2) * 0.1, 0, 0, 0, 1, 1.4, 0.4);
    C.push({ type: 'box', x: 0, z: -4, hw: 3.6, hd: 3.1 });
    // casuarinas along the sea side
    const cas = mt('casuarina', 0x2f4a2a, 0.9);
    [[-12, -16], [-6, -22], [6, -22], [12, -16]].forEach(([x, z], i) => {
      part(g, G.cyl(0.18, 0.3, 9, 6), M().woodDark, x, 4.5, z);
      for (let k = 0; k < 4; k++) part(g, KT.blob(1.5 - k * 0.15, 1, 0.4, 1000 + i * 4 + k), cas, x + (k % 2 ? 0.6 : -0.6), 6 + k * 1.3, z, 0, 0, 0, 1.2, 0.8, 1.2);
    });
    const baked = KT.bake(g);
    baked.userData.colliders = C;
    return baked;
  };
  // -------------------------------------------------- Paradesi Synagogue
  // Jew Town (1568): a white-walled hall with a red-tiled roof, wrought-iron
  // gates with the Star of David, and the three-storey square clock tower
  // with its gabled tiled roof on wooden brackets, blue clock faces and a
  // little cupola
  Models.synagogue = function () {
    const g = new T.Group(), white = mt('synWhite', 0xf4f2ea, 0.8), roofM = M().roof, blue = mt('synBlue', 0x2c5fa8, 0.5), wood = M().woodDark;
    part(g, G.box(12, 6, 16), white, 0, 3, -4);
    part(g, KT.gableRoofGeometry ? KT.gableRoofGeometry(13, 17, 3.2) : G.box(13, 1, 17), roofM, 0, 6, -4);
    for (let i = 0; i < 4; i++) [-1, 1].forEach((s) => part(g, G.box(0.15, 2.2, 1.2), mt('synShutter', 0x2f6b4a, 0.7), s * 6.05, 3.4, -10 + i * 4));
    // the clock tower beside the entrance
    const tx = 7.5, tz = 5;
    part(g, G.box(4, 12, 4), white, tx, 6, tz);
    [4, 8].forEach((y) => part(g, G.box(4.3, 0.2, 4.3), mt('synBand', 0xd9d2c0, 0.8), tx, y, tz));
    part(g, KT.hipRoofGeometry(5.4, 5.4, 2.0, 0.3), roofM, tx, 12, tz);
    part(g, G.cyl(0.5, 0.5, 1.2, 8), white, tx, 14.4, tz);
    part(g, G.cone(0.7, 1.0, 8), roofM, tx, 15.4, tz);
    [[0, 2.02, 0], [2.02, 0, Math.PI / 2], [0, -2.02, Math.PI], [-2.02, 0, -Math.PI / 2]].forEach(([dx, dz, r]) => {
      const side_ = Math.abs(dx) > 0.1;
      part(g, G.cyl(0.9, 0.9, 0.08, 18), blue, tx + dx, 10, tz + dz, side_ ? 0 : Math.PI / 2, 0, side_ ? Math.PI / 2 : 0);
      part(g, G.box(0.06, 0.7, 0.04), M().white, tx + dx * 1.02, 10.15, tz + dz * 1.02, 0, r, 0);
    });
    for (let k = 0; k < 6; k++) part(g, G.box(0.18, 0.6, 0.4), wood, tx - 2.4 + (k % 2) * 4.8, 11.4, tz - 1.5 + Math.floor(k / 2) * 1.5);
    // the gates
    part(g, G.box(3, 2.4, 0.1), mt('synIron', 0x2a2a2a, 0.5), 0, 1.2, 4.05);
    part(g, G.cyl(0.4, 0.4, 0.05, 6), mt('synStar', 0xd4a434, 0.4), 0, 1.6, 4.12, Math.PI / 2, 0, 0);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: -4, hw: 6, hd: 8 }, { type: 'box', x: tx, z: tz, hw: 2, hd: 2 }];
    return baked;
  };
  // Kappad: the memorial pillar for Vasco da Gama's landing
  Models.gamaPillar = function () {
    const g = new T.Group(), st = mt('gamaStone', 0xc9c2b2, 0.85);
    part(g, G.box(2.4, 0.4, 2.4), st, 0, 0.2, 0);
    part(g, G.box(1.6, 0.4, 1.6), st, 0, 0.6, 0);
    part(g, G.box(0.7, 3.4, 0.7), st, 0, 2.5, 0);
    part(g, G.cone(0.5, 0.7, 4), st, 0, 4.55, 0, 0, Math.PI / 4, 0);
    const pl = KT.signMaterial([{ text: 'VASCO DA GAMA LANDED HERE', size: 30 }, { text: 'KAPPAKADAVU • 1498', size: 34 }], { width: 600, height: 200, bg: '#3a3a3a', color: '#f4f0e0' });
    const plaque = new T.Mesh(G.box(1.2, 0.5, 0.05), [st, st, st, st, pl, pl]);
    plaque.position.set(0, 1.8, 0.38); plaque.userData.noBake = true;
    const baked = KT.bake(g);
    baked.add(plaque);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.2, hd: 1.2 }];
    return baked;
  };
  // a tetrapod (breakwater block)
  function tetrapod(g, x, y, z, r, m) {
    const s = 0.6 * (r || 1);
    [[0, 1, 0], [0.94, -0.33, 0], [-0.47, -0.33, 0.82], [-0.47, -0.33, -0.82]].forEach(([a, b, c]) => {
      const leg = new T.Mesh(G.cone(0.3 * s, 1.1 * s, 6), m);
      leg.position.set(x + a * 0.5 * s, y + b * 0.5 * s, z + c * 0.5 * s);
      leg.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(a, b, c));
      g.add(leg);
    });
  }
  // a Kerala-style statue of a walking Gandhi on a plinth (bronze)
  function gandhiStatue(g, x, z) {
    const br = mt('bronze', 0x5a4a32, 0.45, { metalness: 0.6 }), st = mt('plinth', 0xd8d2c4, 0.8);
    part(g, G.box(2.2, 1.6, 2.2), st, x, 0.8, z);
    part(g, G.box(2.6, 0.2, 2.6), st, x, 0.1, z);
    const y = 1.6;
    part(g, G.cyl(0.07, 0.07, 0.9, 6), br, x - 0.1, y + 0.45, z + 0.15, 0.25, 0, 0);
    part(g, G.cyl(0.07, 0.07, 0.9, 6), br, x + 0.1, y + 0.45, z - 0.1, -0.2, 0, 0);
    part(g, G.cyl(0.24, 0.3, 0.55, 10), br, x, y + 1.05, z);              // dhoti
    part(g, G.cyl(0.2, 0.24, 0.55, 10), br, x, y + 1.55, z, 0.08, 0, 0);    // shawl
    part(g, G.sph(0.15, 12, 10), br, x, y + 2.0, z + 0.05);
    part(g, G.torus(0.05, 0.012, 4, 10), br, x - 0.06, y + 2.02, z + 0.19, 0, 0, 0);
    part(g, G.torus(0.05, 0.012, 4, 10), br, x + 0.06, y + 2.02, z + 0.19, 0, 0, 0);
    part(g, G.cyl(0.03, 0.03, 1.9, 6), br, x + 0.42, y + 0.95, z + 0.35, 0.15, 0, 0); // staff
    part(g, G.cyl(0.05, 0.05, 0.6, 6), br, x + 0.3, y + 1.45, z + 0.22, 0.6, 0, 0.6);
  }
  // a rounded bush with blossoms (bougainvillea, hibiscus, ixora)
  const BLOSSOM = [0xd81b7a, 0xe8452c, 0xf28c28, 0xfff2f0, 0xc2185b];
  function flowerBush(g, x, y, z, s, k) {
    part(g, KT.blob(0.7 * s, 1, 0.25, 300 + k), mt('bushLeaf', 0x3f7a32, 0.9), x, y + 0.5 * s, z, 0, 0, 0, 1, 0.8, 1);
    const fm = mt('blossom' + (k % 5), BLOSSOM[k % 5], 0.7);
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + k; part(g, G.sph(0.12 * s, 5, 4), fm, x + Math.cos(a) * 0.55 * s, y + (0.55 + (i % 3) * 0.18) * s, z + Math.sin(a) * 0.55 * s); }
  }
  Models.flowerBush = function (k) { const g = new T.Group(); flowerBush(g, 0, 0, 0, 1, k || 0); return KT.bake(g); };
  // a round flower bed with a laterite edge
  Models.flowerBed = function (k) {
    const g = new T.Group();
    part(g, G.cyl(1.5, 1.6, 0.3, 18), mt('bedEdge', 0xa4553a, 0.9), 0, 0.15, 0);
    part(g, G.cyl(1.4, 1.4, 0.32, 18), mt('bedSoil', 0x5a3a24, 1), 0, 0.17, 0);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39, r = 0.25 + (i % 4) * 0.3;
      part(g, G.sph(0.16, 5, 4), mt('blossom' + ((i + (k || 0)) % 5), BLOSSOM[(i + (k || 0)) % 5], 0.7), Math.cos(a) * r, 0.42, Math.sin(a) * r);
      part(g, G.cone(0.08, 0.3, 4), mt('bushLeaf', 0x3f7a32, 0.9), Math.cos(a) * r, 0.35, Math.sin(a) * r);
    }
    g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 1.5 }];
    return KT.bake(g);
  };
  Models.dustbin = function () {
    const g = new T.Group();
    part(g, G.cyl(0.28, 0.24, 0.8, 10), mt('binGreen', 0x2f7a3e, 0.6), 0, 0.4, 0);
    part(g, G.cyl(0.3, 0.3, 0.08, 10), mt('binLid', 0x235e2f, 0.6), 0, 0.84, 0);
    part(g, G.box(0.3, 0.12, 0.02), M().white, 0, 0.6, 0.27);
    g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 0.3 }];
    return KT.bake(g);
  };

  // --------------------------------------------------------- Kuttanad
  // Paddy fields below the water line, a canal between high bunds lined
  // with leaning palms, a houseboat and country boats on the canal, a pump
  // house draining a field and a white church.
  Models.kuttanad = function () {
    const g = new T.Group(), top = new T.Group();
    const paddyTex = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#6faa3a'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) { c.fillStyle = y % 8 ? '#8cc04a' : '#5d9a30'; c.fillRect(0, y, w, 2); }
    }, 6, 6);
    const paddy = KT.mat('pl_paddy', { map: paddyTex, roughness: 0.95 });
    const bund = mt('bund', 0x7a5a3a, 1), bank = mt('canalBank', 0x8a8478, 0.9), tuft = mt('riceTuft', 0x8cc04a, 0.9);
    [[-12, 11], [12, 11], [-12, -11], [12, -11]].forEach(([x, z], i) => {
      part(g, G.box(22, 0.1, 15), paddy, x, 0.05, z);
      if (i === 2) waterPlane(g, 22, 15, x, 0.12, z);      // a field flooded for planting
      for (let k = 0; k < 40; k++) if (i !== 2) part(g, G.cone(0.12, 0.45, 4), tuft, x - 10 + (k % 10) * 2.2, 0.3, z - 6 + Math.floor(k / 10) * 3.5);
    });
    // the canal along x, between bunds
    waterPlane(g, 50, 5.6, 0, 0.1, 0);
    [-1, 1].forEach((s) => {
      part(g, G.box(50, 0.7, 1.6), bund, 0, 0.35, s * 3.6);
      part(g, G.box(50, 0.5, 0.3), bank, 0, 0.25, s * 2.85);
    });
    // field bunds
    part(g, G.box(1.2, 0.4, 13), bund, 0, 0.2, 11); part(g, G.box(1.2, 0.4, 13), bund, 0, 0.2, -11);
    [-1, 1].forEach((s) => part(g, G.box(48, 0.4, 1.2), bund, 0, 0.2, s * 18.5));
    // pump house draining a field into the canal
    part(g, G.box(2.6, 2.2, 2.2), mt('pumpWall', 0xe8e0c8, 0.8), 18, 1.0, 5.8);
    part(g, KT.hipRoofGeometry(3.2, 2.8, 1.0, 0.3), M().roof, 18, 2.6, 5.8);
    part(g, G.cyl(0.18, 0.18, 2.4, 8), mt('pipe', 0x3a3f44, 0.5, { metalness: 0.5 }), 18, 0.4, 3.6, Math.PI / 2, 0, 0);
    // a white church with a tall façade
    const wht = mt('churchWhite', 0xf4f2ea, 0.7);
    part(g, G.box(5, 4.5, 8), wht, -18, 2.25, -23);
    part(g, G.box(6, 7.5, 0.6), wht, -18, 3.75, -18.8);
    part(g, KT.gableRoofGeometry ? KT.gableRoofGeometry(5.6, 8.4, 1.8) : G.box(5.6, 1, 8.4), M().roof, -18, 4.5, -23);
    part(g, G.box(0.25, 1.4, 0.15), M().gold, -18, 8.2, -18.6);
    part(g, G.box(0.9, 0.22, 0.15), M().gold, -18, 8.45, -18.6);
    part(g, G.box(1.4, 2.4, 0.1), M().woodDark, -18, 1.2, -18.45);
    const baked = KT.bake(g);
    // leaning palms on the bunds, boats on the canal
    for (let i = 0; i < 9; i++) {
      const p = Models.coconutPalm(80 + i);
      add(top, p, -22 + i * 5.5, 0.7, (i % 2 ? 1 : -1) * 3.8, i);
      p.rotation.z = (i % 2 ? -1 : 1) * 0.18;
    }
    add(top, Models.houseboat(), -6, 0.12, 0, Math.PI / 2, 0.8);
    add(top, Models.canoe(), 16, 0.1 + (Models.CANOE_FLOAT || 0.36), 0.8, Math.PI / 2);
    // the public water bus that serves the canal villages
    if (Models.ferryBoat) add(top, Models.ferryBoat(), 6, 0.12, -1.0, -Math.PI / 2, 0.7);
    baked.add(KT.bake(top));
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 25, hd: 4.4 }, { type: 'box', x: 18, z: 5.8, hw: 1.4, hd: 1.2 }, { type: 'box', x: -18, z: -21.5, hw: 3, hd: 4.6 }];
    return baked;
  };

  // ------------------------------------------------------ Marari beach
  // Fishing boats pulled up on the sand, nets drying on poles, thatched
  // cottages under the palms and a hammock.
  Models.marari = function () {
    const g = new T.Group(), top = new T.Group();
    for (let i = 0; i < 5; i++) add(top, Models.vallam(i), -16 + i * 7.5, 0, 6 + (i % 2) * 3, 0.15 * (i - 2) + Math.PI / 2 * (i % 2 ? 0.1 : 0));
    add(top, Models.vallam(9), 4, 0.05, 22, 1.2);   // one out on the water
    // nets on poles
    const pole = M().woodDark, net = mt('dryNet', 0x2f6a7a, 0.95, { transparent: true, opacity: 0.75, side: T.DoubleSide });
    for (let i = 0; i < 4; i++) {
      part(g, G.cyl(0.06, 0.06, 2.4, 6), pole, -14 + i * 4, 1.2, -2);
      if (i < 3) part(g, G.plane(4, 1.6), net, -12 + i * 4, 1.3, -2);
    }
    // thatched cottages
    [-14, -4, 6, 16].forEach((x, i) => {
      part(g, G.box(4, 2.4, 3.6), mt('cottage', 0xd9c49a, 0.9), x, 1.2, -12 - (i % 2) * 2);
      part(g, KT.hipRoofGeometry(5, 4.6, 1.8, 0.3), M().roof, x, 2.4, -12 - (i % 2) * 2);   // tiled, as at the resort
      part(g, G.box(1, 1.8, 0.1), M().woodDark, x, 0.9, -10.15 - (i % 2) * 2);
    });
    // hammock between two palms
    part(g, new T.CylinderGeometry(0.6, 0.6, 3.2, 10, 1, true, Math.PI, Math.PI), mt('hammock', 0xe05a8a, 0.8, { side: T.DoubleSide }), 0, 1.2, -5, 0, 0, Math.PI / 2);
    const baked = KT.bake(g);
    [[-1.8, -5], [1.8, -5], [-20, -6], [22, -4], [10, -7], [-9, -8]].forEach(([x, z], i) => add(top, Models.coconutPalm(60 + i), x, 0, z, i));
    baked.add(KT.bake(top));
    baked.userData.colliders = [{ type: 'box', x: 0, z: -13, hw: 18, hd: 3 }];
    return baked;
  };

  // ------------------------------------------------- Kollam beach park
  // Mahatma Gandhi Park on the beach: lawns, the statue, benches and lamps,
  // and the harbour breakwater of concrete tetrapods.
  Models.kollamPark = function () {
    const g = new T.Group();
    const lawn = mt('parkLawn', 0x6aa043, 1), path = mt('parkPath', 0xc98a6a, 0.9), conc = mt('tetra', 0xb8b4aa, 0.9);
    part(g, G.cyl(10, 10, 0.12, 32), lawn, -8, 0.06, -6);
    part(g, G.box(2.4, 0.14, 20), path, -8, 0.08, -6);
    part(g, G.box(20, 0.14, 2.4), path, -8, 0.08, -6);
    gandhiStatue(g, -8, -6);
    for (let i = 0; i < 18; i++) tetrapod(g, 12 + (i % 3) * 1.4, 0.45 + Math.floor(i / 9) * 0.6, -12 + Math.floor(i / 3) * 3.5 - (i % 2) * 0.6, 1.5, conc);
    const baked = KT.bake(g);
    const top = new T.Group();
    [[-15, -6, Math.PI / 2], [-1, -6, -Math.PI / 2], [-8, -13, 0], [-8, 1, Math.PI]].forEach(([x, z, r]) => add(top, Models.bench(), x, 0, z, r));
    [[-13, -11], [-3, -11], [-13, -1], [-3, -1]].forEach(([x, z]) => add(top, Models.lampPost(), x, 0, z));
    baked.add(KT.bake(top));
    baked.userData.colliders = [{ type: 'box', x: -8, z: -6, hw: 1.3, hd: 1.3 }, { type: 'box', x: 13.4, z: -3, hw: 2.2, hd: 10 }];
    return baked;
  };

  // ------------------------------------------------------ Illikkal Kallu
  // A grassy hill 1,200 m up with the mushroom-shaped Kuda Kallu (umbrella
  // rock), the hunched Koonu Kallu, the narrow Narakapalam ledge between
  // them, railings, steps and drifting mist.
  Models.illikkal = function () {
    const g = new T.Group();
    const grass = mt('illGrass', 0x7aa24a, 0.95), rock = mt('illRock', 0x6c6a64, 0.95), rock2 = mt('illRock2', 0x55534e, 0.95);
    part(g, G.sph(20, 32, 16), grass, 0, -10, -4, 0, 0, 0, 1, 0.75, 1);
    const hy = (x, z) => Math.sqrt(Math.max(0, 400 - x * x - (z + 4) * (z + 4))) * 0.75 - 10;
    const ty = hy(0, -4);
    // Kuda Kallu: a tall stem with a broad cap
    for (let i = 0; i < 4; i++) part(g, KT.blob(2.2 - i * 0.15, 1, 0.22, 401 + i), i % 2 ? rock : rock2, -2, ty + 1.2 + i * 2.2, -6, 0, i, 0, 1, 1.1, 1);
    part(g, KT.blob(4.6, 1, 0.25, 409), rock, -2, ty + 10.2, -6, 0, 0.4, 0, 1, 0.42, 1);
    // Koonu Kallu: a hunched rock
    part(g, KT.blob(3.6, 1, 0.3, 412), rock2, 6, ty + 2.4, -3, 0.3, 0, 0, 1.2, 0.9, 1);
    // Narakapalam: a knife-edge ledge between them
    part(g, G.box(5, 1.6, 0.6), rock, 2, ty + 3.4, -4.6, 0, 0.5, 0);
    // boulders and steps up from the front
    for (let i = 0; i < 8; i++) { const a = i * 0.8, r = 9 + (i % 3) * 3; part(g, KT.blob(1 + (i % 3) * 0.5, 1, 0.3, 420 + i), i % 2 ? rock : rock2, Math.cos(a) * r, hy(Math.cos(a) * r, Math.sin(a) * r - 4) + 0.3, Math.sin(a) * r - 4); }
    for (let i = 0; i < 22; i++) { const t = i / 21, z = 15 - t * 15, x = 3 + Math.sin(t * 5) * 2; part(g, G.box(1.5, 0.25, 0.7), M().stoneGrey, x, hy(x, z) + 0.12, z); }
    rail(g, -6, 2, 6, 2, ty - 0.3, 1, mt('rail', 0x3a3a3a, 0.6));
    // tall golden-green grass all over the ridge, and the narrow road up
    // with its metal crash barrier
    const tall = mt('illTallGrass', 0xb5b25a, 0.95), tall2 = mt('illTallGrass2', 0x8fa04a, 0.95);
    const grng = KT.makeRng(77);
    for (let i = 0; i < 160; i++) {
      const a = grng() * Math.PI * 2, r = 5 + grng() * 13, x = Math.cos(a) * r, z = Math.sin(a) * r - 4;
      const y = hy(x, z);
      for (let k = 0; k < 4; k++) part(g, G.cone(0.07, 1.1 + grng() * 0.6, 3), k % 2 ? tall : tall2, x + Math.cos(k * 1.6) * 0.15, y + 0.5, z + Math.sin(k * 1.6) * 0.15, Math.cos(k * 1.6) * 0.3, 0, Math.sin(k * 1.6) * 0.3);
    }
    const road = mt('illRoad', 0x4a4a4a, 0.9), barrier = mt('barrier', 0xb8bcc0, 0.4, { metalness: 0.6 });
    for (let i = 0; i < 18; i++) {
      const t = i / 17, x = 15 - t * 9, z = 16 - t * 14, y = hy(x, z);
      part(g, G.box(2.4, 0.12, 2.0), road, x, y + 0.06, z, 0, 0.55, 0);
      if (i % 2 === 0) { part(g, G.box(0.1, 0.7, 0.1), barrier, x + 1.4, y + 0.35, z + 0.6); part(g, G.box(0.06, 0.25, 2.3), barrier, x + 1.4, y + 0.6, z + 0.6, 0, 0.55, 0); }
    }
    const baked = KT.bake(g);
    for (let i = 0; i < 6; i++) mist(baked, -14 + i * 6, ty + 2 + (i % 3) * 3, -6 + (i % 2) * 6, 14, 0.35);
    baked.userData.colliders = [{ type: 'circle', x: 0, z: -4, r: 14 }];
    return baked;
  };

  // ------------------------------------------------------- Eravikulam
  // Rajamala: rolling grassland under a great rock face, shola forest in
  // the folds, blue neelakurinji, Nilgiri tahr grazing by the road and the
  // forest department's shuttle van.
  Models.eravikulam = function () {
    const g = new T.Group(), top = new T.Group();
    const grass = mt('eraGrass', 0x9ab54e, 0.95), grass2 = mt('eraGrass2', 0x7fa646, 0.95), rock = mt('eraRock', 0x5f5d58, 0.95), shola = mt('shola', 0x2f5a2a, 0.9);
    [[-12, -6, 14], [8, -10, 16], [0, -22, 18]].forEach(([x, z, r], i) => part(g, G.sph(r, 28, 14), i % 2 ? grass : grass2, x, -r * 0.42, z, 0, 0, 0, 1, 0.6, 1));
    // the rock face behind
    for (let i = 0; i < 9; i++) part(g, KT.blob(5, 1, 0.25, 500 + i), rock, -20 + i * 5, 8 + (i % 3) * 2, -30 - (i % 2) * 2, 0, i, 0, 1, 1.8, 0.8);
    // shola forest clumps in the folds
    for (let i = 0; i < 14; i++) { const x = -18 + (i * 7.3) % 36, z = -14 - (i % 4) * 2.5; part(g, KT.blob(1.6 + (i % 3) * 0.5, 1, 0.3, 520 + i), shola, x, 1.5 + (i % 2), z); }
    // neelakurinji in bloom
    const kur = mt('kurinji', 0x6a5acd, 0.8);
    for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 3 + (i % 9) * 1.6; part(g, G.sph(0.35, 5, 4), kur, Math.cos(a) * r - 4, 0.5 + (i % 3) * 0.3, Math.sin(a) * r - 6); }
    // the visitors' road and a railing
    part(g, G.box(3, 0.08, 30), mt('eraRoad', 0x4a4a4a, 0.9), 12, 0.05, 2, 0, -0.3, 0);
    rail(g, 9, 14, 6, -12, 0.05, 0.9, mt('rail', 0x3a3a3a, 0.6));
    const baked = KT.bake(g);
    [[2, 6, 0.5, true], [4, 4, 2, false], [-1, 3, -1, false], [6, 8, 1.2, true], [-4, 7, 2.6, false]].forEach(([x, z, r, m]) => add(top, Models.tahr(m), x, 0, z, r));
    if (Models.car) add(top, Models.car(0xf3f3f0, 'suv'), 13, 0, 6, -0.3);
    baked.add(top);
    for (let i = 0; i < 4; i++) mist(baked, -16 + i * 10, 10 + i, -24, 18, 0.3);
    baked.userData.colliders = [{ type: 'box', x: 0, z: -22, hw: 22, hd: 8 }];
    return baked;
  };

  // --------------------------------------------------------- Marayoor
  // Natural sandalwood forest, prehistoric dolmens (muniyara) on a rock
  // outcrop, a jaggery shed with its boiling pans and a sugarcane field.
  Models.marayoor = function () {
    const g = new T.Group();
    const rock = mt('marRock', 0x77706a, 0.95), slab = mt('dolmen', 0x8a8478, 0.9), bark = mt('sandalBark', 0x4a3a2c, 0.9), leaf = mt('sandalLeaf', 0x3a5a2a, 0.9);
    // sandalwood trees
    for (let i = 0; i < 14; i++) {
      const x = -20 + (i % 7) * 6 + (i % 2), z = -14 - Math.floor(i / 7) * 6;
      part(g, G.cyl(0.14, 0.22, 4, 6), bark, x, 2, z);
      part(g, KT.blob(1.4, 1, 0.3, 600 + i), leaf, x, 4.6, z, 0, 0, 0, 1, 0.9, 1);
    }
    // the rock outcrop with dolmens
    part(g, KT.blob(7, 1, 0.2, 610), rock, 10, -2.6, 0, 0, 0, 0, 1, 0.5, 1);
    // the dolmens: a thick, flat capstone on two or three rough boulders
    [[8, -2], [12, 1], [9, 3.5]].forEach(([x, z], k) => {
      const y = 0.8;
      [[-0.75, -0.2], [0.75, 0.1], [0, -0.75]].slice(0, k === 1 ? 2 : 3).forEach(([dx, dz], j) => part(g, KT.blob(0.65, 1, 0.25, 620 + k * 3 + j), rock, x + dx, y + 0.55, z + dz, 0, j, 0, 0.9, 1.0, 1.1));
      part(g, G.box(2.6, 0.38, 2.2), slab, x, y + 1.35, z, 0.04, k * 0.4, 0.05);
    });
    // jaggery shed with pans
    const shed = mt('shedPost', 0x5a4030, 0.9);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => part(g, G.cyl(0.12, 0.12, 2.6, 6), shed, -12 + a * 3, 1.3, 4 + b * 2));
    part(g, KT.hipRoofGeometry(7.4, 5.4, 1.5, 0.3), M().thatch, -12, 2.6, 4);
    [-14, -10].forEach((x) => {
      part(g, G.cyl(1.0, 1.1, 0.7, 12), mt('furnace', 0x8a4a2a, 0.95), x, 0.35, 4);
      part(g, G.cyl(1.1, 0.7, 0.35, 14), mt('pan', 0x2a2a2a, 0.5, { metalness: 0.5 }), x, 0.85, 4);
      part(g, G.cyl(0.95, 0.95, 0.05, 14), mt('syrup', 0x8a5a1a, 0.3), x, 0.98, 4);
    });
    for (let i = 0; i < 12; i++) part(g, G.sph(0.18, 6, 5), mt('jaggery', 0x6b3a12, 0.6), -12.5 + (i % 4) * 0.4, 0.2 + Math.floor(i / 4) * 0.25, 6.4);
    // sugarcane
    const cane = mt('cane', 0x8aa83a, 0.8);
    for (let i = 0; i < 60; i++) part(g, G.cyl(0.04, 0.05, 2.6, 4), cane, -22 + (i % 10) * 0.9, 1.3, 8 + Math.floor(i / 10) * 0.9, (i % 3 - 1) * 0.08, 0, (i % 2 - 0.5) * 0.1);
    const baked = KT.bake(g);
    mist(baked, -14, 2.2, 4, 3, 0.6); mist(baked, -10, 2.4, 4, 3, 0.6);
    baked.userData.colliders = [{ type: 'circle', x: 10, z: 0, r: 6 }, { type: 'box', x: -12, z: 4, hw: 3.6, hd: 2.6 }];
    return baked;
  };

  // ------------------------------------------------- Kochi Marine Drive
  // A paved walkway along the backwater with the arched Rainbow Bridge,
  // lamps, benches and railings, tall apartment towers on the land side and
  // tourist boats at the jetty.
  Models.marineDrive = function () {
    const g = new T.Group(), top = new T.Group();
    const winTex = canvasTex(64, 128, (c, w, h) => {
      c.fillStyle = '#d9d6cc'; c.fillRect(0, 0, w, h);
      for (let y = 4; y < h; y += 12) for (let x = 4; x < w; x += 12) { c.fillStyle = (x * y) % 7 ? '#5d7a8a' : '#2f4a5a'; c.fillRect(x, y, 7, 7); }
    }, 1, 1);
    const pave = mt('mdPave', 0xb5654a, 0.9), stone = mt('mdEdge', 0x8a8478, 0.9), steel = mt('mdRail', 0xd8d8d8, 0.4, { metalness: 0.6 });
    // walkway along x at z = 0, water behind it
    part(g, G.box(48, 0.3, 6), pave, 0, 0.15, 0);
    part(g, G.box(48, 0.6, 0.4), stone, 0, 0.0, -3.1);
    waterPlane(g, 52, 22, 0, 0.08, -14);
    rail(g, -24, -2.9, 24, -2.9, 0.3, 1.0, steel);
    // the Rainbow Bridge: a high arch in rainbow bands over the walkway
    const RB = [0xd8203a, 0xe07a1f, 0xf2c230, 0x3f9f3c, 0x2c5fa8, 0x6b3fa0];
    RB.forEach((c, i) => {
      const r = 6.5 - i * 0.22;
      part(g, new T.TorusGeometry(r, 0.12, 6, 30, Math.PI), mt('rb' + i, c, 0.5), 0, 0.3, 0, 0, Math.PI / 2, 0);
      void r;
    });
    [-1, 1].forEach((s) => part(g, G.box(1.4, 1.2, 7), stone, 0, 0.6, s * 6.4));
    // apartment towers on the land side
    const tower = KT.mat('pl_mdTower', { map: winTex, roughness: 0.6 });
    [[-22, 10, 16], [-24, 19, 22], [22, 10, 14], [25, 19, 19]].forEach(([x, z, h], i) => {
      part(g, G.box(7, h, 7), tower, x, h / 2, z);
      part(g, G.box(7.4, 0.5, 7.4), mt('mdTop' + (i % 2), i % 2 ? 0x2c5fa8 : 0xc4212b, 0.6), x, h + 0.25, z);
    });
    // jetty
    part(g, G.box(3, 0.25, 8), M().wood, 14, 0.45, -6.5);
    const baked = KT.bake(g);
    [-20, -12, 12, 20].forEach((x) => add(top, Models.lampPost(), x, 0.3, 2.4));
    // rows of red benches facing each other along the walk
    const redBench = mt('mdBench', 0xb02a24, 0.6);
    for (let x = -22; x <= 22; x += 3) [-1, 1].forEach((sd) => {
      if (Math.abs(x) < 3) return;
      part(top, G.box(1.6, 0.08, 0.5), redBench, x, 0.75, sd * 2.2);
      part(top, G.box(1.6, 0.5, 0.08), redBench, x, 1.05, sd * 2.45);
      [-0.7, 0.7].forEach((dx) => part(top, G.box(0.06, 0.45, 0.45), M().darkGrey, x + dx, 0.52, sd * 2.25));
    });
    // the container cranes of Vallarpadam across the water
    const crane = mt('mdCrane', 0x3f6ab0, 0.6);
    [-14, -6, 2].forEach((x) => {
      [-1.6, 1.6].forEach((dz) => part(top, G.box(0.5, 16, 0.5), crane, x, 8, -34 + dz));
      part(top, G.box(1.0, 1.0, 16), crane, x, 16, -36);
      part(top, G.box(0.4, 6, 0.4), crane, x, 19, -34, 0, 0, 0.0);
    });
    part(top, G.box(30, 0.6, 6), mt('mdQuay', 0x8a8478, 0.9), -6, 0.3, -34);
    if (Models.motorBoat) add(top, Models.motorBoat(), 17, 0.1, -9, 0.4);
    add(top, Models.houseboat(), -12, 0.12, -14, Math.PI / 2 + 0.2, 0.9);
    baked.add(KT.bake(top));
    baked.userData.colliders = [{ type: 'box', x: 0, z: -9, hw: 26, hd: 6 }, ...[[-22, 10], [-24, 19], [22, 10], [25, 19]].map(([x, z]) => ({ type: 'box', x, z, hw: 3.6, hd: 3.6 }))];
    return baked;
  };

  // ------------------------------------------------------ Parambikulam
  // Kannimara, the giant teak (450 years, 40 m), behind its fence; a tree
  // house on stilts; a bamboo raft on the reservoir; gaur grazing.
  Models.parambikulam = function () {
    const g = new T.Group();
    const bark = mt('teakBark', 0x5a4632, 0.95), leaf = mt('teakLeaf', 0x4a7a2c, 0.9), bam = mt('bamboo', 0xb9a45a, 0.7);
    // the giant teak
    part(g, G.cyl(1.2, 2.0, 22, 12), bark, -6, 11, -6);
    for (let i = 0; i < 6; i++) { const a = i * 1.05; part(g, G.box(0.5, 2.4, 2.2), bark, -6 + Math.cos(a) * 1.6, 1.1, -6 + Math.sin(a) * 1.6, 0, -a, 0); }
    for (let i = 0; i < 7; i++) { const a = i * 0.9; part(g, KT.blob(3.6, 1, 0.3, 700 + i), leaf, -6 + Math.cos(a) * 3, 22 + (i % 3) * 1.6, -6 + Math.sin(a) * 3); }
    for (let i = 0; i < 10; i++) { const a = i * 0.63; part(g, G.box(0.08, 1, 0.08), M().woodDark, -6 + Math.cos(a) * 4, 0.5, -6 + Math.sin(a) * 4); }
    // the tree house on stilts
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => part(g, G.cyl(0.18, 0.2, 6, 6), M().woodDark, 9 + a * 1.6, 3, -2 + b * 1.6));
    part(g, G.box(4.2, 0.25, 4.2), M().wood, 9, 6, -2);
    part(g, G.box(3, 2.2, 3), M().woodLight, 9, 7.2, -2);
    part(g, KT.hipRoofGeometry(4.4, 4.4, 1.6, 0.3), M().thatch, 9, 8.3, -2);
    for (let i = 0; i < 12; i++) part(g, G.box(1, 0.1, 0.3), M().wood, 11.5, 0.4 + i * 0.48, -0.4 + i * 0.32, 0.5, 0, 0);
    // bamboo raft on the water
    for (let i = 0; i < 9; i++) part(g, G.cyl(0.12, 0.12, 5, 6), bam, -2 + i * 0.26, 0.14, 10, Math.PI / 2, 0, 0);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'circle', x: -6, z: -6, r: 4.2 }, { type: 'box', x: 9, z: -2, hw: 2.2, hd: 2.2 }];
    return baked;
  };

  // ------------------------------------------------------ Kottakkunnu
  // A hill park on the ruins of the Zamorin's fort: laterite walls, lawns
  // and flower beds, an open-air stage, swings and a slide for children,
  // and a sunset viewpoint.
  Models.kottakkunnu = function () {
    const g = new T.Group(), top = new T.Group();
    const lat = KT.mat('pl_kkLat', { map: KT.tex('laterite', 2, 1), color: 0xb5603a }, 0.2), lawn = mt('kkLawn', 0x6fa04a, 1);
    part(g, G.sph(22, 30, 14), lawn, 0, -16, -2, 0, 0, 0, 1, 0.8, 1);
    const ty = 1.6;
    // fort wall ruins along the back
    [[-14, -14, 8, 0.3], [-4, -18, 7, 0], [7, -17, 6, -0.2], [15, -11, 6, -0.8]].forEach(([x, z, w, r], i) => {
      part(g, G.box(w, 2.6 - (i % 2) * 0.8, 1.2), lat, x, ty + 1.2, z, 0, r, 0);
      for (let k = 0; k < 3; k++) part(g, G.box(0.9, 0.6, 1.2), lat, x - w / 3 + k * w / 3, ty + 2.7 - (i % 2) * 0.8, z, 0, r, 0);
    });
    // open-air stage
    part(g, G.box(9, 1, 5), M().stoneGrey, -8, ty + 0.5, -8);
    part(g, new T.CylinderGeometry(4.6, 4.6, 0.25, 20, 1, false, Math.PI, Math.PI), mt('stageShell', 0xf0e6d0, 0.8), -8, ty + 5, -10.4);
    [-12, -4].forEach((x) => part(g, G.box(0.4, 4.2, 0.4), mt('stageShell', 0xf0e6d0, 0.8), x, ty + 3, -10.2));
    // children's swings and slide
    const play = mt('play', 0xe07a1f, 0.5), play2 = mt('play2', 0x2c5fa8, 0.5);
    [[8, 2]].forEach(([x, z]) => {
      [-1.5, 1.5].forEach((dx) => part(g, G.box(0.12, 2.6, 0.12), play2, x + dx, ty + 1.3, z));
      part(g, G.box(3.2, 0.12, 0.12), play2, x, ty + 2.6, z);
      [-0.6, 0.6].forEach((dx) => { part(g, G.box(0.03, 1.8, 0.03), M().darkGrey, x + dx, ty + 1.7, z); part(g, G.box(0.5, 0.06, 0.25), play, x + dx, ty + 0.8, z); });
    });
    part(g, G.box(0.8, 0.1, 4), play, 12, ty + 1.2, -2, 0.5, 0, 0);
    part(g, G.box(1, 2.4, 1), play2, 12, ty + 1.2, -4);
    // the musical fountain: a round pool with jets
    part(g, G.cyl(3.2, 3.4, 0.6, 24), M().stoneGrey, 0, ty + 0.3, 2);
    waterDiscM(g, 3.0, 0, ty + 0.62, 2);
    const jet = mt('jet', 0xe8f6fa, 0.2, { transparent: true, opacity: 0.6, emissive: 0x9fc6d0, emissiveIntensity: 0.3 });
    part(g, G.cyl(0.06, 0.18, 3.2, 8), jet, 0, ty + 2.2, 2);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; part(g, G.cyl(0.04, 0.1, 1.6, 6), jet, Math.cos(a) * 2, ty + 1.4, 2 + Math.sin(a) * 2, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); }
    // a giant wheel for the children's park
    const fw = mt('wheelSteel', 0xd8203a, 0.5), fw2 = mt('wheelCab', 0xf2c230, 0.5);
    [-0.6, 0.6].forEach((z) => {
      part(g, new T.TorusGeometry(4.2, 0.08, 6, 32), fw, 15, ty + 5.6, -6 + z);
      [-1, 1].forEach((sd) => part(g, G.box(0.18, 6.2, 0.18), fw, 15 + sd * 1.6, ty + 2.7, -6 + z, 0, 0, sd * 0.28));
    });
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      part(g, G.box(0.06, 4.2, 0.06), fw, 15 + Math.cos(a) * 2.1, ty + 5.6 + Math.sin(a) * 2.1, -6, 0, 0, a + Math.PI / 2);
      part(g, KT.roundBox(0.8, 0.7, 1.0, 0.12), fw2, 15 + Math.cos(a) * 4.2, ty + 5.1 + Math.sin(a) * 4.2, -6);
    }
    // the long straight stairway up the hill, lined with double-globe lamps
    const stepM = mt('kkStep', 0xc9785a, 0.85), globe = mt('kkGlobe', 0xfff6e0, 0.3, { emissive: 0xffe8b0, emissiveIntensity: 0.4 });
    for (let i = 0; i < 26; i++) {
      const z = 26 - i * 0.75, y = Math.max(0, ty - 0.2 - (25 - i) * (ty / 25));
      part(g, G.box(3.2, 0.3, 0.8), stepM, -2, y + 0.15, z);
      if (i % 4 === 0) [-1, 1].forEach((sd) => {
        part(g, G.cyl(0.06, 0.08, 3, 6), M().darkGrey, -2 + sd * 2.1, y + 1.5, z);
        [-0.3, 0.3].forEach((dx) => part(g, G.sph(0.2, 8, 6), globe, -2 + sd * 2.1 + dx, y + 3.0, z));
        part(g, G.box(0.7, 0.05, 0.05), M().darkGrey, -2 + sd * 2.1, y + 2.85, z);
      });
    }
    // sunset viewpoint railing
    rail(g, -6, 8, 6, 8, ty - 0.5, 1, mt('rail', 0x3a3a3a, 0.6));
    const baked = KT.bake(g);
    for (let i = 0; i < 6; i++) add(top, Models.flowerBed(i), -14 + i * 5.5, ty - 0.2, 2 + (i % 2) * 3);
    [[-16, -4], [16, 4], [0, -6], [-2, 12]].forEach(([x, z], i) => add(top, i % 2 ? Models.banyanTree() : Models.mangoTree(), x, ty - 0.3, z, i, 0.8));
    baked.add(KT.bake(top));
    baked.userData.colliders = [{ type: 'box', x: -8, z: -8, hw: 4.6, hd: 2.6 }, { type: 'box', x: 0, z: -16, hw: 16, hd: 2 }];
    return baked;
  };

  // ---------------------------------------------------------- Beypore
  // The uru yard: a great wooden dhow being built on props in scaffolding,
  // timber stacks and a shed, and the long breakwater (pulimuttu) of rocks
  // with a walkway and a small lighthouse at its end.
  Models.beypore = function () {
    const g = new T.Group();
    const wood = mt('uruWood', 0xb06a34, 0.8), wood2 = mt('uruWood2', 0x8f5228, 0.85), scaf = mt('scaffold', 0x9a8a6a, 0.9), rock = mt('bwRock', 0x6b6a66, 0.95);
    // the hull: slices along its length
    const L = 22;
    for (let i = 0; i < 24; i++) {
      const t = i / 23, z = (t - 0.5) * L - 4, w = 0.6 + Math.sin(t * Math.PI) * 3.2, h = 1.6 + Math.sin(t * Math.PI) * 2.6, lift = Math.pow(Math.abs(t - 0.5) * 2, 2.5) * 2.2;
      part(g, G.box(w * 2, 0.3, L / 23 + 0.05), wood2, -8, 1.6 + lift, z);
      [-1, 1].forEach((s) => part(g, G.box(0.25, h, L / 23 + 0.05), i % 2 ? wood : wood2, -8 + s * w, 1.6 + h / 2 + lift, z, 0, 0, s * 0.18));
    }
    part(g, G.box(0.5, 0.6, L + 1), wood2, -8, 1.2, -4);                       // keel
    part(g, G.box(0.4, 6, 0.6), wood, -8, 5, -4 + L / 2 + 0.6, 0.5, 0, 0);       // prow post
    // props and scaffolding
    for (let i = 0; i < 8; i++) [-1, 1].forEach((s) => part(g, G.cyl(0.1, 0.12, 3.2, 6), scaf, -8 + s * 4.6, 1.6, -14 + i * 2.8, 0, 0, s * 0.45));
    for (let i = 0; i < 6; i++) [-1, 1].forEach((s) => { part(g, G.cyl(0.07, 0.07, 7, 5), scaf, -8 + s * 5.2, 3.5, -14 + i * 4); });
    [2.5, 5].forEach((y) => [-1, 1].forEach((s) => part(g, G.box(0.25, 0.08, 22), scaf, -8 + s * 5.2, y, -4)));
    // timber stacks and the shed
    for (let i = 0; i < 9; i++) part(g, G.box(4, 0.4, 0.4), wood2, 4, 0.2 + Math.floor(i / 3) * 0.4, 6 + (i % 3) * 0.45);
    part(g, G.box(6, 3, 4), mt('yardShed', 0xd8c8a8, 0.9), 6, 1.5, -6);
    part(g, KT.hipRoofGeometry(7, 5, 1.4, 0.3), M().roof, 6, 3, -6);
    // the breakwater: rocks with a walkway, out over the water
    for (let i = 0; i < 22; i++) part(g, KT.blob(1.1 + (i % 3) * 0.3, 1, 0.3, 800 + i), rock, 15 + (i % 2) * 1.6, 0.2, 4 - i * 1.6);
    part(g, G.box(2.2, 0.3, 32), M().stoneGrey, 15.8, 1.1, -12);
    part(g, G.cyl(0.8, 1.0, 5, 10), M().white, 15.8, 3.6, -27);
    part(g, G.cyl(1.05, 1.05, 1.2, 10), mt('lhRed', 0xd8203a, 0.6), 15.8, 2.2, -27);
    part(g, G.cyl(0.5, 0.5, 0.8, 10), mt('lhLamp', 0xfff2c0, 0.3, { emissive: 0xffe08a, emissiveIntensity: 0.6 }), 15.8, 6.5, -27);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: -8, z: -4, hw: 5.4, hd: 12 }, { type: 'box', x: 6, z: -6, hw: 3, hd: 2 }];
    return baked;
  };

  // ------------------------------------------------- railway bridge
  // a girder bridge on stone piers (Kadalundi river mouth)
  Models.railBridge = function (len) {
    // a low concrete bridge on round piers with railings (Kadalundi's)
    const g = new T.Group(), conc = mt('bridgeConc', 0xb9b4aa, 0.9), dark = mt('bridgeConcDark', 0x8a857c, 0.9), rail = mt('bridgeRail', 0x6a6a6a, 0.6);
    const n = Math.round(len / 8);
    for (let i = 0; i <= n; i++) [-1.2, 1.2].forEach((x) => part(g, G.cyl(0.45, 0.5, 4.5, 10), dark, x, 1.3, -len / 2 + i * len / n));
    part(g, G.box(4.4, 0.7, len), conc, 0, 3.6, 0);
    part(g, G.box(4.0, 0.08, len), mt('bridgeRoad', 0x5a5a5a, 0.9), 0, 3.99, 0);
    [-1, 1].forEach((s) => {
      part(g, G.box(0.25, 0.25, len), conc, s * 2.1, 4.05, 0);
      part(g, G.box(0.08, 0.08, len), rail, s * 2.1, 4.9, 0);
      for (let t = -len / 2; t <= len / 2; t += 1.5) part(g, G.box(0.1, 0.9, 0.1), rail, s * 2.1, 4.45, t);
    });
    return KT.bake(g);
  };


  // ------------------------------------- Parassinikkadavu snake park
  // Round snake pits, a glass-fronted cobra house, a crocodile pond and
  // the arched gate.
  Models.snakePark = function () {
    const g = new T.Group(), top = new T.Group();
    const conc = mt('pitWall', 0xd8d0be, 0.85), sandM = mt('pitSand', 0xc9a87a, 1), glass = mt('cobraGlass', 0x9ac6d0, 0.1, { transparent: true, opacity: 0.35 });
    // snake pits
    [[-12, -4], [-4, -10], [5, -4]].forEach(([x, z], i) => {
      part(g, new T.CylinderGeometry(4, 4, 1.3, 24, 1, true), conc, x, 0.65, z);
      part(g, G.cyl(3.9, 3.9, 0.1, 24), sandM, x, 0.05, z);
      part(g, G.torus(4, 0.15, 4, 24), conc, x, 1.3, z, Math.PI / 2, 0, 0);
      part(g, KT.blob(0.9, 1, 0.3, 900 + i), M().stoneGrey, x + 1, 0.3, z - 1);
      for (let k = 0; k < 3; k++) add(top, Models.snake(i * 3 + k, k === 0 && i === 1), x - 1.5 + k * 1.3, 0.05, z + (k - 1) * 1.2, k * 2);
    });
    // the cobra house
    part(g, G.box(9, 3.4, 4), mt('cobraHouse', 0xf0e6d0, 0.8), 10, 1.7, -14);
    part(g, KT.hipRoofGeometry(10, 5, 1.6, 0.3), M().roof, 10, 3.4, -14);
    part(g, G.box(8, 1.8, 0.08), glass, 10, 1.6, -11.95);
    // the second king cobra house, and fifteen glass cases on stands
    part(g, G.box(7, 3, 3.6), mt('cobraHouse', 0xf0e6d0, 0.8), 16, 1.5, 4);
    part(g, KT.hipRoofGeometry(8, 4.6, 1.4, 0.3), M().roof, 16, 3.0, 4);
    part(g, G.box(6.2, 1.6, 0.08), glass, 16, 1.4, 5.85);
    for (let i = 0; i < 15; i++) {
      const x = -18 + (i % 5) * 2.2, z = -16 - Math.floor(i / 5) * 2.4;
      part(g, G.box(1.6, 0.9, 0.1), M().woodDark, x, 0.45, z);
      part(g, G.box(1.6, 0.9, 0.9), glass, x, 1.35, z + 0.4);
      part(g, G.box(1.62, 0.06, 0.92), M().darkGrey, x, 1.82, z + 0.4);
    }
    // the statue of a man holding up a crocodile
    const st = mt('statue', 0xb8b0a2, 0.8);
    part(g, G.box(2, 1, 2), M().stoneGrey, 2, 0.5, 8);
    part(g, G.cyl(0.25, 0.3, 1.5, 8), st, 2, 1.75, 8);
    part(g, G.sph(0.24, 10, 8), st, 2, 2.75, 8);
    part(g, G.box(0.4, 0.25, 2.2), st, 2, 2.6, 8.3, 0.3, 0, 0);
    // the crocodile pond
    waterDiscM(g, 4.5, -14, 0.05, 8, 1.2, 0.8);
    part(g, G.torus(4.5, 0.25, 4, 28), conc, -14, 0.2, 8, Math.PI / 2, 0, 0, 1.2, 0.8, 1);
    const baked = KT.bake(g);
    [[-15, 7, 0.6], [-12, 9.5, 2.4]].forEach(([x, z, r]) => add(top, Models.crocodile(), x, 0.05, z, r));
    // turtles basking on a log in the pond
    part(top, G.cyl(0.25, 0.25, 3, 6), M().woodDark, -12.5, 0.2, 6.5, 0, 0, Math.PI / 2);
    [-13.4, -12.2].forEach((x) => part(top, G.sph(0.3, 8, 5), mt('turtle', 0x3f4a2a, 0.6), x, 0.5, 6.5, 0, 0, 0, 1, 0.45, 1.2));
    const gate = Models.entranceArch(['Snake Park', 'Parassinikkadavu']);
    add(top, gate, 0, 0, 14);
    [[-20, -12], [18, 4], [-20, 0], [16, -20]].forEach(([x, z], i) => add(top, Models.forestTree(i + 30), x, 0, z, i));
    baked.add(top);
    baked.userData.colliders = [[-12, -4], [-4, -10], [5, -4]].map(([x, z]) => ({ type: 'circle', x, z, r: 4.1 })).concat([{ type: 'box', x: 10, z: -14, hw: 4.6, hd: 2.1 }, { type: 'box', x: 16, z: 4, hw: 3.6, hd: 1.9 }, { type: 'circle', x: -14, z: 8, r: 5 }, { type: 'box', x: -13.6, z: -18.6, hw: 5.4, hd: 3 }, { type: 'box', x: 2, z: 8, hw: 1, hd: 1 }]);
    return baked;
  };

  // ---------------------------------------- Thrissur zoo aviary & pens
  Models.aviary = function () {
    const g = new T.Group();
    const wire = mt('aviaryWire', 0x3d4a3f, 0.6, { transparent: true, opacity: 0.25, depthWrite: false, side: T.DoubleSide });
    part(g, new T.SphereGeometry(6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), wire, 0, 0, 0);
    part(g, G.cyl(6.05, 6.05, 0.5, 24), mt('aviaryBase', 0x8a3b24, 0.9), 0, 0.25, 0);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; part(g, G.box(0.1, 0.1, 6.4), M().darkGrey, Math.cos(a) * 3, 4.3, Math.sin(a) * 3, 0, -a + Math.PI / 2, 0.9); }
    part(g, G.cyl(0.25, 0.4, 4, 6), M().woodDark, 0, 2, 0);
    part(g, KT.blob(2.2, 1, 0.3, 950), mt('aviaryTree', 0x4a7a2c, 0.9), 0, 4.3, 0);
    const baked = KT.bake(g);
    if (Models.peacock) [[-2, 1], [2, -1]].forEach(([x, z], i) => add(baked, Models.peacock(), x, 0.5, z, i * 2));
    [[1.5, 3.4, 0.8], [-1.2, 3.8, -0.6]].forEach(([x, y, z], i) => add(baked, i ? Models.kingfisher ? Models.kingfisher() : Models.egret() : Models.egret(), x, y, z, i));
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 6.1 }];
    return baked;
  };

  // ------------------------------------- Chembra's heart-shaped lake
  Models.heartLake = function () {
    const s = new T.Shape();
    s.moveTo(0, -3);
    s.bezierCurveTo(-5, 0.5, -3.5, 4, 0, 2.2);
    s.bezierCurveTo(3.5, 4, 5, 0.5, 0, -3);
    const geo = new T.ShapeGeometry(s, 16);
    geo.rotateX(-Math.PI / 2);
    const m = new T.Mesh(geo, water());
    const g = new T.Group();
    g.add(m);
    const rim = new T.Mesh(new T.ShapeGeometry(s, 16).rotateX(-Math.PI / 2), mt('heartRim', 0x6a8a3a, 1));
    rim.scale.set(1.15, 1, 1.15); rim.position.y = -0.03;
    g.add(rim);
    return g;
  };

  // ------------------------------------------ Malampuzha: Yakshi, ropeway
  // Kanayi Kunhiraman's reclining Yakshi (a huge figure in cement) and the
  // ropeway gondolas over the garden.
  Models.yakshi = function () {
    const g = new T.Group(), c = mt('yakshi', 0xcfc8b8, 0.85);
    part(g, G.box(12, 0.6, 5), M().stoneGrey, 0, 0.3, 0);
    part(g, G.capsule(1.4, 6, 6, 12), c, 0, 1.6, 0, 0, 0, Math.PI / 2 - 0.08);  // reclining body
    part(g, G.sph(1.3, 14, 10), c, 4.4, 3.2, 0.2);                              // head raised
    part(g, KT.blob(1.6, 1, 0.2, 960), c, 5.2, 3.6, -0.6, 0, 0, 0, 1, 0.8, 1.5); // flowing hair
    part(g, G.capsule(0.45, 3, 4, 8), c, 2.2, 2.7, 1.0, 0, 0, 0.9);             // raised arm
    part(g, G.capsule(0.55, 3.6, 4, 8), c, -4.2, 2.0, 0.6, 0, 0, 1.3);          // bent knee
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 6, hd: 2.5 }];
    return baked;
  };
  Models.ropeway = function (len) {
    const g = new T.Group(), steel = mt('ropeSteel', 0x6a6a6a, 0.5, { metalness: 0.5 });
    [-len / 2, len / 2].forEach((x) => { part(g, G.box(0.5, 9, 0.5), steel, x, 4.5, 0); part(g, G.box(0.5, 0.4, 3), steel, x, 9, 0); });
    [-1, 1].forEach((s) => part(g, G.box(len, 0.05, 0.05), M().darkGrey, 0, 8.8, s * 1.2));
    const cols = [0xd8203a, 0xf2c230, 0x2c5fa8, 0x2a9d8f];
    for (let i = 0; i < 6; i++) {
      const x = -len / 2 + (i + 0.5) * len / 6, z = (i % 2 ? 1 : -1) * 1.2;
      part(g, G.box(0.05, 1, 0.05), M().darkGrey, x, 8.3, z);
      part(g, KT.roundBox(1.2, 1.1, 1.2, 0.2), mt('gondola' + (i % 4), cols[i % 4], 0.5), x, 7.4, z);
    }
    return KT.bake(g);
  };

  // --------------------------------------------- Thenmala hanging bridge
  Models.hangingBridge = function (len) {
    const g = new T.Group(), rope = mt('rope', 0x8a7a5a, 0.9), plank = M().wood;
    const n = Math.round(len / 0.6);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = -len / 2 + t * len, sag = Math.sin(t * Math.PI) * 1.2;
      part(g, G.box(0.4, 0.06, 1.4), plank, x, 4 - sag, 0);
      if (i % 3 === 0) [-1, 1].forEach((s) => part(g, G.box(0.03, 1.1, 0.03), rope, x, 4.55 - sag, s * 0.7));
    }
    [-1, 1].forEach((s) => {
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, x0 = -len / 2 + t0 * len, x1 = -len / 2 + t1 * len;
        const y0 = 5.1 - Math.sin(t0 * Math.PI) * 1.2, y1 = 5.1 - Math.sin(t1 * Math.PI) * 1.2;
        part(g, G.box(Math.hypot(x1 - x0, y1 - y0), 0.05, 0.05), rope, (x0 + x1) / 2, (y0 + y1) / 2, s * 0.7, 0, 0, Math.atan2(y1 - y0, x1 - x0));
      }
    });
    [-len / 2, len / 2].forEach((x) => [-1, 1].forEach((s) => part(g, G.cyl(0.15, 0.18, 5.5, 6), M().woodDark, x, 2.75, s * 0.8)));
    return KT.bake(g);
  };

  // ------------------------------------------------- Konni kraal
  // the Aanakoodu: a giant cage of kambakam logs (12.65 x 8.6 x 7 m, 1942)
  // where calves found lost in the forest are cared for and trained
  Models.kraal = function () {
    const g = new T.Group(), log = mt('kambakam', 0x6b4a30, 0.9), log2 = mt('kambakam2', 0x5a3c26, 0.9);
    const W = 12.65, D = 8.6, H = 7;
    for (let x = -W / 2; x <= W / 2 + 0.01; x += 0.62) [-D / 2, D / 2].forEach((z) => part(g, G.cyl(0.2, 0.24, H, 7), (Math.round(x * 3) % 2) ? log : log2, x, H / 2, z));
    for (let z = -D / 2 + 0.62; z < D / 2; z += 0.62) [-W / 2, W / 2].forEach((x) => part(g, G.cyl(0.2, 0.24, H, 7), log, x, H / 2, z));
    [1.2, 3.6, 6.2].forEach((y) => {
      [-D / 2 - 0.25, D / 2 + 0.25].forEach((z) => part(g, G.cyl(0.22, 0.22, W + 0.8, 7), log2, 0, y, z, 0, 0, Math.PI / 2));
      [-W / 2 - 0.25, W / 2 + 0.25].forEach((x) => part(g, G.cyl(0.22, 0.22, D + 0.8, 7), log2, x, y, 0, Math.PI / 2, 0, 0));
    });
    for (let x = -W / 2; x <= W / 2; x += 1.6) part(g, G.cyl(0.22, 0.22, D + 0.8, 7), log2, x, H + 0.2, 0, Math.PI / 2, 0, 0);
    part(g, KT.hipRoofGeometry(W + 3, D + 3, 2.2, 0.3), M().roof, 0, H + 0.4, 0);
    part(g, G.box(W, 0.1, D), mt('kraalFloor', 0x8a6a46, 1), 0, 0.05, 0);
    const baked = KT.bake(g);
    const calf = KT.skinify(Models.elephant(false, 3)); calf.scale.setScalar(0.6); add(baked, calf, 1, 0, 0, 1.2);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: W / 2 + 0.3, hd: D / 2 + 0.3 }];
    return baked;
  };

  // ------------------------------------------- Thenmala canopy walk
  // an elevated wooden walkway on posts winding through the trees, with
  // green pipe railings and stairs at each end
  Models.canopyWalk = function () {
    const g = new T.Group(), top = new T.Group();
    const deck = M().wood, post = M().woodDark, rail = mt('canopyRail', 0x2f6b3a, 0.5);
    const pts = [[-18, 4], [-10, 0], [-2, 3], [6, -2], [14, 1], [20, -4]];
    const Y = 4.2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
      part(g, G.box(1.6, 0.18, len + 0.4), deck, (x0 + x1) / 2, Y, (z0 + z1) / 2, 0, ang, 0);
      [-1, 1].forEach((sd) => {
        const ox = Math.cos(ang) * 0.8 * sd, oz = -Math.sin(ang) * 0.8 * sd;
        part(g, G.box(0.06, 0.06, len), rail, (x0 + x1) / 2 + ox, Y + 1.05, (z0 + z1) / 2 + oz, 0, ang, 0);
        part(g, G.box(0.05, 0.05, len), rail, (x0 + x1) / 2 + ox, Y + 0.55, (z0 + z1) / 2 + oz, 0, ang, 0);
        for (let t = 0; t <= len; t += 1.6) part(g, G.box(0.06, 1.05, 0.06), rail, x0 + (x1 - x0) * t / len + ox, Y + 0.55, z0 + (z1 - z0) * t / len + oz);
      });
      [[x0, z0]].forEach(([x, z]) => [-0.7, 0.7].forEach((o) => part(g, G.box(0.22, Y, 0.22), post, x + o, Y / 2, z)));
    }
    // stairs down at both ends
    [[pts[0], -1], [pts[pts.length - 1], 1]].forEach(([[x, z], sd]) => {
      for (let i = 0; i < 12; i++) part(g, G.box(1.6, 0.16, 0.5), deck, x + sd * (1 + i * 0.5), Y - 0.35 * (i + 1), z);
    });
    const baked = KT.bake(g);
    [[-14, -3], [-6, 6], [2, -4], [10, 5], [17, -7], [-20, -2], [8, -8]].forEach(([x, z], i) => add(top, Models.forestTree(i + 50), x, 0, z, i, 1.2));
    baked.add(KT.bake(top));
    return baked;
  };
  // the deer rehabilitation enclosure: a wire-mesh fence round spotted deer
  Models.deerPen = function () {
    const g = new T.Group(), top = new T.Group();
    const mesh = mt('penMesh', 0x3d4a3f, 0.6, { transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide });
    const W = 14, D = 10;
    [[-W / 2, -D / 2, W / 2, -D / 2], [W / 2, -D / 2, W / 2, D / 2], [W / 2, D / 2, -W / 2, D / 2], [-W / 2, D / 2, -W / 2, -D / 2]].forEach(([a, b, c, d]) => {
      const len = Math.hypot(c - a, d - b), ang = Math.atan2(c - a, d - b) + Math.PI / 2;
      part(g, G.box(len, 2.2, 0.04), mesh, (a + c) / 2, 1.1, (b + d) / 2, 0, ang, 0);
      for (let t = 0; t <= len; t += 2.5) part(g, G.box(0.1, 2.4, 0.1), M().darkGrey, a + (c - a) * t / len, 1.2, b + (d - b) * t / len);
    });
    part(g, G.box(W, 0.04, D), mt('penGround', 0x8a6a46, 1), 0, 0.03, 0);
    const baked = KT.bake(g);
    if (Models.deer) [[-3, -1, 0.4, false], [1, 2, 2, true], [4, -2, -1, true], [-1, 3, 3, true]].forEach(([x, z, r, doe]) => add(top, Models.deer(doe), x, 0, z, r));
    baked.add(top);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: W / 2, hd: D / 2 }];
    return baked;
  };

  // ------------------------------------------------ Mananchira tank
  Models.mananchira = function () {
    // the royal tank: a wide sheet of water inside a grassy bank, ringed by
    // a red-paved walkway with red-brick pillars and iron rails
    const g = new T.Group(), lawn = mt('mnLawn', 0x6aa043, 1), pave = mt('mnPave', 0xa4553a, 0.85), brick = mt('mnBrick', 0x8a3b24, 0.9), iron = mt('mnIron', 0x3a3a3a, 0.5);
    const W = 26, D = 17;
    part(g, G.box(W + 12, 0.1, D + 12), lawn, 0, 0.05, 0);
    part(g, G.box(W + 7, 0.14, D + 7), pave, 0, 0.08, 0);
    part(g, G.box(W + 2, 0.18, D + 2), lawn, 0, 0.1, 0);
    waterPlane(g, W, D, 0, 0.22, 0);
    const posts = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
      for (let t = 0; t <= len + 0.01; t += 2.6) {
        const x = x0 + (x1 - x0) * t / len, z = z0 + (z1 - z0) * t / len;
        part(g, G.box(0.45, 1.3, 0.45), brick, x, 0.8, z);
        part(g, G.box(0.55, 0.1, 0.55), mt('mnCap', 0x6a5a4a, 0.8), x, 1.5, z);
      }
      [0.75, 1.15].forEach((y) => part(g, G.box(0.05, 0.05, len), iron, (x0 + x1) / 2, y, (z0 + z1) / 2, 0, ang, 0));
    };
    const hx = W / 2 + 1.6, hz = D / 2 + 1.6;
    posts(-hx, -hz, hx, -hz); posts(-hx, hz, hx, hz); posts(-hx, -hz, -hx, hz); posts(hx, -hz, hx, hz);
    const baked = KT.bake(g);
    const top = new T.Group();
    [[-hx - 2.5, hz + 2], [hx + 2.5, hz + 2], [-hx - 2.5, -hz - 2], [hx + 2.5, -hz - 2]].forEach(([x, z]) => add(top, Models.lampPost(), x, 0.15, z));
    [[-hx - 5, 0], [hx + 5, 0]].forEach(([x, z], i) => add(top, Models.banyanTree(), x, 0, z, i, 0.75));
    baked.add(KT.bake(top));
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: hx, hd: hz }];
    return baked;
  };


  // -------------------------------------------- Payyambalam sculpture
  // Kanayi's "Amma" (mother and child) in the beach garden
  Models.ammaSculpture = function () {
    const g = new T.Group(), c = mt('amma', 0xb9b2a4, 0.85);
    part(g, G.box(4, 0.8, 4), M().stoneGrey, 0, 0.4, 0);
    part(g, G.capsule(0.9, 2.6, 6, 12), c, 0, 2.6, 0, 0.15, 0, 0);
    part(g, G.sph(0.7, 12, 10), c, 0, 4.7, 0.3);
    part(g, G.capsule(0.45, 0.9, 4, 10), c, 0.5, 3.0, 0.9, 0, 0, 0.6);
    part(g, G.sph(0.42, 10, 8), c, 0.9, 3.7, 1.0);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 2, hd: 2 }];
    return baked;
  };
  // spray rising from the foot of a big waterfall
  Models.mistCloud = function () {
    const g = new T.Group();
    for (let i = 0; i < 8; i++) mist(g, -9 + i * 2.6, 2 + (i % 3) * 1.8, -1 + (i % 2), 8, 0.45);
    return g;
  };
  // dead tree stumps standing in Periyar lake
  Models.stumps = function () {
    const g = new T.Group(), m = mt('stump', 0x6a5a4a, 0.95);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.1, r = 3 + (i % 4) * 3;
      part(g, G.cyl(0.18, 0.3, 2.5 + (i % 3), 6), m, Math.cos(a) * r, 1.2, Math.sin(a) * r, (i % 2 - 0.5) * 0.15, 0, (i % 3 - 1) * 0.1);
      if (i % 3 === 0) part(g, G.cyl(0.06, 0.08, 1.2, 4), m, Math.cos(a) * r + 0.3, 2.6, Math.sin(a) * r, 0, 0, 0.8);
    }
    return KT.bake(g);
  };
})();
