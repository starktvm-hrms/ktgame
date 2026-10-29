// Character creator preview (separate small renderer) and HUD portrait.
(function () {
  'use strict';
  const T = THREE;
  const Pv = KT.Preview = { ch: null, t: 0 };

  Pv.init = function (canvas) {
    Pv.canvas = canvas;
    const r = Pv.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    const s = Pv.scene = new T.Scene();
    s.add(new T.HemisphereLight(0xeaf4ff, 0x6b5a3c, 0.9));
    const d = new T.DirectionalLight(0xfff1dc, 2.0);
    d.position.set(2, 4, 3);
    d.castShadow = true;
    d.shadow.mapSize.set(1024, 1024);
    s.add(d);
    const rim = new T.DirectionalLight(0x9fd0ff, 0.8);
    rim.position.set(-3, 2, -3);
    s.add(rim);
    const disc = new T.Mesh(new T.CylinderGeometry(0.9, 1.0, 0.12, 40), new T.MeshStandardMaterial({ map: KT.tex('stone_path'), color: 0xddd2c0, roughness: 0.9 }));
    disc.position.y = -0.06;
    disc.receiveShadow = true;
    s.add(disc);
    const grass = new T.Mesh(new T.CylinderGeometry(1.0, 1.05, 0.08, 40, 1, true), KT.M.leafLight);
    grass.position.y = -0.02;
    s.add(grass);
    Pv.camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
    Pv.resize();
    window.addEventListener('resize', Pv.resize);
    // drag to spin
    let drag = false, lx = 0;
    Pv.spin = 0;
    canvas.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; });
    window.addEventListener('pointerup', () => { drag = false; });
    window.addEventListener('pointermove', (e) => { if (drag) { Pv.spin += (e.clientX - lx) * 0.01; lx = e.clientX; } });
  };

  Pv.resize = function () {
    const c = Pv.canvas;
    const w = c.clientWidth || 300, h = c.clientHeight || 400;
    Pv.renderer.setSize(w, h, false);
    Pv.camera.aspect = w / h;
    Pv.camera.updateProjectionMatrix();
  };

  Pv.setConfig = function (cfg) {
    Pv.cfg = cfg;
    if (Pv.ch) Pv.scene.remove(Pv.ch);
    Pv.ch = KT.Models.character(JSON.parse(JSON.stringify(cfg)));
    Pv.scene.add(Pv.ch);
  };

  Pv.render = function (dt) {
    if (!Pv.ch) return;
    Pv.t += dt;
    if (Pv.canvas.clientWidth && (Pv.canvas.width !== Math.floor(Pv.canvas.clientWidth * Pv.renderer.getPixelRatio()))) Pv.resize();
    Pv.ch.rotation.y = Math.sin(Pv.t * 0.4) * 0.6 + Pv.spin;
    const pose = Math.sin(Pv.t * 0.25) > 0.75 ? 'namaskaram' : 'idle';
    KT.Models.animateCharacter(Pv.ch, pose, dt);
    Pv.camera.position.set(0, 1.0, 5.4);
    Pv.camera.lookAt(0, 0.82, 0);
    Pv.renderer.render(Pv.scene, Pv.camera);
  };

  // Render a head-and-shoulders portrait for the HUD (no canvas resize:
  // render a head close-up at the current size and crop the centre).
  Pv.portrait = function () {
    const r = Pv.renderer;
    const W = Pv.canvas.width, H = Pv.canvas.height;
    const cam = new T.PerspectiveCamera(22, W / H, 0.1, 20);
    Pv.ch.rotation.y = 0.35;
    KT.Models.animateCharacter(Pv.ch, 'idle', 1);
    Pv.ch.updateMatrixWorld(true);
    const head = new T.Vector3();
    Pv.ch.userData.rig.head.getWorldPosition(head);
    cam.position.set(head.x + 0.25, head.y + 0.25, head.z + 1.5);
    cam.lookAt(head.x, head.y + 0.14, head.z);
    const bg = Pv.scene.background;
    Pv.scene.background = new T.Color(0x2e6b4f);
    r.render(Pv.scene, cam);
    Pv.scene.background = bg;
    const out = document.createElement('canvas');
    out.width = out.height = 160;
    const side = Math.min(W, H) * 0.62;
    out.getContext('2d').drawImage(Pv.canvas, (W - side) / 2, (H - side) / 2, side, side, 0, 0, 160, 160);
    return out.toDataURL('image/png');
  };

  // Portrait for any character config (e.g. another player's profile).
  // Temporarily swaps the preview character, then restores it.
  const portraitCache = new Map();
  Pv.portraitFor = function (cfg) {
    const key = JSON.stringify(cfg);
    if (portraitCache.has(key)) return portraitCache.get(key);
    const prev = Pv.cfg;
    let url = '';
    try {
      Pv.setConfig(cfg);
      url = Pv.portrait();
    } catch (e) { /* ignore */ }
    if (prev) Pv.setConfig(prev);
    if (portraitCache.size > 40) portraitCache.clear();
    portraitCache.set(key, url);
    return url;
  };
})();
