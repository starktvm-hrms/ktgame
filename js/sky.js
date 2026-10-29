// Time of day and weather. The sun follows the player's own clock (sunrise
// about 6:10, sunset about 18:30 as in Kerala), and the weather is the
// real current weather for the district you are in, from Open-Meteo
// (free, no key). Without a connection it falls back to a believable
// simulation (monsoon months are wetter). Drives the sky, sun/moon,
// lights, fog, clouds, stars, rain, lightning and night sounds of both
// outdoor maps, and the daylight through the lighthouse windows.
(function () {
  'use strict';
  const T = THREE;
  const S = KT.Sky = {
    mode: 'live',           // 'live' | 'time' (real time, clear skies) | 'day' (always day, clear)
    night: 0, day: 1,       // 0..1
    cloud: 0.3, rain: 0, fog: 0, storm: 0, flash: 0,
    weather: null,          // last report { code, label, icon, temp, wind, place, simulated }
    hours: 12
  };

  // Where each district is, for the weather lookup.
  const COORDS = {
    tvm: [8.524, 76.937], klm: [8.893, 76.614], pta: [9.265, 76.787], alp: [9.498, 76.339],
    ktm: [9.592, 76.522], idk: [9.850, 76.940], ekm: [9.982, 76.300], tsr: [10.528, 76.214],
    pkd: [10.787, 76.655], mlp: [11.051, 76.071], kkd: [11.259, 75.780], wyd: [11.685, 76.132],
    knr: [11.874, 75.370], ksd: [12.500, 74.987]
  };

  // --------------------------------------------------------- palettes
  // keyed by the sun's height (y of the unit sun direction)
  const KEYS = [
    { e: -0.4, top: 0x030817, hor: 0x0d1830, light: 0x8ea6dc, li: 0.32, hs: 0x41557f, hg: 0x141a26, hi: 0.3, fog: 0x0b1528, cl: 0.16, exp: 1.2 },
    { e: -0.1, top: 0x0b1840, hor: 0x2b2f5c, light: 0x99acdf, li: 0.22, hs: 0x5a5f8a, hg: 0x1d2030, hi: 0.32, fog: 0x1f2546, cl: 0.3, exp: 1.15 },
    { e: 0.0, top: 0x2a4682, hor: 0xe0855a, light: 0xff8a4a, li: 0.55, hs: 0xc39ca8, hg: 0x4a3c32, hi: 0.45, fog: 0xc99078, cl: 0.75, exp: 1.08 },
    { e: 0.12, top: 0x3a70bd, hor: 0xf1be8c, light: 0xffb26e, li: 1.4, hs: 0xdcd6e6, hg: 0x5f6a3c, hi: 0.62, fog: 0xdcc6ae, cl: 0.95, exp: 1.05 },
    { e: 0.3, top: 0x2f7fd0, hor: 0xd2e8f2, light: 0xfff0d6, li: 2.1, hs: 0xd6ecff, hg: 0x6b7a3c, hi: 0.75, fog: 0xc8e0ec, cl: 1, exp: 1.05 }
  ];
  const _a = new T.Color(), _b = new T.Color();
  function pal(e) {
    let i = 0;
    while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
    const A = KEYS[i], B = KEYS[i + 1];
    const t = KT.clamp((e - A.e) / (B.e - A.e), 0, 1);
    const col = (k) => new T.Color(A[k]).lerp(_b.set(B[k]), t);
    const num = (k) => KT.lerp(A[k], B[k], t);
    return { top: col('top'), hor: col('hor'), light: col('light'), li: num('li'), hs: col('hs'), hg: col('hg'), hi: num('hi'), fog: col('fog'), cl: num('cl'), exp: num('exp') };
  }

  // ------------------------------------------------------------- sun
  S.sunDir = new T.Vector3(-0.45, 0.62, 0.55).normalize();
  S.moonDir = new T.Vector3();
  S.lightDir = new T.Vector3();
  function clockHours() {
    if (S.mode === 'day') return 11.5;
    if (S.fixedHours !== undefined) return S.fixedHours; // for testing
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }
  // east is +x, north is -z on both maps; the sun passes a little south
  function placeSun(h) {
    const rise = 6.15, set = 18.5;
    let t = (h - rise) / (set - rise);
    if (t < -0.55) t += 24 / (set - rise);
    const a = t * Math.PI;
    S.sunDir.set(Math.cos(a), Math.sin(a), 0.28).normalize();
    S.moonDir.set(-Math.cos(a) * 0.8, -Math.sin(a), 0.35).normalize();
    if (S.moonDir.y < 0.25) S.moonDir.y = 0.25; // keep the moon up all night
    S.moonDir.normalize();
  }

  // -------------------------------------------------- stars, moon, rain
  function makeStars() {
    const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const rng = KT.makeRng(7);
    for (let i = 0; i < n; i++) {
      const u = rng(), v = 0.04 + rng() * 0.96;
      const th = u * Math.PI * 2, y = v, r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(th) * r * 3500, y * 3500, Math.sin(th) * r * 3500], i * 3);
      const b = 0.55 + rng() * 0.45, w = rng();
      col.set([b * (0.85 + w * 0.15), b * 0.9, b], i * 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    const m = new T.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const p = new T.Points(g, m);
    p.frustumCulled = false;
    p.renderOrder = -1;
    return p;
  }
  function moonTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const glow = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    glow.addColorStop(0, 'rgba(230,236,255,0.55)'); glow.addColorStop(1, 'rgba(230,236,255,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#f2f1ea';
    g.beginPath(); g.arc(64, 64, 24, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(160,160,170,0.45)';
    [[56, 58, 6], [72, 70, 4], [62, 74, 3], [70, 54, 3]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    return t;
  }
  function makeRain(count) {
    const pos = new Float32Array(count * 6), end = new Float32Array(count * 2);
    const rng = KT.makeRng(31);
    for (let i = 0; i < count; i++) {
      const x = rng() * 60, y = rng() * 30, z = rng() * 60;
      pos.set([x, y, z, x, y, z], i * 6);
      end[i * 2 + 1] = 1;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new T.BufferAttribute(end, 1));
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { uTime: { value: 0 }, uCam: { value: new T.Vector3() }, uWind: { value: new T.Vector2(1, 0.5) }, uSpeed: { value: 22 }, uColor: { value: new T.Color(0xc8d6e6) }, uOpacity: { value: 0.5 } },
      vertexShader: [
        'attribute float aEnd;',
        'uniform float uTime, uSpeed;',
        'uniform vec3 uCam;',
        'uniform vec2 uWind;',
        'varying float vEnd;',
        'void main(){',
        '  vec3 p = position;',
        '  vec2 drift = uWind * uTime;',
        '  p.x = uCam.x - 30.0 + mod(p.x + drift.x - uCam.x, 60.0);',
        '  p.z = uCam.z - 30.0 + mod(p.z + drift.y - uCam.z, 60.0);',
        '  p.y = uCam.y - 12.0 + mod(p.y - uTime * uSpeed, 30.0);',
        '  p += aEnd * vec3(-uWind.x, uSpeed, -uWind.y) * 0.035;',
        '  vEnd = aEnd;',
        '  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying float vEnd; void main(){ gl_FragColor = vec4(uColor, uOpacity * (1.0 - vEnd * 0.85)); }'
    });
    const mesh = new T.LineSegments(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    mesh.userData.count = count;
    return mesh;
  }

  // ---------------------------------------------------------- weather
  const CODES = [
    [[0], 'Clear sky', '☀️', 0.08, 0, 0, 0],
    [[1], 'Mainly clear', '\u{1F324}️', 0.25, 0, 0, 0],
    [[2], 'Partly cloudy', '⛅', 0.5, 0, 0, 0],
    [[3], 'Overcast', '☁️', 0.9, 0, 0, 0],
    [[45, 48], 'Fog', '\u{1F32B}️', 0.7, 0, 0.85, 0],
    [[51, 53, 55, 56, 57], 'Drizzle', '\u{1F326}️', 0.85, 0.25, 0.15, 0],
    [[61, 80], 'Light rain', '\u{1F326}️', 0.85, 0.45, 0.1, 0],
    [[63, 81], 'Rain', '\u{1F327}️', 0.92, 0.7, 0.2, 0],
    [[65, 66, 67, 82], 'Heavy rain', '\u{1F327}️', 1, 1, 0.3, 0],
    [[95, 96, 99], 'Thunderstorm', '⛈️', 1, 0.9, 0.25, 1]
  ];
  function describe(code) {
    const c = CODES.find((x) => x[0].indexOf(code) >= 0) || CODES[2];
    return { label: c[1], icon: c[2], cloud: c[3], rain: c[4], fog: c[5], storm: c[6] };
  }
  let target = { cloud: 0.3, rain: 0, fog: 0, storm: 0 };
  let wind = new T.Vector2(1.2, 0.6);

  function placeKey() {
    const G = KT.Game;
    if (G.level === 'highway' && KT.Highway.built) {
      const i = KT.Highway.status(KT.Player.pos).nearest;
      return KT.DISTRICTS[i].id;
    }
    return 'alp';
  }
  // Something plausible when the weather service can't be reached:
  // wetter in the monsoons, storms on north-east monsoon afternoons.
  function simulate(key) {
    const d = new Date(), m = d.getMonth();
    const seed = d.getFullYear() * 1000 + Math.floor((d.getTime() / 36e5) / 3) + key.charCodeAt(0);
    const r = KT.makeRng(seed)();
    const wet = m >= 5 && m <= 8 ? 0.6 : m >= 9 && m <= 10 ? 0.4 : 0.15;
    let code = r < wet * 0.35 ? 63 : r < wet * 0.7 ? 61 : r < wet ? 3 : r < wet + 0.25 ? 2 : 1;
    if (m >= 9 && m <= 10 && d.getHours() >= 14 && d.getHours() <= 19 && r < 0.15) code = 95;
    return { code, temp: m >= 2 && m <= 4 ? 32 : 28, wind: 9, windDir: 250, simulated: true };
  }
  let fetchedKey = '', fetchedAt = 0, fetching = false;
  S.fetchWeather = async function (force) {
    if (S.mode !== 'live' || fetching || S.forced) return;
    const key = placeKey();
    if (!force && key === fetchedKey && Date.now() - fetchedAt < 15 * 60e3) return;
    fetching = true;
    fetchedKey = key; fetchedAt = Date.now();
    const [lat, lon] = COORDS[key] || COORDS.alp;
    let rep;
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
        '&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto';
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctl && setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const c = (await res.json()).current;
      rep = { code: c.weather_code, temp: c.temperature_2m, wind: c.wind_speed_10m, windDir: c.wind_direction_10m, cover: c.cloud_cover };
    } catch (e) {
      rep = simulate(key);
      fetchedAt = Date.now() - 10 * 60e3; // retry in ~5 minutes
    }
    fetching = false;
    const dsc = describe(rep.code);
    const dist = KT.DISTRICTS.find((d) => d.id === key);
    S.weather = Object.assign(rep, dsc, { place: dist ? dist.name : 'Kerala' });
    target = { cloud: Math.max(dsc.cloud, rep.cover !== undefined ? rep.cover / 100 * 0.9 : 0), rain: dsc.rain, fog: dsc.fog, storm: dsc.storm };
    // wind blows towards (from + 180deg); north is -z
    const b = ((rep.windDir || 250) + 180) * Math.PI / 180, ms = (rep.wind || 8) / 3.6;
    wind.set(Math.sin(b) * ms * 0.6, -Math.cos(b) * ms * 0.6);
    S.updateChip(true);
  };

  // -------------------------------------------------------------- HUD
  const fmtTime = (h) => {
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return ((hh + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + (hh < 12 ? ' AM' : ' PM');
  };
  S.updateChip = function () {
    const el = document.getElementById('weather-chip');
    if (!el) return;
    const w = S.weather;
    let icon = w && S.mode === 'live' ? w.icon : '☀️';
    if (S.night > 0.5 && (!w || S.mode !== 'live' || w.code <= 2)) icon = '\u{1F319}';
    const temp = w && S.mode === 'live' ? ' ' + Math.round(w.temp) + '°' : '';
    el.innerHTML = '<span class="ic">' + icon + '</span><span>' + fmtTime(S.hours) + temp + '</span>';
    el.title = S.describe();
  };
  S.describe = function () {
    const w = S.weather;
    if (S.mode === 'day') return 'Always daytime (change it in Settings).';
    const time = 'Local time ' + fmtTime(S.hours) + (S.night > 0.5 ? ' • night' : '');
    if (S.mode !== 'live' || !w) return time + ' • clear skies';
    return time + ' • ' + w.label + ', ' + Math.round(w.temp) + '°C, wind ' + Math.round(w.wind) + ' km/h in ' + w.place +
      (w.simulated ? ' (simulated: live weather unavailable)' : ' (live, Open-Meteo)');
  };

  // ------------------------------------------------------------ setup
  // A set of things to light for one outdoor map.
  function rigFor(key) {
    const G = KT.Game;
    if (key === 'home') {
      const W = KT.World;
      return { key, scene: G.homeScene, sky: W.sky, sun: W.sun, hemi: W.hemi, clouds: W.clouds, sunDir: W.sunDir, water: KT.Geo.waterUniforms, beams: () => (W.sites.lighthouse || []).map((s) => s.object.userData.beam) };
    }
    const H = KT.Highway;
    return { key, scene: H.scene, sky: H.sky, sun: H.sun, hemi: H.hemi, clouds: H.clouds, sunDir: H.sunDir, beams: () => H.hubs.reduce((out, h) => out.concat(h.beam ? [h.beam] : [], h.beams || []), []) };
  }
  const rigs = {};
  function rig(key) {
    let r = rigs[key];
    if (!r || !r.sky) {
      r = rigs[key] = rigFor(key);
      if (!r.sky) return null;
      r.stars = makeStars(); r.sky.add(r.stars);
      r.moon = new T.Sprite(new T.SpriteMaterial({ map: S.moonTex || (S.moonTex = moonTexture()), transparent: true, depthWrite: false, fog: false }));
      r.moon.scale.set(260, 260, 1);
      r.sky.add(r.moon);
      r.base = r.water ? { deep: r.water.uDeep.value.clone(), shallow: r.water.uShallow.value.clone() } : null;
      r.cloudBase = r.clouds.children.map((c) => c.material.opacity);
    }
    return r;
  }

  S.init = function () {
    const set = KT.Game.settings || {};
    S.mode = set.sky || 'live';
    const q = set.quality || 'medium';
    S.rainMesh = makeRain(q === 'low' ? 1600 : q === 'high' ? 5000 : 3200);
    S.update(0, true);
    S.fetchWeather(true);
  };
  // Show a given weather code (testing / photo mode); null = live again.
  S.forceWeather = function (code) {
    if (code === null || code === undefined) { S.forced = false; S.fetchWeather(true); return; }
    S.forced = true;
    const d = describe(code);
    S.weather = Object.assign({ code, temp: 27, wind: 14, windDir: 250, place: 'Kerala', simulated: true }, d);
    target = { cloud: d.cloud, rain: d.rain, fog: d.fog, storm: d.storm };
    S.update(0, true);
  };
  S.setMode = function (m) {
    S.mode = m;
    if (m === 'live') S.fetchWeather(true);
    else target = { cloud: 0.25, rain: 0, fog: 0, storm: 0 };
    S.update(0, true);
  };

  // -------------------------------------------------------------- tick
  let fetchT = 0, chipT = 0, boltT = 8, thunderAt = -1, timeT = 0;
  S.update = function (dt, snap) {
    const G = KT.Game;
    if (!G || !G.homeScene) return;
    fetchT -= dt;
    if (fetchT <= 0) { fetchT = 20; S.fetchWeather(false); }
    if (S.mode !== 'live') target = { cloud: 0.25, rain: 0, fog: 0, storm: 0 };
    // ease towards the reported weather (a front takes ~20 s to roll in)
    const k = snap ? 1 : 1 - Math.exp(-dt / 6);
    ['cloud', 'rain', 'fog', 'storm'].forEach((n) => { S[n] += (target[n] - S[n]) * k; });
    timeT -= dt;
    if (timeT <= 0 || snap) { timeT = 1; S.hours = clockHours(); placeSun(S.hours); }

    const e = S.sunDir.y;
    const P = pal(e);
    S.night = KT.clamp((0.02 - e) / 0.16, 0, 1);
    S.day = 1 - S.night;
    KT.Audio.night = S.night > 0.6;

    // lightning
    if (S.storm > 0.5 && S.mode === 'live') {
      boltT -= dt;
      if (boltT <= 0) { boltT = 5 + Math.random() * 14; S.flash = 1; thunderAt = 0.4 + Math.random() * 2.2; }
    }
    if (thunderAt > 0) { thunderAt -= dt; if (thunderAt <= 0) { KT.Audio.play('thunder'); thunderAt = -1; } }
    S.flash = Math.max(0, S.flash - dt * 4);
    const flash = S.flash * (0.6 + 0.4 * Math.sin(S.flash * 40));

    const level = G.level;
    const outdoor = level === 'home' || level === 'highway';
    const r = outdoor ? rig(level) : null;
    const grey = S.cloud * 0.7 + S.rain * 0.25;
    if (r) {
      const u = r.sky.material.uniforms;
      const lum = 0.35 + 0.65 * S.day;
      _a.setRGB(0.55, 0.6, 0.66).multiplyScalar(lum);
      u.uTop.value.copy(P.top).lerp(_a, Math.min(0.85, grey));
      u.uHorizon.value.copy(P.hor).lerp(_b.setRGB(0.7, 0.73, 0.76).multiplyScalar(lum), Math.min(0.8, grey));
      u.uBottom.value.copy(u.uHorizon.value).multiplyScalar(0.9);
      if (flash > 0) { u.uTop.value.lerp(_a.setRGB(0.85, 0.88, 1), flash * 0.7); u.uHorizon.value.lerp(_a, flash * 0.7); }
      // the sky shader draws the sun disc: hide it at night / behind clouds
      const lightDir = S.night > 0.5 ? S.moonDir : S.sunDir;
      u.uSunDir.value.copy(S.sunDir).multiplyScalar(S.night > 0.5 || S.cloud > 0.8 ? 0 : 1);
      r.sunDir.copy(lightDir);
      // sun (or moon) light and the hemisphere fill
      r.sun.color.copy(P.light);
      r.sun.intensity = P.li * (1 - 0.6 * S.cloud - 0.15 * S.rain) * (S.night > 0.5 ? 1 : 1);
      if (r.hemi) {
        r.hemi.color.copy(P.hs).lerp(_a.setRGB(0.75, 0.78, 0.82).multiplyScalar(0.4 + 0.6 * S.day), grey * 0.6);
        r.hemi.groundColor.copy(P.hg);
        r.hemi.intensity = P.hi * (1 + 0.25 * S.cloud * S.day) + flash * 2.2;
      }
      // fog closes in with rain and mist
      const fog = r.scene.fog;
      if (fog) {
        fog.color.copy(u.uHorizon.value);
        const far = r.key === 'home' ? 1100 : 1150;
        fog.far = KT.lerp(KT.lerp(far, 420, S.rain), 170, S.fog) * (1 - 0.35 * S.night);
        fog.near = KT.lerp(r.key === 'home' ? 160 : 220, 25, Math.max(S.rain * 0.6, S.fog));
      }
      // clouds: thicker, greyer, darker at night
      const cc = 0.25 + 0.75 * Math.min(1, S.cloud * 1.15);
      const shade = (1 - 0.45 * S.rain) * P.cl;
      r.clouds.children.forEach((c, i) => {
        c.material.opacity = r.cloudBase[i] * cc;
        c.material.color.setRGB(shade, shade, shade * (1 + 0.08 * S.night));
      });
      // stars and moon
      const clear = 1 - Math.min(1, S.cloud * 1.1);
      r.stars.material.opacity = S.night * clear;
      r.stars.visible = r.stars.material.opacity > 0.01;
      r.moon.visible = S.night > 0.05;
      r.moon.position.copy(S.moonDir).multiplyScalar(3300);
      r.moon.material.opacity = S.night * (0.3 + 0.7 * clear);
      // the lighthouse beams sweep brightly after dark
      r.beams().forEach((b) => { if (b && b.children[0]) b.children[0].material.opacity = 0.05 + 0.3 * Math.max(S.night, S.rain * 0.4); });
      if (r.water) {
        const wl = 0.3 + 0.7 * S.day * (1 - 0.3 * S.cloud);
        r.water.uDeep.value.copy(r.base.deep).multiplyScalar(wl);
        r.water.uShallow.value.copy(r.base.shallow).multiplyScalar(wl);
        r.water.uSkyHorizon.value.copy(u.uHorizon.value);
        r.water.uSkyZenith.value.copy(u.uTop.value);
        r.water.uSunColor.value.copy(P.light).multiplyScalar(S.cloud > 0.85 ? 0.1 : 1);
        r.water.uSunDir.value.copy(lightDir);
      }
      G.renderer.toneMappingExposure = P.exp;
    } else G.renderer.toneMappingExposure = 1.05;
    // street and house lamps glow brighter at night
    KT.M.lampGlow.emissiveIntensity = 1.4 + 2.2 * S.night;
    // rain follows the camera on the outdoor maps
    const rm = S.rainMesh;
    if (rm) {
      const want = outdoor && S.rain > 0.02;
      if (want && rm.parent !== G.scene) G.scene.add(rm);
      rm.visible = want;
      if (want) {
        const mu = rm.material.uniforms;
        mu.uTime.value += dt;
        mu.uCam.value.copy(G.camera.position);
        mu.uWind.value.copy(wind);
        mu.uOpacity.value = (0.28 + 0.3 * S.rain) * (0.5 + 0.5 * S.day) + flash * 0.3;
        rm.geometry.setDrawRange(0, Math.floor(rm.userData.count * Math.min(1, S.rain * 1.1)) * 2);
      }
    }
    KT.Audio.setRain(outdoor ? S.rain : S.rain * 0.35);
    if (KT.Lighthouse && KT.Lighthouse.built) KT.Lighthouse.setDaylight(S.day * (1 - 0.5 * S.cloud) + flash, _b.setRGB(0.75, 0.88, 1).lerp(_a.setRGB(0.6, 0.65, 0.7), grey));
    chipT -= dt;
    if (chipT <= 0 || snap) { chipT = 5; S.updateChip(); }
  };
})();
