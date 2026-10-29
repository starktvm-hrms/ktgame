// Core helpers shared by the asset builders and the game: math, noise,
// textures, materials, geometry baking and instancing.
window.KT = window.KT || {};
(function () {
  'use strict';
  const T = THREE;

  // Treat hex colours as sRGB and convert to linear for lighting (r149 API).
  if (T.ColorManagement) {
    T.ColorManagement.legacyMode = false;
  }

  // ---------------------------------------------------------------- math
  KT.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  KT.fmtNum = (n) => { try { return Number(n).toLocaleString('en-IN'); } catch (e) { return String(n); } };
  KT.lerp = (a, b, t) => a + (b - a) * t;
  KT.smoothstep = (e0, e1, x) => {
    const t = KT.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  KT.angleLerp = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  };

  KT.makeRng = function (seed) {
    let s = seed >>> 0;
    const rng = function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.range = (a, b) => a + (b - a) * rng();
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
    return rng;
  };
  KT.rng = KT.makeRng(1234);

  // 2D gradient noise (Perlin style) in roughly [-1, 1].
  const perm = new Uint8Array(512);
  (function () {
    const r = KT.makeRng(42);
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  function grad(h, x, y) {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  }
  KT.noise = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    const x1 = KT.lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = KT.lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return KT.lerp(x1, x2, v) * 0.9;
  };
  KT.fbm = function (x, y, oct) {
    let a = 0.5, f = 1, s = 0;
    for (let i = 0; i < (oct || 4); i++) {
      s += a * KT.noise(x * f, y * f);
      f *= 2.03; a *= 0.5;
    }
    return s;
  };

  // ------------------------------------------------------------ textures
  const texCache = {};
  const loader = new T.TextureLoader();
  KT.maxAnisotropy = 4;
  KT.tex = function (name, repeatU, repeatV, linear) {
    const key = name + ':' + (repeatU || 1) + ':' + (repeatV || 1) + (linear ? ':lin' : '');
    if (texCache[key]) return texCache[key];
    const src = (KT.TEXTURE_DATA && KT.TEXTURE_DATA[name]) || ('assets/textures/' + name + '.jpg');
    const t = loader.load(src);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeatU || 1, repeatV || repeatU || 1);
    t.anisotropy = KT.maxAnisotropy;
    if (!linear) t.encoding = T.sRGBEncoding;
    texCache[key] = t;
    return t;
  };

  // Canvas text texture for signboards.
  KT.textTexture = function (lines, opts) {
    opts = opts || {};
    const w = opts.width || 512, h = opts.height || 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = opts.bg || '#6b4226';
    g.fillRect(0, 0, w, h);
    if (opts.border !== false) {
      g.strokeStyle = opts.borderColor || '#3e2414';
      g.lineWidth = 14;
      g.strokeRect(7, 7, w - 14, h - 14);
    }
    g.fillStyle = opts.color || '#f5e6c8';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((ln, i) => {
      const size = ln.size || (i === 0 ? h * 0.32 : h * 0.13);
      g.font = (ln.weight || 'bold') + ' ' + size + 'px Georgia, "Times New Roman", serif';
      g.fillText(ln.text || ln, w / 2, h * ((i + 0.5) / n) + (ln.dy || 0));
    });
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = KT.maxAnisotropy;
    return t;
  };

  // ----------------------------------------------------------- materials
  // uvMode: undefined -> keep primitive uvs, 'world' -> triplanar world-ish
  // projection, 'roof' -> along-eave/along-slope projection for roofs.
  const matCache = {};
  KT.mat = function (key, params, uvScale, uvMode) {
    if (matCache[key]) return matCache[key];
    const p = Object.assign({ roughness: 0.85, metalness: 0 }, params || {});
    const m = new T.MeshStandardMaterial(p);
    m.name = key;
    if (uvScale) {
      m.userData.uvScale = uvScale;
      m.userData.uvMode = uvMode || 'world';
    }
    matCache[key] = m;
    return m;
  };

  // Shared material palette used by all model builders.
  KT.M = {};
  KT.initMaterials = function () {
    const M = KT.M;
    const tex = KT.tex;
    M.skin = KT.mat('skin', { color: 0xc68a62, roughness: 0.7 });
    M.skinDark = KT.mat('skinDark', { color: 0x8d5a3b, roughness: 0.7 });
    M.skinMid = KT.mat('skinMid', { color: 0xa86f4c, roughness: 0.7 });
    M.hair = KT.mat('hair', { color: 0x1d130e, roughness: 0.55 });
    M.hairBrown = KT.mat('hairBrown', { color: 0x3a2417, roughness: 0.55 });
    M.eyeWhite = KT.mat('eyeWhite', { color: 0xffffff, roughness: 0.3 });
    M.eyeDark = KT.mat('eyeDark', { color: 0x1a0f08, roughness: 0.2 });
    M.lip = KT.mat('lip', { color: 0x9e4a3c, roughness: 0.6 });
    M.white = KT.mat('white', { color: 0xf3efe6 });
    M.black = KT.mat('black', { color: 0x161616, roughness: 0.6 });
    M.gold = KT.mat('gold', { color: 0xd9a635, metalness: 0.75, roughness: 0.32 });
    M.brass = KT.mat('brass', { color: 0xc9953a, metalness: 0.7, roughness: 0.35 });
    M.copper = KT.mat('copper', { color: 0x9c5a32, metalness: 0.6, roughness: 0.4 });
    M.red = KT.mat('red', { color: 0xb3261e });
    M.maroon = KT.mat('maroon', { color: 0x6e1a1a });
    M.orange = KT.mat('orange', { color: 0xe07a1f });
    M.yellow = KT.mat('yellow', { color: 0xf2c230 });
    M.blue = KT.mat('blue', { color: 0x2c5fa8 });
    M.teal = KT.mat('teal', { color: 0x2a9d8f });
    M.pink = KT.mat('pink', { color: 0xe05a8a });
    M.purple = KT.mat('purple', { color: 0x6b3fa0 });
    M.grey = KT.mat('grey', { color: 0x8a8a86 });
    M.darkGrey = KT.mat('darkGrey', { color: 0x3c3c3a });
    M.glass = KT.mat('glass', { color: 0x8fb8c8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55 });
    M.windowDark = KT.mat('windowDark', { color: 0x2a1a10, roughness: 0.9 });
    M.lampGlow = KT.mat('lampGlow', { color: 0xffe2a0, emissive: 0xffc560, emissiveIntensity: 1.4 });

    M.wood = KT.mat('wood', { map: tex('wood'), color: 0xffffff }, 0.5);
    M.woodDark = KT.mat('woodDark', { map: tex('wood'), color: 0x8a6a55 }, 0.5);
    M.woodLight = KT.mat('woodLight', { map: tex('wood'), color: 0xf0d2b0 }, 0.5);
    M.roof = KT.mat('roof', { map: tex('roof_tiles'), color: 0xffffff, side: T.DoubleSide }, 0.45, 'roof');
    M.roofGreen = KT.mat('roofGreen', { map: tex('roof_tiles'), color: 0x6fae9c, side: T.DoubleSide }, 0.45, 'roof');
    M.thatch = KT.mat('thatch', { map: tex('thatch'), color: 0xffffff, side: T.DoubleSide }, 0.35, 'roof');
    M.plaster = KT.mat('plaster', { map: tex('plaster'), color: 0xffffff }, 0.25);
    M.plasterCream = KT.mat('plasterCream', { map: tex('plaster'), color: 0xf6e3bf }, 0.25);
    M.laterite = KT.mat('laterite', { map: tex('laterite'), color: 0xffffff }, 0.35);
    M.stone = KT.mat('stone', { map: tex('stone_path'), color: 0xc8c4bc }, 0.3);
    M.stoneGrey = KT.mat('stoneGrey', { map: tex('stone_path'), color: 0x9a968e }, 0.35);
    M.bamboo = KT.mat('bamboo', { map: tex('thatch'), color: 0xe0c48a }, 0.6);
    M.palmBark = KT.mat('palmBark', { map: tex('palm_bark'), color: 0xffffff }, 1.0);
    M.rock = KT.mat('rock', { color: 0x8b8781, roughness: 0.95 });
    M.rockMoss = KT.mat('rockMoss', { color: 0x6f7f4e, roughness: 0.95 });
    M.bark = KT.mat('bark', { color: 0x6b4a33, roughness: 0.95 });
    M.barkLight = KT.mat('barkLight', { color: 0x8e7a62, roughness: 0.95 });
    M.leaf = KT.mat('leaf', { color: 0x3f7f2c, roughness: 0.8 });
    M.leafLight = KT.mat('leafLight', { color: 0x5d9b35, roughness: 0.8 });
    M.leafDark = KT.mat('leafDark', { color: 0x2c5e25, roughness: 0.8 });
    M.teaLeaf = KT.mat('teaLeaf', { color: 0x4f9a3a, roughness: 0.8 });
    M.frond = KT.mat('frond', { map: tex('palm_frond'), alphaTest: 0.45, side: T.DoubleSide, roughness: 0.75 });
    M.banana = KT.mat('banana', { map: tex('banana_leaf'), alphaTest: 0.45, side: T.DoubleSide, roughness: 0.7 });
    M.foliage = KT.mat('foliage', { map: tex('foliage'), alphaTest: 0.45, side: T.DoubleSide, roughness: 0.8 });
    M.coconut = KT.mat('coconut', { color: 0x6b8a2a, roughness: 0.6 });
    M.grassBlade = KT.mat('grassBlade', { color: 0x5f9a35, roughness: 0.9, side: T.DoubleSide });
    M.flowerRed = KT.mat('flowerRed', { color: 0xd8203a });
    M.flowerPink = KT.mat('flowerPink', { color: 0xf06aa0 });
    M.flowerYellow = KT.mat('flowerYellow', { color: 0xf5c518 });
    M.flowerWhite = KT.mat('flowerWhite', { color: 0xfafafa });
    M.hullDark = KT.mat('hullDark', { map: tex('wood'), color: 0x5a3a24 }, 0.6);
    M.rope = KT.mat('rope', { color: 0xb59a6a });
    M.net = KT.mat('net', { color: 0xd8d0b8, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false });
    M.terracotta = KT.mat('terracotta', { color: 0xb4582e, roughness: 0.8 });
    M.plastic = KT.mat('plastic', { color: 0x6fc3e8, roughness: 0.15, transparent: true, opacity: 0.85 });
    M.plasticBag = KT.mat('plasticBag', { color: 0xf0f0f0, roughness: 0.4, side: T.DoubleSide });
    M.coin = KT.mat('coin', { color: 0xffc928, metalness: 0.8, roughness: 0.25, emissive: 0x6a4500, emissiveIntensity: 0.6 });
  };

  // ------------------------------------------------------- geometry utils
  const _v = new T.Vector3(), _n = new T.Vector3();

  // Merge [{geometry, matrix}] into one indexed BufferGeometry with
  // position / normal / uv.
  KT.mergeGeometries = function (items) {
    let vCount = 0, iCount = 0;
    items.forEach((it) => {
      vCount += it.geometry.attributes.position.count;
      iCount += it.geometry.index ? it.geometry.index.count : it.geometry.attributes.position.count;
    });
    const pos = new Float32Array(vCount * 3);
    const nor = new Float32Array(vCount * 3);
    const uv = new Float32Array(vCount * 2);
    const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
    let vo = 0, io = 0;
    const nm = new T.Matrix3();
    items.forEach((it) => {
      const g = it.geometry;
      if (!g.attributes.normal) g.computeVertexNormals();
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      nm.getNormalMatrix(it.matrix);
      for (let i = 0; i < P.count; i++) {
        _v.fromBufferAttribute(P, i).applyMatrix4(it.matrix);
        pos[(vo + i) * 3] = _v.x; pos[(vo + i) * 3 + 1] = _v.y; pos[(vo + i) * 3 + 2] = _v.z;
        _n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        nor[(vo + i) * 3] = _n.x; nor[(vo + i) * 3 + 1] = _n.y; nor[(vo + i) * 3 + 2] = _n.z;
        if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      }
      if (g.index) {
        for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
        io += g.index.count;
      } else {
        for (let i = 0; i < P.count; i++) idx[io + i] = i + vo;
        io += P.count;
      }
      vo += P.count;
    });
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('uv', new T.BufferAttribute(uv, 2));
    out.setIndex(new T.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    out.computeBoundingBox();
    return out;
  };

  // Re-project uvs so textures keep a constant world density.
  KT.projectUV = function (geom, scale, mode) {
    const P = geom.attributes.position, N = geom.attributes.normal, U = geom.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      let u, v;
      if (mode === 'roof' && ay < 0.985) {
        const hl = Math.hypot(nx, nz) || 1;
        const hx = nx / hl, hz = nz / hl;
        u = x * -hz + z * hx;
        v = -(x * hx + z * hz) * 1.0 - y * 0.6;
      } else if (ay >= ax && ay >= az) { u = x; v = z; }
      else if (ax >= az) { u = z; v = y; }
      else { u = x; v = y; }
      U.setXY(i, u * scale, v * scale);
    }
    U.needsUpdate = true;
  };

  // Bake a group of meshes into one mesh per material (static models).
  KT.bake = function (group, opts) {
    opts = opts || {};
    group.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(group.matrixWorld).invert();
    const byMat = new Map();
    group.traverse((o) => {
      if (!o.isMesh || o.userData.noBake) return;
      const m = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push({ geometry: o.geometry, matrix: m });
    });
    const out = new T.Group();
    out.name = group.name;
    byMat.forEach((items, mat) => {
      const g = KT.mergeGeometries(items);
      if (mat.userData.uvScale) KT.projectUV(g, mat.userData.uvScale, mat.userData.uvMode);
      const mesh = new T.Mesh(g, mat);
      mesh.castShadow = opts.castShadow !== false;
      mesh.receiveShadow = opts.receiveShadow !== false;
      out.add(mesh);
    });
    // keep any objects flagged noBake (lights, animated parts)
    const keep = [];
    group.traverse((o) => { if (o.userData.noBake && o !== group) keep.push(o); });
    keep.forEach((o) => {
      const m = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      o.parent.remove(o);
      m.decompose(o.position, o.quaternion, o.scale);
      out.add(o);
    });
    out.userData = group.userData;
    return out;
  };

  // ------------------------------------------------------- primitive kit
  // Small helpers so model builders read like a description of the object.
  KT.part = function (parent, geom, mat, x, y, z, rx, ry, rz, sx, sy, sz) {
    const m = new T.Mesh(geom, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx !== undefined) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
    m.castShadow = true;
    m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  };
  const G = KT.G = {
    box: (w, h, d) => new T.BoxGeometry(w, h, d),
    cyl: (rt, rb, h, s) => new T.CylinderGeometry(rt, rb, h, s || 20),
    sph: (r, ws, hs) => new T.SphereGeometry(r, ws || 18, hs || 12),
    cone: (r, h, s) => new T.ConeGeometry(r, h, s || 18),
    ico: (r, d) => new T.IcosahedronGeometry(r, d === undefined ? 1 : d),
    dodec: (r) => new T.DodecahedronGeometry(r, 0),
    torus: (r, t, rs, ts, arc) => new T.TorusGeometry(r, t, rs || 8, ts || 24, arc),
    plane: (w, h, ws, hs) => new T.PlaneGeometry(w, h, ws || 1, hs || 1),
    capsule: (r, l, cs, rs) => new T.CapsuleGeometry(r, l, cs || 4, rs || 10)
  };

  // Organic blob: jitter an icosahedron for canopies / rocks.
  KT.blob = function (r, detail, amount, seed) {
    const g = new T.IcosahedronGeometry(r, detail);
    const rng = KT.makeRng(seed || 1);
    const P = g.attributes.position;
    const map = {};
    for (let i = 0; i < P.count; i++) {
      const k = P.getX(i).toFixed(3) + ',' + P.getY(i).toFixed(3) + ',' + P.getZ(i).toFixed(3);
      if (map[k] === undefined) map[k] = 1 + (rng() - 0.5) * 2 * amount;
      const s = map[k];
      P.setXYZ(i, P.getX(i) * s, P.getY(i) * s, P.getZ(i) * s);
    }
    // weld normals so the blob shades smoothly (icosahedra are non-indexed)
    g.computeVertexNormals();
    const N = g.attributes.normal;
    const acc = {};
    const key = (i) => P.getX(i).toFixed(4) + ',' + P.getY(i).toFixed(4) + ',' + P.getZ(i).toFixed(4);
    for (let i = 0; i < P.count; i++) {
      const k = key(i);
      const v = acc[k] || (acc[k] = [0, 0, 0]);
      v[0] += N.getX(i); v[1] += N.getY(i); v[2] += N.getZ(i);
    }
    for (let i = 0; i < P.count; i++) {
      const v = acc[key(i)];
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      N.setXYZ(i, v[0] / l, v[1] / l, v[2] / l);
    }
    return g;
  };

  // Rounded box: an extruded rounded rectangle (w x h, depth d, radius r).
  KT.roundBox = function (w, h, d, r) {
    const s = new T.Shape();
    const x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
    s.moveTo(x, y - r);
    s.lineTo(x + ww, y - r); s.quadraticCurveTo(x + ww + r, y - r, x + ww + r, y);
    s.lineTo(x + ww + r, y + hh); s.quadraticCurveTo(x + ww + r, y + hh + r, x + ww, y + hh + r);
    s.lineTo(x, y + hh + r); s.quadraticCurveTo(x - r, y + hh + r, x - r, y + hh);
    s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.9, bevelSegments: 3, curveSegments: 5 });
    g.translate(0, 0, -Math.max(0.001, d - 2 * r) / 2);
    return g;
  };

  // Hip roof with overhang: base w x d at y=0, ridge at height h.
  KT.hipRoofGeometry = function (w, d, h, ridgeFrac) {
    const rf = ridgeFrac === undefined ? 0.35 : ridgeFrac;
    const hw = w / 2, hd = d / 2;
    const long = w >= d;
    const r = (long ? w : d) * rf / 2;
    const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
    const R1 = long ? [-r, h, 0] : [0, h, -r];
    const R2 = long ? [r, h, 0] : [0, h, r];
    let tris;
    if (long) {
      tris = [
        [D, C, R2], [D, R2, R1], // front (+z)
        [B, A, R1], [B, R1, R2], // back
        [C, B, R2], // right
        [A, D, R1] // left
      ];
    } else {
      tris = [
        [C, B, R1], [C, R1, R2], // right
        [A, D, R2], [A, R2, R1], // left
        [D, C, R2], // front
        [B, A, R1] // back
      ];
    }
    const pos = [];
    tris.forEach((t) => t.forEach((p) => pos.push(p[0], p[1], p[2])));
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    g.computeVertexNormals();
    return g;
  };

  // Gable (two-slope) roof along x.
  KT.gableRoofGeometry = function (w, d, h) {
    const hw = w / 2, hd = d / 2;
    const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
    const R1 = [-hw, h, 0], R2 = [hw, h, 0];
    const tris = [[D, C, R2], [D, R2, R1], [B, A, R1], [B, R1, R2]];
    const pos = [];
    tris.forEach((t) => t.forEach((p) => pos.push(p[0], p[1], p[2])));
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    g.computeVertexNormals();
    return g;
  };

  // Triangular gable end (for the decorative Kerala 'mukhappu').
  KT.triangleGeometry = function (w, h, depth) {
    const s = new T.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    return new T.ExtrudeGeometry(s, { depth: depth || 0.1, bevelEnabled: false });
  };

  // ------------------------------------------------------ rigid skinning
  // Converts an animated hierarchy (joint groups with mesh children) into a
  // single SkinnedMesh using vertex colours, so a whole character or animal
  // renders in one draw call. The joint groups stay in place and keep
  // driving the animation exactly as before.
  KT.skinMaterial = null;
  KT.skinify = function (root) {
    if (!KT.skinMaterial) {
      KT.skinMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.05, side: T.DoubleSide });
    }
    const rootJoint = new T.Group();
    root.add(rootJoint);
    root.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(root.matrixWorld).invert();
    const joints = [rootJoint];
    const jointIndex = new Map([[rootJoint, 0]]);
    const meshes = [];
    root.traverse((o) => {
      if (o.isMesh) { meshes.push(o); return; }
      if (o !== root && o !== rootJoint) { jointIndex.set(o, joints.length); joints.push(o); }
    });
    let vCount = 0, iCount = 0;
    meshes.forEach((m) => {
      vCount += m.geometry.attributes.position.count;
      iCount += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
    });
    const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), col = new Float32Array(vCount * 3);
    const sIdx = new Uint16Array(vCount * 4), sW = new Float32Array(vCount * 4);
    const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
    const mm = new T.Matrix4(), nm = new T.Matrix3();
    let vo = 0, io = 0;
    meshes.forEach((m) => {
      let j = m.parent, bi = 0;
      while (j && j !== root) { if (jointIndex.has(j)) { bi = jointIndex.get(j); break; } j = j.parent; }
      mm.multiplyMatrices(inv, m.matrixWorld);
      nm.getNormalMatrix(mm);
      const g = m.geometry;
      if (!g.attributes.normal) g.computeVertexNormals();
      const P = g.attributes.position, N = g.attributes.normal;
      const c = (Array.isArray(m.material) ? m.material[0] : m.material).color || new T.Color(1, 1, 1);
      for (let i = 0; i < P.count; i++) {
        _v.fromBufferAttribute(P, i).applyMatrix4(mm);
        _n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        const k = vo + i;
        pos[k * 3] = _v.x; pos[k * 3 + 1] = _v.y; pos[k * 3 + 2] = _v.z;
        nor[k * 3] = _n.x; nor[k * 3 + 1] = _n.y; nor[k * 3 + 2] = _n.z;
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
        sIdx[k * 4] = bi; sW[k * 4] = 1;
      }
      if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo; io += g.index.count; }
      else { for (let i = 0; i < P.count; i++) idx[io + i] = i + vo; io += P.count; }
      vo += P.count;
      m.parent.remove(m);
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(sIdx, 4));
    geo.setAttribute('skinWeight', new T.BufferAttribute(sW, 4));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    geo.boundingSphere.radius *= 1.4; // room for animated poses
    const sm = new T.SkinnedMesh(geo, KT.skinMaterial);
    sm.castShadow = true;
    sm.receiveShadow = true;
    root.add(sm);
    root.updateMatrixWorld(true);
    sm.bind(new T.Skeleton(joints));
    root.userData.skinned = sm;
    return root;
  };

  // --------------------------------------------------------- instancing
  // Collects transforms for baked prototypes and emits InstancedMeshes.
  KT.Instancer = function () {
    this.protos = {};
    this.lists = {};
  };
  // builder: detailed prototype. opts.low: cheap prototype used beyond
  // opts.lodDist; opts.maxDist: chunks further than this are not drawn.
  KT.Instancer.prototype.define = function (key, builder, opts) {
    this.protos[key] = builder;
    this.lists[key] = [];
    this.lod = this.lod || {};
    this.lod[key] = opts || {};
  };
  KT.Instancer.prototype.add = function (key, x, y, z, ry, s, sy) {
    const m = new T.Matrix4();
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ry || 0);
    const sc = s || 1;
    m.compose(new T.Vector3(x, y, z), q, new T.Vector3(sc, sy || sc, sc));
    this.lists[key].push(m);
    return m;
  };
  // Instances are split into spatial chunks so off-screen vegetation is
  // frustum-culled instead of always being drawn.
  KT.Instancer.prototype.build = function (scene, opts) {
    opts = opts || {};
    const CH = opts.chunk || 160;
    const meshes = [];
    const v = new T.Vector3();
    Object.keys(this.lists).forEach((key) => {
      const list = this.lists[key];
      if (!list.length) return;
      const chunks = new Map();
      list.forEach((m) => {
        v.setFromMatrixPosition(m);
        const k = Math.floor(v.x / CH) + ',' + Math.floor(v.z / CH);
        if (!chunks.has(k)) chunks.set(k, []);
        chunks.get(k).push(m);
      });
      const lod = (this.lod && this.lod[key]) || {};
      const records = new Map();
      chunks.forEach((mats, ck) => records.set(ck, { key, high: [], low: [], maxDist: lod.maxDist || 1e9, lodDist: lod.lodDist || 0 }));
      this.chunks = this.chunks || [];
      records.forEach((r) => this.chunks.push(r));
      const variants = [['high', this.protos[key]()]];
      if (lod.low) variants.push(['low', lod.low()]);
      variants.forEach(([level, proto]) => proto.children.forEach((child) => {
        if (!child.isMesh) return;
        if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
        const pr = child.geometry.boundingSphere.radius + child.geometry.boundingSphere.center.length();
        chunks.forEach((mats, ck) => {
          const geo = child.geometry.clone();
          const im = new T.InstancedMesh(geo, child.material, mats.length);
          const box = new T.Box3();
          let maxS = 1;
          mats.forEach((m, i) => {
            im.setMatrixAt(i, m);
            box.expandByPoint(v.setFromMatrixPosition(m));
            maxS = Math.max(maxS, m.getMaxScaleOnAxis());
          });
          im.instanceMatrix.needsUpdate = true;
          // bounding sphere covering every instance in this chunk
          const sphere = new T.Sphere();
          box.getBoundingSphere(sphere);
          sphere.radius += pr * maxS;
          geo.boundingSphere = sphere;
          im.castShadow = child.castShadow && !(opts.noShadow && opts.noShadow[key]);
          im.receiveShadow = true;
          im.name = key;
          scene.add(im);
          meshes.push(im);
          const rec = records.get(ck);
          rec[level].push(im);
          rec.center = sphere.center;
          rec.radius = sphere.radius;
          if (level === 'low') im.visible = false;
        });
      }));
    });
    return meshes;
  };

  // Show the right level of detail for each chunk based on camera distance.
  KT.Instancer.prototype.updateLOD = function (camPos) {
    (this.chunks || []).forEach((c) => {
      const d = Math.max(0, Math.hypot(c.center.x - camPos.x, c.center.z - camPos.z) - c.radius * 0.7);
      const visible = d < c.maxDist;
      const useLow = c.low.length > 0 && d > c.lodDist;
      c.high.forEach((m) => { m.visible = visible && !useLow; });
      c.low.forEach((m) => { m.visible = visible && useLow; });
    });
  };

  // Wind sway for foliage materials (vertex shader injection).
  KT.windUniform = { value: 0 };
  KT.addWind = function (material, strength) {
    if (material.userData.wind) return;
    material.userData.wind = true;
    material.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = KT.windUniform;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        '  #ifdef USE_INSTANCING\n  vec3 ip = instanceMatrix[3].xyz;\n  #else\n  vec3 ip = vec3(0.0);\n  #endif\n' +
        '  float sway = max(transformed.y - 1.0, 0.0) * ' + (strength || 0.02).toFixed(3) + ';\n' +
        '  transformed.x += sin(uTime * 1.3 + ip.x * 0.11 + ip.z * 0.07) * sway;\n' +
        '  transformed.z += cos(uTime * 1.1 + ip.z * 0.13) * sway * 0.7;\n'
      );
    };
    material.customProgramCacheKey = function () { return 'wind' + (strength || 0.02); };
  };
})();
