import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const STORY_COUNT = 240;
const PHOTO_PATH = '/media/watches/submariner-date.jpg';
// Normalized bezel geometry in each square image. Tune these if source renders change.
const BEZEL_ALIGNMENT = {
  photo: { x: .445, y: .518, radius: .25 },
  story: { x: .5, y: .5, radius: .25 }, // frame 239, front-left three-quarter pose
};
const pathFor = (index) => '/sequence/story_' + String(index).padStart(3, '0') + '.webp?v=story-2';
const clamp = (v) => Math.min(1, Math.max(0, v));
const range = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
const windowed = (p, a, b, fade = .035) => Math.min(range(p, a, a + fade), 1 - range(p, b - fade, b));

const storyFrame = (p) => {
  if (p < .35) return Math.round(ease(range(p, .025, .35)) * 79);
  if (p < .48) return 80 + Math.round(range(p, .35, .48) * 29);
  if (p < .57) return 110 + Math.round(range(p, .48, .57) * 19);
  if (p < .72) return 130 + Math.round(range(p, .57, .72) * 59);
  return 190 + Math.round(range(p, .72, .86) * 49);
};

const captions = [
  { at: [.14, .34], side: 'left', sequence: 'story', eyebrow: '01 — El giro', title: <>Cada ángulo, <em>otra luz.</em></>, text: 'Una vuelta completa revela las líneas de la caja y el encuentro entre metal y correa.' },
  { at: [.14, .34], side: 'left', sequence: 'photo', eyebrow: '01 — El acero', title: <>Presencia en <em>cada detalle.</em></>, text: 'La caja y el brazalete de acero destacan sobre una esfera negra.' },
  { at: [.37, .48], side: 'right', sequence: 'story', eyebrow: '02 — La esfera', title: <>El detalle <em>detiene el tiempo.</em></>, text: 'La mirada se acerca al bisel y a la profundidad de la esfera.' },
  { at: [.37, .48], side: 'right', sequence: 'photo', eyebrow: '02 — La esfera', title: <>El detalle <em>detiene el tiempo.</em></>, text: 'Índices claros y bisel negro definen su carácter.' },
  { at: [.49, .57], side: 'left', sequence: 'story', eyebrow: '03 — El perfil', title: <>Precisión en <em>cada contorno.</em></>, text: 'Un recorrido a ras de la caja descubre su espesor y sus reflejos.' },
  { at: [.49, .57], side: 'left', sequence: 'photo', eyebrow: '03 — El perfil', title: <>Precisión en <em>cada contorno.</em></>, text: 'El acero pulido recoge la luz en cada eslabón y en la caja.' },
  { at: [.59, .75], side: 'right', sequence: 'story', eyebrow: '04 — Las piezas', title: <>La forma nace <em>del encuentro.</em></>, text: 'Cristal, bisel, esfera, caja, movimiento, fondo y correa se separan antes de volver a ser uno.' },
  { at: [.59, .86], side: 'right', sequence: 'photo', eyebrow: '04 — La presencia', title: <>Cada detalle <em>en su lugar.</em></>, text: 'La esfera, el bisel y el brazalete forman una sola pieza.' },
];
const parts = ['Cristal', 'Bisel', 'Esfera', 'Caja', 'Movimiento', 'Fondo', 'Correa'];
const finishes = ['Acero', 'Negro', 'Oro', 'Cobre'];

const preparePhoto = (image) => {
  const prepared = document.createElement('canvas');
  prepared.width = image.naturalWidth;
  prepared.height = image.naturalHeight;
  const context = prepared.getContext('2d');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, prepared.width, prepared.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    if (pixels.data[index] >= 245 && pixels.data[index + 1] >= 245 && pixels.data[index + 2] >= 245) {
      pixels.data[index] = 255;
      pixels.data[index + 1] = 255;
      pixels.data[index + 2] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  return prepared;
};

export default function WatchSequence() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const particlesRef = useRef(null);
  const heroRef = useRef(null);
  const bigRef = useRef(null);
  const backtypeRef = useRef(null);
  const glowRef = useRef(null);
  const progressRef = useRef(null);
  const loaderRef = useRef(null);
  const variantRef = useRef(null);
  const finaleRef = useRef(null);
  const partRefs = useRef([]);
  const captionRefs = useRef([]);
  const [finish, setFinish] = useState('Acero');

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const particleCanvas = particlesRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let kind = 'story';
    const frames = Array(STORY_COUNT).fill(null);
    const revealCanvas = document.createElement('canvas');
    let target = reduced ? STORY_COUNT - 1 : 0;
    let painted = '';
    let photo = null;
    let progress = 0;
    let finishReset = false;
    let visible = true;
    let scrollRaf = 0;
    let particleRaf = 0;
    const pending = new Set();

    const draw = (force = false) => {
      const context = canvas.getContext('2d');
      if (!context) return;
      let nearest = -1;
      if (kind === 'story') {
        for (let distance = 0; distance < STORY_COUNT; distance += 1) {
          const left = target - distance;
          const right = target + distance;
          if (left >= 0 && frames[left]) { nearest = left; break; }
          if (right < STORY_COUNT && frames[right]) { nearest = right; break; }
        }
      }
      if (nearest < 0 && !photo) return;
      const morph = photo ? (kind === 'photo' || reduced ? 1 : ease(range(progress, .86, .95))) : 0;
      const key = kind + ':' + nearest + ':' + morph.toFixed(3) + ':' + Boolean(photo);
      if (!force && key === painted) return;
      const side = canvas.width;
      const targetBezel = BEZEL_ALIGNMENT.story;
      const photoBezel = BEZEL_ALIGNMENT.photo;
      const photoSide = side * targetBezel.radius / photoBezel.radius;
      const photoX = side * targetBezel.x - photoSide * photoBezel.x;
      const photoY = side * targetBezel.y - photoSide * photoBezel.y;
      const drawPhoto = (surface) => {
        surface.fillStyle = '#fff';
        surface.fillRect(0, 0, side, side);
        surface.drawImage(photo, photoX, photoY, photoSide, photoSide);
      };
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (nearest >= 0 && morph < 1) {
        context.drawImage(frames[nearest], 0, 0, side, side);
      }
      if (photo && morph > 0) {
        if (morph === 1) {
          drawPhoto(context);
        } else {
          const reveal = revealCanvas.getContext('2d');
          reveal.clearRect(0, 0, side, side);
          drawPhoto(reveal);
          const radius = side * (targetBezel.radius * .2 + morph * 1.25);
          const iris = reveal.createRadialGradient(side * targetBezel.x, side * targetBezel.y, radius * .78, side * targetBezel.x, side * targetBezel.y, radius);
          iris.addColorStop(0, '#000');
          iris.addColorStop(1, 'transparent');
          reveal.globalCompositeOperation = 'destination-in';
          reveal.fillStyle = iris;
          reveal.fillRect(0, 0, side, side);
          reveal.globalCompositeOperation = 'source-over';
          context.drawImage(revealCanvas, 0, 0);
        }
      }
      painted = key;
    };

    const loadPhoto = () => {
      const image = new Image();
      pending.add(image);
      image.onload = async () => {
        try {
          if (!image.naturalWidth || !image.naturalHeight) throw new Error('Invalid photo');
          await image.decode();
          if (!cancelled) {
            photo = preparePhoto(image);
            section.dataset.photo = 'ready';
            draw(true);
            if (!reduced) onScroll();
          }
        } catch { /* Leave the current frame in place if the photo cannot decode. */ }
        pending.delete(image);
      };
      image.onerror = () => { pending.delete(image); };
      image.src = PHOTO_PATH;
    };

    const loadFrame = (index) => new Promise((resolve) => {
      const image = new Image();
      pending.add(image);
      image.onload = async () => {
        try {
          // A missing Vite asset may return SPA HTML; decoded pixels are required.
          if (!image.naturalWidth || !image.naturalHeight) throw new Error('Invalid image');
          await image.decode();
          if (!cancelled) { frames[index] = image; draw(); syncParticles(); }
          resolve(!cancelled);
        } catch { resolve(false); }
        pending.delete(image);
        image.onload = null;
        image.onerror = null;
      };
      image.onerror = () => {
        pending.delete(image);
        image.onload = null;
        image.onerror = null;
        resolve(false);
      };
      image.src = pathFor(index);
    });

    const loadSequence = async () => {
      if (!(await loadFrame(0)) && !cancelled) {
        kind = 'photo';
        painted = '';
        section.dataset.sequence = kind;
        onScroll();
        if (loaderRef.current) loaderRef.current.textContent = '';
        return;
      }
      if (cancelled || reduced) {
        if (reduced && !cancelled) await loadFrame(STORY_COUNT - 1);
        if (loaderRef.current) loaderRef.current.textContent = '';
        return;
      }
      const samples = [];
      const rest = [];
      for (let index = 1; index < STORY_COUNT; index += 1) (index % 8 === 0 ? samples : rest).push(index);
      const queue = [STORY_COUNT - 1, ...samples, ...rest.filter((index) => index !== STORY_COUNT - 1)].filter((index, position, all) => all.indexOf(index) === position);
      let next = 0;
      let settled = 1;
      const worker = async () => {
        while (!cancelled && next < queue.length) {
          await loadFrame(queue[next++]);
          settled += 1;
          if (loaderRef.current && !cancelled) loaderRef.current.textContent = settled === STORY_COUNT ? '' : Math.round(settled / STORY_COUNT * 100) + '%';
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker));
    };

    const drawParticles = (time) => {
      particleRaf = 0;
      if (cancelled || reduced || kind !== 'story' || !frames[target] || !visible || progress < .57 || progress > .75) {
        particleCanvas.getContext('2d')?.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        return;
      }
      const context = particleCanvas.getContext('2d');
      if (!context) return;
      const width = particleCanvas.width;
      const height = particleCanvas.height;
      const unit = Math.min(width, height);
      const phase = range(progress, .57, .75);
      const intensity = Math.min(range(phase, 0, .16), 1 - range(phase, .84, 1));
      context.clearRect(0, 0, width, height);
      for (let ribbon = 0; ribbon < 3; ribbon += 1) {
        for (let dot = 0; dot < 46; dot += 1) {
          const t = dot / 45;
          const angle = t * Math.PI * 2.4 + ribbon * 2.1 + time * .00022 * (ribbon % 2 ? -1 : 1);
          const radius = unit * (.17 + t * .28);
          const x = width * .5 + Math.cos(angle) * radius;
          const y = height * .49 + Math.sin(angle * .72 + ribbon) * radius * .54 + (t - .5) * unit * .25;
          context.beginPath();
          context.fillStyle = 'rgba(' + (ribbon === 1 ? '181,83,45' : '140,90,46') + ',' + ((.05 + (1 - t) * .22) * intensity) + ')';
          context.arc(x, y, Math.max(.7, unit * (.0012 + (1 - t) * .0014)), 0, Math.PI * 2);
          context.fill();
        }
      }
      particleRaf = requestAnimationFrame(drawParticles);
    };

    const syncParticles = () => {
      const active = !reduced && kind === 'story' && Boolean(frames[target]) && visible && progress >= .57 && progress <= .75;
      if (active && !particleRaf) particleRaf = requestAnimationFrame(drawParticles);
      if (!active) {
        if (particleRaf) cancelAnimationFrame(particleRaf);
        particleRaf = 0;
        particleCanvas.getContext('2d')?.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const side = Math.max(1, Math.round(canvas.getBoundingClientRect().width * dpr));
      canvas.width = side;
      canvas.height = side;
      revealCanvas.width = side;
      revealCanvas.height = side;
      const rect = particleCanvas.getBoundingClientRect();
      particleCanvas.width = Math.max(1, Math.round(rect.width * dpr));
      particleCanvas.height = Math.max(1, Math.round(rect.height * dpr));
      draw(true);
    };

    const update = () => {
      scrollRaf = 0;
      if (reduced) return;
      const rect = section.getBoundingClientRect();
      progress = clamp(-rect.top / Math.max(1, section.offsetHeight - window.innerHeight));
      target = storyFrame(progress);
      draw();
      const heroOut = range(progress, .025, .12);
      heroRef.current.style.opacity = String(1 - heroOut);
      heroRef.current.style.transform = 'translate3d(0,' + (-heroOut * 55) + 'px,0)';
      heroRef.current.style.pointerEvents = heroOut > .65 ? 'none' : 'auto';
      heroRef.current.inert = heroOut > .65;
      const wordOut = range(progress, .02, .19);
      bigRef.current.style.opacity = String(1 - wordOut);
      bigRef.current.style.transform = 'translate3d(0,' + (-wordOut * 7) + 'vh,0) scale(' + (1 + wordOut * .25) + ')';
      backtypeRef.current.style.opacity = String(kind === 'story' ? windowed(progress, .56, .75, .06) * .65 : 0);
      glowRef.current.style.setProperty('--glow', String(.35 + .65 * range(progress, .1, .58)));
      progressRef.current.style.setProperty('--p', progress.toFixed(4));
      const scale = kind === 'photo' ? .84 + .16 * ease(range(progress, 0, .86)) : .83 + .17 * ease(range(progress, 0, .19));
      const drift = kind === 'photo' ? (1 - progress) * 2.5 : (1 - range(progress, 0, .18)) * 4;
      canvas.style.transform = 'translate3d(0,' + drift + 'vh,0) scale(' + scale + ')';
      captions.forEach((caption, index) => {
        const element = captionRefs.current[index];
        if (!element) return;
        const opacity = caption.sequence && caption.sequence !== kind ? 0 : windowed(progress, ...caption.at);
        element.style.opacity = String(opacity);
        element.style.transform = 'translate3d(0,' + ((1 - opacity) * 24) + 'px,0)';
      });
      const partsOpacity = kind === 'story' ? windowed(progress, .6, .74, .04) : 0;
      partRefs.current.forEach((element, index) => {
        if (!element) return;
        element.style.opacity = String(partsOpacity);
        element.style.transform = 'translate3d(' + ((1 - partsOpacity) * (index % 2 ? 12 : -12)) + 'px,0,0)';
      });
      const finishOpacity = kind === 'story' ? windowed(progress, .76, .86, .025) : 0;
      variantRef.current.style.opacity = String(finishOpacity);
      variantRef.current.style.transform = 'translate3d(0,' + ((1 - finishOpacity) * 28) + 'px,0)';
      variantRef.current.inert = finishOpacity < .8;
      if (progress >= .86) {
        canvas.style.filter = 'none';
        if (!finishReset) { setFinish('Acero'); finishReset = true; }
      } else {
        canvas.style.filter = '';
        finishReset = false;
      }
      const maskRadius = 70 + 80 * (photo ? ease(range(progress, .86, .95)) : 0);
      const mask = kind === 'photo' || (photo && progress >= .95) ? 'none' : 'radial-gradient(ellipse ' + maskRadius + '% ' + maskRadius + '% at center, #000 55%, transparent 76%)';
      canvas.style.maskImage = mask;
      canvas.style.webkitMaskImage = mask;
      const finaleOpacity = photo ? range(progress, .91, .96) : 0;
      finaleRef.current.style.opacity = String(finaleOpacity);
      finaleRef.current.style.transform = 'translate3d(0,' + ((1 - finaleOpacity) * 24) + 'px,0)';
      finaleRef.current.inert = finaleOpacity < .8;
      syncParticles();
    };

    const onScroll = () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(update); };
    const onResize = () => { resize(); onScroll(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncParticles();
      if (visible) onScroll();
    });
    observer.observe(section);
    section.dataset.sequence = kind;
    variantRef.current.inert = !reduced;
    finaleRef.current.inert = !reduced;
    if (reduced) heroRef.current.inert = false;
    resize();
    update();
    loadPhoto();
    loadSequence();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (particleRaf) cancelAnimationFrame(particleRaf);
      pending.forEach((image) => { image.onload = null; image.onerror = null; image.src = ''; });
      pending.clear();
    };
  }, []);

  const scrollIntoSequence = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: sectionRef.current.offsetTop + window.innerHeight * (reduced ? .5 : 1.35), behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section ref={sectionRef} className="seq grain" aria-label="Presentación del reloj Cronos">
      <div className="seq__stage">
        <div ref={glowRef} className="seq__glow" aria-hidden="true" />
        <canvas ref={particlesRef} className="seq__particles" aria-hidden="true" />
        <div ref={backtypeRef} className="seq__backtype" aria-hidden="true">Mecánica</div>
        <canvas ref={canvasRef} className={'seq__canvas seq__canvas--' + finish.toLowerCase()} role="img" aria-label="Reloj Submariner Date de acero" />
        <div ref={bigRef} className="seq__bigtype" aria-hidden="true">Cronos</div>

        <div ref={heroRef} className="seq__hero">
          <div>
            <p className="eyebrow eyebrow--line eyebrow--accent mb-6 animate-fade-in">Rolex · Submariner Date</p>
            <h1 className="display-xl animate-fade-in-up">El tiempo,<br /><em>esculpido.</em></h1>
          </div>
          <div className="seq__hero-side animate-fade-in-up" style={{ animationDelay: '.15s' }}>
            <p className="lede">Piezas de manufactura suiza elegidas una a una, para quien entiende que un reloj se hereda.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/catalogo" className="btn btn-lg">Explorar colección <ArrowRight size={16} /></Link>
              <button type="button" className="btn btn-ghost btn-lg" onClick={scrollIntoSequence}>Ver la pieza</button>
            </div>
            <span className="seq__scrollcue" aria-hidden="true"><i /> Desliza para descubrir</span>
          </div>
        </div>

        {captions.map((caption, index) => (
          <div key={caption.eyebrow + (caption.sequence || "")} ref={(element) => { captionRefs.current[index] = element; }} className={'seq__caption seq__caption--' + caption.side + (caption.sequence ? ' seq__caption--' + caption.sequence : '')}>
            <p className="eyebrow eyebrow--accent">{caption.eyebrow}</p>
            <h2 className="display-md">{caption.title}</h2>
            <p className="body-sm">{caption.text}</p>
          </div>
        ))}
        <div className="seq__part-labels" aria-hidden="true">
          {parts.map((part, index) => <span key={part} ref={(element) => { partRefs.current[index] = element; }} className={'seq__part seq__part--' + (index + 1)}>{part}</span>)}
        </div>

        <div ref={variantRef} className="seq__variants">
          <p className="eyebrow eyebrow--accent">05 — Una última mirada</p>
          <h2 className="display-md">La luz cambia.<br /><em>El carácter permanece.</em></h2>
          <p className="body-sm">Acabados visuales ilustrativos; no son opciones de compra.</p>
          <div className="seq__finish-list" role="group" aria-label="Acabados visuales del reloj">
            {finishes.map((name) => <button key={name} type="button" className="seq__finish" aria-pressed={finish === name} onClick={() => setFinish(name)}>{name}</button>)}
          </div>
        </div>
        <div ref={finaleRef} className="seq__finale">
          <p className="eyebrow eyebrow--accent">La pieza real</p>
          <h2 className="display-md">Una presencia <em>que permanece.</em></h2>
          <p className="body-sm">Descubre el Submariner Date de acero.</p>
          <Link to="/catalogo/submariner-date" className="btn btn-lg">Descubrir la pieza <ArrowRight size={16} /></Link>
        </div>
        <div ref={progressRef} className="seq__progress" aria-hidden="true">
          <span>00</span><div className="seq__progress-bar"><span /></div><span>05</span>
        </div>
        <span ref={loaderRef} className="seq__loader" aria-hidden="true">Cargando</span>
      </div>
    </section>
  );
}
