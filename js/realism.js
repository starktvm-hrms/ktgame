// "Realistic" look: physically based light with deep, soft shade and a
// camera-like finish. After the scene is drawn into an off-screen buffer,
//  - ambient occlusion darkens corners, the ground under cars and flyovers,
//    the gaps between buildings and the creases of every model (from the
//    depth buffer: no extra geometry needed),
//  - bloom lets the sun's glints, lamps, headlights and neon bleed light,
//  - a colour grade warms the light, cools the shade, adds a gentle
//    contrast curve and a vignette, like a film camera.
// Then three.js's own tone mapping and sRGB output run as usual.
// Medium quality skips the bloom; low quality skips the whole pass.
(function () {
  'use strict';
  const T = THREE;
  const Real = KT.Real = { active: false, enabled: false, ao: 1, bloom: 0.55, grade: 1, night: 0 };

  // the lighting tweaks are made before the shaders compile
  Real.patchShaders = function () {
    Real.enabled = true;
    KT.Toon.exposure = 0.8; // keep sunlit white walls from burning out
    const S = T.ShaderChunk;
    // a touch more contrast between sun and shade: soften the flat
    // hemisphere fill where the surface faces away from the sky
    S.lights_fragment_end = S.lights_fragment_end +
      '\nreflectedLight.indirectDiffuse *= mix( 0.72, 1.0, saturate( 0.5 + 0.5 * dot( normal, ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ) ) );\n';
  };


  // ------------------------------------------------ photo surface detail
  // Normal maps (the bumps of every brick, tile, crack and trowel mark) and
  // roughness maps (where a surface is dull or polished) from Poly Haven's
  // CC0 photo scans, laid on the shared materials. Each one matches the
  // colour photo the material already uses, so the bumps line up with it.
  const pbrCache = {};
  Real.pbr = function (name, kind) {
    const key = name + '_' + kind;
    if (pbrCache[key]) return pbrCache[key];
    const t = new T.TextureLoader().load('assets/textures/pbr/' + key + '.jpg');
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = KT.maxAnisotropy;
    pbrCache[key] = t;
    return t;
  };
  // give a material a scan's normal map (and its roughness, from the green
  // channel of the AO/roughness/metal map)
  Real.surface = function (m, name, normal, rough) {
    if (!Real.enabled || !m || m.userData.pbr) return m;
    m.userData.pbr = name;
    m.normalMap = Real.pbr(name, 'nor');
    const k = normal === undefined ? 1 : normal;
    m.normalScale = new T.Vector2(k, k);
    if (rough !== false) { m.roughnessMap = Real.pbr(name, 'arm'); m.roughness = 1; }
    m.needsUpdate = true;
    return m;
  };
  Real.enhanceMaterials = function () {
    if (!Real.enabled) return;
    const M = KT.M;
    ['plaster', 'plasterCream'].forEach((k) => Real.surface(M[k], 'painted_plaster_wall', 0.9));
    ['roof', 'roofGreen'].forEach((k) => Real.surface(M[k], 'clay_roof_tiles_02', 1));
    Real.surface(M.laterite, 'red_laterite_soil_stones', 1.2);
  };

  let rt = null, aoRT = null, bA = null, bB = null;
  let qScene = null, qCam = null, quad = null;
  let aoMat = null, brightMat = null, blurMat = null, compMat = null;
  let useBloom = true;

  const vert = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';

  // Ambient occlusion (a small screen-space "SAO"): for each pixel, look at
  // a spiral of nearby depths and count how much of the hemisphere above the
  // surface they block. Runs at half resolution.
  const aoFrag = [
    '#include <packing>',
    'uniform sampler2D tDepth; uniform vec2 size; uniform float cameraNear; uniform float cameraFar;',
    'uniform mat4 projInv; uniform float radius; uniform float projScale;',
    'varying vec2 vUv;',
    'vec3 viewPos( vec2 uv ) {',
    '  float d = texture2D( tDepth, uv ).x;',
    '  vec4 p = projInv * vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 );',
    '  return p.xyz / p.w;',
    '}',
    'float hash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }',
    'void main() {',
    '  float d = texture2D( tDepth, vUv ).x;',
    '  if ( d >= 0.9999 ) { gl_FragColor = vec4( 1.0 ); return; }',
    '  vec3 P = viewPos( vUv );',
    '  vec3 N = normalize( cross( dFdx( P ), dFdy( P ) ) );',
    '  float dist = -P.z;',
    // the sample disc: about `radius` metres across, in screen pixels
    '  float rPix = radius * projScale / dist;',
    '  if ( rPix < 1.5 ) { gl_FragColor = vec4( 1.0 ); return; }',
    '  rPix = min( rPix, 90.0 );',
    '  vec2 cell = mod( floor( gl_FragCoord.xy ), 4.0 );',
    '  float a0 = ( cell.x * 4.0 + cell.y ) / 16.0 * 6.2832 + hash( floor( gl_FragCoord.xy / 4.0 ) ) * 0.4;',
    '  float occ = 0.0;',
    '  const int N_S = 14;',
    '  for ( int i = 0; i < N_S; i ++ ) {',
    '    float f = ( float( i ) + 0.5 ) / float( N_S );',
    '    float ang = a0 + f * 6.2832 * 3.0;',
    '    vec2 off = vec2( cos( ang ), sin( ang ) ) * rPix * f / size;',
    '    vec3 Q = viewPos( vUv + off );',
    '    vec3 v = Q - P;',
    '    float vv = dot( v, v );',
    '    float vn = dot( v, N );',
    '    float fall = max( 0.0, 1.0 - vv / ( radius * radius ) );',
    '    occ += max( 0.0, vn / sqrt( vv + 0.0001 ) - 0.16 ) * fall;',
    '  }',
    '  occ = occ / float( N_S );',
    '  float ao = clamp( 1.0 - 3.6 * occ, 0.0, 1.0 );',
    '  ao = ao * ao;',
    // fade out far away, where the depth gets coarse
    '  ao = mix( ao, 1.0, smoothstep( 90.0, 260.0, dist ) );',
    '  gl_FragColor = vec4( ao, ao, ao, 1.0 );',
    '}'
  ].join('\n');

  // bloom: keep only what is brighter than white, then blur it
  const brightFrag = [
    'uniform sampler2D tColor; uniform float threshold;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 c = texture2D( tColor, vUv ).rgb;',
    '  float l = max( c.r, max( c.g, c.b ) );',
    '  float k = smoothstep( threshold, threshold * 2.2, l );',
    '  gl_FragColor = vec4( min( c * k, vec3( 8.0 ) ), 1.0 );',
    '}'
  ].join('\n');
  const blurFrag = [
    'uniform sampler2D tIn; uniform vec2 dir;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 s = texture2D( tIn, vUv ).rgb * 0.227;',
    '  s += texture2D( tIn, vUv + dir * 1.385 ).rgb * 0.316;',
    '  s += texture2D( tIn, vUv - dir * 1.385 ).rgb * 0.316;',
    '  s += texture2D( tIn, vUv + dir * 3.231 ).rgb * 0.070;',
    '  s += texture2D( tIn, vUv - dir * 3.231 ).rgb * 0.070;',
    '  gl_FragColor = vec4( s, 1.0 );',
    '}'
  ].join('\n');

  const compFrag = [
    'uniform sampler2D tColor; uniform sampler2D tAO; uniform sampler2D tBloom;',
    'uniform vec2 aoTexel; uniform float aoAmt; uniform float bloomAmt; uniform float grade; uniform float night; uniform float debug;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 c = texture2D( tColor, vUv ).rgb;',
    // a soft 3x3 blur of the half-resolution occlusion
    '  float ao = 0.0;',
    '  for ( int y = -1; y <= 1; y ++ ) for ( int x = -1; x <= 1; x ++ ) ao += texture2D( tAO, vUv + vec2( float( x ), float( y ) ) * aoTexel ).r;',
    '  ao /= 9.0;',
    '  c *= mix( 1.0, ao, aoAmt );',
    '  if ( debug > 0.5 ) c = vec3( ao );',
    '  c += texture2D( tBloom, vUv ).rgb * bloomAmt;',
    // grade: warm light, cool shade, a touch more colour
    '  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );',
    '  float hi = smoothstep( 0.05, 1.2, l );',
    '  vec3 tint = mix( vec3( 0.96, 0.99, 1.05 ), vec3( 1.05, 1.0, 0.93 ), hi );',
    '  tint = mix( tint, vec3( 0.92, 0.97, 1.08 ), night );',
    '  c = mix( vec3( l ), c, 1.0 + 0.1 * grade ) * mix( vec3( 1.0 ), tint, grade );',
    // vignette
    '  vec2 q = vUv - 0.5;',
    '  c *= 1.0 - grade * 0.32 * smoothstep( 0.2, 0.75, dot( q, q ) * 2.0 );',
    '  gl_FragColor = vec4( max( c, 0.0 ), 1.0 );',
    '  #include <tonemapping_fragment>',
    '  #include <encodings_fragment>',
    '}'
  ].join('\n');

  function shader(frag, uniforms, deriv) {
    const m = new T.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false });
    if (deriv) m.extensions = { derivatives: true };
    return m;
  }

  Real.init = function (renderer, opts) {
    if (!Real.enabled) return;
    const gl2 = renderer.capabilities.isWebGL2;
    useBloom = opts.quality === 'high';
    Real.active = true;
    rt = new T.WebGLRenderTarget(4, 4, { type: gl2 ? T.HalfFloatType : T.UnsignedByteType, depthBuffer: true });
    rt.depthTexture = new T.DepthTexture(4, 4);
    rt.depthTexture.type = T.UnsignedIntType;
    if (gl2 && opts.samples) rt.samples = opts.samples;
    aoRT = new T.WebGLRenderTarget(4, 4, { depthBuffer: false });
    const half = { type: gl2 ? T.HalfFloatType : T.UnsignedByteType, depthBuffer: false };
    bA = new T.WebGLRenderTarget(4, 4, half);
    bB = new T.WebGLRenderTarget(4, 4, half);
    qScene = new T.Scene();
    qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    aoMat = shader(aoFrag, {
      tDepth: { value: rt.depthTexture }, size: { value: new T.Vector2() },
      cameraNear: { value: 0.1 }, cameraFar: { value: 6000 }, projInv: { value: new T.Matrix4() },
      radius: { value: 1.6 }, projScale: { value: 500 }
    }, true);
    brightMat = shader(brightFrag, { tColor: { value: rt.texture }, threshold: { value: 1.0 } });
    blurMat = shader(blurFrag, { tIn: { value: null }, dir: { value: new T.Vector2() } });
    compMat = shader(compFrag, {
      tColor: { value: rt.texture }, tAO: { value: aoRT.texture }, tBloom: { value: bA.texture },
      aoTexel: { value: new T.Vector2() }, aoAmt: { value: 1 }, bloomAmt: { value: 0.5 }, grade: { value: 1 }, night: { value: 0 }, debug: { value: 0 }
    });
    quad = new T.Mesh(new T.PlaneGeometry(2, 2), compMat);
    quad.frustumCulled = false;
    qScene.add(quad);
  };

  Real.resize = function (renderer) {
    if (!rt) return;
    const v = renderer.getDrawingBufferSize(new T.Vector2());
    rt.setSize(v.x, v.y);
    const hw = Math.max(1, Math.round(v.x / 2)), hh = Math.max(1, Math.round(v.y / 2));
    aoRT.setSize(hw, hh);
    aoMat.uniforms.size.value.set(hw, hh);
    compMat.uniforms.aoTexel.value.set(1 / hw, 1 / hh);
    const bw = Math.max(1, Math.round(v.x / 4)), bh = Math.max(1, Math.round(v.y / 4));
    bA.setSize(bw, bh); bB.setSize(bw, bh);
  };

  function pass(renderer, mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(qScene, qCam);
  }

  Real.render = function (renderer, scene, camera) {
    if (!rt) { renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    const outdoor = !!scene.fog; // indoor scenes are small: keep the occlusion tight
    // occlusion
    const u = aoMat.uniforms;
    u.projInv.value.copy(camera.projectionMatrixInverse);
    u.cameraNear.value = camera.near; u.cameraFar.value = camera.far;
    // pixels per metre at 1 m distance, at half resolution
    u.projScale.value = aoRT.height / (2 * Math.tan(T.MathUtils.degToRad(camera.fov) / 2));
    u.radius.value = outdoor ? 1.6 : 0.9;
    pass(renderer, aoMat, aoRT);
    // bloom
    const c = compMat.uniforms;
    if (useBloom) {
      brightMat.uniforms.threshold.value = 1.0;
      pass(renderer, brightMat, bA);
      for (let i = 0; i < 2; i++) {
        blurMat.uniforms.tIn.value = bA.texture; blurMat.uniforms.dir.value.set(1 / bA.width, 0);
        pass(renderer, blurMat, bB);
        blurMat.uniforms.tIn.value = bB.texture; blurMat.uniforms.dir.value.set(0, 1 / bA.height);
        pass(renderer, blurMat, bA);
      }
      c.bloomAmt.value = Real.bloom * (1 + 0.8 * Real.night);
    } else c.bloomAmt.value = 0;
    c.aoAmt.value = Real.ao;
    c.grade.value = Real.grade;
    c.night.value = Real.night;
    c.debug.value = Real.debug ? 1 : 0;
    pass(renderer, compMat, null);
    quad.material = compMat;
  };
})();
