import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import designs from './designs.json' with { type: 'json' };
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/*
 * Every watch is built in millimetres in the same frame: +X = 3 o'clock, +Y = 12 o'clock, +Z = out of the dial.
 * The bracelet is a closed loop in the YZ plane. LOOP is its centre, where the wrist goes.
 */
export const LOOP = { z: -19, a: 33, b: 17 };
const BLACK = '#0b0c0f';
const STEEL = 0xc9ccd1;

const BASE = { bezel: 'smooth', markers: 'baton', hands: 'baton', links: 3, bezelColor: BLACK };

/** Design traits of each watch in the catalogue; dial colour and diameter come from the product itself. */
const TRAITS = [
  ['submariner', { glb: '/models/submariner.glb' }],
  ['daytona', { bezel: 'tachymeter', markers: 'baton', subdials: [3, 6, 9], subRing: BLACK, pushers: true, accent: '#b3202c' }],
  ['datejust', { bezel: 'fluted', markers: 'baton', date: 3, cyclops: true, links: 5 }],
  ['gmt', { guards: true, bezel: 'gmt', markers: 'dots', date: 3, cyclops: true, hands: 'luminous', links: 5, gmtHand: '#b3202c' }],
  ['speedmaster', { bezel: 'tachymeter', markers: 'baton', subdials: [3, 6, 9], pushers: true, accent: '#f2f2f2' }],
  ['planet ocean', { guards: true, bezel: 'dive', markers: 'arabic', date: 3, hands: 'arrow', accent: '#f2f2f2' }],
  ['seamaster', { guards: true, bezel: 'dive', markers: 'dots', date: 6, hands: 'skeleton', accent: '#c8312f', bezelColor: '#10264f' }],
  ['constellation', { bezel: 'roman', markers: 'baton', date: 6, claws: true, links: 5 }],
  ['carrera', { bezel: 'smooth', markers: 'baton', subdials: [12, 6, 9], subRing: '#c9ccd1', date: 3, pushers: true, accent: '#c8312f' }],
  ['monaco', { square: true, crownLeft: true, bezel: 'none', markers: 'baton', subdials: [3, 9], subFill: '#f1f1ee', date: 6, pushers: true, accent: '#c8312f' }],
  ['aquaracer', { guards: true, bezel: 'dodecagon', markers: 'dots', date: 6, hands: 'luminous' }],
  ['formula', { guards: true, bezel: 'dive', markers: 'arabic', date: 3, hands: 'luminous', accent: '#c8312f' }],
];

const DIALS = {
  black: '#0c0d10', blue: '#12315f', white: '#f1f0ea', silver: '#d5d6d8', green: '#123c2c', grey: '#4a4d52', brown: '#4a2c1b', cream: '#eadfc6',
  red: '#6d1420', turquoise: '#3f9c9a', salmon: '#d9a189', orange: '#c4571c', purple: '#3b2350', champagne: '#d8bf8c', yellow: '#d9a520', pink: '#dfb0b4',
};
const METALS = [[/steel & rose gold/i, STEEL], [/rose gold/i, 0xd9997a], [/white gold/i, STEEL], [/gold/i, 0xd8a648], [/bronze/i, 0xa5713b], [/titanium/i, 0x8f9195], [/black/i, 0x2c2e33]];

export function traitsFor(product) {
  const name = product.name.toLowerCase();
  const found = designs[product.referenceNumber] ?? TRAITS.find(([key]) => name.includes(key))?.[1] ?? {};
  const diameter = Number.parseFloat(product.caseDiameter) || 41;
  return {
    ...BASE, ...found, diameter,
    lug: Math.min(10.2, diameter * 0.25),
    dial: DIALS[product.dialColor?.toLowerCase()] ?? DIALS.black,
    label: [{ QUARTZ: 'QUARTZ', MANUAL: 'MANUAL', AUTOMATIC: 'AUTOMATIC' }[product.movementType] ?? 'AUTOMATIC'],
    metal: METALS.find(([key]) => key.test(product.caseMaterial ?? ''))?.[1] ?? STEEL,
  };
}

const steel = (roughness, color = STEEL) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness, side: THREE.DoubleSide });
const glassMaterial = (opacity = 0.03) => new THREE.MeshPhysicalMaterial({ transparent: true, opacity, roughness: 0.02, depthWrite: false, specularIntensity: 0.15, envMapIntensity: 0.25 });
const luminance = (hex) => new THREE.Color(hex).getHSL({}).l;

function canvasTexture(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  c.translate(size / 2, size / 2);
  draw(c, size / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Where an hour marker goes: on a circle, or following the sides of a rectangular dial. 1 = edge of the dial. */
function markerReach(t, angle) {
  if (!t.ratio) return 1;
  return Math.min(t.ratio / Math.max(0.001, Math.abs(Math.sin(angle))), 1 / Math.max(0.001, Math.abs(Math.cos(angle))));
}
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function digitalTexture(t) {
  return canvasTexture(1024, (c, R) => {
    c.fillStyle = t.dial; c.fillRect(-R, -R, R * 2, R * 2);
    const w = R * (t.ratio ?? 1) * 0.72;
    c.fillStyle = '#b9c2a6'; c.fillRect(-w, -R * 0.36, w * 2, R * 0.72);
    c.fillStyle = '#1d231a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 ${w * 0.66}px "Courier New", monospace`; c.fillText('10:09', 0, R * 0.06);
    c.font = `700 ${w * 0.2}px "Courier New", monospace`; c.fillText('WE 28', 0, -R * 0.25);
    c.fillStyle = luminance(t.dial) > 0.42 ? '#17181b' : '#f4f3ee'; c.font = `600 ${R * 0.08}px Helvetica, Arial, sans-serif`;
    c.fillText('DIGITAL', 0, -R * 0.62); c.fillText('ALARM  CHRONO', 0, R * 0.62);
  });
}

function dialTexture(t) {
  if (t.digital) return digitalTexture(t);
  const light = luminance(t.dial) > 0.42;
  const ink = light ? '#17181b' : '#f4f3ee';
  return canvasTexture(1024, (c, R) => {
    c.fillStyle = t.dial;
    c.fillRect(-R, -R, R * 2, R * 2);
    const sun = c.createConicGradient(0.6, 0, 0);
    for (let i = 0; i <= 8; i += 1) sun.addColorStop(i / 8, i % 2 ? 'rgba(255,255,255,0)' : `rgba(255,255,255,${light ? 0.35 : 0.13})`);
    c.fillStyle = sun;
    c.fillRect(-R, -R, R * 2, R * 2);

    for (let i = 0; i < 60 && !t.ratio && t.track !== false; i += 1) {
      c.save(); c.rotate((i * Math.PI) / 30); c.fillStyle = ink;
      c.fillRect(-1.5, -R * 0.97, 3, R * (i % 5 ? 0.035 : 0.055)); c.restore();
    }
    for (let h = 1; h <= 12; h += 1) {
      if (t.date === h || t.moon && h === 6 || t.markers === 'none') continue;
      c.save(); c.rotate((h * Math.PI) / 6);
      const y = -R * 0.8 * markerReach(t, (h * Math.PI) / 6);
      c.fillStyle = light ? '#26282c' : '#f6f4e9';
      c.strokeStyle = t.metal === STEEL ? '#b9bcc2' : `#${new THREE.Color(t.metal).getHexString()}`; c.lineWidth = 7;
      if (t.lumeColor) c.fillStyle = t.lumeColor;
      if (t.markers === 'dots' && h === 12) {
        c.beginPath(); c.moveTo(-R * 0.085, y - R * 0.07); c.lineTo(R * 0.085, y - R * 0.07); c.lineTo(0, y + R * 0.1); c.closePath();
      } else if (t.markers === 'dots' && h % 3) {
        c.beginPath(); c.arc(0, y, R * 0.062, 0, 7);
      } else if (t.markers === 'gems') {
        c.beginPath(); c.arc(0, y, R * 0.032, 0, 7);
      } else if (t.markers === 'numerals' || t.markers === 'roman') {
        c.translate(0, y + R * 0.02); c.rotate((-h * Math.PI) / 6);
        c.font = `600 ${R * (t.markers === 'roman' ? 0.15 : 0.19) * (t.ratio ? 0.85 : 1)}px ${t.markers === 'roman' ? 'Georgia, serif' : 'Helvetica, Arial, sans-serif'}`;
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t.markers === 'roman' ? ROMAN[h] : String(h), 0, 0);
        c.restore(); continue;
      } else if (t.markers === 'thin') {
        c.fillStyle = c.strokeStyle; c.lineWidth = 2; c.beginPath(); c.rect(-R * 0.011, y - R * 0.1, R * 0.022, R * 0.2);
      } else if (t.markers === 'arabic' && h % 3 === 0) {
        c.translate(0, y + R * 0.03); c.rotate((-h * Math.PI) / 6);
        c.font = `600 ${R * 0.22}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(h), 0, 0);
        c.restore(); continue;
      } else {
        const w = R * (h === 12 ? 0.075 : 0.05);
        c.beginPath(); c.rect(-w / 2, y - R * 0.08, w, R * 0.19);
      }
      c.stroke(); c.fill(); c.restore();
    }
    for (const h of t.subdials ?? []) {
      const angle = (h * Math.PI) / 6;
      const r = R * 0.245;
      c.save(); c.translate(Math.sin(angle) * R * 0.46, -Math.cos(angle) * R * 0.46);
      c.fillStyle = t.subFill ?? (light ? '#fbfaf6' : 'rgba(0,0,0,0.42)');
      c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
      c.strokeStyle = t.subRing ?? 'rgba(255,255,255,0.4)'; c.lineWidth = t.subRing ? 22 : 4;
      c.beginPath(); c.arc(0, 0, r - c.lineWidth / 2, 0, 7); c.stroke();
      const subInk = t.subFill || light ? '#17181b' : '#f4f3ee';
      for (let i = 0; i < 12; i += 1) {
        c.save(); c.rotate((i * Math.PI) / 6); c.fillStyle = subInk; c.fillRect(-1.5, -r * 0.8, 3, r * 0.16); c.restore();
      }
      c.rotate(0.7 + h); c.fillStyle = t.accent && t.subFill ? t.accent : subInk; c.fillRect(-4, -r * 0.7, 8, r * 0.85);
      c.restore();
    }
    if (t.moon) {
      c.save(); c.translate(0, R * 0.48); c.beginPath(); c.arc(0, 0, R * 0.24, Math.PI, 0); c.closePath(); c.fillStyle = '#101d3d'; c.fill(); c.clip();
      c.fillStyle = '#e9cf83'; c.beginPath(); c.arc(R * 0.03, -R * 0.1, R * 0.085, 0, 7); c.fill();
      c.fillStyle = '#fff'; [[-0.14, -0.08], [-0.1, -0.17], [0.15, -0.13], [0.12, -0.04]].forEach(([x, y]) => c.fillRect(x * R, y * R, 5, 5));
      c.restore();
    }
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `600 ${R * 0.052}px Helvetica, Arial, sans-serif`;
    if (!t.subdials && !t.moon) (t.label ?? ['AUTOMATIC']).forEach((line, i) => c.fillText(line, 0, R * (0.36 + i * 0.075)));
    if (t.date) {
      const angle = (t.date * Math.PI) / 6;
      const reach = R * 0.74 * markerReach(t, angle);
      c.save(); c.translate(Math.sin(angle) * reach, -Math.cos(angle) * reach);
      c.fillStyle = '#f7f6f1'; c.strokeStyle = '#b9bcc2'; c.lineWidth = 6;
      c.beginPath(); c.rect(-R * 0.1, -R * 0.085, R * 0.2, R * 0.17); c.fill(); c.stroke();
      c.fillStyle = '#17181b'; c.font = `600 ${R * 0.14}px Helvetica, Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('28', 0, R * 0.01); c.restore();
    }
  });
}

/** Square texture whose ring between inner and outer (fractions of the radius) is the bezel. */
function bezelTexture(t, inner) {
  return canvasTexture(1024, (c, R) => {
    const band = R * (1 - inner);
    const mid = R - band / 2;
    const roman = t.bezel === 'roman' || t.bezel === 'dodecagon';
    c.fillStyle = roman ? `#${new THREE.Color(t.metal).getHexString()}` : t.bezelColor;
    c.fillRect(-R, -R, R * 2, R * 2);
    if (t.bezel === 'gmt') {
      c.fillStyle = t.bezelTop ?? '#16244d'; c.fillRect(-R, -R, R * 2, R);
      c.fillStyle = t.bezelBottom ?? '#7d1726'; c.fillRect(-R, 0, R * 2, R);
    }
    c.fillStyle = roman ? '#17181b' : '#eceae2';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const at = (turn, draw) => { c.save(); c.rotate(turn * Math.PI * 2); c.translate(0, -mid); draw(); c.restore(); };
    const text = (turn, label, size) => at(turn, () => { c.font = `600 ${band * size}px Helvetica, Arial, sans-serif`; c.fillText(label, 0, 0); });
    const tick = (turn, w, h) => at(turn, () => c.fillRect(-w / 2, (-band * h) / 2, w, band * h));
    const triangle = () => at(0, () => {
      c.beginPath(); c.moveTo(-band * 0.4, -band * 0.36); c.lineTo(band * 0.4, -band * 0.36); c.lineTo(0, band * 0.36); c.fill();
    });
    if (t.bezel === 'tachymeter') {
      ['60', '65', '70', '75', '80', '90', '100', '120', '140', '160', '200', '240', '300', '400'].forEach((n) => text(60 / Number(n), n, 0.55));
      for (let i = 0; i < 60; i += 1) at(i / 60, () => c.fillRect(-1.5, band * 0.36, 3, band * 0.14));
    } else if (t.bezel === 'gmt') {
      triangle();
      for (let h = 2; h < 24; h += 2) text(h / 24, String(h), 0.7);
      for (let h = 1; h < 24; h += 2) at(h / 24, () => { c.beginPath(); c.arc(0, 0, band * 0.12, 0, 7); c.fill(); });
    } else if (t.bezel === 'roman') {
      ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => text(i / 12, n, 0.62));
    } else {
      triangle();
      for (let m = 10; m < 60; m += 10) text(m / 60, String(m), 0.72);
      for (let m = 1; m < 60; m += 1) if (m % 10) tick(m / 60, m % 5 ? 4 : 12, m % 5 ? 0.22 : 0.6);
    }
  });
}

function flatRing(inner, outer, texture, z, material) {
  const geometry = new THREE.RingGeometry(inner, outer, 96, 1);
  const p = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i += 1) uv.setXY(i, 0.5 + p.getX(i) / (2 * outer), 0.5 + p.getY(i) / (2 * outer));
  const mesh = new THREE.Mesh(geometry, material ?? new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.35, clearcoat: 0.5, envMapIntensity: 0.6 }));
  mesh.position.z = z;
  return mesh;
}

/** Solid turned around the watch axis from [radius, z] points. */
function turned(points, material, segments = 96) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, z]) => new THREE.Vector2(r, z)), segments), material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function roundedBox(w, h, depth, radius, material, bevel = 0.35) {
  const x = w / 2 - bevel; const y = h / 2 - bevel; const r = Math.max(0.05, Math.min(radius, x * 0.95, y * 0.95));
  const s = new THREE.Shape();
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  const g = new THREE.ExtrudeGeometry(s, { depth: depth - bevel * 2, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  return new THREE.Mesh(g, material);
}

function lugMesh(R, material, w) {
  const s = new THREE.Shape();
  s.moveTo(R * 0.5, 1.6); s.lineTo(R * 0.8, 1.3); s.quadraticCurveTo(R + 2, -0.6, R + 3, -5.8);
  s.lineTo(R + 1.8, -6.6); s.quadraticCurveTo(R, -5.4, R * 0.5, -5.2);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelSize: 0.35, bevelThickness: 0.35, bevelSegments: 2, curveSegments: 14 });
  g.translate(0, 0, -w / 2);
  // Profile drawn in (Y, Z): move the shape's axes onto the watch's.
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  return new THREE.Mesh(g, material);
}

/** Leather, rubber, textile or mesh band: one rounded section swept along the loop. */
function softStrap(t, curve) {
  const group = new THREE.Group();
  const steps = 220;
  const thick = t.strap === 'nato' ? 0.8 : t.strap === 'mesh' ? 1 : 1.5;
  const section = [[-0.5, -0.5], [-0.47, 0.6], [-0.4, 1], [0.4, 1], [0.47, 0.6], [0.5, -0.5]];
  const positions = []; const uvs = []; const index = [];
  const normal = new THREE.Vector3();
  const widthAt = (u) => t.lug * 2 - 0.3 - t.lug * 0.35 * Math.min(1, Math.min(u, 1 - u) * 3);
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps; const p = curve.getPointAt(u); const tangent = curve.getTangentAt(u);
    normal.crossVectors(new THREE.Vector3(1, 0, 0), tangent);
    section.forEach(([x, n], k) => {
      positions.push(x * widthAt(u), p.y + normal.y * n * thick, p.z + normal.z * n * thick);
      uvs.push(k / (section.length - 1), u);
      if (i < steps) {
        const a = i * section.length + k; const b = i * section.length + ((k + 1) % section.length);
        index.push(a, b, a + section.length, b, b + section.length, a + section.length);
      }
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  let material;
  if (t.strap === 'mesh') {
    const weave = canvasTexture(128, (c, R) => {
      c.fillStyle = '#777'; c.fillRect(-R, -R, R * 2, R * 2);
      c.strokeStyle = '#fff'; c.lineWidth = 12;
      for (let k = -4; k <= 4; k += 1) { c.beginPath(); c.moveTo(k * 32 - R, -R); c.lineTo(k * 32 + R, R); c.moveTo(k * 32 + R, -R); c.lineTo(k * 32 - R, R); c.stroke(); }
    });
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping; weave.repeat.set(9, 64);
    material = steel(0.35, t.metal); material.bumpMap = weave; material.bumpScale = 1.5; material.map = weave;
  } else {
    material = new THREE.MeshStandardMaterial({ color: t.strapColor ?? '#1a1a1c', roughness: t.strap === 'rubber' ? 0.55 : 0.82, side: THREE.DoubleSide });
  }
  group.add(new THREE.Mesh(geometry, material));
  const rows = t.strap === 'leather' ? [-0.4, 0.4] : t.strap === 'nato' && t.stripe ? [-0.16, 0, 0.16] : t.strap === 'rubber' ? [-0.2, 0.2] : [];
  if (rows.length) {
    const count = t.strap === 'leather' ? 90 : 160;
    const size = t.strap === 'leather' ? [0.28, 0.9, 0.3] : t.strap === 'nato' ? [t.lug * 0.3, curve.getLength() / count + 0.15, 0.1] : [0.9, curve.getLength() / count + 0.1, 0.5];
    const color = t.strap === 'leather' ? (t.stitch ?? '#e8dcc4') : t.strap === 'nato' ? t.stripe : new THREE.Color(t.strapColor ?? '#1a1a1c').multiplyScalar(0.6);
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), count * rows.length);
    const m = new THREE.Matrix4(); const side = new THREE.Vector3(1, 0, 0);
    rows.forEach((row, k) => {
      for (let i = 0; i < count; i += 1) {
        const u = (i + 0.5) / count; const p = curve.getPointAt(u); const tangent = curve.getTangentAt(u);
        normal.crossVectors(side, tangent);
        m.makeBasis(side, tangent, normal);
        m.setPosition(row * widthAt(u), p.y + normal.y * (thick + 0.02), p.z + normal.z * (thick + 0.02));
        mesh.setMatrixAt(k * count + i, m);
      }
    });
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  const buckle = new THREE.Mesh(new THREE.TorusGeometry(t.lug * 0.95, 0.8, 8, 4), steel(0.25, t.metal));
  buckle.rotation.z = Math.PI / 4;
  buckle.position.z = LOOP.z - LOOP.b - 1.6;
  group.add(buckle);
  return group;
}

function bracelet(t, reach) {
  const group = new THREE.Group();
  const start = Math.asin(Math.min(0.95, reach / LOOP.a));
  const points = [];
  for (let i = 0; i <= 400; i += 1) {
    const angle = start + ((Math.PI * 2 - start * 2) * i) / 400;
    points.push(new THREE.Vector3(0, LOOP.a * Math.sin(angle), LOOP.z + LOOP.b * Math.cos(angle)));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  curve.arcLengthDivisions = 800;
  if (t.strap) { group.add(softStrap(t, curve)); return group; }
  const pitch = t.links === 5 ? 3.4 : 5;
  const count = Math.round(curve.getLength() / pitch);
  const step = curve.getLength() / count;
  const columns = t.links === 5 ? [[-0.36, 0.26], [-0.135, 0.17], [0.045, 0.17], [0.225, 0.17], [0.4, 0.2]] : [[-0.335, 0.31], [0, 0.34], [0.335, 0.31]];
  const unit = roundedBox(1, step * 0.95, 2.5, 0.2, steel(0.2), 0.28).geometry;
  const second = t.twoTone ?? t.metal;
  columns.forEach(([x, w], column) => {
    const edge = column === 0 || column === columns.length - 1;
    const mesh = new THREE.InstancedMesh(unit, steel(edge ? 0.34 : 0.16, edge ? t.metal : second), count);
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const basis = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      const u = (i + 0.5) / count;
      const p = curve.getPointAt(u); const tangent = curve.getTangentAt(u);
      const side = new THREE.Vector3(1, 0, 0);
      basis.makeBasis(side, tangent, new THREE.Vector3().crossVectors(side, tangent));
      q.setFromRotationMatrix(basis);
      const width = (t.square ? 12.5 : t.integrated ? t.lug * 1.15 : t.lug) * 2 - 0.2 - t.lug * 0.4 * Math.min(1, Math.min(u, 1 - u) * 3);
      p.x = x * width;
      m.compose(p, q, new THREE.Vector3(w * width, 1, 1));
      mesh.setMatrixAt(i, m);
    }
    mesh.frustumCulled = false;
    group.add(mesh);
  });
  const clasp = roundedBox(t.lug * 1.62, 26, 2.6, 1, steel(0.3, t.metal));
  clasp.rotation.x = Math.PI;
  clasp.position.z = LOOP.z - LOOP.b - 0.7;
  group.add(clasp);
  return group;
}

function hands(t, R, z) {
  const group = new THREE.Group();
  const light = luminance(t.dial) > 0.42;
  const metal = new THREE.MeshStandardMaterial({ color: t.metal !== STEEL && t.metal !== 0x2c2e33 ? t.metal : light ? 0x4a4c50 : 0xf3f3f1, metalness: 0.6, roughness: 0.25 });
  const lume = new THREE.MeshStandardMaterial({ color: t.lumeColor ?? 0xf2f3e2, roughness: 0.7 });
  const len = t.ratio ?? 1;
  const add = (turn, length, width, level, material, tail = 0) => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length + tail, 0.18), material);
    mesh.position.y = (length - tail) / 2;
    pivot.add(mesh);
    pivot.position.z = z + level;
    pivot.rotation.z = -turn * Math.PI * 2;
    group.add(pivot);
    return pivot;
  };
  const wide = (t.hands === 'baton' ? 1 : t.hands === 'thin' ? 0.55 : 1.5) * Math.min(1, R / 15);
  const hour = add((10 + 9 / 60) / 12, R * 0.5 * len, 1.5 * wide, 0.2, metal);
  const minute = add(9.5 / 60, R * 0.78 * len, 1.1 * wide, 0.45, metal);
  for (const [pivot, length] of t.hands === 'thin' ? [] : [[hour, 0.5 * len], [minute, 0.78 * len]]) {
    const inlay = new THREE.Mesh(new THREE.PlaneGeometry(0.55 * wide, R * length * 0.62), lume);
    inlay.position.set(0, R * length * 0.56, 0.11);
    pivot.add(inlay);
  }
  if (t.hands === 'arrow' || t.hands === 'luminous') {
    const tip = new THREE.Mesh(t.hands === 'arrow' ? new THREE.CircleGeometry(2, 3) : new THREE.CircleGeometry(1.7, 24), lume);
    tip.rotation.z = Math.PI / 2;
    tip.position.set(0, t.hands === 'arrow' ? R * 0.72 : R * 0.38, 0.12);
    (t.hands === 'arrow' ? minute : hour).add(tip);
  }
  if (t.gmtHand) add(0.79, R * 0.72, 0.6, 0.1, new THREE.MeshStandardMaterial({ color: t.gmtHand, roughness: 0.5 }));
  if (t.seconds !== false) add(t.subdials?.length > 1 ? 0 : 0.58, R * 0.88 * len, 0.3, 0.7, t.accent ? new THREE.MeshStandardMaterial({ color: t.accent, roughness: 0.5 }) : metal, R * 0.2);
  const pin = turned([[0, 0.5], [1, 0.5], [1, 0], [0.9, -0.5]], metal, 24);
  pin.position.z = z + 0.6;
  group.add(pin);
  return group;
}

function flatDial(t, half) {
  if (t.ratio) {
    const g = new THREE.ShapeGeometry(outline(t.shape, half * t.ratio, half), 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 1) g.attributes.uv.setXY(i, 0.5 + p.getX(i) / (2 * half), 0.5 + p.getY(i) / (2 * half));
    return g;
  }
  const r = half * 0.16;
  const s = new THREE.Shape();
  s.moveTo(-half + r, -half); s.lineTo(half - r, -half); s.quadraticCurveTo(half, -half, half, -half + r); s.lineTo(half, half - r);
  s.quadraticCurveTo(half, half, half - r, half); s.lineTo(-half + r, half); s.quadraticCurveTo(-half, half, -half, half - r);
  s.lineTo(-half, -half + r); s.quadraticCurveTo(-half, -half, -half + r, -half);
  const g = new THREE.ShapeGeometry(s, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) g.attributes.uv.setXY(i, 0.5 + p.getX(i) / (2 * half), 0.5 + p.getY(i) / (2 * half));
  return g;
}

/** Non-round cases: half width and half height of the outline, in mm. */
function outline(kind, w, h) {
  const s = new THREE.Shape();
  if (kind === 'tonneau') {
    s.moveTo(-w * 0.74, -h); s.lineTo(w * 0.74, -h); s.quadraticCurveTo(w * 1.24, 0, w * 0.74, h); s.lineTo(-w * 0.74, h); s.quadraticCurveTo(-w * 1.24, 0, -w * 0.74, -h);
    return s;
  }
  const r = Math.min(w, h) * (kind === 'cushion' ? 0.62 : 0.14);
  s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
}

function slab(shape, from, to, material) {
  const bevel = 0.6;
  const g = new THREE.ExtrudeGeometry(shape, { depth: to - from - bevel * 2, bevelSize: 0.5, bevelThickness: bevel, bevelSegments: 4, curveSegments: 24 });
  g.translate(0, 0, from + bevel);
  return new THREE.Mesh(g, material);
}

function procedural(t) {
  const group = new THREE.Group();
  const polished = steel(0.13, t.twoTone ?? t.metal);
  const brushed = steel(t.metal === 0x2c2e33 ? 0.5 : 0.32, t.metal);
  const R = t.diameter / 2;
  const shaped = t.shape && t.shape !== 'octagon';
  const half = shaped ? { w: R * (t.width ?? 1), h: R * (t.shape === 'cushion' ? 1 : 1.12) } : null;
  if (t.shape === 'rect' || t.shape === 'tonneau') t.ratio = (half.w * (t.shape === 'tonneau' ? 0.78 : 0.82)) / (half.h * 0.82);
  const dialR = t.square ? R * 0.83 : t.ratio ? half.h * 0.82 : R * 0.76;

  if (shaped && t.shape !== 'cushion') {
    group.add(slab(outline(t.shape, half.w, half.h), -5, 3.6, brushed));
    group.add(slab(outline(t.shape, half.w * 0.9, half.h * 0.9), 2, 4.4, polished));
  } else if (t.square) {
    const body = roundedBox(t.diameter, t.diameter, 9.6, 5, brushed, 0.7);
    body.position.z = -0.6;
    group.add(body);
    const rim = roundedBox(dialR * 2 + 1.6, dialR * 2 + 1.6, 1.2, 4, polished, 0.3);
    rim.position.z = 4.2;
    group.add(rim);
  } else {
    if (t.shape === 'cushion') group.add(slab(outline('cushion', half.w, half.h), -5.2, 1.7, brushed));
    if (t.shape === 'octagon') {
      const top = turned([[R * 1.02, 1.6], [R * 1.01, 3], [R * 0.95, 4.1], [dialR * 1.07, 4.3], [dialR * 1.05, 3]], Object.assign(steel(0.28, t.twoTone ?? t.metal), { flatShading: true }), 8);
      top.geometry.rotateY(Math.PI / 8);
      group.add(top);
    }
    group.add(turned([[0, -5.6], [R * 0.82, -5.6], [R * 0.97, -4], [R, -2.4], [R, 1.4], [R * 0.96, 2.4], [dialR, 2.4], [dialR, 1.5]], brushed));
    group.add(turned([[R * 0.96, 2.2], [R * 0.95, 3.4], [R * 0.91, 4.1]], polished, t.bezel === 'dodecagon' ? 12 : 96));
    group.add(turned([[dialR * 1.02, 4.3], [dialR, 3.6], [dialR * 0.985, 2.2]], polished));
    const insertOuter = R * 0.93;
    if (t.bezel === 'fluted') {
      const n = 72;
      const geometry = new THREE.RingGeometry(dialR, R * 0.97, n * 4, 2);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i += 1) {
        const x = p.getX(i); const y = p.getY(i); const r = Math.hypot(x, y);
        const k = (r - dialR) / (R * 0.97 - dialR);
        p.setZ(i, 4.4 - k * 2 + Math.abs(((Math.atan2(y, x) / (Math.PI * 2) + 1) * n % 1) - 0.5) * 1.1);
      }
      group.add(new THREE.Mesh(geometry.toNonIndexed(), Object.assign(polished.clone(), { flatShading: true, side: THREE.DoubleSide })));
    } else if (t.bezel === 'octagon') {
      for (let i = 0; i < (t.screws === false ? 0 : 8); i += 1) {
        const screw = turned([[0, 0.3], [0.9, 0.3], [0.9, -0.5]], steel(0.2), 6);
        const a = (i / 8) * Math.PI * 2;
        screw.position.set(Math.cos(a) * R * 0.87, Math.sin(a) * R * 0.87, 4.2);
        group.add(screw);
      }
    } else if (t.bezel === 'gems') {
      group.add(turned([[R * 0.97, 2.4], [R * 0.95, 3.4], [R * 0.9, 3.9], [dialR, 3.9]], polished));
      const n = 44; const gem = new THREE.InstancedMesh(new THREE.OctahedronGeometry(R * 0.055), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.02, envMapIntensity: 1.6, flatShading: true }), n);
      for (let i = 0; i < n; i += 1) gem.setMatrixAt(i, new THREE.Matrix4().setPosition(Math.cos((i / n) * Math.PI * 2) * R * 0.85, Math.sin((i / n) * Math.PI * 2) * R * 0.85, 3.9));
      group.add(gem);
    } else if (t.bezel === 'smooth') {
      group.add(turned([[R * 0.97, 2.4], [R * 0.95, 3.4], [R * 0.88, 4.3], [dialR, 4.4]], polished));
    } else {
      const texture = bezelTexture(t, dialR / insertOuter);
      const metalBezel = t.bezel === 'roman' || t.bezel === 'dodecagon';
      group.add(flatRing(dialR, insertOuter, texture, 4.15, metalBezel ? new THREE.MeshStandardMaterial({ map: texture, metalness: 0.85, roughness: 0.3 }) : undefined));
      if (['dive', 'gmt', 'dodecagon'].includes(t.bezel)) {
        const teeth = t.bezel === 'dodecagon' ? 12 : 60;
        const tooth = new THREE.InstancedMesh(new THREE.BoxGeometry(teeth === 12 ? 5 : 1, 1, 1.6), polished, teeth);
        for (let i = 0; i < teeth; i += 1) {
          const a = (i / teeth) * Math.PI * 2;
          tooth.setMatrixAt(i, new THREE.Matrix4().makeRotationZ(a).setPosition(-Math.sin(a) * R * 0.955, Math.cos(a) * R * 0.955, 3.3));
        }
        group.add(tooth);
      }
    }
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) {
        const lug = lugMesh(R, brushed, t.diameter * 0.073);
        lug.scale.y = end;
        lug.position.x = side * (t.lug + t.diameter * 0.046);
        group.add(lug);
      }
    }
    if (t.guards) {
      for (const end of [-1, 1]) {
        const guard = roundedBox(5, 4.2, 5.2, 1.8, brushed, 0.5);
        guard.position.set(R * 0.95, end * 5.2, -1.4);
        guard.rotation.z = end * -0.3;
        group.add(guard);
      }
    }
    if (t.claws) {
      for (const side of [-1, 1]) for (const y of [-2.6, 2.6]) {
        const claw = roundedBox(4.4, 2.2, 1.2, 0.8, polished);
        claw.position.set(side * R * 0.9, y, 4.2);
        group.add(claw);
      }
    }
  }

  if (shaped) {
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      const lug = lugMesh(half.h * 0.96, brushed, t.diameter * 0.073);
      lug.scale.y = end;
      lug.position.x = side * (t.lug + t.diameter * 0.046);
      if (t.shape !== 'cushion') group.add(lug);
    }
  }
  const flat = t.square || t.ratio;
  const dialZ = t.square ? 4.85 : t.ratio ? 4.6 : 2.3;
  const dialMaterial = new THREE.MeshStandardMaterial({ map: dialTexture(t), metalness: 0.1, roughness: 0.5, envMapIntensity: 0.55 });
  const dial = new THREE.Mesh(flat ? flatDial(t, dialR) : new THREE.CircleGeometry(dialR, 96), dialMaterial);
  dial.position.z = dialZ;
  group.add(dial);
  if (!t.digital) group.add(hands(t, dialR, dialZ));

  const glass = new THREE.Mesh(
    flat ? new THREE.PlaneGeometry(dialR * 2 * (t.ratio ?? 1), dialR * 2) : new THREE.CircleGeometry(dialR, 96),
    glassMaterial(),
  );
  glass.position.z = dialZ + 1.6;
  group.add(glass);
  if (t.cyclops) {
    const lens = roundedBox(dialR * 0.3, dialR * 0.26, 0.6, 1.2, glassMaterial(0.12), 0.15);
    lens.position.set(dialR * 0.74, 0, dialZ + 1.9);
    group.add(lens);
  }

  const crown = turned([[0, 1.9], [2.6, 1.9], [2.9, 1.4], [2.9, -1.2], [1.8, -1.6], [1.6, -3]], Object.assign(steel(0.25, t.metal), { flatShading: true }), 22);
  const edge = half?.w ?? R;
  crown.scale.setScalar(Math.min(1, t.diameter / 40));
  crown.rotation.set(0, 0, -Math.PI / 2);
  crown.position.set((t.crownLeft ? -1 : 1) * (edge + 1.5), 0, -1.2);
  if (!t.digital) group.add(crown);
  if (t.pushers) {
    for (const side of [-1, 1]) {
      const pusher = turned([[0, 1.8], [1.9, 1.8], [1.9, 0.2], [1.2, 0.2], [1.2, -3]], polished, 24);
      const a = t.square ? 0 : side * 0.5;
      pusher.rotation.set(0, 0, -Math.PI / 2 + a);
      pusher.position.set(t.square ? R + 1 : Math.cos(a) * (R + 0.6), t.square ? side * R * 0.5 : Math.sin(a) * (R + 0.6), -1);
      group.add(pusher);
    }
  }
  group.add(bracelet(t, (half?.h ?? R) * 0.84));
  return group;
}

async function fromBlender(url) {
  const { scene } = await new GLTFLoader().loadAsync(url);
  scene.rotation.x = -Math.PI / 2; // exported with the dial facing -Y and 12 o'clock on +Z
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const names = `${o.name} ${o.parent?.name ?? ''} ${[].concat(o.material).map((m) => m.name).join(' ')}`.toLowerCase();
    if (names.includes('sapphire')) {
      o.material = glassMaterial();
      o.renderOrder = 2;
    }
    if (/316l|satin|brushed|caseback/.test(names)) o.material = steel(names.includes('polished') ? 0.16 : 0.32);
    if (!o.geometry.attributes.normal) o.geometry = mergeVertices(o.geometry);
  });
  const group = new THREE.Group();
  group.add(scene);
  return group;
}

/**
 * Soft shadow the watch casts on the skin: a band where the bracelet presses on the wrist and a wider patch
 * under the case. It is a sleeve just outside the invisible wrist, so its far half is hidden like the bracelet's.
 * diameter and strap in mm; across: wrist half-width in mm, to turn millimetres around the wrist into texture.
 */
function skinShadow(diameter, strap, across) {
  const length = Math.max(diameter, strap) + 24;
  const W = 512; const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  const alongPx = H / length; // texture v runs along the forearm
  const aroundPx = W / (Math.PI * 2 * across); // texture u runs around the wrist, starting on top of it
  const soft = (x, y, rx, ry, strength) => {
    c.save(); c.translate(x, y); c.scale(rx, ry);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(0,0,0,${strength})`); g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.8})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
  };
  // Bracelet band: dark where it touches, fading over about 7 mm on each side (quickly at first, like real
  // contact shadow).
  const band = c.createLinearGradient(0, 0, 0, H);
  const inner = strap / 2 / length;
  const fade = 7 / length;
  band.addColorStop(0.5, 'rgba(0,0,0,0.6)');
  for (const side of [-1, 1]) {
    [[0, 0.6], [0.15, 0.42], [0.4, 0.2], [0.7, 0.07], [1, 0]]
      .forEach(([k, a]) => band.addColorStop(THREE.MathUtils.clamp(0.5 + side * (inner + k * fade), 0, 1), `rgba(0,0,0,${a})`));
  }
  c.fillStyle = band; c.fillRect(0, 0, W, H);
  // Case: a wider, softer shadow on top of the wrist (u = 0 and u = 1 are the same place).
  for (const x of [0, W]) soft(x, H / 2, (diameter * 0.5 + 7) * aroundPx, (diameter * 0.5 + 7) * alongPx, 0.6);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, length, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.name = 'shadow';
  return mesh;
}

/** Watch centred on its bracelet loop, plus the invisible wrist that hides the far half of the bracelet. */
export async function buildWatch(product) {
  const t = traitsFor(product);
  let body;
  let real = false;
  if (t.glb) {
    try { body = await fromBlender(t.glb); real = true; } catch { body = procedural({ ...t, bezel: 'dive', markers: 'dots', date: 3, cyclops: true, hands: 'luminous' }); }
  } else {
    body = procedural(t);
  }
  const watch = new THREE.Group();
  const z = real ? -16 : LOOP.z;
  body.position.z = -z;
  watch.add(body);
  const occluder = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 110, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.rotation.z = Math.PI / 2;
  // Cylinder runs along X (the forearm); its local X is Y of the watch and its local Z is Z of the watch.
  occluder.scale.set(real ? 30 : LOOP.a - 2, 1, real ? 14.5 : LOOP.b - 2);
  occluder.renderOrder = -1;
  occluder.name = 'wrist';
  watch.add(occluder);
  const strap = t.square ? 25 : (t.integrated ? t.lug * 1.15 : t.lug) * 2;
  const shadow = skinShadow(t.diameter, strap, occluder.scale.x);
  shadow.rotation.z = Math.PI / 2;
  shadow.scale.set(occluder.scale.x * 1.012, 1, occluder.scale.z * 1.012);
  watch.add(shadow);
  watch.userData = { span: real ? 72 : (LOOP.a + 1.5) * 2, illustrative: !real };
  return watch;
}

export function disposeWatch(object) {
  object.traverse((o) => {
    o.geometry?.dispose?.();
    for (const m of [].concat(o.material ?? [])) { m.map?.dispose?.(); m.dispose?.(); }
  });
}
