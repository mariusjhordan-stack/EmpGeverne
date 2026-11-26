"""
Exporta el catálogo público a archivos JSON para la "vitrina" estática (Firebase Hosting).

Uso (desde la carpeta backend, con la base de datos encendida):
    env DB_PORT=5433 venv/bin/python scripts/export_vitrina.py ../frontend/dist/static-api

Genera:
    brands.json, collections.json, featured.json  -> mismas respuestas que la API
    watches.json                                  -> todos los relojes (formato de lista) + campos
                                                     internos "_..." para filtrar y ordenar en el navegador
    watches/<slug>.json                           -> ficha de cada reloj
Las URLs de imágenes quedan relativas (/media/...), para servirlas desde el mismo sitio.
"""
import json
import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django  # noqa: E402

django.setup()

from django.contrib.auth.models import AnonymousUser  # noqa: E402
from django.db.models import Count  # noqa: E402
from django.test import RequestFactory  # noqa: E402

from catalog.models import Brand, Collection, Watch  # noqa: E402
from catalog.serializers import (  # noqa: E402
    BrandSerializer, CollectionSerializer, WatchDetailSerializer, WatchListSerializer,
)

HOST = 'localhost:65000'  # host permitido con un puerto que nadie usa: fácil de quitar después
PREFIX = f'http://{HOST}'


def relative(data):
    """Quita el dominio de todas las URLs: http://localhost:65000/media/x -> /media/x."""
    return json.loads(json.dumps(data, ensure_ascii=False).replace(PREFIX, ''))


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(relative(data), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def main(out):
    out = Path(out).resolve()
    request = RequestFactory().get('/', HTTP_HOST=HOST)
    request.user = AnonymousUser()
    ctx = {'request': request}

    brands = Brand.objects.filter(is_active=True).annotate(watch_count=Count('watches')).order_by('name')
    collections = Collection.objects.filter(is_active=True).annotate(watch_count=Count('watches'))
    watches = (Watch.objects.filter(is_active=True)
               .select_related('brand', 'collection').prefetch_related('images').order_by('-created_at'))

    write(out / 'brands.json', BrandSerializer(brands, many=True, context=ctx).data)
    write(out / 'collections.json', CollectionSerializer(collections, many=True, context=ctx).data)
    write(out / 'featured.json', WatchListSerializer(watches.filter(is_featured=True)[:8], many=True, context=ctx).data)

    rows = []
    for w in watches:
        row = dict(WatchListSerializer(w, context=ctx).data)
        # campos internos para filtrar y ordenar en el navegador (mismos filtros que la API)
        row.update({
            '_brand': w.brand_id, '_brand_slug': w.brand.slug,
            '_collection': w.collection_id, '_collection_slug': w.collection.slug if w.collection else '',
            '_movement': w.movement, '_stock': w.stock, '_featured': w.is_featured,
            '_reference': w.reference or '', '_created': w.created_at.isoformat(),
            '_price': float(w.price),
        })
        rows.append(row)
        write(out / 'watches' / f'{w.slug}.json', WatchDetailSerializer(w, context=ctx).data)
    write(out / 'watches.json', rows)
    print(f'Exportado: {len(rows)} relojes, {brands.count()} marcas, {collections.count()} colecciones -> {out}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Uso: scripts/export_vitrina.py <carpeta de salida>')
    main(sys.argv[1])
