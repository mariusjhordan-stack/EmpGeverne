# Frontend de Cronos Genève

Tienda de relojes de lujo hecha con React 19, Vite 8 y Tailwind CSS 4.

## Desarrollo

Desde `frontend/`:

```bash
npm install
npm run dev
```

Vite sirve la aplicación en `http://localhost:5173`. Para las llamadas a la API y los archivos multimedia, inicia también el backend Django en `http://localhost:8000`: Vite redirige `/api` y `/media` a ese servidor.

Para generar la versión de producción:

```bash
npm run build
```

## Diseño

El sistema de diseño está en `src/index.css` y se documenta en `DESIGN.md`. Usa una paleta editorial de marfil y arena con tonos cuero y nogal, titulares en Instrument Serif e interfaz en Geist (Geist Mono para cifras y etiquetas).

## Secuencia del reloj

`src/components/home/WatchSequence.jsx` muestra durante el desplazamiento los 120 fotogramas `public/sequence/watch_000.webp` a `watch_119.webp`. Cuando cambien los fotogramas, incrementa `SEQ_VERSION` en ese componente para invalidar la caché del navegador.

Para regenerarlos con la herramienta Three.js:

1. Ejecuta `npm run dev` desde `frontend/`.
2. Abre `http://localhost:5173/tools/render-watch.html` para revisar el render.
3. Abre `http://localhost:5173/tools/render-watch.html?export=1` para guardar la secuencia en `public/sequence/`.

Las rutas de Vite `/__save-frame` y `/__save-media` solo funcionan durante el desarrollo; no forman parte del build de producción.
