// Geography of the game map: height field, paths, splat map, terrain
// mesh, water, sky, clouds and distant scenery.
// Axes: +x = east, -z = north. Water level is y = 0.
(function () {
  'use strict';
  const T = THREE;
  const Geo = KT.Geo = {};

  Geo.HALF = 400; // playable/textured half size
  Geo.BOUNDS = { minX: -360, maxX: 360, minZ: -360, maxZ: 262 };

  // West shore of the backwater lake (Alleppey promenade runs along it).
  Geo.shoreX = (z) => 24 + 5 * Math.sin(z / 45) + 3 * Math.sin(z / 17 + 1);
  Geo.promenadeX = (z) => Geo.shoreX(z) - 3.6;
  Geo.LAKE = { east: 330, north: -172, south: 172 };
  Geo.ISLANDS = [{ x: 175, z: -10, r: 30 }, { x: 250, z: 95, r: 15 }];

  // Mud / laterite paths (polylines). Promenade is a separate stone ribbon.
  Geo.PATHS = [
    { name: 'village road', w: 3.2, pts: [[16, 40], [-10, 36], [-45, 30], [-90, 40], [-130, 46], [-165, 48], [-205, 52], [-250, 40], [-300, 20]] },
    { name: 'temple road', w: 3.0, pts: [[-45, 30], [-58, -10], [-75, -45], [-105, -70], [-130, -86]] },
    { name: 'church lane', w: 2.4, pts: [[-58, -10], [-35, -40], [-15, -70], [-15, -85]] },
    { name: 'palace road', w: 2.8, pts: [[-105, -70], [-95, -120], [-80, -165], [-60, -205], [-45, -245], [-35, -280], [-30, -300]] },
    { name: 'north trail', w: 2.8, pts: [[Geo.promenadeX(-168), -168], [5, -190], [-25, -215], [-45, -245]] },
    { name: 'palace lane', w: 2.4, pts: [[-60, -205], [-10, -225], [40, -238], [80, -255]] },
    { name: 'beach road', w: 3.0, pts: [[-45, 30], [-38, 80], [-25, 130], [0, 175], [30, 205], [50, 222]] },
    { name: 'south promenade link', w: 3.0, pts: [[Geo.promenadeX(168), 168], [22, 190], [30, 205]] },
    { name: 'beach walk', w: 2.6, pts: [[-150, 222], [-60, 224], [50, 222], [100, 228], [112, 236]] },
    { name: 'coir village path', w: 2.4, pts: [[-205, 52], [-225, 90], [-255, 110], [-285, 80], [-290, 30], [-270, -20], [-240, -40], [-215, 0], [-205, 52]] }
  ];
  Geo.PROMENADE_Z = [-170, 170];

  // Building sites flatten the ground. raise lifts the plateau.
  Geo.FLATS = [];
  Geo.addFlat = function (x, z, r, raise) { Geo.FLATS.push({ x, z, r, raise: raise || 0 }); };

  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz;
    let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - px, ez = az + dz * t - pz;
    return Math.sqrt(ex * ex + ez * ez);
  }
  Geo.pathDistance = function (x, z) {
    let best = 1e9, w = 3;
    for (let p = 0; p < Geo.PATHS.length; p++) {
      const pts = Geo.PATHS[p].pts;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = segDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (d < best) { best = d; w = Geo.PATHS[p].w; }
      }
    }
    return { d: best, w: w };
  };
  Geo.promenadeDistance = function (x, z) {
    if (z < Geo.PROMENADE_Z[0] - 2 || z > Geo.PROMENADE_Z[1] + 2) return 1e9;
    return Math.abs(x - Geo.promenadeX(z));
  };

  // Signed "inside lake" distance (positive = in water).
  Geo.lakeInside = function (x, z) {
    let d = Math.min(x - Geo.shoreX(z), Geo.LAKE.east - x, z - Geo.LAKE.north, Geo.LAKE.south - z);
    for (let i = 0; i < Geo.ISLANDS.length; i++) {
      const is = Geo.ISLANDS[i];
      const r = is.r + KT.noise(x * 0.08, z * 0.08) * 4;
      d = Math.min(d, Math.hypot(x - is.x, z - is.z) - r);
    }
    return d;
  };

  // Raw terrain height.
  Geo.height = function (x, z) {
    let h = 1.1 + KT.fbm(x * 0.012, z * 0.012, 3) * 1.6;
    // gentle swells inland
    h += Math.max(0, KT.fbm(x * 0.006 + 7, z * 0.006 - 3, 3)) * 5 * KT.smoothstep(-20, -120, x);
    // Krishnapuram Palace grounds to the north: a low rise among the palms
    const hill = KT.smoothstep(-170, -330, z);
    if (hill > 0) h += hill * (2.5 + 2 * KT.fbm(x * 0.01 + 3, z * 0.01, 4));
    // coconut groves and the coir village to the west
    const fw = KT.smoothstep(-160, -340, x);
    if (fw > 0) h += fw * (0.8 + 1.2 * Math.max(0, KT.fbm(x * 0.015, z * 0.015, 3)));
    // far Western Ghats, only to the east beyond the lake (outside play area)
    const far = Math.max(x - 380, 0);
    if (far > 0) h += KT.smoothstep(0, 400, far) * (90 + 70 * KT.fbm(x * 0.004, z * 0.004, 4)) * (z > 240 ? 0 : 1);
    // building plateaus
    for (let i = 0; i < Geo.FLATS.length; i++) {
      const f = Geo.FLATS[i];
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r + 10) {
        const t = 1 - KT.smoothstep(f.r, f.r + 10, d);
        if (f.h === undefined) f.h = null;
        const target = f.base + f.raise;
        h = KT.lerp(h, target, t);
      }
    }
    // paths: slightly sunk & smoothed
    // backwater lake
    const li = Geo.lakeInside(x, z);
    if (li > -2) {
      const t = KT.smoothstep(-1.5, 9, li);
      h = KT.lerp(Math.min(h, 1.0), -3.6 + KT.noise(x * 0.05, z * 0.05) * 0.6, t);
    }
    // the dune the Alappuzha lighthouse stands on
    const hd = Math.hypot(x - 118, z - 244);
    if (hd < 30) h += (1 - KT.smoothstep(6, 30, hd)) * 5.5;
    // beach and Arabian sea to the south
    const beach = KT.smoothstep(196, 222, z);
    if (beach > 0) {
      h = KT.lerp(h, 0.7 - (z - 222) * 0.02, beach * (hd < 30 ? 1 - KT.smoothstep(26, 8, hd) : 1));
      const sea = KT.smoothstep(232, 290, z);
      h = KT.lerp(h, -7, sea);
    }
    return h;
  };

  Geo.prepareFlats = function () {
    // evaluate the base height of each plateau before flattening
    const flats = Geo.FLATS;
    Geo.FLATS = [];
    flats.forEach((f) => { f.base = Geo.height(f.x, f.z); });
    Geo.FLATS = flats;
  };

  // Splat map (R mud, G sand, B tea rows, A paddy) + minimap colours.
  Geo.buildSplat = function (N) {
    const size = Geo.HALF * 2;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');
    const img = g.createImageData(N, N);
    const map = document.createElement('canvas');
    map.width = map.height = N;
    const mg = map.getContext('2d');
    const mimg = mg.createImageData(N, N);
    const heights = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      const z = -Geo.HALF + (j + 0.5) * size / N;
      for (let i = 0; i < N; i++) {
        const x = -Geo.HALF + (i + 0.5) * size / N;
        const h = Geo.height(x, z);
        heights[j * N + i] = h;
        const pd = Geo.pathDistance(x, z);
        let mud = 1 - KT.smoothstep(pd.w * 0.5, pd.w * 0.5 + 1.4, pd.d + KT.noise(x * 0.3, z * 0.3) * 0.6);
        const li = Geo.lakeInside(x, z);
        let sand = 0;
        if (z > 190) sand = KT.smoothstep(190, 206, z);
        if (li > -4 && h < 1.2) sand = Math.max(sand, (1 - KT.smoothstep(0.2, 1.1, h)) * 0.8);
        if (h < 0.15) sand = Math.max(sand, 0.6);
        const tea = 0; // (no tea estates in Alappuzha)
        let paddy = 0;
        if (x > -112 && x < -62 && z > 62 && z < 134) paddy = 1;
        const k = (j * N + i) * 4;
        img.data[k] = mud * 255; img.data[k + 1] = sand * 255; img.data[k + 2] = tea * 255; img.data[k + 3] = 255 - paddy * 255;
        // minimap colour
        let r, gg, b;
        if (h < 0) {
          const d = KT.clamp(-h / 4, 0, 1);
          r = 70 - d * 30; gg = 170 - d * 50; b = 200 - d * 30;
        } else {
          const lit = KT.clamp(0.85 + h * 0.006, 0.7, 1.15);
          r = (88 + h * 0.8) * lit; gg = (150 + h * 0.6) * lit; b = 70 * lit;
          if (tea > 0.5) { r = 70; gg = 135; b = 55; }
          if (paddy) { r = 150; gg = 190; b = 80; }
          r = KT.lerp(r, 232, sand); gg = KT.lerp(gg, 214, sand); b = KT.lerp(b, 168, sand);
          r = KT.lerp(r, 196, mud); gg = KT.lerp(gg, 160, mud); b = KT.lerp(b, 112, mud);
          if (Geo.promenadeDistance(x, z) < 2.6) { r = 215; gg = 205; b = 185; }
        }
        mimg.data[k] = r; mimg.data[k + 1] = gg; mimg.data[k + 2] = b; mimg.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    mg.putImageData(mimg, 0, 0);
    Geo.splatCanvas = c;
    Geo.mapCanvas = map;
    Geo.mapSize = N;
    return c;
  };

  function axisCoords(half, step, outer, outerStep) {
    const a = [];
    for (let x = -outer; x < -half; x += outerStep) a.push(x);
    for (let x = -half; x <= half + 0.001; x += step) a.push(x);
    for (let x = half + outerStep; x <= outer + 0.001; x += outerStep) a.push(x);
    return a;
  }

  Geo.buildTerrain = function (quality) {
    const step = quality === 'low' ? 4 : 3;
    const xs = axisCoords(Geo.HALF, step, 1300, 30);
    const nx = xs.length;
    const pos = new Float32Array(nx * nx * 3);
    for (let j = 0; j < nx; j++) {
      for (let i = 0; i < nx; i++) {
        const k = (j * nx + i) * 3;
        const x = xs[i], z = xs[j];
        pos[k] = x; pos[k + 1] = Geo.height(x, z); pos[k + 2] = z;
      }
    }
    const idx = new Uint32Array((nx - 1) * (nx - 1) * 6);
    let o = 0;
    for (let j = 0; j < nx - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        idx[o++] = a; idx[o++] = c; idx[o++] = b;
        idx[o++] = b; idx[o++] = c; idx[o++] = d;
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const splat = new T.CanvasTexture(Geo.splatCanvas);
    splat.wrapS = splat.wrapT = T.ClampToEdgeWrapping;
    const mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
    const uniforms = {
      tGrass: { value: KT.tex('grass', 1, 1, true) },
      tSand: { value: KT.tex('sand', 1, 1, true) },
      tMud: { value: KT.tex('mud', 1, 1, true) },
      tTea: { value: KT.tex('tea_rows', 1, 1, true) },
      tSplat: { value: splat },
      uHalf: { value: Geo.HALF }
    };
    mat.onBeforeCompile = function (shader) {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWNor;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n vWNor = normal;'
      );
      shader.fragmentShader = [
        'uniform sampler2D tGrass, tSand, tMud, tTea, tSplat;',
        'uniform float uHalf;',
        'varying vec3 vWPos;',
        'varying vec3 vWNor;',
        'vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }'
      ].join('\n') + '\n' + shader.fragmentShader.replace(
        '#include <map_fragment>',
        [
          'vec2 suv = vec2((vWPos.x + uHalf) / (2.0 * uHalf), 1.0 - (vWPos.z + uHalf) / (2.0 * uHalf));',
          'vec4 sp = texture2D(tSplat, suv);',
          'float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);',
          'sp = mix(vec4(0.0, 0.0, 0.0, 1.0), sp, inside);',
          'vec2 tuv = vWPos.xz * 0.16;',
          'float big = texture2D(tGrass, vWPos.xz * 0.0045).g;',
          'vec3 grass = lin(texture2D(tGrass, tuv).rgb) * mix(0.75, 1.25, big);',
          // a second, rotated sample hides the tiling; fine detail up close
          'grass = mix(grass, lin(texture2D(tGrass, mat2(0.8, -0.6, 0.6, 0.8) * tuv * 0.41 + 0.37).rgb) * mix(0.75, 1.25, big), 0.45);',
          'grass *= mix(0.86, 1.14, texture2D(tGrass, tuv * 3.7).g);',
          'grass = mix(grass, grass * vec3(1.08, 0.95, 0.7), smoothstep(0.55, 0.8, texture2D(tMud, vWPos.xz * 0.003).r));',
          'vec3 sand = lin(texture2D(tSand, tuv * 0.8).rgb);',
          'vec3 mud = lin(texture2D(tMud, tuv * 0.9).rgb);',
          'vec3 tea = lin(texture2D(tTea, vec2(vWPos.x * 0.05, vWPos.y * 0.9 + vWPos.z * 0.02)).rgb);',
          'vec3 paddy = lin(texture2D(tTea, vec2(vWPos.x * 0.06, vWPos.z * 0.08)).rgb) * vec3(1.35, 1.35, 0.9);',
          // worn patches of bare earth
          'grass = mix(grass, mud * 1.1, smoothstep(0.62, 0.76, texture2D(tMud, vWPos.xz * 0.011 + 0.3).r) * 0.45);',
          'vec3 col = grass;',
          'col = mix(col, tea, sp.b);',
          'col = mix(col, paddy, 1.0 - sp.a);',
          'col = mix(col, sand, sp.g);',
          'col = mix(col, mud, sp.r);',
          'float slope = 1.0 - normalize(vWNor).y;',
          'vec3 rock = vec3(0.32, 0.29, 0.25) * mix(0.8, 1.2, big);',
          'col = mix(col, rock, smoothstep(0.3, 0.55, slope) * (1.0 - sp.r));',
          'col *= mix(0.55, 1.0, smoothstep(-0.6, 0.5, vWPos.y));',
          'col = mix(col, vec3(0.05, 0.1, 0.08), smoothstep(-0.5, -3.0, vWPos.y) * 0.6);',
          'diffuseColor.rgb *= col;'
        ].join('\n')
      );
    };
    const mesh = new T.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
  };

  // ------------------------------------------------------------------ water
  Geo.waterUniforms = null;
  Geo.buildWater = function (sunDir) {
    const group = new T.Group();
    const uniforms = T.UniformsUtils.merge([T.UniformsLib.fog, {
      uTime: { value: 0 },
      tNormal: { value: null },
      uSunDir: { value: sunDir.clone() },
      uDeep: { value: new T.Color(0x0f4f5f) },
      uShallow: { value: new T.Color(0x3fa7a0) },
      uSkyHorizon: { value: new T.Color(0xcfe6f2) },
      uSkyZenith: { value: new T.Color(0x3f8fd8) },
      uSunColor: { value: new T.Color(0xfff0d0) }
    }]);
    uniforms.tNormal.value = KT.tex('water_normal', 1, 1, true);
    Geo.waterUniforms = uniforms;
    const vs = [
      'attribute float depth;',
      'uniform float uTime;',
      'varying vec3 vWPos;',
      'varying float vDepth;',
      '#include <fog_pars_vertex>',
      'void main() {',
      '  vec3 p = position;',
      '  vec4 wp = modelMatrix * vec4(p, 1.0);',
      '  float amp = clamp(depth * 0.04, 0.0, 0.08);',
      '  wp.y += (sin(wp.x * 0.15 + uTime * 1.3) + cos(wp.z * 0.12 + uTime * 1.1)) * amp;',
      '  vWPos = wp.xyz;',
      '  vDepth = depth;',
      '  vec4 mvPosition = viewMatrix * wp;',
      '  gl_Position = projectionMatrix * mvPosition;',
      '  #include <fog_vertex>',
      '}'
    ].join('\n');
    const fs = [
      'uniform float uTime;',
      'uniform sampler2D tNormal;',
      'uniform vec3 uSunDir, uDeep, uShallow, uSkyHorizon, uSkyZenith, uSunColor;',
      'varying vec3 vWPos;',
      'varying float vDepth;',
      '#include <common>',
      '#include <fog_pars_fragment>',
      'void main() {',
      '  vec2 uv = vWPos.xz;',
      '  vec3 n1 = texture2D(tNormal, uv * 0.035 + uTime * vec2(0.011, 0.007)).rgb * 2.0 - 1.0;',
      '  vec3 n2 = texture2D(tNormal, uv * 0.09 - uTime * vec2(0.009, 0.014)).rgb * 2.0 - 1.0;',
      '  vec3 n3 = texture2D(tNormal, uv * 0.006 + uTime * vec2(0.002, -0.001)).rgb * 2.0 - 1.0;',
      '  vec2 nn = (n1.xy + n2.xy) * 0.5 + n3.xy * 0.6;',
      '  vec3 N = normalize(vec3(nn.x * 0.55, 1.0, nn.y * 0.55));',
      '  vec3 V = normalize(cameraPosition - vWPos);',
      '  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
      '  float dfac = smoothstep(0.0, 3.2, vDepth);',
      '  vec3 base = mix(uShallow, uDeep, dfac);',
      '  vec3 R = reflect(-V, N);',
      '  vec3 sky = mix(uSkyHorizon, uSkyZenith, clamp(R.y * 1.6, 0.0, 1.0));',
      '  vec3 col = mix(base, sky, clamp(fres * 0.85, 0.0, 0.85));',
      '  float spec = pow(max(dot(R, normalize(uSunDir)), 0.0), 180.0);',
      '  col += uSunColor * spec * 2.5;',
      '  float shore = 1.0 - smoothstep(0.0, 0.7, vDepth);',
      '  float foamN = texture2D(tNormal, uv * 0.25 + vec2(uTime * 0.03, 0.0)).r;',
      '  float foam = shore * smoothstep(0.45, 0.7, foamN + 0.25 * sin(uTime * 1.5 + vWPos.x * 0.4 + vWPos.z * 0.3));',
      '  col = mix(col, vec3(0.92, 0.96, 0.95), foam * 0.7);',
      '  float alpha = mix(0.55, 0.96, smoothstep(0.0, 1.6, vDepth));',
      '  gl_FragColor = vec4(col, alpha);',
      '  #include <tonemapping_fragment>',
      '  #include <encodings_fragment>',
      '  #include <fog_fragment>',
      '}'
    ].join('\n');
    const mat = new T.ShaderMaterial({ uniforms, vertexShader: vs, fragmentShader: fs, transparent: true, fog: true, depthWrite: false });
    // detailed water over the play area
    const S = Geo.HALF * 2 + 40, seg = 210;
    const geo = new T.PlaneGeometry(S, S, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position;
    const depth = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) depth[i] = Math.max(0, -Geo.height(P.getX(i), P.getZ(i)));
    geo.setAttribute('depth', new T.BufferAttribute(depth, 1));
    const inner = new T.Mesh(geo, mat);
    inner.renderOrder = 1;
    group.add(inner);
    // the open sea beyond
    const og = new T.PlaneGeometry(6000, 6000, 1, 1);
    og.rotateX(-Math.PI / 2);
    og.setAttribute('depth', new T.BufferAttribute(new Float32Array([10, 10, 10, 10]), 1));
    const outer = new T.Mesh(og, mat);
    outer.position.y = -0.25;
    outer.renderOrder = 0;
    group.add(outer);
    return group;
  };

  // -------------------------------------------------------------------- sky
  Geo.buildSky = function (sunDir) {
    const geo = new T.SphereGeometry(4000, 32, 16);
    const mat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uSunDir: { value: sunDir.clone().normalize() },
        uTop: { value: new T.Color(0x2f7fd0) },
        uHorizon: { value: new T.Color(0xd2e8f2) },
        uBottom: { value: new T.Color(0xbcd8e6) }
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: [
        'uniform vec3 uSunDir, uTop, uHorizon, uBottom;',
        'varying vec3 vDir;',
        'void main(){',
        '  vec3 d = normalize(vDir);',
        '  float h = d.y;',
        '  vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55));',
        '  col = mix(col, uBottom, clamp(-h * 4.0, 0.0, 1.0));',
        '  float sd = max(dot(d, uSunDir), 0.0);',
        '  col += vec3(1.0, 0.85, 0.6) * pow(sd, 8.0) * 0.35;',
        '  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9997, sd) * 3.0;',
        '  gl_FragColor = vec4(col, 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <encodings_fragment>',
        '}'
      ].join('\n')
    });
    const sky = new T.Mesh(geo, mat);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    return sky;
  };

  // Fluffy, hand-painted cumulus clouds: white sunlit tops and soft
  // blue-grey undersides, a few shapes drawn once and shared.
  function cloudTexture(seed) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const rng = KT.makeRng(seed);
    const puffs = [];
    const n = 9 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = 70 + t * 372 + (rng() - 0.5) * 30;
      const r = 34 + Math.sin(t * Math.PI) * (52 + rng() * 30) + rng() * 10;
      puffs.push({ x, y: 196 - r * (0.75 + rng() * 0.2), r });
    }
    // soft shadowed base, then the lit puffs, then highlights
    g.filter = 'blur(6px)';
    g.fillStyle = 'rgba(176, 190, 214, 0.95)';
    puffs.forEach((p) => { g.beginPath(); g.arc(p.x, p.y + p.r * 0.18, p.r, 0, Math.PI * 2); g.fill(); });
    g.fillRect(60, 170, 392, 34);
    g.filter = 'blur(3px)';
    puffs.forEach((p) => {
      const gr = g.createRadialGradient(p.x - p.r * 0.25, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
      gr.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gr.addColorStop(0.65, 'rgba(250, 251, 255, 0.98)');
      gr.addColorStop(1, 'rgba(214, 224, 240, 0.0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(p.x, p.y - p.r * 0.06, p.r * 0.92, 0, Math.PI * 2); g.fill();
    });
    g.filter = 'none';
    // flatten the bottom like a fair-weather cumulus
    const fade = g.createLinearGradient(0, 196, 0, 230);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = fade; g.fillRect(0, 196, 512, 60);
    g.globalCompositeOperation = 'source-over';
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    return tex;
  }
  Geo.buildClouds = function () {
    const group = new T.Group();
    const texs = [11, 23, 37, 41, 59].map(cloudTexture);
    const rng = KT.makeRng(99);
    for (let i = 0; i < 52; i++) {
      const mat = new T.SpriteMaterial({ map: texs[i % texs.length], transparent: true, depthWrite: false, fog: false, opacity: 0.9 + rng() * 0.1 });
      const s = new T.Sprite(mat);
      // a ring of clouds all round, high overhead and banked on the horizon
      const a = rng() * Math.PI * 2, r = 380 + rng() * 2000;
      s.position.set(Math.cos(a) * r, 200 + rng() * 220 + r * 0.04, Math.sin(a) * r);
      const sc = 220 + rng() * 300 + r * 0.12;
      s.scale.set(sc, sc * 0.5, 1);
      group.add(s);
    }
    group.userData.drift = true;
    return group;
  };
})();
