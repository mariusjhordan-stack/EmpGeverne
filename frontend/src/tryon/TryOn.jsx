import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Download, FlipHorizontal2, ImagePlus, RefreshCw, SwitchCamera, Video, X } from 'lucide-react';
import * as THREE from 'three';
import { useLanguage } from './i18n';
import { buildWatch, disposeWatch, traitsFor } from './watchModel';
import { studioEnvironment } from './studio';
import { OneEuro, wristPose } from './handPose';

const smoothers = () => ({ x: new OneEuro(1.4, 0.012), y: new OneEuro(1.4, 0.012), wrist: new OneEuro(0.8, 0.004) });
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const ERRORS = {
  insecure: 'The camera only works on a secure connection (https). Open this page with https:// or on localhost.',
  denied: 'Camera access was not allowed. Enable it for this site in your browser and try again.',
  missing: 'We could not find a camera on this device.',
  busy: 'The camera is being used by another application. Close it and try again.',
  tracking: 'Hand tracking could not start in this browser.',
  model: 'The 3D watch could not load. Reload the page and try again.',
  photo: 'We could not open that picture. Try another one.',
};

let handsScript;
function loadHands() {
  handsScript ??= new Promise((resolve, reject) => {
    if (window.Hands) { resolve(); return; }
    const tag = document.createElement('script');
    tag.src = '/mediapipe/hands.js';
    tag.onload = resolve;
    tag.onerror = () => { handsScript = undefined; tag.remove(); reject(new Error('tracking')); };
    document.head.append(tag);
  });
  return handsScript;
}

/** Average brightness and colour of the camera picture (or the photo), from a 16 × 16 thumbnail. */
function sampleLight(source, e) {
  try {
    e.probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const c = e.probe;
    c.canvas.width = c.canvas.height = 16;
    c.drawImage(source, 0, 0, 16, 16);
    const data = c.getImageData(0, 0, 16, 16).data;
    let r = 0; let g = 0; let b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = (data.length / 4) * 255;
    r /= n; g /= n; b /= n;
    const color = new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
    // Hue of the room without its brightness, mixed with white so a warm room only warms the highlights.
    const top = Math.max(r, g, b, 0.05);
    const tint = new THREE.Color().setRGB(r / top, g / top, b / top, THREE.SRGBColorSpace).lerp(new THREE.Color(0xffffff), 0.55);
    return { lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, color, tint };
  } catch {
    return e.light;
  }
}

/** Outline of a hand and forearm, with the place of the watch, to show how to stand in front of the camera. */
function HandGuide() {
  return (
    <svg viewBox="0 0 160 280" aria-hidden="true" className="tryon-guide">
      <path
        d="M58 280 L60 192 C51 180 45 162 45 140 L45 78 C45 68 57 68 57 78 L57 102 L58 102 L58 52 C58 42 71 42 71 52 L71 98 L72 98 L72 44 C72 34 85 34 85 44 L85 98 L86 98 L86 56 C86 46 99 46 99 56 L99 120 C104 112 112 100 118 92 C124 84 135 92 130 100 L114 132 C108 146 104 165 100 192 L102 280"
        fill="rgba(255,255,255,.07)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <rect x="53" y="204" width="54" height="24" rx="7" fill="rgba(227,201,149,.16)" stroke="#e3c995" strokeWidth="2" />
    </svg>
  );
}

export default function TryOn({ product, onClose }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState('preview'); // preview | starting | live | reading | photo
  const [error, setError] = useState(null);
  const [found, setFound] = useState(false);
  const [facing, setFacing] = useState('user');
  const [size, setSize] = useState(1);
  const [spin, setSpin] = useState(0); // degrees, only on a photo
  const [flipped, setFlipped] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [notice, setNotice] = useState(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const photoRef = useRef(null);
  const fileRef = useRef(null);
  const closeRef = useRef(null);
  const engine = useRef({});
  const settings = useRef({});
  const photo = phase === 'photo';
  const live = phase === 'live';
  useEffect(() => {
    settings.current = { size, flipped, spin: photo ? spin : 0, photo, mirrored: !photo && facing === 'user', live: live || photo };
  }, [size, flipped, spin, facing, photo, live]);

  const stopCamera = useCallback(() => {
    const e = engine.current;
    e.session = (e.session ?? 0) + 1;
    e.stream?.getTracks().forEach((track) => track.stop());
    e.stream = null;
    e.target = null;
    e.label = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /** Puts the watch on the wrist found in the photo, or in the middle of it when no hand was found. */
  const placePhoto = useCallback((flip) => {
    const e = engine.current;
    const pic = e.photoSize;
    if (!pic || !e.w) return;
    const view = { videoW: pic.w, videoH: pic.h, scale: Math.min(e.w / pic.w, e.h / pic.h) };
    const hand = e.photoHand;
    const pose = hand && wristPose(hand.image, hand.world, hand.label, view, false, flip);
    const shown = { x: (pic.w * view.scale) / 2, y: (pic.h * view.scale) / 2 };
    e.target = pose
      ? { ...pose, at: performance.now() }
      : { position: new THREE.Vector3(), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0)), wrist: Math.min(shown.x, shown.y) * 0.6, at: performance.now() };
    // When the wrist is cut off by the edge of the photo, the watch stays on the picture instead of off it.
    const margin = e.target.wrist * 0.45;
    const { position } = e.target;
    position.x = THREE.MathUtils.clamp(position.x, -Math.max(0, shown.x - margin), Math.max(0, shown.x - margin));
    position.y = THREE.MathUtils.clamp(position.y, -Math.max(0, shown.y - margin), Math.max(0, shown.y - margin));
  }, []);

  // 3D scene: free rotation before the camera, wrist pose afterwards.
  useEffect(() => {
    const e = engine.current;
    const stage = stageRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    const environment = studioEnvironment(renderer);
    scene.environment = environment;
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(-300, 600, 800);
    scene.add(key);
    // Picks up the colour of the room seen by the camera, so the steel is not lit by a different light than the skin.
    const room = new THREE.HemisphereLight(0xffffff, 0x404040, 0);
    scene.add(room);
    const white = new THREE.Color(0xffffff);
    const canvas = canvasRef.current;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
    camera.position.z = 3000;
    const holder = new THREE.Group();
    scene.add(holder);
    let cancelled = false;
    let watch;
    e.drag = { x: 0.5, y: -0.45 };
    e.nudge = new THREE.Vector3();
    e.renderer = renderer;

    buildWatch(product).then((built) => {
      if (cancelled) { disposeWatch(built); return; }
      watch = built;
      holder.add(watch);
      e.watch = watch;
    }).catch(() => !cancelled && setError('model'));

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = stage;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      e.w = w; e.h = h;
      // The photo is fitted to the stage, so the wrist moves when the stage changes size.
      if (settings.current.photo) placePhoto(settings.current.flipped);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    const euler = new THREE.Euler();
    const goal = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { live: onHand, photo: still2d } = settings.current;
      // Match the brightness and colour of the picture; the studio look is kept before the camera starts.
      const light = onHand && e.light;
      const ease = 1 - Math.exp(-dt * 3);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure, light ? THREE.MathUtils.clamp(0.5 + light.lum * 1.05, 0.55, 1.15) : 1.05, ease);
      scene.environmentIntensity = THREE.MathUtils.lerp(scene.environmentIntensity, light ? 0.75 + light.lum * 0.4 : 1, ease);
      room.intensity = THREE.MathUtils.lerp(room.intensity, light ? 0.55 : 0, ease);
      if (light) {
        room.color.lerp(light.color, ease);
        key.color.lerp(light.tint, ease);
      } else {
        key.color.lerp(white, ease);
      }
      if (watch) {
        watch.getObjectByName('wrist').visible = onHand;
        watch.getObjectByName('shadow').visible = onHand;
        if (onHand) {
          const target = e.target;
          // A photo does not move, so its pose never goes stale.
          const seen = !!target && (still2d || now - target.at < 600);
          // Fades in and out instead of popping on and off when the hand is found or lost.
          e.fade = THREE.MathUtils.clamp((e.fade ?? 0) + (seen ? dt * 5 : -dt * 4), 0, 1);
          canvas.style.opacity = String(e.fade);
          holder.visible = e.fade > 0;
          if (seen) {
            const { size: scaleBy, spin: degrees } = settings.current;
            // The pose is already smoothed per camera frame; this only fills the gaps between camera frames.
            const scale = (target.wrist / watch.userData.span) * 1.12 * scaleBy;
            const k = e.placed ? 1 - Math.exp(-dt * 22) : 1;
            goal.copy(target.position);
            if (still2d) goal.add(e.nudge);
            turn.setFromAxisAngle(Z_AXIS, THREE.MathUtils.degToRad(degrees)).multiply(target.quaternion);
            holder.position.lerp(goal, k);
            holder.quaternion.slerp(turn, k);
            holder.scale.setScalar(THREE.MathUtils.lerp(holder.scale.x, scale, k));
            e.placed = true;
          } else if (!e.fade) {
            e.placed = false;
          }
        } else {
          canvas.style.opacity = '1';
          holder.visible = true;
          if (!still && !e.dragging) e.drag.x += dt * 0.35;
          holder.position.set(0, 0, 0);
          holder.quaternion.setFromEuler(euler.set(e.drag.y, Math.sin(e.drag.x) * 0.8, 0.12));
          holder.scale.setScalar((Math.min(e.w, e.h) / 100) * 1.05);
        }
      }
      renderer.render(scene, camera);
    });

    return () => {
      cancelled = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      if (watch) disposeWatch(watch);
      environment.dispose();
      renderer.dispose();
      e.watch = null;
    };
  }, [product, placePhoto]);

  useEffect(() => {
    const e = engine.current;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      stopCamera();
      e.hands?.close?.();
      e.hands = null;
      if (e.photoUrl) URL.revokeObjectURL(e.photoUrl);
    };
  }, [stopCamera]);

  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Turning the watch over on a photo has to work out the pose again.
  useEffect(() => { if (photo) placePhoto(flipped); }, [photo, flipped, placePhoto]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(timer);
  }, [notice]);

  const onResults = useCallback((results) => {
    const e = engine.current;
    // While a photo is being read, its results go to the photo and not to the live tracking.
    if (e.capture) { e.capture(results); return; }
    const video = videoRef.current;
    const image = results.multiHandLandmarks?.[0];
    const world = results.multiHandWorldLandmarks?.[0];
    if (!image || !world || !video?.videoWidth) { e.misses = (e.misses ?? 0) + 1; if (e.misses > 8) { setFound(false); e.lost = true; } return; }
    e.misses = 0;
    const view = { videoW: video.videoWidth, videoH: video.videoHeight, scale: Math.max(e.w / video.videoWidth, e.h / video.videoHeight) };
    const { mirrored, flipped: flip } = settings.current;
    // One doubtful frame must not turn the watch over: a different hand has to be seen several times in a row.
    const label = results.multiHandedness?.[0]?.label;
    if (!e.label || (e.lost && label)) { e.label = label; e.lost = false; }
    e.doubt = label && label !== e.label ? (e.doubt ?? 0) + 1 : 0;
    if (e.doubt > 8) { e.label = label; e.doubt = 0; }
    const pose = wristPose(image, world, e.label, view, mirrored, flip);
    if (!pose) return;
    const now = performance.now();
    // After a gap the filters start again from the new position instead of sliding from the old one.
    if (!e.target || now - e.target.at > 400) { e.smooth = smoothers(); e.target = null; }
    const dt = e.target ? (now - e.target.at) / 1000 : 0;
    const { x, y, wrist } = e.smooth;
    let quaternion = pose.quaternion;
    if (e.target) {
      // Same idea as the One Euro filter for the rotation: firm when the wrist barely turns, loose when it turns fast.
      const turnSpeed = e.target.quaternion.angleTo(pose.quaternion) / Math.max(dt, 1e-3);
      quaternion = e.target.quaternion.clone().slerp(pose.quaternion, OneEuro.alpha(1.2 + turnSpeed * 1.6, dt));
    }
    e.target = {
      position: new THREE.Vector3(x.filter(pose.position.x, dt), y.filter(pose.position.y, dt), 0),
      quaternion,
      wrist: wrist.filter(pose.wrist, dt),
      at: now,
    };
    if (now - (e.lightAt ?? 0) > 250) { e.lightAt = now; e.light = sampleLight(video, e); }
    setFound(true);
  }, []);

  /** MediaPipe hand tracker, loaded once; null when a newer camera or photo request took over. */
  const getHands = async (session) => {
    const e = engine.current;
    await loadHands();
    if (session !== e.session) return null;
    if (!e.hands) {
      const hands = new window.Hands({ locateFile: (file) => `/mediapipe/${file}` });
      hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
      hands.onResults(onResults);
      await hands.initialize().catch(() => { throw new Error('tracking'); });
      if (session !== e.session) { hands.close(); return null; }
      e.hands = hands;
    }
    return e.hands;
  };

  const forgetPhoto = () => {
    const e = engine.current;
    e.photoHand = null;
    e.photoSize = null;
    if (e.photoUrl) URL.revokeObjectURL(e.photoUrl);
    e.photoUrl = null;
    setPhotoUrl(null);
  };

  const start = async (mode) => {
    setError(null);
    setFound(false);
    stopCamera();
    forgetPhoto();
    if (!navigator.mediaDevices?.getUserMedia) { setPhase('preview'); setError(window.isSecureContext ? 'missing' : 'insecure'); return; }
    const e = engine.current;
    const session = e.session;
    setFacing(mode);
    setPhase('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (session !== e.session) { stream.getTracks().forEach((track) => track.stop()); return; }
      e.stream = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      const hands = await getHands(session);
      if (!hands) return;
      e.hands.reset?.();
      setPhase('live');
      const track = async () => {
        if (session !== e.session) return;
        if (video.readyState >= 2 && e.lastTime !== video.currentTime) {
          e.lastTime = video.currentTime;
          try { await e.hands.send({ image: video }); } catch {
            if (session === e.session) { stopCamera(); setPhase('preview'); setError('tracking'); }
            return;
          }
        }
        requestAnimationFrame(track);
      };
      track();
    } catch (err) {
      if (session !== e.session) return;
      stopCamera();
      setPhase('preview');
      setError({ NotAllowedError: 'denied', SecurityError: 'denied', NotFoundError: 'missing', OverconstrainedError: 'missing', NotReadableError: 'busy', AbortError: 'busy' }[err?.name] ?? 'tracking');
    }
  };

  /** A still photo of the wrist: the watch is placed on it once and can then be moved, sized and turned by hand. */
  const onPhoto = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    setError(null);
    setFound(false);
    stopCamera();
    const e = engine.current;
    const session = e.session;
    setPhase('reading');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (session !== e.session) { URL.revokeObjectURL(url); return; }
      forgetPhoto();
      e.photoUrl = url;
      setPhotoUrl(url);
      // A smaller copy is enough to find the hand and is much faster than a 12-megapixel photo.
      const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const small = document.createElement('canvas');
      small.width = Math.round(img.naturalWidth * k);
      small.height = Math.round(img.naturalHeight * k);
      small.getContext('2d').drawImage(img, 0, 0, small.width, small.height);
      let hand = null;
      try {
        const hands = await getHands(session);
        if (!hands) return;
        hands.reset?.();
        e.capture = (results) => {
          const image = results.multiHandLandmarks?.[0];
          const world = results.multiHandWorldLandmarks?.[0];
          if (image && world) hand = { image, world, label: results.multiHandedness?.[0]?.label };
        };
        // The second pass starts from the hand found by the first one and places the landmarks more precisely.
        for (let i = 0; i < 2; i += 1) await hands.send({ image: small });
        hands.reset?.();
      } catch {
        hand = null; // without hand tracking the watch is simply placed by hand
      } finally {
        e.capture = null;
      }
      if (session !== e.session) return;
      e.photoHand = hand;
      e.photoSize = { w: img.naturalWidth, h: img.naturalHeight };
      e.light = sampleLight(small, e);
      e.nudge.set(0, 0, 0);
      e.placed = false;
      e.fade = 0;
      setSize(1);
      setSpin(0);
      setFlipped(false);
      setFound(!!hand);
      setPhase('photo');
    } catch {
      if (session !== e.session) return;
      URL.revokeObjectURL(url);
      forgetPhoto();
      setPhase('preview');
      setError('photo');
    }
  };

  const takePhoto = () => {
    const e = engine.current;
    const source = photo ? photoRef.current : videoRef.current;
    const sw = photo ? source.naturalWidth : source.videoWidth;
    const sh = photo ? source.naturalHeight : source.videoHeight;
    if (!sw || !sh) return;
    const ratio = e.renderer.getPixelRatio();
    // A photo is shown whole (letterboxed) and the video fills the stage; only the picture itself is saved.
    const fit = (photo ? Math.min : Math.max)(e.w / sw, e.h / sh);
    const rw = Math.min(e.w, sw * fit); const rh = Math.min(e.h, sh * fit);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rw * ratio); canvas.height = Math.round(rh * ratio);
    const c = canvas.getContext('2d');
    c.save();
    if (!photo && facing === 'user') { c.translate(canvas.width, 0); c.scale(-1, 1); }
    c.drawImage(source, ((rw - sw * fit) / 2) * ratio, ((rh - sh * fit) / 2) * ratio, sw * fit * ratio, sh * fit * ratio);
    c.restore();
    c.globalAlpha = Number(canvasRef.current.style.opacity || 1);
    c.filter = `blur(${0.35 * ratio}px)`;
    c.drawImage(canvasRef.current, ((e.w - rw) / 2) * ratio, ((e.h - rh) / 2) * ratio, rw * ratio, rh * ratio, 0, 0, canvas.width, canvas.height);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.92);
    a.download = `cronos-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
    a.click();
    setNotice('Photo saved');
  };

  // Pointer gestures: turn the watch before the camera; on a photo, drag it with one finger, pinch to size and twist to turn it.
  const gesture = () => {
    const e = engine.current;
    const points = [...e.pointers.values()];
    if (points.length >= 2) {
      const [a, b] = points;
      e.gesture = { pinch: true, distance: Math.hypot(b.x - a.x, b.y - a.y) || 1, angle: Math.atan2(b.y - a.y, b.x - a.x), size, spin };
    } else if (points.length === 1) {
      e.gesture = { x: points[0].x, y: points[0].y, from: e.nudge.clone() };
    } else {
      e.gesture = null;
    }
  };
  const onDown = (ev) => {
    const e = engine.current;
    if (phase !== 'preview' && !photo) return;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    if (phase === 'preview') { e.dragging = { x: ev.clientX, y: ev.clientY, from: { ...e.drag } }; return; }
    (e.pointers ??= new Map()).set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    gesture();
  };
  const onMove = (ev) => {
    const e = engine.current;
    const d = e.dragging;
    if (d) {
      e.drag = { x: d.from.x + (ev.clientX - d.x) * 0.01, y: THREE.MathUtils.clamp(d.from.y + (ev.clientY - d.y) * 0.008, -1.5, 1.5) };
      return;
    }
    if (!photo || !e.pointers?.has(ev.pointerId)) return;
    e.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const g = e.gesture;
    if (!g) return;
    if (g.pinch) {
      const [a, b] = [...e.pointers.values()];
      setSize(THREE.MathUtils.clamp(g.size * (Math.hypot(b.x - a.x, b.y - a.y) / g.distance), 0.4, 2));
      // The screen's y axis points down, so a clockwise twist of the fingers is a negative turn in 3D.
      const twist = THREE.MathUtils.radToDeg(Math.atan2(b.y - a.y, b.x - a.x) - g.angle);
      setSpin(Math.round(THREE.MathUtils.euclideanModulo(g.spin - twist + 180, 360) - 180));
    } else {
      e.nudge.set(g.from.x + ev.clientX - g.x, g.from.y - (ev.clientY - g.y), 0);
    }
  };
  const onUp = (ev) => {
    const e = engine.current;
    e.dragging = null;
    if (e.pointers?.delete(ev.pointerId)) gesture();
  };
  const onWheel = (ev) => { if (photo) setSize((s) => THREE.MathUtils.clamp(s * Math.exp(-ev.deltaY * 0.0015), 0.4, 2)); };
  const resetPhoto = () => { engine.current.nudge.set(0, 0, 0); setSize(1); setSpin(0); };

  const control = 'inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/70 transition-colors';
  const camera = phase === 'starting' || live;
  const pickPhoto = () => fileRef.current?.click();

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('Virtual try-on')} className="fixed inset-0 z-[90] bg-night text-white flex flex-col">
      <div
        ref={stageRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
        className={`relative flex-1 min-h-0 overflow-hidden touch-none ${photo ? 'cursor-move' : ''} ${camera || photo || phase === 'reading' ? '' : 'cursor-grab bg-[radial-gradient(circle_at_50%_40%,#3b3328_0%,#17140f_60%,#0c0c0e_100%)]'}`}
      >
        <video ref={videoRef} muted playsInline className={`absolute inset-0 w-full h-full object-cover ${camera ? '' : 'hidden'} ${facing === 'user' ? '-scale-x-100' : ''}`} />
        {photoUrl && <img ref={photoRef} src={photoUrl} alt="" draggable="false" className={`absolute inset-0 w-full h-full object-contain select-none ${photo || phase === 'reading' ? '' : 'hidden'}`} />}
        {/* A camera picture is never razor sharp: a hint of blur keeps the watch from looking pasted on. */}
        <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${live || photo ? '[filter:blur(0.35px)]' : ''} ${phase === 'reading' ? 'invisible' : ''}`} />

        <div className="absolute inset-x-0 top-0 p-4 sm:p-6 flex items-start justify-between gap-4 bg-gradient-to-b from-black/55 to-transparent pointer-events-none">
          <div>
            <p className="text-[0.65rem] tracking-[0.28em] uppercase text-[#e3c995]">{t('Virtual try-on')}</p>
            <p className="font-serif text-2xl leading-tight mt-1">{product.name}</p>
            {!traitsFor(product).glb && <p className="text-xs text-white/65 mt-1">{t('Illustrative 3D model')}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} onPointerDown={(ev) => ev.stopPropagation()} aria-label={t('Close')} className={`${control} pointer-events-auto`}><X size={20} /></button>
        </div>

        {live && !found && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 pointer-events-none">
            <HandGuide />
            <p className="w-[min(20rem,90%)] text-center bg-black/60 backdrop-blur px-6 py-4 rounded-2xl">
              {t('Show the back of your hand and your whole wrist, with good light')}
            </p>
          </div>
        )}
        {phase === 'starting' && <p role="status" className="absolute inset-x-0 bottom-8 text-center animate-pulse">{t('Starting the camera…')}</p>}
        {phase === 'reading' && <p role="status" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur px-6 py-4 rounded-2xl animate-pulse">{t('Looking for your wrist…')}</p>}
        {photo && (
          <p role="status" className="absolute left-1/2 bottom-4 -translate-x-1/2 w-[min(26rem,calc(100%-6rem))] text-center text-sm bg-black/60 backdrop-blur px-5 py-3 rounded-2xl pointer-events-none">
            {found ? t('Drag to move the watch · pinch or use the sliders to adjust it') : t('We could not find your hand in this photo. Drag the watch onto your wrist, then adjust its size and rotation.')}
          </p>
        )}
        {notice && <p role="status" className="absolute left-1/2 top-24 -translate-x-1/2 bg-[#e3c995] text-[#17140f] text-sm font-medium px-5 py-2 rounded-full">{t(notice)}</p>}
        {(live || photo) && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3" onPointerDown={(ev) => ev.stopPropagation()}>
            {live && <button type="button" onClick={() => start(facing === 'user' ? 'environment' : 'user')} aria-label={t('Switch camera')} title={t('Switch camera')} className={control}><SwitchCamera size={19} /></button>}
            {photo && <button type="button" onClick={() => start(matchMedia('(pointer: coarse)').matches ? 'environment' : 'user')} aria-label={t('Use the camera')} title={t('Use the camera')} className={control}><Video size={19} /></button>}
            <button type="button" onClick={pickPhoto} aria-label={t(photo ? 'Another photo' : 'Use a photo')} title={t(photo ? 'Another photo' : 'Use a photo')} className={control}><ImagePlus size={19} /></button>
            <button type="button" onClick={() => setFlipped(!flipped)} aria-pressed={flipped} aria-label={t('Turn the watch over')} title={t('Turn the watch over')} className={control}><FlipHorizontal2 size={19} /></button>
            <button type="button" onClick={takePhoto} aria-label={t(photo ? 'Save the photo' : 'Take a photo')} title={t(photo ? 'Save the photo' : 'Take a photo')} className={control}>{photo ? <Download size={19} /> : <Camera size={19} />}</button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
      <div className="px-5 py-4 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))] bg-night border-t border-white/10">
        {error && <p role="alert" className="text-center text-sm text-[#ffb4a8] mb-3">{t(ERRORS[error])}</p>}
        {live || photo ? (
          <div className="grid gap-2 max-w-md mx-auto text-sm">
            <label className="flex items-center gap-4">
              <span className="shrink-0 w-14">{t('Size')}</span>
              <input type="range" min={photo ? 0.4 : 0.7} max={photo ? 2 : 1.4} step="0.01" value={size} onChange={(ev) => setSize(Number(ev.target.value))} className="flex-1 accent-[#d6b779]" />
              {!photo && <button type="button" onClick={() => setSize(1)} aria-label={t('Reset size')} className="p-2 hover:text-[#e3c995]"><RefreshCw size={16} /></button>}
            </label>
            {photo && (
              <label className="flex items-center gap-4">
                <span className="shrink-0 w-14">{t('Rotation')}</span>
                <input type="range" min="-180" max="180" step="1" value={spin} onChange={(ev) => setSpin(Number(ev.target.value))} className="flex-1 accent-[#d6b779]" />
                <button type="button" onClick={resetPhoto} aria-label={t('Reset')} title={t('Reset')} className="p-2 hover:text-[#e3c995]"><RefreshCw size={16} /></button>
              </label>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" disabled={phase !== 'preview'} onClick={() => start(matchMedia('(pointer: coarse)').matches ? 'environment' : 'user')} className="btn-solid btn-gold inline-flex items-center gap-3 disabled:opacity-60">
                <Camera size={17} /> {t('Turn on the camera')}
              </button>
              <button type="button" disabled={phase !== 'preview'} onClick={pickPhoto} className="btn-solid tryon-photo-btn disabled:opacity-60">
                <ImagePlus size={17} /> {t('Use a photo')}
              </button>
            </div>
            <p className="text-xs text-white/65 text-center max-w-sm">{t('The camera and your photos are processed on your device: nothing is recorded or sent anywhere.')}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
