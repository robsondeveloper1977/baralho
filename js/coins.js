/* Chuva de moedas douradas em 3D (precisa do THREE global). Usado na comemoração de vitórias. */
const Coins = (() => {
  'use strict';

  function create(scene, { gravity = 18, floorY = 0.12 } = {}) {
    const geo = new THREE.CylinderGeometry(0.24, 0.24, 0.045, 24);
    const hole = new THREE.BoxGeometry(0.1, 0.05, 0.1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf2b928, metalness: 0.55, roughness: 0.28, emissive: 0x5a3600 });
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x3a0610 });
    const list = [];

    /** n moedas caindo numa área (centro cx,cz; largura w, profundidade d), de uma altura `top`. */
    function burst(n, { cx = 0, cz = 0, w = 7, d = 4, top = 6 } = {}) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, mat); m.add(new THREE.Mesh(hole, holeMat));
        m.position.set(cx + (Math.random() - 0.5) * w, top + Math.random() * 3, cz + (Math.random() - 0.5) * d);
        m.rotation.set(Math.random() * 3, 0, Math.random() * 3); m.castShadow = true; m.visible = false;
        scene.add(m);
        list.push({
          m, v: new THREE.Vector3((Math.random() - 0.5) * 2, -Math.random() * 3, (Math.random() - 0.5) * 2),
          s: new THREE.Vector3(Math.random() * 8 - 4, 0, Math.random() * 8 - 4), life: 2.6 + Math.random(), delay: Math.random() * 0.9,
        });
      }
    }

    function step(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const c = list[i];
        if (c.delay > 0) { c.delay -= dt; continue; }
        c.m.visible = true; c.life -= dt;
        c.v.y -= gravity * dt; c.m.position.addScaledVector(c.v, dt);
        c.m.rotation.x += c.s.x * dt; c.m.rotation.z += c.s.z * dt;
        if (c.m.position.y < floorY) { c.m.position.y = floorY; c.v.y *= -0.42; c.v.x *= 0.7; c.v.z *= 0.7; c.s.multiplyScalar(0.6); }
        if (c.life < 0.4) c.m.scale.setScalar(Math.max(0.001, c.life / 0.4));
        if (c.life <= 0) { scene.remove(c.m); list.splice(i, 1); }
      }
    }

    return { burst, step };
  }

  return { create };
})();
