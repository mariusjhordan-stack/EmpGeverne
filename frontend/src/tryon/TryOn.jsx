import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, FlipHorizontal2, RefreshCw, SwitchCamera, X } from 'lucide-react';
import * as THREE from 'three';
import { useLanguage } from './i18n';
import { buildWatch, disposeWatch, traitsFor } from './watchModel';
import { studioEnvironment } from './studio';
import { OneEuro, wristPose } from './handPose';

const smoothers = () => ({ x: new OneEuro(1.4, 0.012), y: new OneEuro(1.4, 0.012), wrist: new OneEuro(0.8, 0.004) });

const ERRORS = {
  insecure: 'The camera only works on a secure connection (https). Open this page with https:// or on localhost.',
  denied: 'Camera access was not allowed. Enable it for this site in your browser and try again.',
  missing: 'We could not find a camera on this device.',
  busy: 'The camera is being used by another application. Close it and try again.',
  tracking: 'Hand tracking could not start in this browser.',
  model: 'The 3D watch could not load. Reload the page and try again.',
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

/** Average brightness and colour of the camera picture, from a 16 × 16 thumbnail. */
function sampleLight(video, e) {
  try {
    e.probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const c = e.probe;
    c.canvas.width = c.canvas.height = 16;
    c.drawImage(video, 0, 0, 16, 16);
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

export default function TryOn({ product, onClose }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState('preview'); // preview | starting | live
  const [error, setError] = useState(null);
  const [found, setFound] = useState(false);
  const [facing, setFacing] = useState('user');
  const [size, setSize] = useState(1);
  const [flipped, setFlipped] = useState(false);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  const engine = useRef({});
  const settings = useRef({});
  useEffect(() => { settings.current = { size, flipped, mirrored: facing === 'user', live: phase === 'live' }; }, [size, flipped, facing, phase]);

  const stopCamera = useCallback(() => {
    const e = engine.current;
    e.session = (e.session ?? 0) + 1;
    e.stream?.getTracks().forEach((track) => track.stop());
    e.stream = null;
    e.target = null;
    e.label = null;
    if (videoRef.current) videoRef.current.srcObject = null;
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
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    const euler = new THREE.Euler();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const live = settings.current.live;
      // Match the brightness and colour of the camera picture; the studio look is kept before the camera starts.
      const light = live && e.light;
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
        watch.getObjectByName('wrist').visible = live;
        watch.getObjectByName('shadow').visible = live;
        if (live) {
          const target = e.target;
          const seen = !!target && now - target.at < 600;
          // Fades in and out instead of popping on and off when the hand is found or lost.
          e.fade = THREE.MathUtils.clamp((e.fade ?? 0) + (seen ? dt * 5 : -dt * 4), 0, 1);
          canvas.style.opacity = String(e.fade);
          holder.visible = e.fade > 0;
          if (seen) {
            // The pose is already smoothed per camera frame; this only fills the gaps between camera frames.
            const scale = (target.wrist / watch.userData.span) * 1.12 * settings.current.size;
            const k = e.placed ? 1 - Math.exp(-dt * 22) : 1;
            holder.position.lerp(target.position, k);
            holder.quaternion.slerp(target.quaternion, k);
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
  }, [product]);

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
    };
  }, [stopCamera]);

  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onResults = useCallback((results) => {
    const e = engine.current;
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

  const start = async (mode) => {
    setError(null);
    setFound(false);
    stopCamera();
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
      await loadHands();
      if (session !== e.session) return;
      if (!e.hands) {
        const hands = new window.Hands({ locateFile: (file) => `/mediapipe/${file}` });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
        hands.onResults(onResults);
        await hands.initialize().catch(() => { throw new Error('tracking'); });
        if (session !== e.session) { hands.close(); return; }
        e.hands = hands;
      }
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

  const takePhoto = () => {
    const e = engine.current;
    const video = videoRef.current;
    const ratio = e.renderer.getPixelRatio();
    const canvas = document.createElement('canvas');
    canvas.width = e.w * ratio; canvas.height = e.h * ratio;
    const c = canvas.getContext('2d');
    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const w = video.videoWidth * scale; const h = video.videoHeight * scale;
    c.save();
    if (facing === 'user') { c.translate(canvas.width, 0); c.scale(-1, 1); }
    c.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    c.restore();
    c.globalAlpha = Number(canvasRef.current.style.opacity || 1);
    c.filter = `blur(${0.35 * ratio}px)`;
    c.drawImage(canvasRef.current, 0, 0, canvas.width, canvas.height);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.92);
    a.download = `cronos-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
    a.click();
  };

  const onDown = (ev) => { if (phase === 'preview') { engine.current.dragging = { x: ev.clientX, y: ev.clientY, from: { ...engine.current.drag } }; ev.currentTarget.setPointerCapture?.(ev.pointerId); } };
  const onMove = (ev) => {
    const d = engine.current.dragging;
    if (!d) return;
    engine.current.drag = { x: d.from.x + (ev.clientX - d.x) * 0.01, y: THREE.MathUtils.clamp(d.from.y + (ev.clientY - d.y) * 0.008, -1.5, 1.5) };
  };
  const onUp = () => { engine.current.dragging = null; };

  const control = 'inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/70 transition-colors';
  const live = phase === 'live';

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('Virtual try-on')} className="fixed inset-0 z-[90] bg-night text-white flex flex-col">
      <div
        ref={stageRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className={`relative flex-1 min-h-0 overflow-hidden touch-none ${live ? '' : 'cursor-grab bg-[radial-gradient(circle_at_50%_40%,#3a3a55_0%,#14142a_60%,#0d0d1a_100%)]'}`}
      >
        <video ref={videoRef} muted playsInline className={`absolute inset-0 w-full h-full object-cover ${phase === 'preview' ? 'hidden' : ''} ${facing === 'user' ? '-scale-x-100' : ''}`} />
        {/* A camera picture is never razor sharp: a hint of blur keeps the watch from looking pasted on. */}
        <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${live ? '[filter:blur(0.35px)]' : ''}`} />

        <div className="absolute inset-x-0 top-0 p-4 sm:p-6 flex items-start justify-between gap-4 bg-gradient-to-b from-black/55 to-transparent">
          <div>
            <p className="text-[0.65rem] tracking-[0.28em] uppercase text-[#9fb0ff]">{t('Virtual try-on')}</p>
            <p className="font-serif text-2xl leading-tight mt-1">{product.name}</p>
            {!traitsFor(product).glb && <p className="text-xs text-white/65 mt-1">{t('Illustrative 3D model')}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('Close')} className={control}><X size={20} /></button>
        </div>

        {live && !found && (
          <p role="status" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(20rem,80%)] text-center bg-black/60 backdrop-blur px-6 py-5 rounded-2xl">
            {t('Show the back of your hand and your whole wrist, with good light')}
          </p>
        )}
        {phase === 'starting' && <p role="status" className="absolute inset-x-0 bottom-8 text-center animate-pulse">{t('Starting the camera…')}</p>}
        {live && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            <button type="button" onClick={() => start(facing === 'user' ? 'environment' : 'user')} aria-label={t('Switch camera')} title={t('Switch camera')} className={control}><SwitchCamera size={19} /></button>
            <button type="button" onClick={() => setFlipped(!flipped)} aria-pressed={flipped} aria-label={t('Turn the watch over')} title={t('Turn the watch over')} className={control}><FlipHorizontal2 size={19} /></button>
            <button type="button" onClick={takePhoto} aria-label={t('Take a photo')} title={t('Take a photo')} className={control}><Camera size={19} /></button>
          </div>
        )}
      </div>

      <div className="px-5 py-4 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))] bg-night border-t border-white/10">
        {error && <p role="alert" className="text-center text-sm text-[#ffb4a8] mb-3">{t(ERRORS[error])}</p>}
        {live ? (
          <label className="flex items-center gap-4 max-w-md mx-auto text-sm">
            <span className="shrink-0">{t('Size')}</span>
            <input type="range" min="0.7" max="1.4" step="0.01" value={size} onChange={(ev) => setSize(Number(ev.target.value))} className="flex-1 accent-[#7d95ff]" />
            <button type="button" onClick={() => setSize(1)} aria-label={t('Reset size')} className="p-2 hover:text-[#9fb0ff]"><RefreshCw size={16} /></button>
          </label>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <button type="button" disabled={phase === 'starting'} onClick={() => start(matchMedia('(pointer: coarse)').matches ? 'environment' : 'user')} className="btn-solid btn-gold inline-flex items-center gap-3 disabled:opacity-60">
              <Camera size={17} /> {t('Turn on the camera')}
            </button>
            <p className="text-xs text-white/65 text-center sm:text-left max-w-xs">{t('The video is processed on your device: it is not recorded or sent anywhere.')}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
