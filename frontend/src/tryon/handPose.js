import * as THREE from 'three';

const v = (p) => new THREE.Vector3(p.x, -p.y, -p.z);

// MediaPipe guesses depth from a single image and overstates it: a hand lying flat often comes back tilted
// by 30-60 degrees. What the camera sees (x, y) is reliable, so only this share of the depth is kept.
const DEPTH = 0.45;

/**
 * Wrist pose from MediaPipe's 21 hand landmarks, in screen pixels centred on the view (y up).
 * world: metric landmarks; image: normalised landmarks; label: MediaPipe's handedness; view: cover-fit geometry.
 */
export function wristPose(image, world, label, view, mirrored, flipped) {
  const sx = mirrored ? -1 : 1;
  const px = (p) => new THREE.Vector2(sx * (p.x - 0.5) * view.videoW * view.scale, -(p.y - 0.5) * view.videoH * view.scale);
  const w = world.map((p) => { const q = v(p); q.x *= sx; return q; });
  const s = image.map(px);

  // Pixels per metre. A segment can only look shorter on screen than it really is, so the least shortened one
  // (the largest ratio) is the closest to the true scale, whatever the hand's tilt. Only the three long bones
  // from the wrist are used: MediaPipe squeezes the distances across the knuckles (7-33 mm instead of about
  // 65 mm in tests), and those short segments made the watch up to six times too big.
  let perMetre = 0;
  for (const [a, b] of [[0, 5], [0, 9], [0, 17]]) {
    const metres = w[a].distanceTo(w[b]);
    if (metres > 0.03) perMetre = Math.max(perMetre, s[a].distanceTo(s[b]) / metres);
  }
  if (!perMetre) return null;

  // Directions in metres: on-screen part from the image, depth from the metric landmarks (softened).
  const toward = (a, b) => {
    const d = s[b].clone().sub(s[a]).divideScalar(perMetre);
    return new THREE.Vector3(d.x, d.y, (w[b].z - w[a].z) * DEPTH);
  };
  const knuckles = s[5].clone().add(s[17]).multiplyScalar(0.5);
  const f = new THREE.Vector3(...knuckles.clone().sub(s[0]).divideScalar(perMetre).toArray(), ((w[5].z + w[17].z) / 2 - w[0].z) * DEPTH).normalize();
  const p = toward(5, 17);
  p.addScaledVector(f, -p.dot(f));
  if (!Number.isFinite(p.x) || p.lengthSq() < 1e-6) return null;
  p.normalize();

  // The label assumes a mirrored selfie, so it names the apparent hand only when the view is mirrored.
  let left = (label === 'Left') === mirrored;
  if (flipped) left = !left;
  const x = left ? f.clone() : f.clone().negate();
  const z = new THREE.Vector3().crossVectors(x, p);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, p, z));

  // Wrist width from the palm length (wrist to middle knuckle), the measurement MediaPipe gets most steadily.
  const palm = w[0].distanceTo(w[9]);
  const wrist = palm * 0.62 * perMetre;

  // A watch is worn about two centimetres behind the wrist joint, along the forearm.
  const back = palm * 0.2 * perMetre;
  return { position: new THREE.Vector3(s[0].x - f.x * back, s[0].y - f.y * back, 0), quaternion, wrist };
}

/**
 * One Euro filter: smooths hard when the hand is still (no trembling) and barely when it moves (no lag).
 * minCutoff in Hz; beta raises the cutoff with speed (units of the value per second).
 */
export class OneEuro {
  constructor(minCutoff, beta, dCutoff = 1) {
    Object.assign(this, { minCutoff, beta, dCutoff, value: null, speed: 0 });
  }

  static alpha(cutoff, dt) { return 1 / (1 + 1 / (2 * Math.PI * cutoff * dt)); }

  filter(value, dt) {
    if (this.value === null || !(dt > 0)) { this.value = value; this.speed = 0; return value; }
    this.speed += OneEuro.alpha(this.dCutoff, dt) * ((value - this.value) / dt - this.speed);
    this.value += OneEuro.alpha(this.minCutoff + this.beta * Math.abs(this.speed), dt) * (value - this.value);
    return this.value;
  }

  reset() { this.value = null; this.speed = 0; }
}
