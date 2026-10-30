// Cel-shaded "Ghibli" look: soft two-band toon lighting with cool, light
// shade and crisp shadow edges (patched into three.js's lighting chunks for
// every material), a painted, less bumpy finish, and a final pass that draws
// light ink lines along silhouettes and creases and grades the
// colour warmer. "Classic" turns it all off (it needs a reload, because the
// shaders are compiled with it).
(function () {
  'use strict';
  const T = THREE;
  const Toon = KT.Toon = { enabled: false, outlines: false, exposure: 1 };

  // --------------------------------------------------------- lighting
  Toon.patchShaders = function () {
    const S = T.ShaderChunk;
    const rep = (key, a, b) => {
      if (S[key].indexOf(a) < 0) { console.warn('toon: chunk changed', key); return; }
      S[key] = S[key].split(a).join(b);
    };
    // the light falls in two soft bands, and shadow edges are crisp
    S.lights_pars_begin = [
      'float ktToon( float x ) { return smoothstep( 0.0, 0.1, x ) * ( 0.7 + 0.3 * smoothstep( 0.3, 0.8, x ) ); }',
      'float ktShadow( float s ) { return smoothstep( 0.22, 0.72, s ); }',
      S.lights_pars_begin
    ].join('\n');
    ['lights_physical_pars_fragment', 'lights_lambert_pars_fragment'].forEach((k) => rep(k,
      'float dotNL = saturate( dot( geometry.normal, directLight.direction ) );',
      'float dotNL = ktToon( saturate( dot( geometry.normal, directLight.direction ) ) );'));
    rep('lights_fragment_begin',
      '? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;',
      '? ktShadow( getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) ) : 1.0;');
    // soft, small highlights instead of glossy ones
    rep('lights_physical_pars_fragment',
      'reflectedLight.directSpecular += irradiance * BRDF_GGX(',
      'reflectedLight.directSpecular += 0.45 * irradiance * BRDF_GGX(');
    // the shade is light and cool, lit by the blue sky
    S.lights_fragment_end = S.lights_fragment_end + '\nreflectedLight.indirectDiffuse *= vec3( 1.04, 1.08, 1.22 );\n';
    Toon.enabled = true;
    Toon.exposure = 0.85; // a calmer, darker picture than the classic look
  };

  // Hand-painted textures: a Kuwahara filter (the classic "oil paint" image
  // filter) turns photo detail into soft patches of colour, wrapping round
  // the edges so tiling textures stay seamless; then the contrast is eased
  // and the colour lifted a little. Returns a canvas.
  Toon.paint = function (src, radius) {
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
    const r = radius || Math.max(2, Math.round(Math.min(w, h) / 160));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    // summed-area tables over a wrapped, padded copy
    const W = w + 2 * r + 1, H = h + 2 * r + 1, n = W * H;
    const sr = new Float64Array(n), sg = new Float64Array(n), sb = new Float64Array(n), sl = new Float64Array(n), sl2 = new Float64Array(n);
    for (let y = 1; y < H; y++) {
      const yy = ((y - 1 - r) % h + h) % h;
      let ar = 0, ag = 0, ab = 0, al = 0, al2 = 0;
      for (let x = 1; x < W; x++) {
        const xx = ((x - 1 - r) % w + w) % w, k = (yy * w + xx) * 4;
        const R = d[k], Gc = d[k + 1], B = d[k + 2], L = 0.3 * R + 0.59 * Gc + 0.11 * B;
        ar += R; ag += Gc; ab += B; al += L; al2 += L * L;
        const i = y * W + x, u = i - W;
        sr[i] = sr[u] + ar; sg[i] = sg[u] + ag; sb[i] = sb[u] + ab; sl[i] = sl[u] + al; sl2[i] = sl2[u] + al2;
      }
    }
    const box = (t, x0, y0, x1, y1) => t[y1 * W + x1] - t[y0 * W + x1] - t[y1 * W + x0] + t[y0 * W + x0];
    const cnt = (r + 1) * (r + 1);
    let mR = 0, mG = 0, mB = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + r, py = y + r; // position in the padded table (+1 offset in the sums)
        let best = 1e18, br = 0, bg = 0, bb = 0;
        for (let q = 0; q < 4; q++) {
          const x0 = q & 1 ? px : px - r, y0 = q & 2 ? py : py - r;
          const x1 = x0 + r + 1, y1 = y0 + r + 1;
          const L = box(sl, x0, y0, x1, y1) / cnt, v = box(sl2, x0, y0, x1, y1) / cnt - L * L;
          if (v < best) { best = v; br = box(sr, x0, y0, x1, y1) / cnt; bg = box(sg, x0, y0, x1, y1) / cnt; bb = box(sb, x0, y0, x1, y1) / cnt; }
        }
        const k = (y * w + x) * 4;
        d[k] = br; d[k + 1] = bg; d[k + 2] = bb;
        mR += br; mG += bg; mB += bb;
      }
    }
    // ease the contrast towards the average colour, then lift the colour
    const N = w * h;
    mR /= N; mG /= N; mB /= N;
    for (let k = 0; k < d.length; k += 4) {
      let R = mR + (d[k] - mR) * 0.8, Gc = mG + (d[k + 1] - mG) * 0.8, B = mB + (d[k + 2] - mB) * 0.8;
      const L = 0.3 * R + 0.59 * Gc + 0.11 * B;
      d[k] = L + (R - L) * 1.12; d[k + 1] = L + (Gc - L) * 1.12; d[k + 2] = L + (B - L) * 1.12;
    }
    g.putImageData(img, 0, 0);
    return c;
  };

  // A painted finish: flatter surfaces, less mirror shine (materials are
  // tuned once each as they appear).
  const tuned = new WeakSet();
  Toon.tune = function (scene) {
    if (!Toon.enabled) return;
    scene.traverse((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach((m) => {
        if (!m || tuned.has(m)) return;
        tuned.add(m);
        if (m.transparent) return; // water keeps its ripples
        if (m.normalScale) m.normalScale.multiplyScalar(0.35);
        if (m.bumpScale !== undefined && m.bumpMap) m.bumpScale *= 0.3;
        if (m.isMeshStandardMaterial) {
          m.roughness = Math.max(m.roughness, 0.55);
          m.envMapIntensity = (m.envMapIntensity || 1) * 0.6;
        }
      });
    });
  };

  // ------------------------------------------------------ ink and grade
  let rt = null, quad = null, qScene = null, qCam = null;
  const vert = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
  const frag = [
    '#include <packing>',
    'uniform sampler2D tColor; uniform sampler2D tDepth;',
    'uniform vec2 texel; uniform float cameraNear; uniform float cameraFar; uniform float ink;',
    'varying vec2 vUv;',
    'float viewD( vec2 uv ) { return -perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, cameraNear, cameraFar ); }',
    'void main() {',
    '  vec3 c = texture2D( tColor, vUv ).rgb;',
    '  float d = viewD( vUv );',
    '  vec2 o = texel;',
    '  float l = viewD( vUv - vec2( o.x, 0.0 ) ), r = viewD( vUv + vec2( o.x, 0.0 ) );',
    '  float u = viewD( vUv + vec2( 0.0, o.y ) ), b = viewD( vUv - vec2( 0.0, o.y ) );',
    // creases and silhouettes: where the depth bends, not along smooth slopes
    '  float lap = abs( l + r + u + b - 4.0 * d ) / max( d, 0.5 );',
    '  float near = min( min( l, r ), min( u, b ) );',
    '  float sil = ( d - near ) / max( d, 0.5 );',
    '  float e = max( smoothstep( 0.03, 0.10, lap ), smoothstep( 0.06, 0.2, sil ) );',
    '  e *= 1.0 - smoothstep( 220.0, 700.0, min( d, near ) );',
    '  c = mix( c, c * 0.4 + vec3( 0.02, 0.014, 0.01 ), e * ink );', // a light line, tinted by what it outlines
    // a warm, slightly richer grade (in linear light, before tone mapping)
    '  float g = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );',
    '  c = mix( vec3( g ), c, 1.04 ) * vec3( 1.015, 1.0, 0.98 ) * 0.9;',
    '  gl_FragColor = vec4( max( c, 0.0 ), 1.0 );',
    '  #include <tonemapping_fragment>',
    '  #include <encodings_fragment>',
    '}'
  ].join('\n');

  Toon.init = function (renderer, opts) {
    Toon.outlines = Toon.enabled && opts.outlines;
    if (!Toon.outlines) return;
    const gl2 = renderer.capabilities.isWebGL2;
    rt = new T.WebGLRenderTarget(4, 4, {
      type: gl2 ? T.HalfFloatType : T.UnsignedByteType,
      depthBuffer: true
    });
    rt.depthTexture = new T.DepthTexture(4, 4);
    rt.depthTexture.type = T.UnsignedIntType;
    if (gl2 && opts.samples) rt.samples = opts.samples;
    qScene = new T.Scene();
    qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
      uniforms: { tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, texel: { value: new T.Vector2() }, cameraNear: { value: 0.1 }, cameraFar: { value: 6000 }, ink: { value: 0.5 } },
      vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false
    }));
    quad.frustumCulled = false;
    qScene.add(quad);
  };
  Toon.resize = function (renderer) {
    if (!rt) return;
    const v = renderer.getDrawingBufferSize(new T.Vector2());
    rt.setSize(v.x, v.y);
    quad.material.uniforms.texel.value.set(1 / v.x, 1 / v.y);
  };
  Toon.render = function (renderer, scene, camera) {
    if (!rt) { renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    const u = quad.material.uniforms;
    u.cameraNear.value = camera.near; u.cameraFar.value = camera.far;
    renderer.render(qScene, qCam);
  };
})();
