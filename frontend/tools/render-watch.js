/*
 * Turntable renderer for the home-page image sequence.
 * A Submariner-style dive watch built in Three.js with physically based materials, lit like a
 * studio product shot (dark room + white softboxes reflected in polished steel). The dial and
 * bezel insert are the REAL photo of the Rolex Submariner in the catalogue, rectified to a front
 * view (scripts/extract_dial.py + scripts/refine_dial.py -> tools/dial.png).
 * The watch sits on a display loop and spins around the vertical axis, so the profile, crown,
 * caseback and the back of the bracelet are all seen.
 * Units are millimetres. Dial faces +Z, 12 o'clock is +Y.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const FRAMES = 120;
const SIZE = 1000;

// texture layout of tools/dial.png (fractions of the texture radius)
const TEX_DIAL = 0.69;
const TEX_INSERT_IN = 0.77;
const TEX_INSERT_OUT = 0.97;

const INSERT_OUT = 19.0;
const INSERT_IN = INSERT_OUT * TEX_INSERT_IN / TEX_INSERT_OUT;
const DIAL_R = INSERT_OUT * TEX_DIAL / TEX_INSERT_OUT;
const MM_PER_TEX = INSERT_OUT / TEX_INSERT_OUT;
const CASE_TOP = 3.4;

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
renderer.setSize(SIZE, SIZE, false);
canvas.style.width = `${SIZE}px`;
canvas.style.height = `${SIZE}px`;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
// the composer tone-maps the background too, so it is over-exposed to land on pure white
scene.background = new THREE.Color(12, 12, 12);

// ---------------------------------------------------------------- studio environment
// A dark room with big white softboxes: polished steel picks up crisp light/dark bands.
function studioEnvironment() {
  const env = new THREE.Scene();
  // gradient dome: bright ceiling, dark band at the horizon, warm floor -> shape-defining reflections
  const dome = new THREE.SphereGeometry(100, 96, 64);
  const col = []; const c = new THREE.Color();
  const stops = [[-1, 0x8c857c], [-0.25, 0x6a6660], [-0.04, 0x26272a], [0.06, 0x2c2e31], [0.35, 0x9a9ea4], [1, 0xe6e8eb]];
  const pos = dome.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i) / 100;
    let k = 0; while (k < stops.length - 2 && y > stops[k + 1][0]) k += 1;
    const [y0, c0] = stops[k]; const [y1, c1] = stops[k + 1];
    c.set(c0).lerp(new THREE.Color(c1), THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1));
    col.push(c.r, c.g, c.b);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  env.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, intensity, pos, tint = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  box(120, 40, 6, [0, 70, 20]);              // overhead softbox
  box(18, 120, 9, [-70, 10, 40]);            // tall strip, front left
  box(18, 120, 7, [72, 0, 30]);              // tall strip, front right
  box(40, 90, 5, [0, 10, -80], 0xfff1df);    // warm back light (rim)
  box(90, 14, 4, [0, -30, 70]);              // low front card for the dial side
  const pmrem = new THREE.PMREMGenerator(renderer);
  return pmrem.fromScene(env, 0.015).texture;
}
scene.environment = studioEnvironment();

const camera = new THREE.PerspectiveCamera(15, 1, 10, 3000);
camera.position.set(0, 26, 292);
camera.lookAt(0, -1, 0);

const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(-70, 110, 130);
scene.add(key);
const rim = new THREE.DirectionalLight(0xfff2e2, 0.9);
rim.position.set(110, 40, -90);
scene.add(rim);

// ---------------------------------------------------------------- textures
function canvasTexture(size, draw, colorSpace = THREE.NoColorSpace) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = colorSpace;
  t.anisotropy = 8;
  return t;
}
const brushed = canvasTexture(512, (g, s) => {
  g.fillStyle = '#5c5c5c'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 3000; i += 1) {
    const v = 70 + Math.random() * 70;
    g.strokeStyle = `rgba(${v},${v},${v},0.4)`;
    g.lineWidth = 0.4 + Math.random();
    const x = Math.random() * s;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 3, s); g.stroke();
  }
});
brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
brushed.repeat.set(0.15, 0.15);
const caseback = canvasTexture(1024, (g, s) => {
  const c = s / 2;
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  for (let r = 4; r < c; r += 2.5) {
    g.strokeStyle = Math.random() > 0.5 ? '#787878' : '#888888';
    g.lineWidth = 1.4; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = '#3c3c3c';
  g.font = '600 32px Helvetica, Arial, sans-serif';
  const text = 'OYSTERSTEEL · SWISS MADE · WATER RESISTANT 300 M / 1000 FT · ';
  const step = (Math.PI * 2) / text.length;
  for (let i = 0; i < text.length; i += 1) {
    g.save(); g.translate(c, c); g.rotate(i * step); g.translate(0, -c * 0.8); g.fillText(text[i], -9, 0); g.restore();
  }
  g.strokeStyle = '#3c3c3c'; g.lineWidth = 3;
  for (const k of [0.72, 0.88]) { g.beginPath(); g.arc(c, c, c * k, 0, Math.PI * 2); g.stroke(); }
});

let ready = false;
let currentFrame = Number(new URLSearchParams(location.search).get('frame') || 0);
const dialImage = new THREE.TextureLoader().load('./dial.png', () => { ready = true; render(currentFrame); });
dialImage.colorSpace = THREE.SRGBColorSpace;
dialImage.anisotropy = 16;
function dialCrop(frac) {
  const t = dialImage.clone();
  t.repeat.set(frac, frac);
  t.offset.set(0.5 - frac / 2, 0.5 - frac / 2);
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------- materials
const STEEL = 0xe4e6e9;
const polished = new THREE.MeshPhysicalMaterial({ color: STEEL, metalness: 1, roughness: 0.045, side: THREE.DoubleSide });
const claspMat = new THREE.MeshPhysicalMaterial({ color: 0xe2e5e8, metalness: 1, roughness: 0.6, roughnessMap: brushed, side: THREE.DoubleSide });
const caseCap = new THREE.MeshPhysicalMaterial({ color: STEEL, metalness: 1, roughness: 0.28, roughnessMap: brushed, side: THREE.DoubleSide });
const dialBump = dialCrop(TEX_DIAL);
dialBump.colorSpace = THREE.NoColorSpace;
const insertBump = dialCrop(TEX_INSERT_OUT);
insertBump.colorSpace = THREE.NoColorSpace;
const dialMat = new THREE.MeshPhysicalMaterial({ map: dialCrop(TEX_DIAL), bumpMap: dialBump, bumpScale: 0.35, roughness: 0.16, metalness: 0, specularIntensity: 0.25, clearcoat: 0.2, clearcoatRoughness: 0.05, envMapIntensity: 0.2 });
const insertMat = new THREE.MeshPhysicalMaterial({ map: dialCrop(TEX_INSERT_OUT), bumpMap: insertBump, bumpScale: 0.25, roughness: 0.2, metalness: 0, specularIntensity: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.05, envMapIntensity: 0.3 });
const rehautMat = new THREE.MeshPhysicalMaterial({ color: 0x2b2c2f, metalness: 0.4, roughness: 0.55, side: THREE.DoubleSide });
// clear sapphire: thin transparent layer with subtle reflections (no transmission pass, which
// would sample the over-exposed white background and veil the dial)
const glass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 0, roughness: 0, transparent: true, opacity: 0.06,
  specularIntensity: 0.25, clearcoat: 0.25, clearcoatRoughness: 0, envMapIntensity: 0.2, depthWrite: false,
});
const backMat = new THREE.MeshPhysicalMaterial({ color: STEEL, metalness: 1, roughness: 0.14, bumpMap: caseback, bumpScale: 0.6, roughnessMap: caseback });

const toZ = (mesh) => { mesh.rotation.x = Math.PI / 2; return mesh; }; // lathe axis (Y) -> Z
function lathe(points, material, segments = 192) {
  return toZ(new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, h]) => new THREE.Vector2(r, h)), segments), material));
}

const watch = new THREE.Group();

// ---------------------------------------------------------------- case with integrated lugs
// Top-view outline of an Oyster case: round middle, four lug horns, flat seats for the end links.
function caseGeometry() {
  const R = 18.9;                 // outline radius before the bevel (+1.0 bevel => ~19.9)
  const a = THREE.MathUtils.degToRad(41);
  const ex = R * Math.cos(a); const ey = R * Math.sin(a);
  const s = new THREE.Shape();
  s.moveTo(12.6, 23.0);
  s.quadraticCurveTo(13.7, 16.2, ex, ey);
  // right flank with the crown guards grown out of the case around 3 o'clock
  const gA = THREE.MathUtils.degToRad(18);
  s.absarc(0, 0, R, a, gA, true);
  s.quadraticCurveTo(R + 2.9, 7.4, R + 2.9, 3.1);            // upper guard
  s.quadraticCurveTo(R + 1.1, 2.6, R + 0.7, 0);              // notch for the crown
  s.quadraticCurveTo(R + 1.1, -2.6, R + 2.9, -3.1);
  s.quadraticCurveTo(R + 2.9, -7.4, R * Math.cos(-gA), R * Math.sin(-gA)); // lower guard
  s.absarc(0, 0, R, -gA, -a, true);
  s.quadraticCurveTo(13.7, -16.2, 12.6, -23.0);
  s.lineTo(11.0, -23.0);
  s.lineTo(11.0, -19.4);
  s.quadraticCurveTo(0, -18.2, -11.0, -19.4);               // seat for the bottom end link
  s.lineTo(-11.0, -23.0);
  s.lineTo(-12.6, -23.0);
  s.quadraticCurveTo(-13.7, -16.2, -ex, -ey);
  s.absarc(0, 0, R, Math.PI + a, Math.PI - a, true);        // left flank
  s.quadraticCurveTo(-13.7, 16.2, -12.6, 23.0);
  s.lineTo(-11.0, 23.0);
  s.lineTo(-11.0, 19.4);
  s.quadraticCurveTo(0, 18.2, 11.0, 19.4);                  // seat for the top end link
  s.lineTo(11.0, 23.0);
  s.lineTo(12.6, 23.0);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 16.0, 0, Math.PI * 2, false);
  s.holes.push(hole);
  const depth = 5.8;
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 1.0, bevelSegments: 8, curveSegments: 96 });
  g.translate(0, 0, CASE_TOP - depth - 1.1);
  // lugs dip towards the wrist and thin out at the tips
  const p = g.attributes.position;
  const mid = CASE_TOP - (depth + 2.2) / 2;
  for (let i = 0; i < p.count; i += 1) {
    const y = Math.abs(p.getY(i));
    if (y > 16.5) {
      const t = Math.min(1, (y - 16.5) / 7.5);
      const dip = 2.4 * t * t;
      let z = p.getZ(i);
      const under = z < mid;
      z -= dip;
      if (under) z += 1.6 * t; // raise the underside: thinner tips
      p.setZ(i, z);
    }
  }
  g.computeVertexNormals();
  return g;
}
// ExtrudeGeometry group 0 is the broad caps; group 1 includes the flanks and bevel.
watch.add(new THREE.Mesh(caseGeometry(), [caseCap, polished]));

// caseback
watch.add(lathe([[0, -6.5], [9, -6.47], [14.2, -6.3], [16.4, -5.95], [17.6, -5.3], [18.4, -4.6]], polished));
const back = new THREE.Mesh(new THREE.CircleGeometry(14.2, 160), backMat);
back.position.z = -6.52; back.rotation.y = Math.PI; watch.add(back);

// bezel: polished steel ring with a coin edge, carrying the real insert
watch.add(lathe([[15.2, CASE_TOP], [19.55, CASE_TOP], [19.95, CASE_TOP + 0.3], [20.05, CASE_TOP + 1.05], [19.85, CASE_TOP + 1.7], [19.25, CASE_TOP + 1.9], [19.0, CASE_TOP + 1.9]], polished));
const notches = 120;
const knurl = new THREE.InstancedMesh(new RoundedBoxGeometry(0.42, 0.55, 1.25, 2, 0.12), polished, notches);
const m4 = new THREE.Matrix4();
for (let i = 0; i < notches; i += 1) {
  const ang = (i / notches) * Math.PI * 2;
  m4.makeRotationZ(ang).setPosition(Math.cos(ang) * 20.05, Math.sin(ang) * 20.05, CASE_TOP + 0.95);
  knurl.setMatrixAt(i, m4);
}
watch.add(knurl);
const insert = new THREE.Mesh(new THREE.RingGeometry(INSERT_IN, INSERT_OUT, 256, 1), insertMat);
insert.position.z = CASE_TOP + 1.92; watch.add(insert);

// dial under a sloped rehaut
watch.add(lathe([[DIAL_R, 2.7], [INSERT_IN - 0.05, CASE_TOP + 1.85]], rehautMat));
watch.add(lathe([[15.0, 2.5], [16.05, 2.5], [16.05, CASE_TOP + 1]], rehautMat)); // inner wall of the case opening
const dial = new THREE.Mesh(new THREE.CircleGeometry(DIAL_R, 192), dialMat);
dial.position.z = 2.7; watch.add(dial);

// sapphire crystal + cyclops lens over the date (date window: 0.445 of texture radius, 3 o'clock)
const crystal = toZ(new THREE.Mesh(new THREE.CylinderGeometry(14.95, 14.95, 0.9, 160), glass));
crystal.position.z = CASE_TOP + 2.2; watch.add(crystal);
// A narrow, feathered softbox reflection follows the crystal through the turntable.
const reflectionMap = canvasTexture(256, (g, s) => {
  const across = g.createLinearGradient(0, 0, 0, s);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = across; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'destination-in';
  const along = g.createLinearGradient(0, 0, s, 0);
  along.addColorStop(0, 'rgba(0,0,0,0)');
  along.addColorStop(0.2, 'rgba(0,0,0,1)');
  along.addColorStop(0.8, 'rgba(0,0,0,1)');
  along.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = along; g.fillRect(0, 0, s, s);
}, THREE.SRGBColorSpace);
const reflectionPos = []; const reflectionUV = []; const reflectionIndex = [];
for (let i = 0; i <= 48; i += 1) {
  const u = i / 48;
  const angle = THREE.MathUtils.degToRad(42 + u * 96);
  for (const [edge, v] of [[-0.55, 0], [0.55, 1]]) {
    const radius = 10.8 + edge;
    reflectionPos.push(radius * Math.cos(angle), radius * Math.sin(angle), CASE_TOP + 2.67);
    reflectionUV.push(u, v);
  }
  if (i < 48) {
    const k = i * 2;
    reflectionIndex.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
  }
}
const reflectionGeometry = new THREE.BufferGeometry();
reflectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(reflectionPos, 3));
reflectionGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(reflectionUV, 2));
reflectionGeometry.setIndex(reflectionIndex);
watch.add(new THREE.Mesh(reflectionGeometry, new THREE.MeshBasicMaterial({ map: reflectionMap, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
const cyclops = new THREE.Mesh(new RoundedBoxGeometry(6.0, 5.2, 1.4, 6, 0.65), glass);
cyclops.position.set(0.445 * MM_PER_TEX, 0, CASE_TOP + 3.05); watch.add(cyclops);

// crown guards (shoulders) + Triplock crown
const crown = new THREE.Group();
const crownGeo = new THREE.CylinderGeometry(3.15, 3.15, 3.3, 144, 1);
{ // knurled edge baked into the geometry
  const p = crownGeo.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i); const z = p.getZ(i); const r = Math.hypot(x, z);
    if (r > 3.0) {
      const ang = Math.atan2(z, x);
      const k = 3.15 - 0.16 * (0.5 + 0.5 * Math.cos(ang * 36));
      p.setX(i, (x / r) * k); p.setZ(i, (z / r) * k);
    }
  }
  crownGeo.computeVertexNormals();
}
const crownBody = new THREE.Mesh(crownGeo, polished);
crownBody.rotation.z = Math.PI / 2; crownBody.position.x = 22.1; crown.add(crownBody);
const crownCap = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.1, 0.7, 96), polished);
crownCap.rotation.z = -Math.PI / 2; crownCap.position.x = 24.05; crown.add(crownCap);
const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 2.4, 48), polished);
tube.rotation.z = Math.PI / 2; tube.position.x = 19.7; crown.add(tube);
crown.position.z = -0.4;
watch.add(crown);

// ---------------------------------------------------------------- Oyster bracelet on a display loop
const RY = 25.4; const RZ = 21.0; const ZC = -7.6;
const t0 = Math.asin(23.4 / RY);
const pathPoint = (t) => new THREE.Vector3(0, RY * Math.sin(t), ZC + RZ * Math.cos(t));
// Short straight portions fill the seats between the lugs before the loop curves away.
const samples = [new THREE.Vector3(0, 18.8, 0.65)];
for (let i = 0; i <= 4000; i += 1) samples.push(pathPoint(t0 + (i / 4000) * (Math.PI * 2 - 2 * t0)));
samples.push(new THREE.Vector3(0, -18.8, 0.65));
const cum = [0];
for (let i = 1; i < samples.length; i += 1) cum.push(cum[i - 1] + samples[i].distanceTo(samples[i - 1]));
const total = cum[cum.length - 1];
const loopCentre = new THREE.Vector3(0, 0, ZC);
function frameAt(s) {
  let i = cum.findIndex((c) => c >= s); if (i <= 0) i = 1;
  const k = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
  const p = samples[i - 1].clone().lerp(samples[i], k);
  const tan = samples[i].clone().sub(samples[i - 1]).normalize();
  const out = p.clone().sub(loopCentre); out.x = 0;
  out.sub(tan.clone().multiplyScalar(out.dot(tan))).normalize();   // outward normal
  return { p, tan, out };
}
const X = new THREE.Vector3(1, 0, 0);
// Yacht-Master 42 Oysterflex strap: one continuous sweep around the display loop.
const CLASP = 25;
const sMid = total / 2;
const bracelet = new THREE.Group();
const strapSteps = 700;
const strapTaper = (s) => Math.min(1, Math.min(s, total - s) / (sMid - CLASP / 2));
const strapWidth = (s) => 20.5 - 2.5 * strapTaper(s);
const strapThickness = (s) => 3.4 - 0.4 * strapTaper(s);

const rubberNoise = canvasTexture(256, (g, n) => {
  const pixels = g.createImageData(n, n);
  for (let i = 0; i < n * n; i += 1) {
    const gray = 119 + Math.floor(Math.random() * 19);
    pixels.data[4 * i] = gray;
    pixels.data[4 * i + 1] = gray;
    pixels.data[4 * i + 2] = gray;
    pixels.data[4 * i + 3] = 255;
  }
  g.putImageData(pixels, 0, 0);
});
rubberNoise.wrapS = rubberNoise.wrapT = THREE.RepeatWrapping;
rubberNoise.repeat.set(4, 24);
const rubber = new THREE.MeshPhysicalMaterial({
  color: 0x121314, metalness: 0, roughness: 0.55,
  sheen: 0.25, sheenColor: 0x555555,
  clearcoat: 0.08, clearcoatRoughness: 0.4,
  bumpMap: rubberNoise, bumpScale: 0.035, side: THREE.DoubleSide,
});

// Closed section: low inner cushion ribs, 1.1 mm rounded sides, and two soft V grooves.
function strapTopAt(x, width, h) {
  const half = width / 2; const r = 1.1;
  const ax = Math.abs(x);
  if (ax > half - r) return h - r + Math.sqrt(Math.max(0, r * r - (ax - half + r) ** 2));
  const groove = (c) => {
    const d = Math.abs(x - c) / 0.31;
    return d < 1 ? 0.25 * (1 - d * d) ** 2 : 0;
  };
  return h + 0.35 * (1 - (x / (half - r)) ** 2) - groove(3.4) - groove(-3.4);
}
function strapSection(width, h) {
  const half = width / 2; const r = 1.1; const pts = [];
  const underside = (x) => -0.4 * (Math.exp(-(((x - 5) / 0.55) ** 2))
    + Math.exp(-(((x + 5) / 0.55) ** 2)));
  // Bottom runs left to right; outside the two ribs it remains flat.
  for (let j = 0; j <= 48; j += 1) {
    const x = -half + r + (width - 2 * r) * j / 48;
    pts.push([x, underside(x)]);
  }
  for (let j = 1; j <= 6; j += 1) {
    const a = -Math.PI / 2 + (Math.PI / 2) * j / 6;
    pts.push([half - r + r * Math.cos(a), r + r * Math.sin(a)]);
  }
  pts.push([half, h - r]);
  for (let j = 1; j <= 6; j += 1) {
    const a = (Math.PI / 2) * j / 6;
    pts.push([half - r + r * Math.cos(a), h - r + r * Math.sin(a)]);
  }
  // Extra fixed samples land at both groove centres at every strap width.
  const topXs = [];
  for (let j = 1; j <= 64; j += 1) topXs.push((half - r) * (1 - 2 * j / 64));
  for (const c of [-3.4, 3.4]) for (const delta of [-0.31, -0.18, 0, 0.18, 0.31]) {
    topXs.push(c + delta);
  }
  topXs.sort((a, b) => b - a);
  for (const x of topXs) pts.push([x, strapTopAt(x, width, h)]);
  for (let j = 1; j <= 6; j += 1) {
    const a = Math.PI / 2 + (Math.PI / 2) * j / 6;
    pts.push([-half + r + r * Math.cos(a), h - r + r * Math.sin(a)]);
  }
  pts.push([-half, r]);
  for (let j = 1; j < 6; j += 1) {
    const a = Math.PI + (Math.PI / 2) * j / 6;
    pts.push([-half + r + r * Math.cos(a), r + r * Math.sin(a)]);
  }
  return pts;
}

// Smooth the section orientation through the straight-to-curved lead-ins.
function strapFrame(s) {
  const f = frameAt(s);
  const before = frameAt(Math.max(0, s - 1.2)).p;
  const after = frameAt(Math.min(total, s + 1.2)).p;
  const tangent = after.sub(before).normalize();
  const out = f.p.clone().sub(loopCentre); out.x = 0;
  out.addScaledVector(tangent, -out.dot(tangent)).normalize();
  return { p: f.p, out };
}
function oysterflexGeometry() {
  const positions = []; const uvs = []; const indices = [];
  let ringSize = 0;
  for (let i = 0; i <= strapSteps; i += 1) {
    const s = total * i / strapSteps;
    const { p, out } = strapFrame(s);
    const width = strapWidth(s);
    const section = strapSection(width, strapThickness(s));
    ringSize = section.length;
    const lift = 0.38 * Math.max(0, 1 - Math.min(s, total - s) / 2.2);
    for (const [x, y] of section) {
      const v = p.clone().addScaledVector(X, x).addScaledVector(out, y - 1.5 + lift);
      // The terminal edge matches the quadratic seat between the lugs.
      if (i === 0 || i === strapSteps) {
        v.y = (i === 0 ? 1 : -1) * (18.22 + 1.2 * (x / 11) ** 2);
      }
      positions.push(v.x, v.y, v.z);
      uvs.push(x / width + 0.5, s / total);
    }
  }
  for (let i = 0; i < strapSteps; i += 1) for (let q = 0; q < ringSize; q += 1) {
    const next = (q + 1) % ringSize;
    const a = i * ringSize + q; const b = i * ringSize + next;
    const c = (i + 1) * ringSize + q; const d = (i + 1) * ringSize + next;
    indices.push(a, c, b, b, c, d);
  }
  // Both seated ends are closed; the strap itself remains one uninterrupted mesh.
  for (const [i, first] of [[0, true], [strapSteps, false]]) {
    const f = strapFrame(i === 0 ? 0 : total);
    const h = strapThickness(i === 0 ? 0 : total);
    const v = f.p.clone().addScaledVector(f.out, h / 2 - 1.5 + 0.38);
    v.y = (first ? 1 : -1) * 18.22;
    const center = positions.length / 3;
    positions.push(v.x, v.y, v.z); uvs.push(0.5, first ? 0 : 1);
    for (let q = 0; q < ringSize; q += 1) {
      const a = i * ringSize + q; const b = i * ringSize + (q + 1) % ringSize;
      if (first) indices.push(center, b, a); else indices.push(center, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
bracelet.add(new THREE.Mesh(oysterflexGeometry(), rubber));

// The steel Oysterlock curves with the loop and sits over the unbroken rubber.
const claspSatin = new THREE.MeshPhysicalMaterial({
  color: 0xdadde1, metalness: 1, roughness: 0.32,
  roughnessMap: brushed, side: THREE.DoubleSide,
});
const claspPolished = new THREE.MeshPhysicalMaterial({
  color: STEEL, metalness: 1, roughness: 0.055, side: THREE.DoubleSide,
});
const claspEngraving = canvasTexture(1024, (g, n) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
  g.strokeStyle = '#4e4e4e'; g.fillStyle = '#4e4e4e'; g.lineWidth = 5;
  const tips = [[-98, -34], [-64, -91], [0, -117], [64, -91], [98, -34]];
  g.save(); g.translate(n / 2, n * 0.42);
  g.beginPath(); g.moveTo(-110, 17); g.quadraticCurveTo(0, 50, 110, 17);
  g.lineTo(75, -13); g.lineTo(45, 13); g.lineTo(0, -48);
  g.lineTo(-45, 13); g.lineTo(-75, -13); g.closePath(); g.stroke();
  for (const [x, y] of tips) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.moveTo(-85, 34); g.lineTo(85, 34); g.stroke();
  g.font = 'bold 62px Georgia, serif'; g.textAlign = 'center'; g.fillText('ROLEX', 0, 119);
  g.restore();
});
const coverPolished = claspPolished.clone();
coverPolished.bumpMap = claspEngraving;
coverPolished.bumpScale = 0.075;

// One curved section with material groups: satin top, polished side bevels.
function curvedClasp(section, edgeMaterials, a, b, isCover = false) {
  const positions = []; const uvs = []; const indices = []; const groups = [];
  const steps = isCover ? 64 : 96;
  const count = section.length;
  const halfWidth = isCover ? 7.65 : 8.25;
  for (let i = 0; i <= steps; i += 1) {
    const e = i / steps; const s = a + (b - a) * e;
    const { p, out } = frameAt(s);
    const endDistance = Math.min(s - a, b - s);
    const roundT = THREE.MathUtils.clamp(endDistance / 1.2, 0, 1);
    const endRound = isCover ? 0.3 * (1 - roundT * roundT * (3 - 2 * roundT)) : 0;
    for (const [x, y] of section) {
      const topWeight = isCover ? Math.max(0, (y - 4.19) / 0.43) : 0;
      const v = p.clone().addScaledVector(X, x)
        .addScaledVector(out, y - 1.5 - endRound * topWeight);
      positions.push(v.x, v.y, v.z);
      uvs.push(isCover ? x / (2 * halfWidth) + 0.5 : x * 0.7, isCover ? e : s * 0.7);
    }
  }
  for (let material = 0; material < 2; material += 1) {
    const start = indices.length;
    for (let i = 0; i < steps; i += 1) for (let q = 0; q < count; q += 1) {
      if (edgeMaterials[q] !== material) continue;
      const a0 = i * count + q; const b0 = i * count + (q + 1) % count;
      const c0 = (i + 1) * count + q; const d0 = (i + 1) * count + (q + 1) % count;
      indices.push(a0, c0, b0, b0, c0, d0);
    }
    groups.push([start, indices.length - start, material]);
  }
  const capStart = indices.length;
  for (const [i, first] of [[0, true], [steps, false]]) {
    const f = frameAt(first ? a : b);
    const x = 0; const y = isCover ? 4.25 : 3.7;
    const v = f.p.clone().addScaledVector(X, x).addScaledVector(f.out, y - 1.5);
    const center = positions.length / 3;
    positions.push(v.x, v.y, v.z); uvs.push(0.5, first ? 0 : 1);
    for (let q = 0; q < count; q += 1) {
      const a0 = i * count + q; const b0 = i * count + (q + 1) % count;
      if (first) indices.push(center, b0, a0); else indices.push(center, a0, b0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  for (const [start, size, material] of groups) g.addGroup(start, size, material);
  g.addGroup(capStart, indices.length - capStart, isCover ? 1 : 0);
  g.computeVertexNormals();
  return g;
}
const claspA = sMid - CLASP / 2;
const claspB = sMid + CLASP / 2;
const claspBottomXs = [-8, -7, -6, -5, -4, -3.4, -2, 0, 2, 3.4, 4, 5, 6, 7, 8];
const claspBody = [
  ...claspBottomXs.map((x) => [x, strapTopAt(x, strapWidth(sMid), strapThickness(sMid)) + 0.025]),
  [8.25, 3.2], [8.25, 3.91], [7.65, 4.22], [-7.65, 4.22],
  [-8.25, 3.91], [-8.25, 3.2],
];
const claspFinishes = [...claspBottomXs.map((_, i) => i === claspBottomXs.length - 1 ? 1 : 0),
  1, 1, 0, 1, 1, 1];
bracelet.add(new THREE.Mesh(
  curvedClasp(claspBody, claspFinishes, claspA, claspB),
  [claspSatin, claspPolished],
));
const coverA = sMid - 7.8; const coverB = sMid + 7.8;
const claspCover = [
  [-7.3, 4.19], [7.3, 4.19], [7.65, 4.32], [7.65, 4.48],
  [7.35, 4.59], [0, 4.62], [-7.35, 4.59], [-7.65, 4.48], [-7.65, 4.32],
];
bracelet.add(new THREE.Mesh(
  curvedClasp(claspCover, Array(claspCover.length).fill(1), coverA, coverB, true),
  [claspSatin, coverPolished],
));
const foldS = coverA + 1.2;
const fold = frameAt(foldS);
const foldPoints = [-7.1, 0, 7.1].map((x) => fold.p.clone()
  .addScaledVector(X, x).addScaledVector(fold.out, 4.65 - 1.5));
bracelet.add(new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(foldPoints), 24, 0.025, 5, false),
  claspSatin,
));

watch.add(bracelet);

// Draw this separately after tone mapping: 18% black cannot darken the over-exposed
// scene background before the OutputPass, but blends cleanly into its pure-white result.
const shadowMap = canvasTexture(256, (g, s) => {
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.18)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
});
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
shadow.rotation.x = -Math.PI / 2;
shadow.position.set(0, -31, 0);
shadow.material.depthTest = false;
const shadowScene = new THREE.Scene();
shadowScene.add(shadow);

// ---------------------------------------------------------------- turntable pivot
watch.position.z = 9;          // spin around the middle of case + loop
watch.rotation.x = -0.06;      // a touch of tilt shows the top of the bezel
const pivot = new THREE.Group();
pivot.add(watch);
scene.add(pivot);

// ---------------------------------------------------------------- post: ambient occlusion
const composer = new EffectComposer(renderer);
composer.setPixelRatio(2);
composer.setSize(SIZE, SIZE);
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, SIZE * 2, SIZE * 2);
ao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 16 });
ao.blendIntensity = 0.6;
composer.addPass(ao);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- render / export
function render(i) {
  currentFrame = i;
  pivot.rotation.y = (i / FRAMES) * Math.PI * 2;
  composer.render();
  renderer.autoClear = false;
  renderer.render(shadowScene, camera);
  renderer.autoClear = true;
  document.getElementById('status').textContent = `frame ${i}${ready ? '' : ' (cargando)'}`;
}

const down = document.createElement('canvas');
down.width = down.height = SIZE;
const dctx = down.getContext('2d');
dctx.imageSmoothingQuality = 'high';
async function snapshot(name) {
  dctx.drawImage(renderer.domElement, 0, 0, SIZE, SIZE);
  const blob = await new Promise((r) => down.toBlob(r, 'image/webp', 0.86));
  await fetch(`/__save-frame?name=${name}`, { method: 'POST', body: blob });
}

const slider = document.getElementById('slider');
slider.value = currentFrame;
slider.addEventListener('input', () => render(Number(slider.value)));
render(currentFrame);

window.exportSequence = async () => {
  for (let i = 0; i < FRAMES; i += 1) {
    render(i);
    await snapshot(`watch_${String(i).padStart(3, '0')}.webp`);
    if (i === 0) await snapshot('poster.webp');
  }
  document.getElementById('status').textContent = `exported ${FRAMES} frames`;
  return 'done';
};
if (new URLSearchParams(location.search).get('export') === '1') window.exportSequence();
