// Street / village props, fences, jetty sections and collectibles.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;

  Models.lampPost = function () {
    const g = new T.Group();
    part(g, G.cyl(0.22, 0.28, 0.4, 8), M().darkGrey, 0, 0.2, 0);
    part(g, G.cyl(0.07, 0.1, 3.4, 8), M().woodDark, 0, 2.0, 0);
    part(g, G.box(0.7, 0.08, 0.08), M().woodDark, 0.25, 3.5, 0);
    // Victorian-style lantern: glowing core, glass, frame, cap & finial
    part(g, G.cyl(0.1, 0.08, 0.3, 16), M().lampGlow, 0.55, 3.15, 0);
    part(g, G.cyl(0.17, 0.13, 0.4, 6), M().glass, 0.55, 3.15, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(g, G.cyl(0.012, 0.012, 0.42, 6), M().black, 0.55 + Math.cos(a) * 0.155, 3.15, Math.sin(a) * 0.155);
    }
    part(g, G.cone(0.24, 0.22, 6), M().black, 0.55, 3.46, 0);
    part(g, G.sph(0.04), M().brass, 0.55, 3.6, 0);
    part(g, G.cyl(0.13, 0.15, 0.05, 6), M().black, 0.55, 2.93, 0);
    part(g, G.cyl(0.025, 0.025, 0.25, 8), M().black, 0.55, 3.45, 0);
    return KT.bake(g);
  };

  Models.bench = function () {
    const g = new T.Group();
    for (let i = 0; i < 3; i++) part(g, G.box(1.8, 0.06, 0.14), M().wood, 0, 0.48, -0.18 + i * 0.18);
    for (let i = 0; i < 2; i++) part(g, G.box(1.8, 0.12, 0.05), M().wood, 0, 0.75 + i * 0.18, -0.3, -0.15);
    [-0.75, 0.75].forEach((x) => {
      part(g, G.box(0.08, 0.48, 0.5), M().woodDark, x, 0.24, 0);
      part(g, G.box(0.08, 0.5, 0.06), M().woodDark, x, 0.75, -0.3, -0.15);
    });
    return KT.bake(g);
  };

  Models.signboard = function (lines) {
    const g = new T.Group();
    part(g, G.cyl(0.07, 0.08, 2.4, 6), M().woodDark, 0, 1.2, 0);
    const tex = KT.textTexture(lines, { width: 512, height: 256 });
    const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    const board = new T.Mesh(G.box(1.6, 0.8, 0.06), [M().wood, M().wood, M().wood, M().wood, mat, mat]);
    board.position.set(0, 2.0, 0.06);
    board.castShadow = true;
    g.add(board);
    return g;
  };

  Models.directionSign = function (entries) {
    const g = new T.Group();
    part(g, G.cyl(0.07, 0.08, 3, 6), M().woodDark, 0, 1.5, 0);
    entries.forEach((e, i) => {
      const tex = KT.textTexture([{ text: e.text, size: 64 }], { width: 512, height: 128, border: false });
      const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.8 });
      const arm = new T.Group();
      arm.position.y = 2.6 - i * 0.42;
      arm.rotation.y = e.angle;
      g.add(arm);
      const b = new T.Mesh(G.box(1.5, 0.32, 0.05), [M().wood, M().wood, M().wood, M().wood, mat, mat]);
      b.position.x = 0.75;
      b.castShadow = true;
      arm.add(b);
      part(arm, G.cone(0.16, 0.2, 3), M().wood, 1.58, 0, 0, 0, 0, -Math.PI / 2, 1, 1, 0.3);
    });
    return g;
  };

  Models.crates = function () {
    const g = new T.Group();
    part(g, G.box(0.8, 0.8, 0.8), M().woodLight, 0, 0.4, 0);
    part(g, G.box(0.7, 0.7, 0.7), M().wood, 0.85, 0.35, 0.1, 0, 0.3);
    part(g, G.box(0.6, 0.6, 0.6), M().woodLight, 0.2, 1.1, 0, 0, 0.5);
    part(g, G.cyl(0.32, 0.32, 0.9, 12), M().woodDark, -0.8, 0.45, 0.2);
    part(g, G.torus(0.33, 0.025, 4, 14), M().darkGrey, -0.8, 0.2, 0.2, Math.PI / 2);
    part(g, G.torus(0.33, 0.025, 4, 14), M().darkGrey, -0.8, 0.7, 0.2, Math.PI / 2);
    return KT.bake(g);
  };

  Models.clayPots = function () {
    const g = new T.Group();
    const lathe = (s) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        pts.push(new T.Vector2(Math.max(0.02, Math.sin(t * Math.PI * 0.95 + 0.1) * 0.35 * s + (t > 0.85 ? 0.04 : 0)), t * 0.7 * s));
      }
      return new T.LatheGeometry(pts, 12);
    };
    part(g, lathe(1), M().terracotta, 0, 0, 0);
    part(g, lathe(0.75), M().terracotta, 0.6, 0, 0.2);
    part(g, lathe(0.6), M().terracotta, -0.4, 0, 0.45);
    part(g, lathe(1.2), KT.mat('terracottaDark', { color: 0x8e4424 }), -0.5, 0, -0.4);
    return KT.bake(g);
  };

  Models.woodenFence = function (len) {
    const g = new T.Group();
    const L = len || 2;
    part(g, G.box(L, 0.1, 0.06), M().wood, 0, 0.55, 0);
    part(g, G.box(L, 0.1, 0.06), M().wood, 0, 0.95, 0);
    part(g, G.box(0.14, 1.15, 0.14), M().woodDark, -L / 2, 0.57, 0);
    part(g, G.cone(0.11, 0.14, 4), M().woodDark, -L / 2, 1.21, 0, 0, Math.PI / 4);
    return KT.bake(g);
  };

  Models.stoneRailing = function (len) {
    const g = new T.Group();
    const L = len || 3;
    part(g, G.box(L, 0.15, 0.3), M().stoneGrey, 0, 0.9, 0);
    part(g, G.box(L, 0.15, 0.3), M().stoneGrey, 0, 0.08, 0);
    part(g, G.box(0.3, 1.1, 0.3), M().stoneGrey, -L / 2, 0.55, 0);
    for (let i = 1; i < 5; i++) part(g, G.cyl(0.06, 0.08, 0.7, 6), M().stoneGrey, -L / 2 + (L * i) / 5, 0.5, 0);
    return KT.bake(g);
  };

  Models.boundaryWall = function (len) {
    const g = new T.Group();
    const L = len || 4;
    part(g, G.box(L, 1.1, 0.5), M().laterite, 0, 0.55, 0);
    part(g, G.box(L + 0.1, 0.12, 0.6), M().stoneGrey, 0, 1.16, 0);
    part(g, KT.blob(0.4, 0, 0.3, 5), M().leafLight, L * 0.2, 1.3, 0, 0, 0, 0, 1.6, 0.5, 0.8);
    return KT.bake(g);
  };

  // Jetty deck section 4m long (x) and 2.4 wide; deck top at y = 0.6.
  Models.jettySection = function () {
    const g = new T.Group();
    for (let i = 0; i < 8; i++) part(g, G.box(0.46, 0.08, 2.4), M().wood, -1.75 + i * 0.5, 0.56, 0);
    part(g, G.box(4, 0.14, 0.14), M().woodDark, 0, 0.45, 1.1);
    part(g, G.box(4, 0.14, 0.14), M().woodDark, 0, 0.45, -1.1);
    [-1.9, 1.9].forEach((x) => [-1.1, 1.1].forEach((z) => part(g, G.cyl(0.11, 0.12, 3.4, 6), M().woodDark, x, -0.9, z)));
    return KT.bake(g);
  };

  Models.mooringPost = function () {
    const g = new T.Group();
    part(g, G.cyl(0.13, 0.15, 3, 6), M().woodDark, 0, 0, 0);
    part(g, G.torus(0.16, 0.04, 4, 10), M().rope, 0, 0.9, 0, Math.PI / 2);
    return KT.bake(g);
  };

  // Plastic waste collectible.
  Models.plasticBottle = function () {
    const g = new T.Group();
    part(g, G.cyl(0.11, 0.11, 0.42, 10), M().plastic, 0, 0, 0);
    part(g, G.cyl(0.05, 0.11, 0.1, 10), M().plastic, 0, 0.26, 0);
    part(g, G.cyl(0.055, 0.055, 0.06, 8), M().blue, 0, 0.33, 0);
    part(g, G.cyl(0.115, 0.115, 0.14, 10), KT.mat('label', { color: 0xd8342c }), 0, 0, 0);
    return g;
  };

  Models.plasticBag = function () {
    const g = new T.Group();
    part(g, KT.blob(0.25, 1, 0.35, 8), M().plasticBag, 0, 0, 0, 0, 0, 0, 1.2, 0.6, 1);
    part(g, G.torus(0.08, 0.02, 4, 8), M().plasticBag, 0.15, 0.12, 0);
    return g;
  };

  Models.coin = function () {
    const g = new T.Group();
    const c = part(g, G.cyl(0.32, 0.32, 0.07, 18), M().coin, 0, 0, 0, Math.PI / 2);
    c.castShadow = false;
    const s = part(g, G.cyl(0.2, 0.2, 0.09, 6), KT.mat('coinInner', { color: 0xffe27a, metalness: 0.8, roughness: 0.3, emissive: 0x7a5200, emissiveIntensity: 0.5 }), 0, 0, 0, Math.PI / 2);
    s.castShadow = false;
    return g;
  };

  // Floating glowing ring marking mission destinations.
  Models.beacon = function () {
    const g = new T.Group();
    const mat = new T.MeshBasicMaterial({ color: 0x4cff9a, transparent: true, opacity: 0.35, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending });
    const col = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 30, 24, 1, true), mat);
    col.position.y = 15;
    g.add(col);
    const ringMat = new T.MeshBasicMaterial({ color: 0x9dffc8, transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending });
    const ring = new T.Mesh(new T.TorusGeometry(2.2, 0.08, 6, 32), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    g.add(ring);
    g.userData.ring = ring;
    g.userData.col = col;
    return g;
  };
})();
