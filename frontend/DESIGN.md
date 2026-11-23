# Cronos Genève — Sistema de diseño "Ivory Editorial"

Todo el CSS vive en `src/index.css`. Tailwind 4 sigue disponible para layout (grid, flex, gap, spacing,
responsive), pero **colores, tipografía, botones, formularios y superficies salen de las clases de abajo**.
No uses colores hex sueltos ni `text-gold`/`bg-white`/`text-gray-*` en código nuevo.

## Dirección
- Lienzo claro marfil (`--ink #f6f2eb`; el nombre del token es histórico: `--ink` = fondo de página),
  superficies `--ink-2` (blanco cálido), `--ink-3/4` (arena), texto `--fg #17150f`, `--fg-dim`, `--mute`.
- Secciones en arena: añade `section--paper` (o `on-paper`).
- Acento único: oro viejo `--champagne #9a7a43`. `--ember` solo como detalle.
- Tipografía: **Instrument Serif** para titulares editoriales (con `<em>` en cursiva dorada),
  **Geist** para UI, **Geist Mono** para etiquetas, precios y números.
- Radios grandes (18–28px), botones en píldora oscura, bordes de 1px `--line`.
- Las fotos de producto tienen fondo blanco: muéstralas dentro de `.product-card__media` o `.media-well`
  (`mix-blend-mode: multiply` funde el blanco con la superficie).
- Los mosaicos con foto (`tile` + `tile__img` + `tile__shade`) ponen el texto en claro automáticamente.
- Los estilos propios viven en `@layer components`: las utilidades de Tailwind (`pl-11`, `hidden`…) los
  pueden sobrescribir. Evita nombres que choquen con utilidades de Tailwind (por eso `tile--tall`, no `row-2`).

## Tipografía
| Clase | Uso |
|---|---|
| `display-xxl` / `display-xl` / `display-lg` / `display-md` / `display-sm` | Titulares serif. `<em>` = cursiva champagne |
| `eyebrow` (+ `eyebrow--line`, `eyebrow--accent`) | Etiqueta mono en mayúsculas sobre titulares |
| `lede` | Párrafo de entrada grande |
| `body-sm`, `text-mute`, `text-dim`, `text-accent` | Texto secundario |
| `num`, `price`, `price--lg` | Números y precios en mono tabular |

## Layout
- `container` (ancho máx 1360 + gutter), `container--narrow` (880).
- `section`, `section--tight`, `section--paper`, `section--ink-2`.
- `divider` (línea horizontal).
- `PageHero` (`components/common/SectionHeader.jsx`): cabecera estándar de toda página interna
  `<PageHero eyebrow="Catálogo" title={<>El catálogo <em>completo</em></>} description="..." />`.
- `SectionHeader` (mismo archivo): `eyebrow`, `title`, `description`, `align`, `action`.

## Componentes
- Botones: `<Button variant="primary|accent|ghost|danger|link" size="sm|md|lg" block as={Link} to="..." />`
  o clases `btn`, `btn btn-ghost`, `btn btn-accent`, `btn btn-danger`, `btn-sm`, `btn-lg`, `btn-block`,
  `btn-link`, `btn-icon` (botón redondo de icono).
- Formularios: `field` > `field-label` + `input` (inputs/select/textarea ya se estilan solos) +
  `field-hint` / `field-error`. `<FloatingInput label name value onChange error />` ya lo hace.
- Superficies: `card` (+ `card--flush`, `card--hover`), `card-title`, `panel`, `alert`, `alert--danger`,
  `alert--success`, `empty-state`.
- Estados: `badge` + `badge--success|warn|danger|info|accent` (`badge--plain` sin punto).
- Filtros: `chip` + `is-active`.
- Especificaciones: `spec-list` > `spec-row` (`<dt>`/`<dd>` o dos `<span>`).
- Tablas: `table-wrap` > `table`.
- Modal: `modal-backdrop` > `modal`.
- Producto: `<WatchCard watch />`, `formatPrice` exportado de `components/catalog/WatchCard.jsx`.
- Carga: `<LoadingSpinner text />`, `<Skeleton />`, `<WatchCardSkeleton />`.
- Admin: `admin-shell`, `admin-sidebar`, `admin-nav-link` (+ `active`), `admin-topbar`, `admin-main`,
  `kpi` > `eyebrow` + `kpi__value`.

## Movimiento
- `<Reveal variant="up|fade|scale|left|right|clip" delay={ms}>` en cada bloque al entrar en pantalla.
  En listas usa `delay={i * 70}` (máx ~6 elementos escalonados, luego delay fijo).
- `<RevealLines as="h1" className="display-lg" lines={['Primera línea', <em>segunda</em>]} />` para
  titulares que suben línea por línea.
- Hover: `card--hover`, `btn` ya animan. Respeta `prefers-reduced-motion` (ya está en el CSS).

## Reglas
- Mantener intacta toda la lógica: llamadas a `api`, contextos, rutas, validaciones, toasts, estados.
- Textos en español. Accesibilidad: labels en todos los inputs, `aria-label` en botones de icono.
- Responsive desde 360px: nada de scroll horizontal; tablas dentro de `table-wrap`.
