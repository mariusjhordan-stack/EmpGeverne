import * as THREE from 'three';

/**
 * Dark room with soft boxes: gives polished steel the bright and dark bands of a studio photograph.
 * style 'product': darker room, bigger and brighter boxes and a warm ivory floor, like a jewellery shot
 * on the ivory backdrop of the catalogue (used by the product renders and the 3D viewer).
 */
export function studioEnvironment(renderer, { style = 'tryon' } = {}) {
  const product = style === 'product';
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: product ? 0x3b3a37 : 0x5e6064, side: THREE.BackSide }));
  scene.add(room);
  const panel = (w, h, x, y, z, strength, tint = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(strength * tint[0], strength * tint[1], strength * tint[2]), side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  if (product) {
    const warm = [1, 0.95, 0.86];
    panel(18, 8, 0, 14, 4, 4.2); // techo: la gran caja de luz
    panel(4.5, 17, -14, 2, 5, 3.6); // tira izquierda: la línea blanca larga en el acero pulido
    panel(2.6, 15, 14, 0, 3, 2.3); // tira derecha, más débil
    panel(10, 6, -6, 5, 14, 1.9); // luz principal de frente
    panel(8, 3, 6, -4, 14, 0.85); // relleno bajo
    panel(12, 4, 0, 6, -14, 2.1); // contraluz: brillo en los cantos
    panel(30, 30, 0, -16, 0, 0.75, warm); // piso marfil: el reflejo cálido del fondo
  } else {
    panel(14, 7, 0, 13, 5, 3.2);
    panel(5, 14, -13, 2, 6, 2.2);
    panel(3, 12, 14, 0, 4, 1.6);
    panel(10, 3, 0, -12, 7, 0.9);
    panel(9, 7, -5, 5, 14, 1.5);
    panel(6, 3, 6, -3, 14, 1.1);
    panel(3, 8, -9, -5, 12, 1.2);
    panel(16, 1.6, 0, 1, 15, 0.12);
    panel(2, 12, 9, 0, 11, 0.15);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return target.texture;
}
