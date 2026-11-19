// Low-poly props from Kenney's CC0 kits (assets/kenney): rocks, bushes,
// flowers, logs, mushrooms, hill trees, lilies, road-works gear, street
// lights and signs. Each .glb is merged into one vertex-coloured mesh
// (their materials are plain colours), so many copies can be drawn at
// once with the game's pools and instancers.
//
//   KT.Props.preload()         starts loading everything (tiny files)
//   KT.Props.get('rock_largeA') -> a Group holding the one mesh, or null
//   KT.Props.ready             true once every file has been tried
(function () {
  'use strict';
  const T = THREE;
  const Pr = KT.Props = { ready: false, loaded: 0, total: 0, protos: {}, failed: [] };

  const FILES = {
    nature: ['rock_largeA', 'rock_largeB', 'rock_largeC', 'rock_smallA', 'rock_smallB', 'rock_smallC', 'rock_smallFlatA', 'stone_largeA', 'stone_largeB', 'stone_tallA', 'stone_tallB', 'stone_smallA',
      'plant_bush', 'plant_bushDetailed', 'plant_bushLarge', 'plant_flatTall', 'plant_flatShort', 'flower_redA', 'flower_redB', 'flower_yellowA', 'flower_yellowB', 'flower_purpleA', 'flower_purpleB',
      'grass_leafsLarge', 'grass_large', 'log', 'log_large', 'log_stack', 'stump_round', 'stump_old', 'stump_squareDetailed', 'mushroom_red', 'mushroom_redGroup', 'mushroom_tanGroup',
      'tree_pineRoundA', 'tree_pineRoundB', 'tree_pineRoundC', 'tree_pineRoundD', 'tree_pineTallA', 'tree_pineTallB', 'tree_detailed', 'tree_oak', 'tree_fat', 'tree_plateau', 'tree_tall', 'tree_thin',
      'tree_palmBend', 'tree_palmDetailedTall', 'lily_large', 'lily_small', 'fence_simple', 'fence_planks', 'hanging_moss'],
    roads: ['construction-cone', 'construction-barrier', 'construction-light', 'construction-fence', 'light-curved', 'light-square', 'road-sign-warning', 'road-sign-stop', 'sign-highway', 'dumpster', 'traffic-light']
  };
  // Kenney's units are small (a tree is 1.3 units tall, a cone 0.09): how
  // much each family grows to sit in this world (pines 6-10 m, cones 0.7 m)
  const SCALE = [[/^tree_pine/, 5.0], [/^tree_/, 5.5], [/^plant_bush/, 3.0], [/^plant_|^grass_/, 2.2], [/^rock_large|^stone_large|^stone_tall/, 2.2], [/^rock_|^stone_/, 2.0],
    [/^log|^stump/, 2.2], [/^flower_/, 1.6], [/^mushroom_/, 1.5], [/^lily_/, 4.0], [/^fence_/, 3.0], [/^hanging_moss/, 3.0],
    [/^road-sign/, 5.0], [/^dumpster/, 5.6], [/^construction-light/, 6.0], [/./, 8.0]];
  const scaleFor = (name) => (SCALE.find(([re]) => re.test(name)) || [0, 1])[1];
  // Kenney's nature palette is a cool mint green; these props stand among
  // this game's own trees, so their material colours are swapped for its
  // greens, greys and browns (sRGB)
  const RECOLOR = { leafsGreen: 0x5aa33a, leafsDark: 0x3f8a3a, grass: 0x6db043, woodBark: 0x8a5a3a, woodBarkDark: 0x6e4a33, woodInner: 0xd9b98a, wood: 0xa8743f, woodDark: 0x7d5430,
    stone: 0x9a9a92, dirt: 0x8a6a52, _defaultMat: 0xe8e2d4, colorRed: 0xd94a4a, colorYellow: 0xf2b53c, colorPurple: 0x9a7fe0, colorTan: 0xe0b07a };
  const recolor = new Map();
  const colorOf = (m) => {
    if (!m) return null;
    let c = recolor.get(m);
    if (c === undefined) { const hex = RECOLOR[m.name]; c = hex !== undefined ? new T.Color(hex) : (m.color || new T.Color(0.6, 0.6, 0.6)); recolor.set(m, c); }
    return c;
  };

  // read a texture's pixel at (u, v) (palette textures: flat colour cells)
  const samplers = new Map();
  function sample(tex, u, v) {
    let sm = samplers.get(tex);
    if (!sm) {
      const img = tex.image, cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      sm = { w: cv.width, h: cv.height, d: ctx.getImageData(0, 0, cv.width, cv.height).data };
      samplers.set(tex, sm);
    }
    u = u - Math.floor(u); v = v - Math.floor(v);
    if (tex.flipY) v = 1 - v;
    const x = Math.min(sm.w - 1, Math.floor(u * sm.w)), y = Math.min(sm.h - 1, Math.floor(v * sm.h));
    const k = (y * sm.w + x) * 4, g = (q) => Math.pow(q / 255, 2.2); // sRGB bytes to linear colour
    return [g(sm.d[k]), g(sm.d[k + 1]), g(sm.d[k + 2])];
  }

  // one mesh per file: vertices in world space of the file's scene, colours
  // from the materials (a slight cel-friendly lift), flat shaded
  let material = null;
  function merge(name, scene) {
    scene.updateMatrixWorld(true);
    const pos = [], nor = [], col = [], idx = [];
    const c = new T.Color(), v = new T.Vector3(), n = new T.Vector3(), nm = new T.Matrix3();
    let base = 0;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry, P = g.attributes.position;
      if (!g.attributes.normal) g.computeVertexNormals();
      const N = g.attributes.normal;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      nm.getNormalMatrix(o.matrixWorld);
      const groups = g.groups && g.groups.length ? g.groups : [{ start: 0, count: g.index ? g.index.count : P.count, materialIndex: 0 }];
      // colour per vertex comes from the group (material) its triangles are
      // in: a plain colour, or a palette texture read at the vertex's uv
      const vmat = new Array(P.count).fill(null);
      groups.forEach((gr) => {
        const m = mats[gr.materialIndex] || mats[0];
        for (let i = gr.start; i < gr.start + gr.count; i++) { const vi = g.index ? g.index.getX(i) : i; vmat[vi] = m; }
      });
      const UV = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
        n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        const m = vmat[i] || mats[0];
        if (m && m.map && m.map.image && UV) {
          const px = sample(m.map, UV.getX(i), UV.getY(i));
          c.setRGB(px[0], px[1], px[2]);
          if (m.color) c.multiply(m.color);
        } else c.copy(colorOf(m) || c.set(0.6, 0.6, 0.6));
        pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z);
        col.push(Math.min(1, c.r * 1.08), Math.min(1, c.g * 1.08), Math.min(1, c.b * 1.06));
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
      else for (let i = 0; i < P.count; i++) idx.push(i + base);
      base += P.count;
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    const s = scaleFor(name);
    geo.scale(s, s, s);
    geo.computeBoundingSphere();
    if (!material) material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true });
    const mesh = new T.Mesh(geo, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const g = new T.Group();
    g.add(mesh);
    g.userData.size = geo.boundingSphere.radius * 2;
    return g;
  }

  Pr.preload = function () {
    if (Pr.total || !T.GLTFLoader) { Pr.ready = !T.GLTFLoader; return; }
    const loader = new T.GLTFLoader();
    const all = [];
    Object.keys(FILES).forEach((dir) => FILES[dir].forEach((name) => all.push([dir, name])));
    Pr.total = all.length;
    const done = () => { Pr.loaded++; if (Pr.loaded >= Pr.total) { Pr.ready = true; (Pr.onReady || []).forEach((f) => f()); Pr.onReady = []; } };
    all.forEach(([dir, name], k) => setTimeout(() => {
      loader.load('assets/kenney/' + dir + '/' + name + '.glb', (gltf) => { try { Pr.protos[name] = merge(name, gltf.scene); } catch (e) { Pr.failed.push(name); } done(); }, undefined, () => { Pr.failed.push(name); done(); });
    }, k * 15));
  };
  Pr.get = (name) => Pr.protos[name] || null;
  // a fresh copy to place in a scene (the geometry and material are shared)
  Pr.make = function (name) {
    const p = Pr.protos[name];
    if (!p) return null;
    const m = p.children[0];
    const mesh = new T.Mesh(m.geometry, m.material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const g = new T.Group();
    g.add(mesh);
    g.userData.size = p.userData.size;
    return g;
  };
  Pr.whenReady = (f) => { if (Pr.ready) f(); else (Pr.onReady = Pr.onReady || []).push(f); };
})();
