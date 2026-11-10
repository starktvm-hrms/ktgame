// Waterfalls: a curved gorge of layered, wet rock with moss and hanging
// creepers, forest along the rim and a river running to the lip; the water
// pours over it in streams that curve out and spread as they fall, in one
// or more tiers, with white water breaking on the ledges, a churning pool
// of foam at the foot, spray clouds rising and drifting, and the stream
// running out of the pool past boulders. A railed viewing deck stands by
// the pool.
//
// Models.waterfall(opts) — or (height) for the plain one. opts:
//   H        height of the drop (24)
//   w        width of the lip the water pours over (14)
//   streams  how many separate streams (2)
//   tiers    1-3 drops, broken by ledges (1)
//   rock     rock colour
// The model faces +z, its pool centred on the origin. userData.tick(t)
// animates the water; userData.poolR is the pool's radius.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = KT.maxAnisotropy;
    return t;
  }
  // falling water: bright streaks, soft at the sides (alpha in the texture)
  function fallTexture(seed, dense) {
    const rng = KT.makeRng(seed);
    return canvasTex(128, 512, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      for (let i = 0; i < (dense ? 520 : 300); i++) {
        const x = rng() * w, len = 30 + rng() * 140, y = rng() * h;
        const a = 0.25 + rng() * 0.6, b = 200 + rng() * 55;
        c.fillStyle = 'rgba(' + Math.round(b * 0.93) + ',' + Math.round(b * 0.98) + ',' + Math.round(b) + ',' + a + ')';
        c.fillRect(x, y, 1 + rng() * 3.5, len);
        if (y + len > h) c.fillRect(x, y - h, 1 + rng() * 3.5, len);
      }
      // soft edges
      const gx = c.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.12, 'rgba(0,0,0,0)'); gx.addColorStop(0.88, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = gx; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
    });
  }
  // foam: blotchy white
  function foamTexture() {
    const rng = KT.makeRng(77);
    return canvasTex(256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      for (let i = 0; i < 420; i++) {
        const x = rng() * w, y = rng() * h, r = 3 + rng() * 14;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.35 + rng() * 0.5) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
  }
  function puffTexture() {
    return canvasTex(128, 128, (c, w) => {
      const rng = KT.makeRng(5);
      for (let i = 0; i < 14; i++) {
        const x = w / 2 + (rng() - 0.5) * w * 0.4, y = w / 2 + (rng() - 0.5) * w * 0.3, r = w * (0.2 + rng() * 0.2);
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, w);
      }
    });
  }
  let FOAM = null, PUFF = null;

  // a ribbon of falling water: from (x, yTop, zTop) down to yBot, curving
  // out from the lip and spreading as it falls
  function ribbon(width, yTop, yBot, zTop, out, spread, mat, segs) {
    const h = yTop - yBot, geo = new T.PlaneGeometry(width, h, 6, segs || 18);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i);
      const t = (h / 2 - y) / h;               // 0 at the lip, 1 at the bottom
      P.setXYZ(i, x * (1 + spread * t), yTop - t * h, zTop + out * Math.sqrt(t) + Math.sin(x * 0.7) * 0.15);
    }
    geo.computeVertexNormals();
    return new T.Mesh(geo, mat);
  }

  // each named fall's size and shape (shared with the terrain, which rises
  // to the lip behind it)
  KT.FALLS = {
    athirappilly: { H: 26, w: 30, streams: 4 },        // a broad curtain in parts
    palaruvi: { H: 38, w: 8, streams: 1, tiers: 3, rock: 0x3d3833 }, // a milky stream stepping down a dark rock face
    perunthenaruvi: { H: 14, w: 30, streams: 6, tiers: 3, rock: 0x2f2d2a }, // ~30 m wide, slanting down over honeycombed black rock
    adyanpara: { H: 10, w: 22, streams: 6, tiers: 2 }, // cascades over sloping slabs
    soochipara: { H: 34, w: 9, streams: 1, tiers: 3 }, // "needle rock" falls in three tiers
    thusharagiri: { H: 24, w: 12, streams: 2, tiers: 2 },
    meenmutty: { H: 26, w: 12, streams: 2, tiers: 2 },
    plain: { H: 24, w: 14, streams: 2 }
  };
  const ARC = 2.7;
  // the gorge's plan: its radius, the lip, the arc's centre and where its
  // two ends reach (model space, +z towards the viewer)
  Models.waterfallShape = function (opts) {
    const H = opts.H || 24, W = opts.w || 14;
    const Rc = Math.max(16, W * 0.75 + 9);
    const backZ = -Math.max(9, W * 0.35 + 6);
    const z0 = backZ + Rc;
    return { H, W, Rc, backZ, z0, zEnd: z0 - Rc * Math.cos(ARC / 2), arc: ARC };
  };

  Models.waterfall = function (opts) {
    if (typeof opts !== 'object' || !opts) opts = { H: opts ? Math.max(opts, 20) : 24 };
    const H = opts.H || 24, W = opts.w || 14, streams = opts.streams || 2, tiers = Math.max(1, Math.min(3, opts.tiers || 1));
    const rng = KT.makeRng(Math.round(H * 7 + W * 13 + streams));
    const g = new T.Group(), top = new T.Group();
    const shp = Models.waterfallShape(opts);
    const Rc = shp.Rc, backZ = shp.backZ, z0 = shp.z0;   // gorge radius, the lip, the arc's centre
    const rockCol = new T.Color(opts.rock || 0x5d5850), wet = rockCol.clone().multiplyScalar(0.55), moss = new T.Color(0x4f7034), moss2 = new T.Color(0x6b8a3c);

    // ---- the gorge: an arc of rock wall, stratified, wet where the water runs
    const geo = new T.CylinderGeometry(Rc, Rc * 1.06, H + 3, 56, 14, true, Math.PI - ARC / 2, ARC);
    const P = geo.attributes.position, cols = [];
    const ledgeY = []; for (let k = 1; k < tiers; k++) ledgeY.push(H * (1 - k / tiers));
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i) + (H + 3) / 2, z = P.getZ(i);
      const a = Math.atan2(x, z), r = Math.hypot(x, z);
      // strata: rock steps back in bands; jitter; overhang at the top
      const band = Math.sin(y * 0.9 + a * 2) * 0.45 + Math.sin(y * 2.3) * 0.25 + (rng() - 0.5) * 0.9;
      const top_ = y > H - 1.5 ? -1.2 : 0;
      const ledge = ledgeY.reduce((m, ly) => m + Math.max(0, 1 - Math.abs(y - ly) / 1.2) * -2.4, 0);
      const rr = r + band + top_ + ledge;
      P.setXYZ(i, Math.sin(a) * rr, y, Math.cos(a) * rr + z0);
      // colour: wet behind the water, moss on ledges and higher up, rock between
      const wx = Math.abs(Math.sin(a) * rr);
      const c = rockCol.clone();
      if (wx < W * 0.6 && Math.cos(a) < -0.6) c.lerp(wet, 0.8);
      else if (rng() < 0.28 || (y > H * 0.7 && rng() < 0.5)) c.lerp(rng() < 0.5 ? moss : moss2, 0.75);
      c.multiplyScalar(0.85 + rng() * 0.3);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const rockM = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: T.DoubleSide });
    const wall = new T.Mesh(geo, rockM);
    wall.castShadow = wall.receiveShadow = true;
    g.add(wall);
    // the forest floor on top of the gorge, and the river to the lip
    const capR = Rc + 12;
    const cap = new T.Mesh(new T.RingGeometry(Rc - 0.8, capR, 48, 1, Math.PI / 2 - ARC / 2, ARC), KT.mat('fallTop', { color: 0x4f7a32, roughness: 0.95 }));
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(0, H + 1.4, z0);
    g.add(cap);
    const flowTex = fallTexture(3, true), veilTex = fallTexture(9, false);
    flowTex.repeat.set(1, 1.6); veilTex.repeat.set(1, 1.1);
    const riverTex = fallTexture(21, false); riverTex.repeat.set(1, 3);
    const riverM = new T.MeshStandardMaterial({ map: riverTex, transparent: true, opacity: 0.9, color: 0xcfe8ee, roughness: 0.2, depthWrite: false });
    const riverBed = new T.Mesh(new T.PlaneGeometry(W * 0.9, 40), KT.Highway && KT.Highway.waterMaterial ? KT.Highway.waterMaterial() : riverM);
    riverBed.rotation.x = -Math.PI / 2; riverBed.position.set(0, H + 1.45, backZ - 20);
    g.add(riverBed);
    const river = new T.Mesh(new T.PlaneGeometry(W * 0.9, 40), riverM);
    river.rotation.x = -Math.PI / 2; river.position.set(0, H + 1.5, backZ - 20);
    g.add(river);

    // ---- the water
    const coreM = new T.MeshStandardMaterial({ map: flowTex, color: 0xf4fbff, emissive: 0xbfd8e0, emissiveIntensity: 0.35, transparent: true, opacity: 0.95, roughness: 0.15, side: T.DoubleSide, depthWrite: false });
    const veilM = new T.MeshStandardMaterial({ map: veilTex, color: 0xe6f2f6, emissive: 0x9fc0cc, emissiveIntensity: 0.25, transparent: true, opacity: 0.55, roughness: 0.2, side: T.DoubleSide, depthWrite: false });
    const sx = [];
    for (let k = 0; k < streams; k++) {
      const f = streams === 1 ? 0 : k / (streams - 1) - 0.5;
      sx.push({ x: f * W * 0.85 + (rng() - 0.5) * 1.2, w: (W / streams) * (0.55 + rng() * 0.45) + (streams === 1 ? W * 0.3 : 0) });
    }
    const drop = H / tiers;
    for (let t = 0; t < tiers; t++) {
      const yTop = H + 1.3 - t * drop, yBot = t === tiers - 1 ? 0.2 : H + 1.3 - (t + 1) * drop;
      const zTop = backZ + 0.6 + t * 2.2, out = 1.2 + drop * 0.08;
      sx.forEach((s) => {
        const ww = s.w * (1 + t * 0.15);
        const core = ribbon(ww, yTop, yBot, zTop, out, 0.35, coreM, Math.round(8 + drop));
        const veil = ribbon(ww * 1.35, yTop - 0.3, yBot, zTop + 0.25, out * 1.15, 0.5, veilM, Math.round(6 + drop / 2));
        core.position.x = veil.position.x = s.x;
        g.add(core, veil);
        // the lip: a smooth tongue of water pouring over
        const tongue = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, ww, 10, 1, true, 0, Math.PI), coreM);
        tongue.rotation.z = Math.PI / 2; tongue.position.set(s.x, yTop - 0.4, zTop - 0.2);
        g.add(tongue);
      });
      // the rock ledge each tier breaks on
      if (t < tiers - 1) {
        const lm = KT.mat('fallLedge' + (opts.rock || 0), { color: rockCol.getHex(), roughness: 0.9 });
        const n = Math.max(1, Math.round(W / 6));
        for (let k = 0; k < n; k++) part(g, KT.blob(3.4, 1, 0.3, 600 + t * 9 + k), lm, (n === 1 ? 0 : (k / (n - 1) - 0.5) * (W - 2)), yBot - 0.4, backZ + 1.2 + t * 2.2, 0, k, 0, 1.1, 0.3, 0.4);
      }
    }
    // a few thin side trickles down the rock
    for (let k = 0; k < 3; k++) {
      const a = Math.PI + (k - 1) * 0.55 + (rng() - 0.5) * 0.2;
      const x = Math.sin(a) * (Rc - 0.8), z = Math.cos(a) * (Rc - 0.8) + z0;
      const tr = ribbon(0.9, H + 0.5, 0.3, 0, 0.3, 0.2, veilM, 10);
      tr.position.set(x, 0, z + 0.4);
      tr.rotation.y = a + Math.PI;
      g.add(tr);
    }

    // ---- the pool: deep water, foam where the water lands, a ring of rocks
    const poolR = Math.max(9, W * 0.55 + 6);
    const deep = new T.Mesh(new T.CircleGeometry(poolR, 40), KT.Highway && KT.Highway.waterMaterial ? KT.Highway.waterMaterial() : new T.MeshStandardMaterial({ color: 0x2f6f7a }));
    deep.rotation.x = -Math.PI / 2; deep.position.set(0, 0.06, backZ + poolR * 0.75);
    g.add(deep);
    const darkM = new T.MeshStandardMaterial({ color: 0x1f4a50, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });
    const dk = new T.Mesh(new T.CircleGeometry(poolR * 0.6, 32), darkM);
    dk.rotation.x = -Math.PI / 2; dk.position.set(0, 0.08, backZ + poolR * 0.7);
    g.add(dk);
    if (!FOAM) FOAM = foamTexture();
    const foamTex = FOAM.clone(); foamTex.needsUpdate = true; foamTex.repeat.set(2, 2);
    const foamM = new T.MeshStandardMaterial({ map: foamTex, transparent: true, depthWrite: false, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.25 });
    sx.forEach((s) => {
      const f = new T.Mesh(new T.CircleGeometry(s.w * 0.8 + 2.4, 24), foamM);
      f.rotation.x = -Math.PI / 2; f.position.set(s.x, 0.11, backZ + 2.2 + (tiers - 1) * 2.2);
      f.scale.set(1.4, 1, 1);
      g.add(f);
    });
    const ring = new T.Mesh(new T.RingGeometry(poolR * 0.55, poolR * 0.98, 40), new T.MeshStandardMaterial({ map: foamTex, transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.4 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.1, backZ + poolR * 0.75);
    g.add(ring);
    const rockM2 = KT.mat('fallBoulder', { color: rockCol.getHex(), roughness: 0.9 }), wetM = KT.mat('fallBoulderWet', { color: wet.getHex(), roughness: 0.35 });
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * (-0.15 + i * 0.075) + (rng() - 0.5) * 0.1;
      const r = poolR * (0.95 + rng() * 0.25);
      if (Math.sin(a) > 0.85 && i % 2) continue;                    // the outflow
      part(g, KT.blob(0.9 + rng() * 1.3, 1, 0.3, 700 + i), i % 3 ? rockM2 : wetM, Math.cos(a) * r, 0.25, backZ + poolR * 0.75 + Math.sin(a) * r * 0.9, rng(), rng(), 0, 1, 0.7, 1);
    }
    // boulders in the water where it lands
    for (let i = 0; i < 5; i++) part(g, KT.blob(0.8 + rng(), 1, 0.3, 720 + i), wetM, (rng() - 0.5) * W, 0.2, backZ + 3 + rng() * 3);
    // the stream running out of the pool towards the front
    const outTex = fallTexture(31, false); outTex.repeat.set(1, 2);
    const outM = new T.MeshStandardMaterial({ map: outTex, transparent: true, opacity: 0.75, color: 0xdff0f2, roughness: 0.2, depthWrite: false });
    const outBed = new T.Mesh(new T.PlaneGeometry(4.5, 16), deep.material);
    outBed.rotation.x = -Math.PI / 2; outBed.position.set(poolR * 0.35, 0.05, backZ + poolR * 1.6 + 8);
    g.add(outBed);
    const outW = new T.Mesh(new T.PlaneGeometry(4.5, 16), outM);
    outW.rotation.x = -Math.PI / 2; outW.rotation.z = Math.PI; outW.position.set(poolR * 0.35, 0.09, backZ + poolR * 1.6 + 8);
    g.add(outW);
    for (let i = 0; i < 8; i++) part(g, KT.blob(0.5 + rng() * 0.6, 1, 0.3, 740 + i), i % 2 ? wetM : rockM2, poolR * 0.35 + (i % 2 ? 2.6 : -2.6), 0.2, backZ + poolR * 1.6 + 1 + i * 2);

    // ---- plants: ferns on the ledges, creepers hanging down, forest on the rim
    const fern = KT.mat('fallFern', { color: 0x4f8a3a, roughness: 0.9 }), vine = KT.mat('fallVine', { color: 0x3f6b2a, roughness: 0.9 });
    for (let i = 0; i < 30; i++) {
      const a = Math.PI + (rng() - 0.5) * ARC * 0.95, y = 0.5 + rng() * H;
      const wx = Math.sin(a) * (Rc - 0.6);
      if (Math.abs(wx) < W * 0.55 && Math.cos(a) < -0.6) continue;  // not on the falls
      const x = wx, z = Math.cos(a) * (Rc - 0.6) + z0;
      for (let f = 0; f < 5; f++) part(g, G.cone(0.12, 1.3, 4), fern, x + Math.cos(f) * 0.3, y + 0.4, z + Math.sin(f) * 0.3, Math.cos(f) * 0.8, 0, Math.sin(f) * 0.8);
    }
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + (rng() - 0.5) * ARC * 0.9, len = 3 + rng() * H * 0.4;
      const wx = Math.sin(a) * (Rc - 0.9);
      if (Math.abs(wx) < W * 0.55 && Math.cos(a) < -0.6) continue;
      part(g, G.cyl(0.05, 0.03, len, 4), vine, wx, H + 1 - len / 2, Math.cos(a) * (Rc - 0.9) + z0);
      part(g, G.sph(0.35, 5, 4), vine, wx, H + 0.9 - len, Math.cos(a) * (Rc - 0.9) + z0, 0, 0, 0, 1, 1.6, 1);
    }
    const trees = [];
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + (i / 15 - 0.5) * ARC * 1.05, r = Rc + 2 + (i % 3) * 3.5;
      const x = Math.sin(a) * r, z = Math.cos(a) * r + z0;
      if (Math.abs(x) < W * 0.5 && Math.cos(a) < -0.7) continue;     // the river
      trees.push([x, z]);
    }
    trees.forEach(([x, z], i) => { const t = Models.forestTree ? Models.forestTree(i + 3) : Models.mangoTree(); t.position.set(x, H + 1.3, z); t.rotation.y = i; t.scale.setScalar(1 + (i % 3) * 0.2); top.add(t); });
    for (let i = 0; i < 10; i++) {
      const a = Math.PI + (i % 2 ? 1 : -1) * (ARC / 2 + 0.15) + (rng() - 0.5) * 0.2, r = Rc - 3 - rng() * 6;
      const t = Models.forestTree ? Models.forestTree(i + 20) : Models.mangoTree();
      t.position.set(Math.sin(a) * r, 0, Math.cos(a) * r + z0); t.rotation.y = i; top.add(t);
    }
    // ---- the viewing deck, railed, on the pool's edge
    const dx = poolR * 0.75 + 3, dz = backZ + poolR * 1.2;
    part(g, G.box(7, 0.3, 4), M().wood, dx, 1.2, dz);
    for (let x = -3.2; x <= 3.2; x += 1.6) [-1.8, 1.8].forEach((z) => part(g, G.box(0.2, 1.2, 0.2), M().woodDark, dx + x, 0.6, dz + z));
    const rail = (x0, z0_, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0_), ang = Math.atan2(x1 - x0, z1 - z0_);
      for (let i = 0; i <= Math.round(len / 1.2); i++) part(g, G.box(0.08, 1, 0.08), M().woodDark, KT.lerp(x0, x1, i / Math.round(len / 1.2)), 1.85, KT.lerp(z0_, z1, i / Math.round(len / 1.2)));
      part(g, G.box(0.08, 0.08, len), M().woodDark, (x0 + x1) / 2, 2.35, (z0_ + z1) / 2, 0, ang, 0);
    };
    rail(dx - 3.4, dz - 1.9, dx + 3.4, dz - 1.9); rail(dx - 3.4, dz - 1.9, dx - 3.4, dz + 1.9);
    for (let i = 0; i < 5; i++) part(g, G.box(1.4, 0.15, 0.4), M().wood, dx + 2.4, 0.2 + i * 0.24, dz + 2.2 + i * 0.35);

    // ---- bake the solid parts; water, foam and spray stay as they are
    const solid = new T.Group(), live = new T.Group();
    g.children.slice().forEach((c) => {
      const mm = c.material;
      if (c === wall || (mm && (mm.transparent || mm.vertexColors || mm === deep.material))) live.add(c);
      else solid.add(c);
    });
    const root = new T.Group();
    root.add(KT.bake(solid));
    root.add(live);
    root.add(KT.bake(top));
    // spray: puffs at the foot and drifting clouds rising
    if (!PUFF) PUFF = puffTexture();
    const puffs = [];
    for (let i = 0; i < 18; i++) {
      const m = new T.SpriteMaterial({ map: PUFF, transparent: true, depthWrite: false, opacity: 0.5 });
      const s = new T.Sprite(m);
      const sxs = sx[i % sx.length];
      puffs.push({ s, x: sxs.x + (rng() - 0.5) * sxs.w, z: backZ + 2.5 + (tiers - 1) * 2.2 + rng() * 2, ph: rng(), sp: 0.12 + rng() * 0.1, sc: 3 + sxs.w * 0.35 + rng() * 2, rise: H * (0.25 + rng() * 0.3) });
      root.add(s);
    }
    // ledge spray for tiered falls
    for (let t = 0; t < tiers - 1; t++) sx.forEach((s) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: PUFF, transparent: true, depthWrite: false, opacity: 0.45 })); sp.position.set(s.x, H + 1.3 - (t + 1) * drop + 0.6, backZ + 2.2 + t * 2.2); sp.scale.set(s.w * 1.4 + 2, 2.4, 1); root.add(sp); });
    const tick = (time) => {
      flowTex.offset.y = time * 1.6;
      veilTex.offset.y = time * 0.9;
      riverTex.offset.y = -time * 0.5;
      outTex.offset.y = time * 0.35;
      foamTex.offset.set(Math.sin(time * 0.3) * 0.2, time * 0.05);
      puffs.forEach((p) => {
        const u = (time * p.sp + p.ph) % 1;
        p.s.position.set(p.x + Math.sin(time * 0.4 + p.ph * 6) * 1.2, 0.8 + u * p.rise, p.z + u * 3);
        const k = p.sc * (0.6 + u * 1.2);
        p.s.scale.set(k, k * 0.7, 1);
        p.s.material.opacity = 0.55 * (1 - u) * Math.min(1, u * 6);
      });
    };
    tick(0);
    root.userData.tick = tick;
    root.userData.animate = tick;            // (keeps it out of merged statics)
    root.userData.poolR = poolR;
    root.userData.pool = { x: 0, z: backZ + poolR * 0.75, r: poolR };
    // the gorge walls stop the player; the pool is water
    const C = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10 - 0.5) * ARC;
      C.push({ type: 'circle', x: Math.sin(a) * Rc, z: Math.cos(a) * Rc + z0, r: 3.2 });
    }
    C.push({ type: 'circle', x: 0, z: backZ + poolR * 0.75, r: poolR - 1.2 });
    root.userData.colliders = C;
    return root;
  };
})();
