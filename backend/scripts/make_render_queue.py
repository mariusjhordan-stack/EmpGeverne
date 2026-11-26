"""
Escribe scripts/render_queue.json con TODOS los relojes activos, para volver a renderizar
las fotos 3D del catálogo con frontend/tools/render-products.html.

Solo lee la base de datos (no cambia nada).
Uso (desde backend/):  env DB_PORT=5433 venv/bin/python scripts/make_render_queue.py
"""
import json
import os
import sys
from pathlib import Path

import django

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Watch  # noqa: E402

OUT = Path(__file__).resolve().parent / 'render_queue.json'

# mismas equivalencias que seed_java_catalog.py (español de la base -> etiquetas del modelo 3D)
DIAL_EN = {'Negro': 'Black', 'Azul': 'Blue', 'Blanco': 'White', 'Plata': 'Silver', 'Crema': 'Cream', 'Verde': 'Green',
           'Champán': 'Champagne', 'Gris': 'Grey', 'Marrón': 'Brown', 'Rosa': 'Pink', 'Rojo': 'Red', 'Salmón': 'Salmon',
           'Naranja': 'Orange', 'Violeta': 'Purple', 'Turquesa': 'Turquoise', 'Amarillo': 'Yellow'}
MOVEMENT_EN = {'automatic': 'AUTOMATIC', 'manual': 'MANUAL', 'quartz': 'QUARTZ', 'solar': 'QUARTZ', 'spring_drive': 'AUTOMATIC'}


def case_en(text):
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


def file_stem(w):
    """Nombre de archivo que ya usa el reloj (watches/3d/<stem>-hero.webp), para reemplazar sus fotos."""
    for img in w.images.all():
        name = img.image.name.rsplit('/', 1)[-1]
        if img.image.name.startswith('watches/3d/') and name.endswith('-hero.webp'):
            return name[:-len('-hero.webp')]
    return w.slug


queue = [{
    'slug': w.slug,
    'file': file_stem(w),
    'name': f'{w.brand.name} {w.name}',
    'referenceNumber': w.reference,
    'dialColor': DIAL_EN.get(w.dial_color, 'Black'),
    'caseDiameter': w.case_diameter,
    'caseMaterial': case_en(w.case_material),
    'movementType': MOVEMENT_EN.get(w.movement, 'AUTOMATIC'),
} for w in Watch.objects.filter(is_active=True).select_related('brand').prefetch_related('images').order_by('brand__name', 'name')]

OUT.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(queue)} relojes -> {OUT}')
