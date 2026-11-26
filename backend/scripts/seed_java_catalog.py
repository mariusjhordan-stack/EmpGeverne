"""
Imports the catalogue of the sibling Java project (cronos-geneve-java) and switches product
images to its 3D renders (1200x1500 webp on an ivory background).

Run after seed_data.py and seed_more_watches.py:
    DB_PORT=5433 venv/bin/python manage.py shell < scripts/seed_java_catalog.py

Data: scripts/data/java_catalog.json, exported from the Java catalog_db (Flyway V4-V11: 137
products in 17 brands) with the Spanish texts of the Java frontend (src/i18n/es.js).
Images: media/watches/3d/<slug>-hero|detail|side.webp, copied from the Java frontend
(public/images/products/3d/). Missing files are copied from ../../cronos-geneve-java when found.

Idempotent:
- brands are matched by name (created with Spanish description/country when missing);
- Java watches are matched by MERGES (existing Django slug) and then by reference; existing
  Django watches keep their id, slug and price (orders reference them);
- a watch with 3D renders gets exactly the trio (hero primary order 0, detail 1, side 2); old
  photo files are never deleted from disk;
- Django watches with no Java match switch to watches/3d/<django-slug>-*.webp as soon as those
  files exist (render them and re-run). The rest are written to scripts/render_queue.json.
"""
import json
import os
import re
import shutil
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.utils.text import slugify
from catalog.models import Brand, Collection, Watch, WatchImage

BASE = settings.BASE_DIR
DATA = json.loads((BASE / 'scripts' / 'data' / 'java_catalog.json').read_text(encoding='utf-8'))
MEDIA = settings.MEDIA_ROOT
JAVA_PUBLIC = os.environ.get('JAVA_PUBLIC', str(BASE.parent.parent / 'cronos-geneve-java' / 'frontend' / 'public'))
RENDER_QUEUE = BASE / 'scripts' / 'render_queue.json'

# Existing Django watch (slug) -> Java reference. Same watch or same model family; the Django record
# is updated in place (name, specs, reference, images) and keeps its id, slug and price.
MERGES = {
    'air-king': '126900',
    'datejust-36': '126334',                         # Datejust 36 -> Datejust 41
    'cosmograph-daytona': '126500LN',
    'deepsea-sea-dweller': '136660',
    'explorer': '124270',
    'explorer-ii': '226570',
    'gmt-master-ii': '126710BLRO',
    'sea-dweller': '126600',
    'submariner-date': '126610LN',
    'seamaster-diver-300m': '210.30.42.20.03.001',
    'aqua-terra-150m': '220.10.41.21.03.004',
    'speedmaster-moonwatch': '310.30.42.50.01.002',
    'carrera-chronograph': 'CBS2210.BA0882',
    'monaco-calibre': 'CBL2111.BA0644',
    'aquaracer-chronograph': 'WBP201B.BA0632',       # Aquaracer Chronograph -> Aquaracer Professional 300
    'royal-oak-selfwinding': '15510ST',
    'royal-oak-offshore-chronograph': '26420SO',
    'chronomat-bluebird': 'AB0134',                  # -> Chronomat B01 42
    'navitimer-chronograph': 'AB0138',
    'superocean-44': 'A17375',                       # -> Superocean Automatic 42
    'santos-de-cartier': 'WSSA0018',
    'nautilus-5711': '5811/1G',                      # 5811 is the successor of the 5711
    'calatrava-5227': '5227G',
    'calatrava-travel-time': '5524G',
    'calatrava-5196': '6119R',                       # manual-wind Calatrava, successor line
    'pilots-watch-mark-xv': 'IW328201',              # Mark XV -> Mark XX
    'pelagos': 'M25407N-0001',                       # -> Pelagos 39
    'grand-seiko-sbgw231': 'SBGW231',
    'grand-seiko-hi-beat': 'SLGH005',                # White Birch is a Hi-Beat 36000
    'reverso-classic': 'Q3858520',
    'prx-chronograph': 'T137.407.11.041.00',
}

# The only featured pieces (home page shows 8): Submariner Date, Daytona, Speedmaster, Royal Oak,
# Nautilus, Santos, Monaco, Reverso.
ICONIC = {'126610LN', '126500LN', '310.30.42.50.01.002', '15510ST', '5811/1G', 'WSSA0018', 'CBL2111.BA0644', 'Q3858520'}

NAME_PREFIXES = {'IWC Schaffhausen': ['IWC Schaffhausen ', 'IWC ']}

MOVEMENT = {'AUTOMATIC': 'automatic', 'MANUAL': 'manual', 'QUARTZ': 'quartz', 'SOLAR': 'solar', 'SPRING_DRIVE': 'spring_drive'}
CRYSTAL = {'Sapphire Crystal': 'sapphire', 'Mineral Crystal': 'mineral', 'Hesalite Crystal': 'acrylic', 'Acrylic Crystal': 'acrylic'}
CASE = {
    'Stainless Steel': 'Acero inoxidable', 'Oystersteel': 'Acero Oystersteel',
    'Oystersteel & Rose Gold': 'Acero Oystersteel y oro rosa 18 k', 'Oystersteel & White Gold': 'Acero Oystersteel y oro blanco 18 k',
    'Rose Gold': 'Oro rosa 18 k', 'White Gold': 'Oro blanco 18 k', 'Yellow Gold': 'Oro amarillo 18 k',
    'Titanium': 'Titanio', 'Bronze': 'Bronce', 'Ceramic': 'Cerámica',
    'Black PVD Steel': 'Acero con PVD negro', 'Rose Gold PVD Steel': 'Acero con PVD oro rosa', 'Yellow Gold PVD Steel': 'Acero con PVD oro amarillo',
}
BRACELETS = {
    'Stainless Steel Bracelet': 'Brazalete de acero inoxidable', 'Oyster Bracelet': 'Brazalete Oyster',
    'Oystersteel Bracelet': 'Brazalete Oyster de acero', 'Jubilee Bracelet': 'Brazalete Jubilee',
    'President Bracelet': 'Brazalete President', 'Five-link Steel Bracelet': 'Brazalete de acero de cinco eslabones',
    'Black Steel Bracelet': 'Brazalete de acero negro', 'Gold-tone Bracelet': 'Brazalete dorado',
    'Titanium Bracelet': 'Brazalete de titanio', 'White Gold Bracelet': 'Brazalete de oro blanco 18 k',
    'Milanese Mesh Bracelet': 'Malla milanesa',
}
STRAP_COLOR = {'Black': 'negro', 'Brown': 'marrón', 'Blue': 'azul', 'Tan': 'tostado', 'Green': 'verde', 'Red': 'rojo',
               'White': 'blanco', 'Orange': 'naranja', 'Grey': 'gris', 'Sand': 'arena', 'Navy': 'azul marino'}
DIAL = {'Black': 'Negro', 'Blue': 'Azul', 'White': 'Blanco', 'Silver': 'Plata', 'Cream': 'Crema', 'Green': 'Verde',
        'Champagne': 'Champán', 'Grey': 'Gris', 'Brown': 'Marrón', 'Pink': 'Rosa', 'Red': 'Rojo', 'Salmon': 'Salmón',
        'Orange': 'Naranja', 'Purple': 'Violeta', 'Turquoise': 'Turquesa', 'Yellow': 'Amarillo'}
DIAL_EN = {v: k for k, v in DIAL.items()}
# Dial colour of the Django-only watches (read from their photos); only set when empty.
DJANGO_DIALS = {
    'milgauss': 'Negro', 'sky-dweller': 'Gris', 'yacht-master-ii': 'Blanco', 'royal-oak-chronograph': 'Blanco',
    'royal-oak-offshore-diver': 'Verde', 'pasha-de-cartier': 'Plata', 'panthere-de-cartier': 'Blanco',
    'tank-francaise': 'Plata', 'aquanaut-advanced-research': 'Negro', 'big-pilot-saint-exupery': 'Marrón',
    'master-ultra-thin-perpetual': 'Plata', 'radiomir-california': 'Negro', 'prospex-marinemaster': 'Negro',
    'classique-9067': 'Plata', 'el-primero-chronograph': 'Azul', 'fifty-fathoms': 'Negro',
    'master-collection-retrograde': 'Plata', 'spirit-zulu-time': 'Azul', 'khaki-field-mechanical': 'Negro',
}
LIMITED = 'edicion-limitada'


def strap_es(label):
    if label in BRACELETS:
        return BRACELETS[label]
    m = re.match(r'(\w+) (Leather|Rubber|NATO) Strap$', label or '')
    if m:
        kind = {'Leather': 'Cuero', 'Rubber': 'Caucho', 'NATO': 'Tela NATO'}[m.group(2)]
        return f'{kind} {STRAP_COLOR.get(m.group(1), m.group(1).lower())}'
    return label or 'Acero inoxidable'


def case_en(text):
    """Spanish case material -> English label of the 3D render tool."""
    s = (text or '').lower()
    steel = 'acero' in s or 'oystersteel' in s
    if 'titanio' in s:
        return 'Titanium'
    if 'cerámica' in s or 'ceramica' in s:
        return 'Ceramic'
    if 'bronce' in s:
        return 'Bronze'
    gold = 'Rose Gold' if 'oro rosa' in s else 'White Gold' if 'oro blanco' in s else 'Yellow Gold' if ('oro' in s or 'rolesor' in s) else None
    if gold and 'pvd' in s:
        return f'{gold} PVD Steel'
    if gold and steel:
        return f'Stainless Steel & {gold}'
    return gold or 'Stainless Steel'


def collection_for(category, price, current):
    if current is not None and current.slug == LIMITED:
        return current
    if price >= 25000:
        return COLLECTIONS['lujo']
    return COLLECTIONS['clasica'] if category == 'Dress' else COLLECTIONS['deportiva']


def strip_brand(name, brand):
    for prefix in NAME_PREFIXES.get(brand, []) + [brand + ' ']:
        if name.startswith(prefix):
            return name[len(prefix):]
    return name


def media_file(java_url):
    """Java public URL -> MEDIA-relative path, copying the file from the Java project if needed."""
    rel = java_url.split('/images/products/', 1)[-1]
    target = f'watches/3d/{rel[3:]}' if rel.startswith('3d/') else f'watches/java/{rel}'
    dest = os.path.join(MEDIA, target)
    if not os.path.exists(dest):
        src = os.path.join(JAVA_PUBLIC, java_url.lstrip('/'))
        if os.path.exists(src):
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src, dest)
    return target if os.path.exists(dest) else None


def trio(slug):
    """watches/3d/<slug>-hero|detail|side.webp when the three files exist."""
    files = [f'watches/3d/{slug}-{view}.webp' for view in ('hero', 'detail', 'side')]
    return files if all(os.path.exists(os.path.join(MEDIA, f)) for f in files) else None


def java_images(p):
    hero = p['image_url']
    m = re.search(r'/([^/]+?)(?:-hero)?\.webp$', hero)
    if m and trio(m.group(1)):
        return trio(m.group(1))
    files = [media_file(u) for u in [hero] + p['gallery_urls']]
    return [f for f in files if f]


def set_images(watch, files):
    """Replace the WatchImage rows with `files` (first one primary). Files on disk stay untouched."""
    wanted = [(f, i, i == 0) for i, f in enumerate(files)]
    current = [(img.image.name, img.order, img.is_primary) for img in watch.images.order_by('order', 'pk')]
    if current == wanted:
        return False
    watch.images.all().delete()
    views = ['vista frontal', 'detalle de la esfera', 'vista lateral']
    for f, order, primary in wanted:
        label = views[order] if order < len(views) else f'imagen {order + 1}'
        WatchImage.objects.create(watch=watch, image=f, order=order, is_primary=primary,
                                  alt_text=f'{watch.brand.name} {watch.name}, {label}'[:200])
    return True


def has_3d(watch):
    primary = watch.images.filter(is_primary=True).first() or watch.images.first()
    return bool(primary and primary.image.name.startswith('watches/3d/'))


COLLECTIONS = {c.slug: c for c in Collection.objects.all()}
for slug, name in [('clasica', 'Clásica'), ('deportiva', 'Deportiva'), ('lujo', 'Lujo'), (LIMITED, 'Edición Limitada')]:
    if slug not in COLLECTIONS:
        COLLECTIONS[slug] = Collection.objects.create(slug=slug, name=name)

created, updated, merged, images_changed = [], [], [], 0

with transaction.atomic():
    # --- Brands ---
    brands = {}
    for b in DATA['brands']:
        brand = Brand.objects.filter(name__iexact=b['name']).first() or Brand.objects.filter(slug=b['slug']).first()
        if not brand:
            brand = Brand.objects.create(name=b['name'], slug=b['slug'], country=b['country'],
                                         description=' '.join(t for t in (b['description_es'], b['story_es']) if t))
            print(f'  + brand {brand.name}')
        brands[b['name']] = brand

    merge_by_ref = {ref: slug for slug, ref in MERGES.items()}
    touched = set()

    # --- Watches ---
    for p in DATA['products']:
        brand = brands[p['brand']]
        ref = p['reference']
        watch = None
        if ref in merge_by_ref:
            watch = Watch.objects.filter(slug=merge_by_ref[ref]).first()
        if watch is None:
            watch = Watch.objects.filter(reference=ref).first()
        is_new = watch is None
        if is_new:
            watch = Watch(brand=brand, price=Decimal(str(p['price'])))

        name = strip_brand(p['name'], p['brand'])
        price = watch.price if (not is_new and watch.price) else Decimal(str(p['price']))
        watch.name = name
        watch.brand = brand
        watch.price = price
        watch.description = p['description_es'] or p['description_en']
        watch.stock = p['stock']
        watch.movement = MOVEMENT.get(p['movement'], 'automatic')
        watch.case_material = CASE.get(p['case_material'], p['case_material'] or 'Acero inoxidable')
        watch.case_diameter = p['case_diameter'] or watch.case_diameter
        watch.water_resistance = p['water_resistance'] or watch.water_resistance
        watch.crystal = CRYSTAL.get(p['crystal'], 'sapphire')
        watch.strap_material = strap_es(p['strap'])
        watch.dial_color = DIAL.get(p['dial_color'], p['dial_color'] or '')
        watch.collection = collection_for(p['category'], float(price), None if is_new else watch.collection)
        watch.is_active = True
        if Watch.objects.filter(reference=ref).exclude(pk=watch.pk).exists():
            print(f'  ! reference {ref} already used, {watch.slug or name} keeps {watch.reference}')
        else:
            watch.reference = ref
        if is_new:
            watch.warranty = '5 años' if p['brand'] == 'Rolex' else '2 años'
            slug = slugify(name)
            if Watch.objects.filter(slug=slug).exists():
                slug = slugify(f'{brand.slug} {name}')
            watch.slug = slug
        watch.save()
        touched.add(watch.pk)
        (created if is_new else updated).append(watch)
        if not is_new and watch.slug in MERGES:
            merged.append((watch.slug, f'{brand.name} {name}', ref))

        files = java_images(p)
        if files and set_images(watch, files):
            images_changed += 1

    # --- Django watches without a Java match ---
    still_photo = []
    for watch in Watch.objects.exclude(pk__in=touched).select_related('brand'):
        if not watch.dial_color and watch.slug in DJANGO_DIALS:
            watch.dial_color = DJANGO_DIALS[watch.slug]
            watch.save(update_fields=['dial_color'])
        files = trio(watch.slug)
        if files:
            if set_images(watch, files):
                images_changed += 1
        elif not has_3d(watch):
            still_photo.append(watch)

    # --- Featured: exactly the iconic pieces ---
    Watch.objects.filter(reference__in=ICONIC).update(is_featured=True)
    Watch.objects.exclude(reference__in=ICONIC).update(is_featured=False)

# --- Render queue (input of the 3D render tool) ---
MOVEMENT_EN = {'automatic': 'AUTOMATIC', 'manual': 'MANUAL', 'quartz': 'QUARTZ', 'solar': 'QUARTZ', 'spring_drive': 'AUTOMATIC'}
queue = [{
    'slug': w.slug,
    'name': f'{w.brand.name} {w.name}',
    'referenceNumber': w.reference,
    'dialColor': DIAL_EN.get(w.dial_color, 'Black'),
    'caseDiameter': w.case_diameter,
    'caseMaterial': case_en(w.case_material),
    'movementType': MOVEMENT_EN.get(w.movement, 'AUTOMATIC'),
} for w in sorted(still_photo, key=lambda w: (w.brand.name, w.name))]
RENDER_QUEUE.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print('\nMerged into existing Django watches:')
for slug, name, ref in merged:
    print(f'  ~ {slug:32} -> {name} ({ref})')
print('\nStill without 3D images (see scripts/render_queue.json):')
for w in sorted(still_photo, key=lambda w: (w.brand.name, w.name)):
    print(f'  - {w.slug:32} {w.brand.name} {w.name}')
with_3d = sum(1 for w in Watch.objects.prefetch_related('images') if has_3d(w))
print(f'\nCreated: {len(created)} · Updated: {len(updated)} (merged {len(merged)}) · Image sets changed: {images_changed}')
print(f'Brands: {Brand.objects.count()} · Watches: {Watch.objects.count()} · With 3D: {with_3d} · Still photo: {len(still_photo)}')
print(f'Featured: {Watch.objects.filter(is_featured=True).count()} · Images: {WatchImage.objects.count()}')
