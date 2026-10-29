// District towns and tourist attractions on the Kerala highway: multi-storey
// town buildings, heritage halls (Napier Museum, Mattancherry Palace,
// Kottakkal), the Jatayu sculpture, waterfalls, Varkala cliff, beaches,
// a small lake temple, Theyyam, a football ground, a garden, an earth dam,
// tea hills and a bird sanctuary. Every model faces +z.
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
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    return t;
  }
  // pyramid roof (4 sides) of a Kerala building, w x d at the eaves
  function hipRoof(g, w, d, h, mat, y, x, z) {
    const r = new T.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    r.rotateY(Math.PI / 4);
    part(g, r, mat, x || 0, y + h / 2, z || 0, 0, 0, 0, w, h, d);
  }

  // ------------------------------------------------------ town buildings
  // A Kerala town block: 2-4 floors of painted concrete, a shop on the
  // ground floor with its signboard, windows with sunshades and a black
  // water tank on the flat roof.
  const TOWN = [
    { floors: 3, paint: '#f2d27a', trim: '#b0562a', sign: ['Hotel Aryaas', 'Pure Vegetarian'], sbg: '#b3261e', sfg: '#fff3c4' },
    { floors: 2, paint: '#bfe0d8', trim: '#2a7b6f', sign: ['Alukkas Jewellery', 'Gold & Diamonds'], sbg: '#7a1e2e', sfg: '#f7d774' },
    { floors: 4, paint: '#f4f1ea', trim: '#3b5b8c', sign: ['State Bank', 'ATM 24x7'], sbg: '#1f4e9a', sfg: '#ffffff' },
    { floors: 3, paint: '#f6c8b0', trim: '#8e3b2a', sign: ['Kalyan Silks', 'Sarees • Kasavu'], sbg: '#5a2a82', sfg: '#ffe48a' },
    { floors: 2, paint: '#d9e8b8', trim: '#4f7a2a', sign: ['Medical Centre', 'Clinic & Pharmacy'], sbg: '#ffffff', sfg: '#127a3a' },
    { floors: 3, paint: '#e8d8f0', trim: '#6b3fa0', sign: ['Book Stall', 'DC Books • Papers'], sbg: '#2a2a2a', sfg: '#ffd34d' },
    { floors: 4, paint: '#cfe3f2', trim: '#2c5fa8', sign: ['Hotel Paramount', 'Rooms • Restaurant'], sbg: '#0f3b6b', sfg: '#ffffff' },
    { floors: 2, paint: '#f7e3a1', trim: '#a0522d', sign: ['Bismi Electronics', 'TV • Mobile • AC'], sbg: '#d8203a', sfg: '#ffffff' },
    { floors: 3, paint: '#ffe6cc', trim: '#c4212b', sign: ['Malabar Biriyani', 'Family Restaurant'], sbg: '#1e6b3a', sfg: '#fff6d8' },
    { floors: 2, paint: '#e6e2da', trim: '#5a5a5a', sign: ['Post Office', 'India Post • തപാൽ'], sbg: '#c4212b', sfg: '#ffffff' }
  ];
  Models.TOWN_TYPES = TOWN.length;
  const townProtos = {};
  function facadeTex(v, w, floors) {
    const ppm = 48, W = Math.round(w * ppm), H = Math.round(floors * 3.2 * ppm);
    return canvasTex(W, H, (g) => {
      g.fillStyle = v.paint; g.fillRect(0, 0, W, H);
      const fh = 3.2 * ppm;
      // upper floors: windows with sunshades
      for (let f = 1; f < floors; f++) {
        const y0 = H - (f + 1) * fh;
        const n = Math.max(2, Math.floor(w / 2.3));
        for (let i = 0; i < n; i++) {
          const cx = (i + 0.5) * (W / n);
          g.fillStyle = '#2f3a44'; g.fillRect(cx - 0.55 * ppm, y0 + 0.75 * ppm, 1.1 * ppm, 1.4 * ppm);
          g.fillStyle = '#9fc4d8'; g.fillRect(cx - 0.48 * ppm, y0 + 0.82 * ppm, 0.43 * ppm, 1.26 * ppm); g.fillRect(cx + 0.05 * ppm, y0 + 0.82 * ppm, 0.43 * ppm, 1.26 * ppm);
          g.fillStyle = v.trim; g.fillRect(cx - 0.75 * ppm, y0 + 0.55 * ppm, 1.5 * ppm, 0.16 * ppm);
        }
        g.fillStyle = v.trim; g.fillRect(0, y0 + fh - 0.12 * ppm, W, 0.12 * ppm);
      }
      // ground floor: rolling shutters and a glass door
      const gy = H - fh;
      g.fillStyle = '#d9d6cf'; g.fillRect(0, gy, W, fh);
      const doors = Math.max(1, Math.floor(w / 3));
      for (let i = 0; i < doors; i++) {
        const x0 = (i + 0.08) * (W / doors), dw = (W / doors) * 0.84;
        g.fillStyle = i === 0 ? '#4b5a63' : '#8c9297'; g.fillRect(x0, gy + 1.0 * ppm, dw, 2.2 * ppm);
        if (i > 0) { g.strokeStyle = '#6d7378'; g.lineWidth = 2; for (let y = gy + 1.0 * ppm; y < H; y += 6) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + dw, y); g.stroke(); } }
        else { g.fillStyle = '#a9cfe0'; g.fillRect(x0 + 6, gy + 1.0 * ppm + 6, dw - 12, 2.2 * ppm - 12); }
      }
      // signboard band
      g.fillStyle = v.sbg; g.fillRect(0, gy + 0.08 * ppm, W, 0.85 * ppm);
      g.fillStyle = v.sfg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold ' + Math.round(0.42 * ppm) + 'px Arial, sans-serif';
      g.fillText(v.sign[0], W / 2, gy + 0.36 * ppm);
      g.font = 'bold ' + Math.round(0.24 * ppm) + 'px "Nirmala UI", "Noto Sans Malayalam", Arial, sans-serif';
      g.fillText(v.sign[1], W / 2, gy + 0.72 * ppm);
    });
  }
  function buildTown(i) {
    const v = TOWN[i % TOWN.length];
    const w = 7.5, d = 8, floors = v.floors, H = floors * 3.2;
    const g = new T.Group();
    const paint = KT.mat('townPaint' + i, { color: new T.Color(v.paint), roughness: 0.9 });
    const front = new T.MeshStandardMaterial({ map: facadeTex(v, w, floors), roughness: 0.85 });
    front.name = 'townFront' + i;
    const body = new T.Mesh(G.box(w, H, d), [paint, paint, paint, paint, front, paint]);
    body.position.y = H / 2; body.castShadow = body.receiveShadow = true;
    const trim = KT.mat('townTrim' + i, { color: new T.Color(v.trim), roughness: 0.8 });
    part(g, G.box(w + 0.3, 0.5, d + 0.3), trim, 0, H + 0.25, 0);                 // roof parapet
    part(g, G.box(w + 0.4, 0.12, 1.2), trim, 0, 3.2 - 0.2, d / 2 + 0.6);         // shop canopy
    part(g, G.cyl(0.55, 0.55, 1.1, 12), KT.mat('waterTank', { color: 0x1d1d1d, roughness: 0.6 }), w / 2 - 1.2, H + 1.05, -d / 2 + 1.4);
    if (floors > 2) part(g, G.box(1.6, 0.9, 0.5), M().white, -w / 2 + 1.4, H + 0.95, -d / 2 + 1); // stair head
    const baked = KT.bake(g);
    baked.add(body); // one material per face: kept out of the merge
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: w / 2, hd: d / 2 }];
    baked.userData.size = { w, d };
    return baked;
  }
  Models.townBuilding = function (i) {
    const k = i % TOWN.length;
    if (!townProtos[k]) townProtos[k] = buildTown(k);
    const o = townProtos[k].clone(true);
    o.userData = Object.assign({}, townProtos[k].userData);
    return o;
  };

  // --------------------------------------------- heritage hall / museum
  // Kerala-style hall with banded walls, arcades and tiled roofs.
  Models.heritageHall = function (colors) {
    const [wallC, bandC, roofC] = colors || [0xb5452e, 0xf2e2c4, 0x4a4a52];
    const g = new T.Group();
    const wall = KT.mat('hallWall' + wallC, { color: wallC, roughness: 0.85 });
    const band = KT.mat('hallBand' + bandC, { color: bandC, roughness: 0.8 });
    const roof = KT.mat('hallRoof' + roofC, { color: roofC, roughness: 0.7 });
    // plinth
    part(g, G.box(26, 0.8, 14), M().stoneGrey, 0, 0.4, 0);
    // main hall: alternating bands
    for (let i = 0; i < 6; i++) part(g, G.box(22, 1, 10), i % 2 ? band : wall, 0, 1.3 + i, 0);
    // arcade of pillars at the front
    for (let i = 0; i < 9; i++) part(g, G.cyl(0.3, 0.3, 5, 10), band, -10 + i * 2.5, 3.3, 5.8);
    part(g, G.box(22, 0.5, 2.2), wall, 0, 6.0, 5.6);
    hipRoof(g, 23.5, 12, 3.4, roof, 6.8);
    // front gable towers with their own small roofs
    [-8, 0, 8].forEach((x, i) => {
      const hgt = i === 1 ? 3.6 : 2.4;
      part(g, G.box(4, hgt, 4), i === 1 ? wall : band, x, 6.8 + hgt / 2, 4);
      hipRoof(g, 5.2, 5.2, i === 1 ? 3.4 : 2.6, roof, 6.8 + hgt, x, 4);
    });
    // corner towers
    [[-11, -4.5], [11, -4.5]].forEach(([x, z]) => {
      part(g, G.box(3, 8.5, 3), wall, x, 4.25 + 0.8, z);
      hipRoof(g, 4, 4, 3, roof, 9.3, x, z);
    });
    part(g, G.box(2.4, 3.6, 0.2), M().woodDark, 0, 2.6, 5.05); // door
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0.5, hw: 13, hd: 7 }];
    return baked;
  };

  // ------------------------------------------------- Jatayu sculpture
  // The giant fallen bird on its rock (Jatayupara, Kollam).
  Models.jatayu = function () {
    const g = new T.Group();
    const stone = KT.mat('jatayuStone', { color: 0xb9b2a4, roughness: 0.75 });
    const rock = KT.mat('jatayuRock', { color: 0x8a7f72, roughness: 0.95 });
    part(g, KT.blob(9, 1, 0.18, 21), rock, 0, 1, 0, 0, 0, 0, 2.2, 0.55, 1.4);
    // body, lying on its side
    part(g, G.sph(4, 20, 14), stone, 0, 6.2, 0, 0, 0, 0.25, 2.1, 1.0, 1.15);
    // wing raised to the sky
    const wing = new T.Group();
    wing.position.set(-1, 9, -1.5);
    wing.rotation.set(-0.5, 0.2, 0.9);
    g.add(wing);
    for (let i = 0; i < 7; i++) part(wing, G.box(1.2, 0.5, 9 - i * 0.9), stone, i * 1.15, i * 0.6, -i * 0.2, 0, 0, -0.1);
    // neck, head and beak
    part(g, G.cyl(1.2, 1.8, 5, 12), stone, 9.5, 7.2, 1, 0, 0, -1.2);
    part(g, G.sph(1.9, 14, 10), stone, 12.3, 8.6, 1.2);
    part(g, G.cone(0.9, 3, 10), KT.mat('jatayuBeak', { color: 0xd9b45a, roughness: 0.6 }), 14.3, 8.2, 1.2, 0, 0, -1.9);
    part(g, G.sph(0.3, 8, 6), M().black, 12.9, 9.3, 2.7);
    // tail feathers
    for (let i = 0; i < 5; i++) part(g, G.box(5, 0.4, 1.1), stone, -9.5, 5.5 + i * 0.25, -2 + i, 0, -0.3 + i * 0.15, 0.3);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 13 }];
    return baked;
  };

  // ------------------------------------------------------- waterfall
  // A rock face with water pouring into a pool; the falling water flows.
  Models.waterfall = function (height) {
    const H = height || 16;
    const g = new T.Group();
    const rock = KT.mat('fallRock', { color: 0x5f5a52, roughness: 0.95 });
    const moss = KT.mat('fallMoss', { color: 0x4f6b3a, roughness: 0.95 });
    for (let i = -3; i <= 3; i++) {
      part(g, KT.blob(6, 1, 0.25, 40 + i), i % 2 ? rock : moss, i * 6.5, H / 2, -6 - Math.abs(i) * 0.8, 0, 0, 0, 1, H / 11, 0.8);
    }
    part(g, KT.blob(10, 1, 0.2, 9), moss, 0, H + 1, -12, 0, 0, 0, 2.6, 0.6, 1.2);
    // trees on top
    for (let i = 0; i < 6; i++) part(g, KT.blob(2.2, 1, 0.2, 60 + i), M().leaf, -14 + i * 5.5, H + 3.5, -9 - (i % 2) * 3);
    const baked = KT.bake(g);
    // flowing water (animated texture, not baked)
    const tex = canvasTex(64, 256, (c, w, h) => {
      c.fillStyle = '#d9eef2'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        c.fillStyle = 'rgba(' + (150 + Math.random() * 60) + ',' + (190 + Math.random() * 40) + ',215,0.7)';
        c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 10 + Math.random() * 40);
      }
    });
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(3, 2);
    const waterMat = new T.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.88, roughness: 0.2, emissive: 0x9fc6d0, emissiveIntensity: 0.25 });
    const sheet = new T.Mesh(G.plane(14, H, 1, 1), waterMat);
    sheet.position.set(0, H / 2, -2.2);
    sheet.rotation.x = -0.08;
    baked.add(sheet);
    const foam = new T.Mesh(new T.CircleGeometry(6, 24), new T.MeshStandardMaterial({ color: 0xf2f8f8, transparent: true, opacity: 0.6, roughness: 0.3 }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.25, 1.5);
    baked.add(foam);
    baked.userData.flow = tex;
    baked.userData.colliders = [{ type: 'box', x: 0, z: -7, hw: 22, hd: 5 }];
    return baked;
  };

  // ----------------------------------------------------- Varkala cliff
  Models.cliff = function () {
    const g = new T.Group();
    const lat = KT.mat('cliffLaterite', { map: KT.tex('laterite', 2, 2), color: 0xc76a3e }, 0.2);
    const top = KT.mat('cliffTop', { color: 0x6d9a42, roughness: 0.95 });
    for (let i = -4; i <= 4; i++) {
      const h = 9 + Math.sin(i * 1.7) * 1.5;
      part(g, G.box(6.4, h, 10), lat, i * 6, h / 2, -2 + Math.cos(i) * 0.8);
      part(g, G.box(6.4, 0.6, 10), top, i * 6, h + 0.3, -2 + Math.cos(i) * 0.8);
    }
    // railing and café huts along the top
    for (let i = -4; i <= 4; i++) part(g, G.box(6, 0.1, 0.1), M().white, i * 6, 10.5, 3);
    [-15, 0, 15].forEach((x) => {
      part(g, G.box(4, 2.4, 3), M().woodLight, x, 11.0, -3);
      hipRoof(g, 5, 4, 1.6, M().thatch, 12.2, x, -3);
    });
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: -2, hw: 28, hd: 5.5 }];
    return baked;
  };

  // ------------------------------------------------- beach umbrellas
  Models.beachSet = function (n) {
    const g = new T.Group();
    const cols = [0xd8203a, 0xf2c230, 0x2c5fa8, 0x2a9d8f, 0xe07a1f];
    const rng = KT.makeRng(5 + (n || 4));
    for (let i = 0; i < (n || 4); i++) {
      const x = (i - (n || 4) / 2) * 5 + rng() * 2, z = rng() * 6 - 3;
      part(g, G.cyl(0.05, 0.05, 2.4, 6), M().white, x, 1.2, z);
      part(g, G.cone(1.6, 0.6, 10), KT.mat('umbrella' + i % 5, { color: cols[i % 5], roughness: 0.6 }), x, 2.5, z);
      part(g, G.box(0.7, 0.1, 1.8), M().white, x + 1.2, 0.35, z + 0.5, 0.25, 0, 0);
    }
    return KT.bake(g);
  };

  // ------------------------------------------------------ lake temple
  // Ananthapura: a small laterite shrine with a copper roof on a lake.
  Models.lakeShrine = function () {
    const g = new T.Group();
    const lat = KT.mat('shrineLaterite', { map: KT.tex('laterite', 1, 1), color: 0xc98a62 }, 0.25);
    part(g, G.box(9, 1.2, 9), M().stoneGrey, 0, 0.6, 0);
    part(g, G.box(6, 3.4, 6), lat, 0, 2.9, 0);
    hipRoof(g, 8.4, 8.4, 3.2, KT.mat('copperRoof', { color: 0x4f8f7a, roughness: 0.5, metalness: 0.4 }), 4.6);
    part(g, G.sph(0.35, 10, 8), M().gold, 0, 8.0, 0);
    part(g, G.box(1.4, 2.4, 0.2), M().woodDark, 0, 2.4, 3.05);
    // footbridge to the shore (+z)
    part(g, G.box(1.8, 0.3, 14), M().stoneGrey, 0, 0.9, 11.5);
    for (let z = 5; z <= 18; z += 3) [-1, 1].forEach((s) => part(g, G.box(0.12, 0.8, 0.12), M().white, s * 0.85, 1.4, z));
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 4.5, hd: 4.5 }];
    return baked;
  };

  // ------------------------------------------------------------ Theyyam
  // A giant Theyyam figure with its round headdress, on a courtyard stage.
  Models.theyyam = function () {
    const g = new T.Group();
    const red = KT.mat('theyyamRed', { color: 0xc4171c, roughness: 0.6 });
    const yel = KT.mat('theyyamYellow', { color: 0xf2b21b, roughness: 0.5 });
    const white = KT.mat('theyyamWhite', { color: 0xf4efe4, roughness: 0.6 });
    part(g, G.cyl(6, 6.3, 0.6, 24), M().stoneGrey, 0, 0.3, 0);
    // skirt of tender palm leaves
    part(g, G.cone(2.6, 4.2, 24), KT.mat('palmSkirt', { color: 0xd8c27a, roughness: 0.8 }), 0, 3.0, 0);
    part(g, G.cyl(1.2, 1.4, 3.2, 14), red, 0, 6.2, 0);
    part(g, G.torus(1.3, 0.2, 6, 20), yel, 0, 5.0, 0, Math.PI / 2);
    [-1, 1].forEach((s) => {
      part(g, G.cyl(0.35, 0.3, 3, 10), red, s * 1.8, 6.4, 0.4, 0.3, 0, s * 0.6);
      part(g, G.torus(0.4, 0.12, 6, 14), white, s * 2.6, 5.2, 0.9, 0, 0.5, 0);
    });
    // face
    part(g, G.sph(1.0, 16, 12), red, 0, 8.5, 0.2);
    part(g, G.box(1.4, 0.25, 0.2), yel, 0, 8.7, 1.1);
    [-0.35, 0.35].forEach((x) => part(g, G.sph(0.14, 8, 6), white, x, 8.8, 1.05));
    // the great round headdress (mudi)
    const mudi = canvasTex(256, 256, (c, w) => {
      const cx = w / 2;
      [['#c4171c', 128], ['#f2b21b', 112], ['#f4efe4', 100], ['#c4171c', 86], ['#1d1d1d', 74], ['#f2b21b', 64], ['#c4171c', 46], ['#f4efe4', 30]].forEach(([col, r]) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cx, r, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = '#f2b21b';
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * 93, cx + Math.sin(a) * 93, 5, 0, Math.PI * 2); c.fill(); }
    });
    const disc = new T.Mesh(new T.CircleGeometry(3.6, 40), new T.MeshStandardMaterial({ map: mudi, side: T.DoubleSide, roughness: 0.5 }));
    disc.position.set(0, 10.4, -0.6);
    disc.castShadow = true;
    g.add(disc);
    // oil lamps around the stage
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(g, G.cyl(0.08, 0.2, 1.2, 8), M().brass, Math.cos(a) * 5.2, 1.2, Math.sin(a) * 5.2);
      part(g, G.sph(0.12, 6, 4), M().lampGlow, Math.cos(a) * 5.2, 1.9, Math.sin(a) * 5.2);
    }
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 3 }];
    return baked;
  };

  // ------------------------------------------------------ football ground
  Models.footballGround = function () {
    const g = new T.Group();
    const L = 44, W = 28;
    const tex = canvasTex(512, 330, (c, w, h) => {
      for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#4f9a3a' : '#5aa844'; c.fillRect(i * w / 10, 0, w / 10, h); }
      c.strokeStyle = '#ffffff'; c.lineWidth = 4;
      c.strokeRect(12, 12, w - 24, h - 24);
      c.beginPath(); c.moveTo(w / 2, 12); c.lineTo(w / 2, h - 12); c.stroke();
      c.beginPath(); c.arc(w / 2, h / 2, 40, 0, Math.PI * 2); c.stroke();
      c.strokeRect(12, h / 2 - 70, 60, 140); c.strokeRect(w - 72, h / 2 - 70, 60, 140);
    });
    const field = new T.Mesh(G.plane(L, W), new T.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    field.rotation.x = -Math.PI / 2; field.position.y = 0.04; field.receiveShadow = true;
    g.add(field);
    [-1, 1].forEach((s) => {
      const x = s * (L / 2 - 0.8);
      part(g, G.box(0.15, 2.4, 0.15), M().white, x, 1.2, -3.6);
      part(g, G.box(0.15, 2.4, 0.15), M().white, x, 1.2, 3.6);
      part(g, G.box(0.15, 0.15, 7.4), M().white, x, 2.4, 0);
      part(g, G.box(1.5, 2.3, 7.2), KT.mat('goalNet', { color: 0xf4f4f4, transparent: true, opacity: 0.3 }), x + s * 0.8, 1.15, 0);
    });
    // low gallery along one side
    for (let r = 0; r < 3; r++) part(g, G.box(L - 6, 0.4, 1.2), M().stoneGrey, 0, 0.2 + r * 0.45, -W / 2 - 1.5 - r * 1.2);
    part(g, G.sph(0.2, 10, 8), M().white, 3, 0.2, 2);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: -W / 2 - 2.7, hw: L / 2 - 3, hd: 2 }];
    return baked;
  };

  // --------------------------------------------- Malampuzha garden
  Models.garden = function () {
    const g = new T.Group();
    const hedge = KT.mat('hedge', { color: 0x2f6b2a, roughness: 0.9 });
    const lawn = new T.Mesh(new T.CircleGeometry(20, 40), KT.mat('lawn', { color: 0x6fae4a, roughness: 0.95 }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.03; lawn.receiveShadow = true;
    g.add(lawn);
    const flowers = [0xe0447a, 0xf2c230, 0xe85d2a, 0xb04ad8, 0xffffff];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      part(g, G.box(4, 0.5, 1.2), hedge, Math.cos(a) * 13, 0.25, Math.sin(a) * 13, 0, -a, 0);
      part(g, G.box(3.6, 0.25, 0.9), KT.mat('flowerBed' + (i % 5), { color: flowers[i % 5], roughness: 0.8 }), Math.cos(a) * 10, 0.2, Math.sin(a) * 10, 0, -a, 0);
    }
    // fountain
    part(g, G.cyl(4.5, 4.8, 0.8, 32), M().stoneGrey, 0, 0.4, 0);
    const water = KT.mat('fountainWater', { color: 0x6fc6d8, roughness: 0.1, transparent: true, opacity: 0.85 });
    part(g, G.cyl(4.1, 4.1, 0.1, 32), water, 0, 0.75, 0);
    part(g, G.cyl(0.6, 0.8, 2.2, 12), M().white, 0, 1.5, 0);
    part(g, G.cone(0.9, 2.5, 12, 1, true), water, 0, 3.6, 0, Math.PI);
    // the reclining Yakshi sculpture (stylised)
    const y = KT.mat('yakshi', { color: 0xc9c2b4, roughness: 0.8 });
    part(g, G.box(6, 1.2, 2.6), M().stoneGrey, 0, 0.6, -15);
    part(g, G.capsule(0.9, 3.4, 4, 10), y, -0.3, 2.0, -15, 0, 0, Math.PI / 2 - 0.3);
    part(g, G.sph(0.7, 12, 10), y, 2.3, 2.9, -15);
    part(g, G.capsule(0.35, 2, 4, 8), y, 1.5, 3.4, -14.6, 0, 0, -0.8);
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 4.8 }, { type: 'box', x: 0, z: -15, hw: 3, hd: 1.3 }];
    return baked;
  };

  // ---------------------------------------------------- earth dam
  Models.earthDam = function () {
    const g = new T.Group();
    const grass = KT.mat('damGrass', { color: 0x6d9a42, roughness: 0.95 });
    const shape = new T.Shape();
    shape.moveTo(-9, 0); shape.lineTo(-2, 8); shape.lineTo(2, 8); shape.lineTo(9, 0); shape.lineTo(-9, 0);
    const geo = new T.ExtrudeGeometry(shape, { depth: 70, bevelEnabled: false });
    geo.translate(0, 0, -35);
    geo.rotateY(Math.PI / 2);
    part(g, geo, grass, 0, 0, 0);
    part(g, G.box(70, 0.3, 4), KT.mat('damRoad', { color: 0x6b6b6b, roughness: 0.9 }), 0, 8.1, 0);
    for (let x = -34; x <= 34; x += 4) [-1.9, 1.9].forEach((z) => part(g, G.box(0.12, 0.8, 0.12), M().white, x, 8.6, z));
    const baked = KT.bake(g);
    baked.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 35, hd: 7 }];
    return baked;
  };

  // --------------------------------------------------------- tea hill
  Models.teaHill = function () {
    const g = new T.Group();
    const soil = KT.mat('teaHillSoil', { color: 0x5f8f3a, roughness: 0.95 });
    part(g, G.sph(22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), soil, 0, -10, 0, 0, 0, 0, 1, 0.75, 1);
    const bush = Models.teaBush();
    const items = [];
    bush.updateMatrixWorld(true);
    for (let ring = 6; ring <= 19; ring += 2.1) {
      const n = Math.floor(ring * 2.2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = Math.cos(a) * ring, z = Math.sin(a) * ring;
        const y = Math.sqrt(Math.max(0, 22 * 22 - ring * ring)) * 0.75 - 10;
        bush.children.forEach((m) => items.push({ geometry: m.geometry, matrix: new T.Matrix4().makeTranslation(x, y - 0.2, z).multiply(m.matrix), material: m.material }));
      }
    }
    const merged = new T.Mesh(KT.mergeGeometries(items), items[0].material);
    merged.castShadow = merged.receiveShadow = true;
    const baked = KT.bake(g);
    baked.add(merged);
    // a shade tree or two
    const tree = Models.forestTree ? Models.forestTree() : null;
    if (tree) { tree.position.set(4, 6, -3); tree.scale.setScalar(0.7); baked.add(tree); }
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 17 }];
    return baked;
  };
})();
