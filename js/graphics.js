// Image-based lighting: the live sky (time of day and weather) is rendered
// into a prefiltered environment map that lights and reflects off every
// physically based material, so metal, glass, water, wet roads and painted
// walls pick up the colour of the sky. It is refreshed when the sky changes.
(function () {
  'use strict';
  const T = THREE;
  const GFX = KT.GFX = { enabled: true, intensity: 0.55 };
  let pmrem = null, envScene = null, envSky = null, current = null, lastKey = '', timer = 0;

  function setup(renderer) {
    pmrem = new T.PMREMGenerator(renderer);
    envScene = new T.Scene();
  }

  // a key that changes when the sky visibly changes
  function skyKey(sky) {
    const u = sky.material.uniforms;
    const q = (c) => Math.round(c.r * 20) + ',' + Math.round(c.g * 20) + ',' + Math.round(c.b * 20);
    return q(u.uTop.value) + '|' + q(u.uHorizon.value) + '|' + Math.round(u.uSunDir.value.y * 10);
  }

  function rebuild(renderer, sky) {
    if (!envSky || envSky.material !== sky.material) {
      if (envSky) envScene.remove(envSky);
      envSky = new T.Mesh(sky.geometry, sky.material);
      envSky.frustumCulled = false;
      envScene.add(envSky);
    }
    const rt = pmrem.fromScene(envScene, 0.02, 0.1, 5000);
    if (current) current.dispose();
    current = rt;
    return rt.texture;
  }

  // set every standard material's environment strength once
  const tuned = new WeakSet();
  function tune(scene) {
    scene.traverse((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach((m) => {
        if (!m || tuned.has(m) || !m.isMeshStandardMaterial) return;
        tuned.add(m);
        // shiny things reflect more, rough ones mostly get soft sky light
        m.envMapIntensity = GFX.intensity * (m.metalness > 0.3 ? 1.6 : m.roughness < 0.35 ? 1.3 : 1);
      });
    });
  }

  GFX.update = function (dt) {
    const G = KT.Game;
    if (!GFX.enabled || !G.renderer || !G.scene) return;
    const scene = G.scene;
    const sky = G.level === 'home' ? KT.World.sky : G.level === 'highway' ? KT.Highway.sky : null;
    if (!sky) { scene.environment = null; return; }
    if (!pmrem) setup(G.renderer);
    timer -= dt;
    const key = skyKey(sky);
    if (key !== lastKey || timer <= 0 || scene.environment !== (current && current.texture)) {
      if (key !== lastKey || !current || timer <= 0) {
        lastKey = key;
        rebuild(G.renderer, sky);
      }
      scene.environment = current.texture;
      timer = 30;
    }
    // new objects appear as districts stream in: tune them now and then
    GFX.tuneT = (GFX.tuneT || 0) - dt;
    if (GFX.tuneT <= 0) { GFX.tuneT = 2; tune(scene); }
  };
  GFX.setEnabled = function (on) {
    GFX.enabled = on;
    if (!on && KT.Game.scene) KT.Game.scene.environment = null;
    lastKey = '';
  };
})();
