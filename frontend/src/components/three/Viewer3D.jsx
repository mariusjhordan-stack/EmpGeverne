import { useEffect, useRef, useState } from 'react';
import { Move3d } from 'lucide-react';
import * as THREE from 'three';
import { buildWatch, disposeWatch } from '../../tryon/watchModel';
import { studioEnvironment } from '../../tryon/studio';
import { toTryOnProduct } from '../../tryon/product';

/**
 * Visor 3D del reloj: el mismo modelo de la prueba virtual, en un estudio de luz.
 * Se gira arrastrando con el mouse o el dedo; si nadie lo toca, gira solo y despacio.
 */
export default function Viewer3D({ watch, product, className = '', hint = true }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const item = product ?? (watch ? toTryOnProduct(watch) : null);
  const key = item ? `${item.name}|${item.referenceNumber}` : '';

  useEffect(() => {
    if (!item) return undefined;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return undefined; // sin WebGL: el contenedor queda con su fondo
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    const environment = studioEnvironment(renderer);
    scene.environment = environment;
    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(-300, 600, 800);
    scene.add(light);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
    camera.position.z = 3000;
    const holder = new THREE.Group();
    scene.add(holder);

    const state = { x: 0.6, y: -0.42, vx: 0, dragging: false, w: 1, h: 1 };
    let model;
    let cancelled = false;
    setReady(false);
    buildWatch(item).then((built) => {
      if (cancelled) { disposeWatch(built); return; }
      built.getObjectByName('wrist').visible = false;
      built.getObjectByName('shadow').visible = false;
      model = built;
      holder.add(model);
      setReady(true);
    }).catch(() => {});

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = stage;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      state.w = w; state.h = h;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    // Arrastre: X gira sobre el eje vertical, Y inclina. Con inercia al soltar.
    let last = null;
    const down = (e) => { state.dragging = true; last = { x: e.clientX, y: e.clientY }; stage.setPointerCapture?.(e.pointerId); };
    const move = (e) => {
      if (!state.dragging || !last) return;
      const dx = (e.clientX - last.x) / state.w;
      const dy = (e.clientY - last.y) / state.h;
      state.x += dx * 4.2;
      state.vx = dx * 4.2;
      state.y = THREE.MathUtils.clamp(state.y + dy * 2.4, -1.2, 0.6);
      last = { x: e.clientX, y: e.clientY };
    };
    const up = () => { state.dragging = false; last = null; };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('pointerleave', up);

    // Solo se dibuja mientras el visor está en pantalla.
    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(stage);

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const euler = new THREE.Euler();
    let prev = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      if (!visible || !model) return;
      if (!state.dragging) {
        state.vx *= 0.94;
        state.x += state.vx + (still ? 0 : dt * 0.32);
      }
      holder.quaternion.setFromEuler(euler.set(state.y, state.x, 0.1));
      holder.scale.setScalar((Math.min(state.w, state.h) / 100) * 1.02);
      renderer.render(scene, camera);
    });

    return () => {
      cancelled = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      io.disconnect();
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      stage.removeEventListener('pointerleave', up);
      if (model) disposeWatch(model);
      environment.dispose();
      renderer.dispose();
    };
    // el modelo solo cambia si cambia el reloj
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div ref={stageRef} className={`viewer3d ${className}`} role="img" aria-label={item ? `Modelo 3D de ${item.name}. Arrastra para girarlo.` : 'Modelo 3D'}>
      <span className="viewer3d__ring" aria-hidden="true" />
      <canvas ref={canvasRef} />
      {!ready && <div className="viewer3d__loading"><span className="spinner" /></div>}
      {hint && <span className="viewer3d__hint"><Move3d size={13} /> Arrastra para girar</span>}
    </div>
  );
}
