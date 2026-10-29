// Fishing at Kochi: the fishing point by the lagoon, the cast net
// (veesh vala) and the catch - mathi, ayala, chemmeen, koonthal, karimeen
// and neymeen.
(function () {
  'use strict';
  const T = THREE, G = KT.G, part = KT.part;
  const Models = KT.Models = KT.Models || {};
  const M = () => KT.M;

  // Wooden landing with a signboard, a basket and a coiled net. Faces +z
  // (towards the water).
  Models.fishingSpot = function () {
    const g = new T.Group();
    const plank = KT.mat('jettyPlank', { map: KT.tex('wood'), color: 0xb08a62 }, 0.5);
    for (let i = 0; i < 6; i++) part(g, G.box(2.4, 0.08, 0.36), plank, 0, 0.12, -1.0 + i * 0.4);
    [-1.1, 1.1].forEach((x) => [-1.1, 1.1].forEach((z) => part(g, G.cyl(0.07, 0.08, 0.5, 8), M().woodDark, x, 0.02, z)));
    // signboard
    part(g, G.cyl(0.05, 0.05, 1.8, 8), M().woodDark, -1.35, 0.9, -1.0);
    const tex = KT.textTexture([{ text: 'Fishing Point', size: 58 }, { text: 'മീൻപിടുത്തം • Kochi', size: 40 }], { width: 512, height: 200, bg: '#1b5e7a', color: '#ffffff', borderColor: '#f2c230' });
    const sign = new T.Mesh(G.box(1.1, 0.45, 0.05), [M().woodDark, M().woodDark, M().woodDark, M().woodDark, new T.MeshStandardMaterial({ map: tex, roughness: 0.6 }), new T.MeshStandardMaterial({ map: tex, roughness: 0.6 })]);
    sign.position.set(-1.35, 1.65, -1.0);
    sign.rotation.y = 0.5;
    sign.userData.noBake = true;
    g.add(sign);
    // woven basket and a coiled net
    const cane = KT.mat('cane', { color: 0xa47a42, roughness: 0.9 });
    part(g, G.cyl(0.26, 0.2, 0.36, 14), cane, 0.85, 0.34, -0.75);
    part(g, G.torus(0.26, 0.03, 6, 16), cane, 0.85, 0.52, -0.75, Math.PI / 2);
    part(g, G.torus(0.22, 0.07, 6, 18), M().net, -0.6, 0.22, -0.7, Math.PI / 2);
    g.userData.colliders = [{ type: 'circle', x: -1.35, z: -1.0, r: 0.2 }];
    return KT.bake(g);
  };

  // A round cast net: a mesh dome with lead weights around the rim.
  Models.castNet = function () {
    const g = new T.Group();
    const mesh = new T.Mesh(new T.SphereGeometry(1, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), KT.mat('castNet', { color: 0xe8e2cc, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false, wireframe: true }));
    mesh.scale.set(1, 0.6, 1);
    g.add(mesh);
    const lead = KT.mat('leadWeight', { color: 0x55585c, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const w = new T.Mesh(G.sph(0.035, 6, 4), lead);
      w.position.set(Math.cos(a) * 1.0, 0.12, Math.sin(a) * 1.0);
      g.add(w);
    }
    const rope = new T.Mesh(G.cyl(0.01, 0.01, 0.8, 4), M().rope);
    rope.position.y = 0.9;
    g.add(rope);
    return g;
  };

  // One fish (or prawn / squid) for the catch display and jumping fish.
  const fishProtos = {};
  Models.fish = function (kind) {
    if (!fishProtos[kind.id]) fishProtos[kind.id] = buildFish(kind);
    return fishProtos[kind.id].clone(true);
  };
  function buildFish(kind) {
    const g = new T.Group();
    const s = kind.size * 0.32;
    const body = KT.mat('fish_' + kind.id, { color: kind.color, roughness: 0.3, metalness: 0.35 });
    const belly = KT.mat('fishBelly', { color: 0xeef0ea, roughness: 0.35, metalness: 0.2 });
    if (kind.prawn) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 0.9;
        part(g, G.sph(s * (0.42 - i * 0.04), 10, 8), body, 0, Math.sin(a) * s * 0.8, Math.cos(a) * s * 0.8 - s * 0.4, 0, 0, 0, 1, 0.8, 1.2);
      }
      [-1, 1].forEach((sd) => part(g, G.cyl(0.004, 0.004, s * 2.4, 4), body, sd * s * 0.1, s * 0.2, s * 1.4, 1.2, 0, 0));
    } else if (kind.squid) {
      part(g, G.cone(s * 0.35, s * 1.6, 12), body, 0, 0, s * 0.4, Math.PI / 2, 0, 0);
      part(g, G.sph(s * 0.32, 10, 8), body, 0, 0, -s * 0.45);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(g, G.cyl(0.012, 0.006, s * 1.2, 4), body, Math.cos(a) * s * 0.15, Math.sin(a) * s * 0.15, -s * 1.1, Math.PI / 2, 0, 0);
      }
      part(g, G.sph(s * 0.07, 6, 4), M().black, s * 0.2, s * 0.08, -s * 0.5);
    } else {
      const flatter = kind.id === 'karimeen' ? 1.35 : 0.85;
      part(g, G.sph(s, 16, 12), body, 0, 0, 0, 0, 0, 0, 0.42, 0.55 * flatter, 1.25);
      part(g, G.sph(s * 0.95, 14, 10), belly, 0, -s * 0.12, 0.02, 0, 0, 0, 0.38, 0.38 * flatter, 1.15);
      part(g, G.cone(s * 0.5, s * 0.7, 4), body, 0, 0, -s * 1.45, -Math.PI / 2, 0, 0, 0.25, 1, 1.3);
      part(g, G.cone(s * 0.32, s * 0.6, 4), body, 0, s * 0.62 * flatter, -s * 0.1, -0.5, 0, 0, 0.15, 1, 1);
      [-1, 1].forEach((sd) => part(g, G.sph(s * 0.09, 8, 6), M().black, sd * s * 0.34, s * 0.12, s * 0.85));
      if (kind.id === 'karimeen') for (let i = 0; i < 5; i++) part(g, G.box(s * 0.86, s * 0.9, s * 0.08), KT.mat('karimeenBand', { color: 0x2a3424, roughness: 0.4 }), 0, 0, -s * 0.7 + i * s * 0.35);
    }
    return KT.bake(g);
  }
})();
