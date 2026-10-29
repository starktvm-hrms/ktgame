// Road traffic and roadside models: cars (hatchback, sedan, SUV), the
// Kerala autorickshaw, a goods lorry, a scooter with rider, traffic
// signals, zebra crossings and small Kerala roadside shops.
// Vehicles face +z with their origin on the ground at the centre; shops
// face +z (towards the road).
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;
  const rb = (w, h, d, r) => KT.roundBox(w, h, d, r);

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    return t;
  }
  const paint = (hex) => KT.mat('paint' + hex.toString(16), { color: hex, roughness: 0.32, metalness: 0.25 });
  const mats = () => ({
    glass: KT.mat('carGlass', { color: 0x1b262c, roughness: 0.06, metalness: 0.5 }),
    tyre: KT.mat('tyre', { color: 0x1a1a1a, roughness: 0.9 }),
    rim: KT.mat('rim', { color: 0xbfc3c7, metalness: 0.8, roughness: 0.3 }),
    trim: KT.mat('carTrim', { color: 0x2a2a2a, roughness: 0.6 }),
    chrome: KT.mat('busChrome', { color: 0xd8d8d8, metalness: 0.8, roughness: 0.25 }),
    head: KT.mat('headLamp', { color: 0xfffbe8, emissive: 0xfff2c0, emissiveIntensity: 0.5, roughness: 0.2 }),
    tail: KT.mat('busTail', { color: 0xd01818, emissive: 0x500000, emissiveIntensity: 0.5 }),
    amber: KT.mat('busOrange', { color: 0xf08a1a, emissive: 0x6a3000, emissiveIntensity: 0.4 }),
    plate: KT.mat('plateWhite', { color: 0xf4f4f0, roughness: 0.5 }),
    plateY: KT.mat('plateYellow', { color: 0xf5d21e, roughness: 0.5 })
  });

  function wheels(g, m, xs, zs, r, w) {
    xs.forEach((x) => zs.forEach((z) => {
      part(g, G.cyl(r, r, w, 18), m.tyre, x, r, z, 0, 0, Math.PI / 2);
      part(g, G.cyl(r * 0.55, r * 0.55, w + 0.02, 12), m.rim, x, r, z, 0, 0, Math.PI / 2);
    }));
  }

  // ------------------------------------------------------------- cars
  // style: 'hatch' | 'sedan' | 'suv'
  Models.car = function (color, style) {
    const g = new T.Group();
    const m = mats();
    const body = paint(color);
    const suv = style === 'suv', sedan = style === 'sedan';
    const L = suv ? 4.5 : sedan ? 4.4 : 3.8, W = suv ? 1.85 : 1.72;
    const bodyH = suv ? 0.78 : 0.62, baseY = suv ? 0.42 : 0.34;
    const cabL = suv ? 2.9 : sedan ? 2.2 : 2.3, cabZ = suv ? -0.35 : sedan ? -0.15 : -0.3;
    const cabH = suv ? 0.62 : 0.56;
    part(g, rb(W, bodyH, L, 0.2), body, 0, baseY + bodyH / 2, 0);
    const cabY = baseY + bodyH + cabH / 2 - 0.04;
    part(g, rb(W - 0.12, cabH, cabL, 0.16), m.glass, 0, cabY, cabZ);
    part(g, rb(W - 0.16, 0.08, cabL - 0.25, 0.04), body, 0, cabY + cabH / 2, cabZ);
    // pillars
    [-1, 1].forEach((s) => {
      part(g, G.box(0.06, cabH, 0.1), body, s * (W / 2 - 0.08), cabY, cabZ + cabL / 2 - 0.15);
      part(g, G.box(0.06, cabH, 0.1), body, s * (W / 2 - 0.08), cabY, cabZ);
      part(g, G.box(0.06, cabH, 0.16), body, s * (W / 2 - 0.08), cabY, cabZ - cabL / 2 + 0.12);
      part(g, rb(0.18, 0.12, 0.08, 0.03), body, s * (W / 2 + 0.06), baseY + bodyH + 0.08, cabZ + cabL / 2 - 0.1);
    });
    if (suv) [-0.6, 0.6].forEach((x) => part(g, G.box(0.05, 0.05, cabL - 0.4), m.trim, x, cabY + cabH / 2 + 0.05, cabZ));
    // front: grille, lamps, bumper, plate
    const fz = L / 2;
    part(g, G.box(W * 0.5, 0.16, 0.04), m.trim, 0, baseY + bodyH * 0.55, fz);
    [-1, 1].forEach((s) => {
      part(g, rb(0.36, 0.14, 0.06, 0.04), m.head, s * (W / 2 - 0.3), baseY + bodyH * 0.7, fz - 0.01);
      part(g, rb(0.32, 0.12, 0.06, 0.03), m.tail, s * (W / 2 - 0.25), baseY + bodyH * 0.72, -fz + 0.01);
    });
    part(g, rb(W + 0.04, 0.16, 0.16, 0.06), m.trim, 0, baseY + 0.12, fz - 0.04);
    part(g, rb(W + 0.04, 0.16, 0.16, 0.06), m.trim, 0, baseY + 0.12, -fz + 0.04);
    part(g, G.box(0.42, 0.11, 0.02), m.plate, 0, baseY + 0.3, fz + 0.01);
    part(g, G.box(0.42, 0.11, 0.02), m.plate, 0, baseY + 0.3, -fz - 0.01);
    const wr = suv ? 0.36 : 0.3;
    wheels(g, m, [-(W / 2 - 0.08), W / 2 - 0.08], [L / 2 - 0.75, -L / 2 + 0.7], wr, 0.2);
    g.userData.size = { length: L, width: W };
    return KT.bake(g);
  };

  // -------------------------------------------------------- autorickshaw
  // Kerala auto: black body, yellow canvas hood, one front wheel.
  Models.autoRickshaw = function () {
    const g = new T.Group();
    const m = mats();
    const black = KT.mat('autoBlack', { color: 0x1d1d1f, roughness: 0.4, metalness: 0.2 });
    const yellow = KT.mat('autoYellow', { color: 0xf2c230, roughness: 0.6 });
    const seat = KT.mat('autoSeat', { color: 0x3a2a24, roughness: 0.8 });
    const L = 2.7, W = 1.32;
    // rear tub and floor
    part(g, rb(W, 0.6, 1.3, 0.12), black, 0, 0.62, -0.55);
    part(g, G.box(W - 0.2, 0.06, 2.0), m.trim, 0, 0.36, -0.1);
    // nose cowl and front mudguard
    part(g, rb(0.62, 0.7, 0.5, 0.2), black, 0, 0.75, 1.0);
    part(g, rb(0.3, 0.12, 0.5, 0.06), black, 0, 0.5, 1.15);
    part(g, rb(0.16, 0.1, 0.06, 0.04), m.head, 0, 0.98, 1.27);
    [-1, 1].forEach((s) => part(g, rb(0.08, 0.06, 0.04, 0.02), m.amber, s * 0.26, 0.92, 1.26));
    // windscreen frame, handlebar, seats
    part(g, G.box(1.1, 0.7, 0.04), m.glass, 0, 1.38, 0.82, -0.08, 0, 0);
    part(g, G.box(0.9, 0.04, 0.04), m.chrome, 0, 1.02, 0.72);
    part(g, rb(0.5, 0.12, 0.42, 0.05), seat, 0, 0.98, 0.35);
    part(g, rb(W - 0.12, 0.14, 0.5, 0.05), seat, 0, 0.98, -0.6);
    part(g, rb(W - 0.12, 0.5, 0.1, 0.04), seat, 0, 1.25, -0.88);
    // canvas hood on thin posts
    part(g, rb(W + 0.06, 0.12, 2.1, 0.08), yellow, 0, 1.78, -0.1);
    part(g, rb(W + 0.02, 0.85, 0.06, 0.05), yellow, 0, 1.35, -1.15);
    [-1, 1].forEach((s) => {
      part(g, G.cyl(0.02, 0.02, 0.95, 6), m.chrome, s * (W / 2 - 0.02), 1.3, 0.85);
      part(g, G.cyl(0.02, 0.02, 0.95, 6), m.chrome, s * (W / 2 - 0.02), 1.3, -0.2);
      part(g, rb(0.06, 0.14, 0.04, 0.02), m.tail, s * (W / 2 - 0.15), 0.72, -1.21);
    });
    part(g, G.box(0.36, 0.1, 0.02), m.plateY, 0, 0.5, -1.22);
    wheels(g, m, [0], [1.0], 0.22, 0.12);
    wheels(g, m, [-(W / 2 - 0.05), W / 2 - 0.05], [-0.65], 0.22, 0.14);
    g.userData.size = { length: L, width: W };
    return KT.bake(g);
  };

  // --------------------------------------------------------------- lorry
  Models.lorry = function (cabColor) {
    const g = new T.Group();
    const m = mats();
    const cab = paint(cabColor);
    const deck = KT.mat('lorryDeck', { map: KT.tex('wood'), color: 0xc98a4a }, 0.5);
    const tarp = KT.mat('lorryTarp', { color: 0x2d5fa8, roughness: 0.8 });
    const L = 7.6, W = 2.35;
    // chassis
    part(g, G.box(1.0, 0.25, L - 0.6), m.trim, 0, 0.72, 0);
    // cab
    const cz = L / 2 - 1.0;
    part(g, rb(W, 1.3, 1.8, 0.16), cab, 0, 1.6, cz);
    part(g, rb(W - 0.2, 0.62, 0.08, 0.04), m.glass, 0, 2.0, cz + 0.88);
    [-1, 1].forEach((s) => part(g, G.box(0.06, 0.5, 0.9), m.glass, s * (W / 2 + 0.005), 2.0, cz + 0.2));
    part(g, rb(W + 0.05, 0.2, 2.0, 0.08), cab, 0, 2.32, cz);
    part(g, G.box(W * 0.6, 0.38, 0.04), m.chrome, 0, 1.15, cz + 0.91);
    [-1, 1].forEach((s) => {
      part(g, G.cyl(0.12, 0.12, 0.06, 14), m.head, s * (W / 2 - 0.3), 1.15, cz + 0.9, Math.PI / 2);
      part(g, rb(0.16, 0.36, 0.05, 0.03), m.trim, s * (W / 2 + 0.2), 2.1, cz + 0.6);
    });
    part(g, rb(W + 0.1, 0.24, 0.2, 0.06), m.trim, 0, 0.8, cz + 0.95);
    // cargo body with wooden sides and a tarpaulin
    const bz = -0.95, bl = L - 2.2;
    part(g, G.box(W, 0.12, bl), deck, 0, 0.92, bz);
    [-1, 1].forEach((s) => part(g, G.box(0.08, 1.0, bl), deck, s * (W / 2 - 0.04), 1.48, bz));
    part(g, G.box(W, 1.0, 0.08), deck, 0, 1.48, bz - bl / 2 + 0.04);
    part(g, G.box(W, 1.0, 0.08), deck, 0, 1.48, bz + bl / 2 - 0.04);
    part(g, rb(W - 0.1, 0.5, bl - 0.1, 0.2), tarp, 0, 2.1, bz);
    [-1, 1].forEach((s) => part(g, rb(0.3, 0.16, 0.05, 0.03), m.tail, s * (W / 2 - 0.3), 1.0, -L / 2 + 0.4));
    part(g, G.box(0.5, 0.14, 0.02), m.plateY, 0, 0.95, -L / 2 + 0.38);
    wheels(g, m, [-(W / 2 - 0.25), W / 2 - 0.25], [cz - 0.1], 0.5, 0.3);
    wheels(g, m, [-(W / 2 - 0.25), W / 2 - 0.25], [-L / 2 + 1.6, -L / 2 + 2.6], 0.5, 0.36);
    g.userData.size = { length: L, width: W };
    return KT.bake(g);
  };

  // ------------------------------------------------------ scooter & rider
  Models.scooter = function (color, shirt, helmet) {
    const g = new T.Group();
    const m = mats();
    const body = paint(color);
    const cloth = KT.mat('riderShirt' + shirt.toString(16), { color: shirt, roughness: 0.8 });
    const hel = paint(helmet);
    const pants = KT.mat('riderPants', { color: 0x2b3442, roughness: 0.85 });
    // scooter
    part(g, rb(0.36, 0.5, 0.9, 0.14), body, 0, 0.6, -0.25);
    part(g, rb(0.3, 0.75, 0.3, 0.12), body, 0, 0.8, 0.55, -0.25, 0, 0);
    part(g, G.box(0.3, 0.06, 0.5), m.trim, 0, 0.36, 0.2);
    part(g, rb(0.32, 0.1, 0.6, 0.05), KT.mat('scooterSeat', { color: 0x161616 }), 0, 0.9, -0.3);
    part(g, G.box(0.6, 0.04, 0.04), m.chrome, 0, 1.2, 0.62);
    part(g, rb(0.14, 0.1, 0.05, 0.03), m.head, 0, 1.12, 0.72);
    part(g, rb(0.12, 0.06, 0.04, 0.02), m.tail, 0, 0.78, -0.72);
    wheels(g, m, [0], [0.62, -0.55], 0.22, 0.1);
    // rider
    part(g, rb(0.32, 0.16, 0.42, 0.07), pants, 0, 1.02, -0.18);
    [-1, 1].forEach((s) => {
      part(g, G.capsule(0.07, 0.36), pants, s * 0.12, 0.72, 0.12, 0.5, 0, 0);
      part(g, G.capsule(0.055, 0.42), cloth, s * 0.2, 1.36, 0.25, -1.0, 0, 0);
    });
    part(g, rb(0.42, 0.52, 0.26, 0.12), cloth, 0, 1.36, -0.18, 0.15, 0, 0);
    part(g, G.sph(0.11, 12, 10), M().skin, 0, 1.7, -0.12);
    part(g, G.sph(0.15, 14, 10), hel, 0, 1.76, -0.13, 0, 0, 0, 1, 0.95, 1.12);
    part(g, G.box(0.22, 0.07, 0.03), m.glass, 0, 1.73, 0.03);
    g.userData.size = { length: 1.8, width: 0.7 };
    return KT.bake(g);
  };

  // ------------------------------------------------------ traffic signal
  // Pole on the roadside with an arm reaching over the lane. The lamps
  // face +z (towards approaching vehicles) and are swapped between lit and
  // dim materials by setSignal().
  const lampMats = {};
  function lampMat(colour, on) {
    const key = colour + on;
    if (!lampMats[key]) {
      const c = { red: 0xff2a1a, amber: 0xffb020, green: 0x2bff6a }[colour];
      lampMats[key] = new T.MeshStandardMaterial(on ? { color: c, emissive: c, emissiveIntensity: 2.2, roughness: 0.3 } : { color: new T.Color(c).multiplyScalar(0.18), roughness: 0.4 });
    }
    return lampMats[key];
  }
  Models.trafficSignal = function (armLen) {
    const g = new T.Group();
    const grey = KT.mat('signalGrey', { color: 0x4a4d50, roughness: 0.5, metalness: 0.4 });
    const housing = KT.mat('signalBlack', { color: 0x121212, roughness: 0.5 });
    const yb = KT.mat('signalStripe', { color: 0xf2c230, roughness: 0.6 });
    part(g, G.cyl(0.09, 0.11, 5.6, 12), grey, 0, 2.8, 0);
    for (let i = 0; i < 3; i++) part(g, G.cyl(0.115, 0.115, 0.18, 12), i % 2 ? housing : yb, 0, 0.25 + i * 0.18, 0);
    part(g, G.cyl(0.06, 0.06, armLen, 10), grey, armLen / 2, 5.4, 0, 0, 0, Math.PI / 2);
    const baked = KT.bake(g);
    const lamps = { red: [], amber: [], green: [] };
    const head = (x, y) => {
      const h = new T.Mesh(G.box(0.36, 1.05, 0.26), housing);
      h.position.set(x, y, 0);
      h.castShadow = true;
      baked.add(h);
      ['red', 'amber', 'green'].forEach((c, i) => {
        const l = new T.Mesh(G.cyl(0.11, 0.11, 0.06, 16), lampMat(c, false));
        l.rotation.x = Math.PI / 2;
        l.position.set(x, y + 0.32 - i * 0.32, 0.15);
        baked.add(l);
        lamps[c].push(l);
        const visor = new T.Mesh(G.box(0.3, 0.03, 0.14), housing);
        visor.position.set(x, y + 0.46 - i * 0.32, 0.2);
        baked.add(visor);
      });
    };
    head(armLen - 0.3, 5.0);
    head(0, 3.0);
    baked.userData.lamps = lamps;
    baked.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 0.2 }];
    return baked;
  };
  Models.setSignal = function (signal, state) {
    const L = signal.userData.lamps;
    ['red', 'amber', 'green'].forEach((c) => L[c].forEach((l) => { l.material = lampMat(c, c === state); }));
  };

  // Zebra crossing across a road `width` wide, `depth` deep (along the road).
  Models.zebraCrossing = function (width, depth) {
    const items = [];
    for (let x = -width / 2 + 0.25; x < width / 2; x += 1.0) items.push({ geometry: G.box(0.5, 0.02, depth), matrix: new T.Matrix4().makeTranslation(x, 0, 0) });
    [-1, 1].forEach((s) => items.push({ geometry: G.box(width, 0.02, 0.25), matrix: new T.Matrix4().makeTranslation(0, 0, s * (depth / 2 + 1.2)) }));
    const mesh = new T.Mesh(KT.mergeGeometries(items), KT.mat('roadPaint', { color: 0xf2f2ee, roughness: 0.6 }));
    mesh.receiveShadow = true;
    return mesh;
  };

  // ------------------------------------------------------------- shops
  Models.SHOP_TYPES = ['tea', 'fruit', 'bakery', 'stores', 'textiles', 'medical', 'hotel', 'mobile'];
  const SHOP = {
    tea: { title: 'Chaya Kada', sub: 'ചായക്കട • Tea & Snacks', bg: '#1e6b3a', fg: '#fff6d8', wall: 0xcfe3c4, awning: 0x2f8a4a },
    fruit: { title: 'Fruits & Vegetables', sub: 'പഴം • പച്ചക്കറി', bg: '#e07a1f', fg: '#ffffff', wall: 0xf2dcb5, awning: 0xe07a1f },
    bakery: { title: 'Malabar Bakery', sub: 'ബേക്കറി • Cool Bar', bg: '#8e1219', fg: '#ffe9a8', wall: 0xf6e3bf, awning: 0xb3261e },
    stores: { title: 'Lakshmi Stores', sub: 'പലചരക്ക് കട • Groceries', bg: '#1b4f9a', fg: '#ffffff', wall: 0xdbe4ee, awning: 0x2c5fa8 },
    textiles: { title: 'Kasavu Textiles', sub: 'തുണിക്കട • Sarees & Mundu', bg: '#6b3fa0', fg: '#ffe48a', wall: 0xeadcf2, awning: 0x7e4cb8 },
    medical: { title: 'Medicals', sub: 'മെഡിക്കൽ ഷോപ്പ് • 24 Hrs', bg: '#ffffff', fg: '#127a3a', wall: 0xf4f4f0, awning: 0x1f8a4a, cross: true },
    hotel: { title: 'Hotel Sagar', sub: 'ഊണ് തയ്യാർ • Meals Ready', bg: '#f2c230', fg: '#8e1219', wall: 0xf7e8c0, awning: 0xc4212b },
    mobile: { title: 'Mobile World', sub: 'മൊബൈൽ ഷോപ്പ് • Recharge', bg: '#2a9d8f', fg: '#ffffff', wall: 0xd7efec, awning: 0x2a9d8f }
  };
  const signMats = {};
  function shopSign(type) {
    if (signMats[type]) return signMats[type];
    const s = SHOP[type];
    const tex = canvasTex(1024, 220, (g, w, h) => {
      g.fillStyle = s.bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = s.fg; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
      let x0 = w / 2;
      if (s.cross) {
        g.fillStyle = '#18a34a';
        g.fillRect(70, 50, 40, 120); g.fillRect(30, 90, 120, 40);
        x0 = w / 2 + 50;
      }
      g.fillStyle = s.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 84px Arial, "Helvetica Neue", sans-serif';
      g.fillText(s.title, x0, h * 0.38);
      g.font = 'bold 46px "Nirmala UI", "Noto Sans Malayalam", "Malayalam Sangam MN", Kartika, sans-serif';
      g.fillText(s.sub, x0, h * 0.77);
    });
    signMats[type] = new T.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12 });
    signMats[type].name = 'shopSign_' + type;
    return signMats[type];
  }
  // rows of colourful packets for shelves
  let goodsMat = null;
  function goods() {
    if (goodsMat) return goodsMat;
    const rng = KT.makeRng(77);
    const cols = ['#d8203a', '#f2c230', '#2c5fa8', '#2a9d8f', '#e07a1f', '#6b3fa0', '#f3efe6', '#3f7f2c', '#e05a8a'];
    const tex = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#5a4030'; g.fillRect(0, 0, w, h);
      for (let row = 0; row < 3; row++) {
        let x = 2;
        while (x < w - 4) {
          const bw = 8 + Math.floor(rng() * 14), bh = 22 + Math.floor(rng() * 16);
          g.fillStyle = cols[Math.floor(rng() * cols.length)];
          g.fillRect(x, row * 43 + 41 - bh, bw, bh);
          x += bw + 2;
        }
        g.fillStyle = '#3a2a20'; g.fillRect(0, row * 43 + 41, w, 2);
      }
    });
    goodsMat = KT.mat('shopGoods', { map: tex, roughness: 0.7 });
    return goodsMat;
  }
  function bananaBunch(g, x, y, z) {
    const yel = KT.mat('bananaYellow', { color: 0xe8c43a, roughness: 0.6 });
    part(g, G.cyl(0.02, 0.02, 0.4, 5), M().rope, x, y + 0.2, z);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      part(g, G.capsule(0.05, 0.18, 3, 6), yel, x + Math.cos(a) * 0.12, y - 0.05 - (i % 3) * 0.12, z + Math.sin(a) * 0.12, 0.3, a, 0);
    }
  }
  function plasticChair(g, x, z, rot, mat) {
    const c = new T.Group();
    part(c, G.box(0.42, 0.05, 0.42), mat, 0, 0.44, 0);
    part(c, G.box(0.42, 0.42, 0.05), mat, 0, 0.66, -0.19);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => part(c, G.box(0.04, 0.44, 0.04), mat, sx * 0.18, 0.22, sz * 0.18)));
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    g.add(c);
  }

  const shopProtos = {};
  Models.shop = function (type) {
    if (!shopProtos[type]) shopProtos[type] = buildShop(type);
    return shopProtos[type].clone(true);
  };
  Models.SHOP_SIZE = { width: 4.4, depth: 4.2, front: 3.5 }; // front: awning reach from centre

  function buildShop(type) {
    const s = SHOP[type];
    const g = new T.Group();
    const W = 4.4, D = 4.2, H = 3.3;
    const wall = KT.mat('shopWall' + type, { map: KT.tex('plaster'), color: s.wall }, 0.25);
    const conc = KT.mat('concrete', { color: 0xc9c6bd, roughness: 0.9 });
    const awn = KT.mat('shopAwning' + type, { color: s.awning, roughness: 0.55, metalness: 0.15, side: T.DoubleSide });
    const dark = KT.mat('shopInterior', { color: 0x4a3a30, roughness: 0.9 });
    const shutter = KT.mat('shutter', { color: 0x8c9196, metalness: 0.5, roughness: 0.45 });
    // floor, walls, roof slab with parapet
    part(g, G.box(W + 0.6, 0.25, D + 1.4), conc, 0, 0.125, 0.4);
    part(g, G.box(W, H, 0.2), wall, 0, H / 2, -D / 2 + 0.1);
    [-1, 1].forEach((x) => part(g, G.box(0.2, H, D), wall, x * (W / 2 - 0.1), H / 2, 0));
    part(g, G.box(W - 0.4, 0.05, D - 0.3), dark, 0, 0.27, 0);
    part(g, G.box(W + 0.3, 0.2, D + 0.3), conc, 0, H + 0.1, 0);
    part(g, G.box(W + 0.3, 0.35, 0.12), wall, 0, H + 0.37, D / 2 + 0.09);
    part(g, G.box(W, 0.55, 0.2), wall, 0, H - 0.27, D / 2 - 0.1);
    part(g, G.cyl(0.14, 0.14, W - 0.3, 12), shutter, 0, H - 0.42, D / 2 + 0.06, 0, 0, Math.PI / 2);
    // signboard above the shutter
    part(g, G.box(W + 0.2, 0.9, 0.08), KT.mat('signBack', { color: 0x2a2a2a }), 0, H + 0.95, D / 2 + 0.12);
    part(g, G.plane(W + 0.1, 0.82), shopSign(type), 0, H + 0.95, D / 2 + 0.17);
    // sloping tin awning on two posts
    part(g, G.box(W + 0.5, 0.04, 1.5), awn, 0, H - 0.75, D / 2 + 0.72, 0.28, 0, 0);
    [-1, 1].forEach((x) => part(g, G.cyl(0.035, 0.035, H - 0.95, 8), shutter, x * (W / 2 + 0.1), (H - 0.95) / 2, D / 2 + 1.38));
    // shelves of goods on the back wall
    part(g, G.plane(W - 0.6, 1.9), goods(), 0, 1.45, -D / 2 + 0.22);
    [0.55, 1.2, 1.85, 2.45].forEach((y) => part(g, G.box(W - 0.6, 0.04, 0.35), M().wood, 0, y, -D / 2 + 0.38));
    // counter
    part(g, G.box(W - 0.9, 0.95, 0.55), M().woodDark, 0, 0.73, D / 2 - 0.55);
    switch (type) {
      case 'tea': {
        [-0.9, -0.55, -0.2].forEach((x) => part(g, G.cyl(0.11, 0.11, 0.3, 12), M().glass, x, 1.36, D / 2 - 0.55));
        part(g, G.cyl(0.16, 0.2, 0.42, 14), M().brass, 0.8, 1.42, D / 2 - 0.55);
        part(g, G.cone(0.12, 0.16, 12), M().brass, 0.8, 1.71, D / 2 - 0.55);
        bananaBunch(g, -1.3, 2.4, D / 2 + 0.3);
        bananaBunch(g, 1.3, 2.4, D / 2 + 0.3);
        part(g, G.box(1.8, 0.08, 0.36), M().wood, 0, 0.47, D / 2 + 1.0);
        [-0.75, 0.75].forEach((x) => part(g, G.box(0.08, 0.45, 0.3), M().woodDark, x, 0.24, D / 2 + 1.0));
        break;
      }
      case 'fruit': {
        const fruitCols = [0xe07a1f, 0x6aa82a, 0xd8203a, 0xf2c230];
        [-1.4, -0.45, 0.5, 1.45].forEach((x, i) => {
          part(g, G.box(0.85, 0.3, 0.6), M().wood, x, 0.55, D / 2 + 0.55, -0.3, 0, 0);
          const fm = KT.mat('fruit' + i, { color: fruitCols[i], roughness: 0.55 });
          for (let k = 0; k < 6; k++) part(g, G.sph(0.09, 8, 6), fm, x - 0.3 + (k % 3) * 0.3, 0.76 - Math.floor(k / 3) * 0.06, D / 2 + 0.45 + Math.floor(k / 3) * 0.2);
        });
        bananaBunch(g, -0.9, 2.45, D / 2 + 0.25);
        bananaBunch(g, 0.2, 2.45, D / 2 + 0.25);
        bananaBunch(g, 1.3, 2.45, D / 2 + 0.25);
        break;
      }
      case 'bakery': {
        part(g, G.box(W - 1.0, 0.5, 0.5), M().glass, 0, 1.46, D / 2 - 0.55);
        const cake = [0xf5d7a0, 0xc96a3a, 0xf06aa0, 0xfafafa];
        for (let k = 0; k < 8; k++) part(g, G.box(0.22, 0.12, 0.22), KT.mat('cake' + (k % 4), { color: cake[k % 4], roughness: 0.6 }), -1.2 + k * 0.34, 1.3, D / 2 - 0.55);
        for (let k = 0; k < 6; k++) part(g, G.cyl(0.13, 0.13, 0.36, 12), M().glass, -1.5 + k * 0.6, 2.07, -D / 2 + 0.38 + 0.4);
        break;
      }
      case 'stores': {
        const sack = KT.mat('sack', { color: 0xd9c49a, roughness: 0.95 });
        [-1.5, -0.9, 0.9, 1.5].forEach((x) => part(g, rb(0.5, 0.7, 0.45, 0.18), sack, x, 0.6, D / 2 + 0.45));
        part(g, G.box(0.9, 0.5, 0.5), M().wood, 0, 0.5, D / 2 + 0.45);
        break;
      }
      case 'textiles': {
        const cl = [0xd8203a, 0xf2c230, 0x2a9d8f, 0xe05a8a, 0x6b3fa0, 0xf3efe6];
        cl.forEach((c, i) => part(g, G.plane(0.5, 1.6), KT.mat('cloth' + i, { color: c, roughness: 0.85, side: T.DoubleSide }), -1.5 + i * 0.6, 1.75, D / 2 + 0.08));
        for (let k = 0; k < 5; k++) part(g, G.box(0.5, 0.18, 0.4), KT.mat('cloth' + (k % 6), { color: cl[k % 6], roughness: 0.85, side: T.DoubleSide }), -1.2 + k * 0.6, 1.29, D / 2 - 0.55);
        break;
      }
      case 'medical': {
        part(g, G.box(0.1, 0.7, 0.7), KT.mat('crossBox', { color: 0x18a34a, emissive: 0x18a34a, emissiveIntensity: 0.6 }), W / 2 + 0.05, 2.4, D / 2 - 0.3);
        part(g, G.box(W - 1.0, 0.5, 0.5), M().glass, 0, 1.46, D / 2 - 0.55);
        break;
      }
      case 'hotel': {
        const red = KT.mat('chairRed', { color: 0xc4212b, roughness: 0.5 });
        [-1.1, 1.1].forEach((x) => {
          part(g, G.box(0.9, 0.05, 0.7), M().white, x, 0.75, D / 2 + 0.9);
          part(g, G.cyl(0.04, 0.04, 0.72, 6), M().darkGrey, x, 0.38, D / 2 + 0.9);
          plasticChair(g, x - 0.55, D / 2 + 0.9, Math.PI / 2, red);
          plasticChair(g, x + 0.55, D / 2 + 0.9, -Math.PI / 2, red);
        });
        break;
      }
      case 'mobile': {
        part(g, G.box(W - 1.0, 0.5, 0.5), M().glass, 0, 1.46, D / 2 - 0.55);
        [0xd8203a, 0x2c5fa8].forEach((c, i) => part(g, G.plane(0.7, 1.0), KT.mat('poster' + i, { color: c, roughness: 0.5 }), (i ? 1 : -1) * (W / 2 + 0.01), 1.6, 0.6, 0, (i ? 1 : -1) * Math.PI / 2, 0));
        break;
      }
      default: break;
    }
    const out = KT.bake(g);
    out.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: W / 2 + 0.1, hd: D / 2 + 0.1 }];
    out.userData.size = { width: W, depth: D };
    return out;
  }
})();
