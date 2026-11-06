/* Low-cost underwater 3D scenery; the playable UI works without WebGL. */
(() => {
  'use strict';
  const host=document.getElementById('ocean-scene');
  if (!window.THREE) return;
  let renderer;
  try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true}); } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,.1,70); camera.position.set(0,4,19);camera.lookAt(0,2,0);
  scene.fog=new THREE.FogExp2(0x07303a,.045);
  scene.add(new THREE.HemisphereLight(0x9be5d2,0x041e2a,2));
  const light=new THREE.DirectionalLight(0xc1efcc,3);light.position.set(-4,12,6);scene.add(light);
  const stone=new THREE.MeshStandardMaterial({color:0x39766d,roughness:.88});
  const metal=new THREE.MeshStandardMaterial({color:0xb9a66c,metalness:.5,roughness:.45});
  function column(x,z,height) {
    const group=new THREE.Group();group.position.set(x,-3,z);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.48,.65,height,12),stone);body.position.y=height/2;group.add(body);
    for(const y of [.15,height-.12]){
      const ring=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,.28,16),stone);ring.position.y=y;group.add(ring);
      const trim=new THREE.Mesh(new THREE.TorusGeometry(.73,.035,6,24),metal);trim.rotation.x=Math.PI/2;trim.position.y=y+.16;group.add(trim);
    }
    scene.add(group);
  }
  column(-9,-3,9);column(9,-3,9);column(-12,-7,11);column(12,-7,11);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,50),new THREE.MeshStandardMaterial({color:0x174a44,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-3,-4);scene.add(floor);
  const count=80,positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){positions[i*3]=(Math.random()-.5)*32;positions[i*3+1]=Math.random()*22-6;positions[i*3+2]=-Math.random()*12;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const particles=new THREE.Points(geo,new THREE.PointsMaterial({color:0xc1ebce,size:.045,transparent:true,opacity:.4}));scene.add(particles);
  host.append(renderer.domElement);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);}
  addEventListener('resize',resize);resize();
  let last=0;
  function frame(time){
    const dt=Math.min((time-last)/1000,.05);last=time;
    for(let i=0;i<count;i++){positions[i*3+1]+=dt*(.08+(i%4)*.025);if(positions[i*3+1]>16)positions[i*3+1]=-6;}
    geo.attributes.position.needsUpdate=true;renderer.render(scene,camera);
  }
  function activity(){last=performance.now();renderer.setAnimationLoop(document.hidden||reduced.matches?null:frame);renderer.render(scene,camera);}
  document.addEventListener('visibilitychange',activity);reduced.addEventListener('change',activity);activity();
})();
