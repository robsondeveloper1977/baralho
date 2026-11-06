/* Shared, offline PBR materials and lighting for the casino tables. */
const CasinoRender = (() => {
  'use strict';
  const cache = new Map();
  function texture(kind) {
    if (cache.has(kind)) return cache.get(kind);
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'), pixels = g.createImageData(512, 512);
    let seed = 413;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const n = random(), i = (y * 512 + x) * 4;
      let rgb;
      if (kind === 'wood') {
        const grain = Math.sin(x * .14 + Math.sin(y * .012) * 3 + Math.sin(x * .025) * 4);
        const v = 0.75 + grain * .19 + n * .12;
        rgb = [86 * v, 43 * v, 23 * v];
      } else {
        const v = 105 + n * 65 + ((x + y) % 2) * 14;
        rgb = [v, v, v];
      }
      pixels.data.set([...rgb, 255], i);
    }
    g.putImageData(pixels, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(kind === 'wood' ? 3 : 12, kind === 'wood' ? 3 : 12);
    if (kind === 'wood') t.colorSpace = THREE.SRGBColorSpace;
    cache.set(kind, t); return t;
  }
  function wood() {
    return new THREE.MeshPhysicalMaterial({ map: texture('wood'), roughness: .3, clearcoat: .8, clearcoatRoughness: .22 });
  }
  function leather() {
    return new THREE.MeshStandardMaterial({ color: 0x171d19, bumpMap: texture('leather'), bumpScale: .025, roughness: .65 });
  }
  function brass() {
    return new THREE.MeshStandardMaterial({ color: 0xc9ad70, metalness: .86, roughness: .27 });
  }
  function setup(renderer, scene) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMappingExposure = 1.05;
    const env = new THREE.Scene(); env.background = new THREE.Color(0x202923);
    for (const [x, y, z, w, h, intensity] of [[0,9,2,9,5,3],[-8,4,-3,3,7,1.7],[8,3,4,2,6,2]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity * .88, intensity * .69), side: THREE.DoubleSide }));
      p.position.set(x,y,z); p.lookAt(0,0,0); env.add(p);
    }
    const generator = new THREE.PMREMGenerator(renderer);
    const target = generator.fromScene(env, .06);
    scene.environment = target.texture; scene.environmentIntensity = .65;
    generator.dispose();
    env.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    for (const t of cache.values()) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    // Retain the render target for the lifetime of the scene, including bfcache restores.
    scene.userData.environmentTarget = target;
  }
  function lamp(scene, x, z) {
    const group = new THREE.Group(); group.position.set(x, 3.6, z);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.35,.75,.55,32,1,true), new THREE.MeshStandardMaterial({color:0x163c2c, roughness:.45, side:THREE.DoubleSide}));
    const bulb = new THREE.Mesh(new THREE.CircleGeometry(.65,32), new THREE.MeshBasicMaterial({color:0xffdeb0}));
    bulb.rotation.x = Math.PI / 2; bulb.position.y = -.26;
    group.add(shade,bulb);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,2,8),brass()); stem.position.y=1.25; group.add(stem);
    scene.add(group);
  }
  return { texture, wood, leather, brass, setup, lamp };
})();
