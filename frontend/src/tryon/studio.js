import * as THREE from 'three';

/** Dark room with soft boxes: gives polished steel the bright and dark bands of a studio photograph. */
export function studioEnvironment(renderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x5e6064, side: THREE.BackSide }));
  scene.add(room);
  const panel = (w, h, x, y, z, strength) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(strength, strength, strength), side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  panel(14, 7, 0, 13, 5, 3.2);
  panel(5, 14, -13, 2, 6, 2.2);
  panel(3, 12, 14, 0, 4, 1.6);
  panel(10, 3, 0, -12, 7, 0.9);
  panel(9, 7, -5, 5, 14, 1.5);
  panel(6, 3, 6, -3, 14, 1.1);
  panel(3, 8, -9, -5, 12, 1.2);
  panel(16, 1.6, 0, 1, 15, 0.12);
  panel(2, 12, 9, 0, 11, 0.15);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return target.texture;
}
