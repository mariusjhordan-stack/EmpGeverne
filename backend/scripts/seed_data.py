"""
Seed data for Cronos Genève demo.
Run: python manage.py shell < scripts/seed_data.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from catalog.models import Brand, Collection, Watch, WatchImage

User = get_user_model()

# --- Brands ---
brands_data = [
    {'name': 'Audemars Piguet', 'slug': 'audemars-piguet', 'country': 'Suiza',
     'description': 'Manufactura relojera suiza fundada en 1875 en Le Brassus.'},
    {'name': 'Patek Philippe', 'slug': 'patek-philippe', 'country': 'Suiza',
     'description': 'Casa relojera de Ginebra fundada en 1839, sinónimo de excelencia.'},
    {'name': 'Rolex', 'slug': 'rolex', 'country': 'Suiza',
     'description': 'Manufactura relojera suiza fundada en 1905 en Londres.'},
    {'name': 'Omega', 'slug': 'omega', 'country': 'Suiza',
     'description': 'Relojería suiza de prestigio fundada en 1848.'},
    {'name': 'TAG Heuer', 'slug': 'tag-heuer', 'country': 'Suiza',
     'description': 'Casa relojera suiza especializada en cronógrafos deportivos.'},
    {'name': 'Cartier', 'slug': 'cartier', 'country': 'Francia',
     'description': 'Maison de alta joyería y relojería fundada en París en 1847.'},
]

brands = {}
for bd in brands_data:
    b, _ = Brand.objects.get_or_create(slug=bd['slug'], defaults=bd)
    brands[b.slug] = b
    print(f"  Brand: {b.name}")

# --- Collections ---
collections_data = [
    {'name': 'Clásica', 'slug': 'clasica', 'description': 'Elegancia atemporal y diseño tradicional.'},
    {'name': 'Deportiva', 'slug': 'deportiva', 'description': 'Resistencia y rendimiento para un estilo de vida activo.'},
    {'name': 'Lujo', 'slug': 'lujo', 'description': 'Piezas exclusivas con materiales preciosos y acabados excepcionales.'},
    {'name': 'Edición Limitada', 'slug': 'edicion-limitada', 'description': 'Colecciones numeradas de producción restringida.'},
]

collections = {}
for cd in collections_data:
    c, _ = Collection.objects.get_or_create(slug=cd['slug'], defaults=cd)
    collections[c.slug] = c
    print(f"  Collection: {c.name}")

# --- Watches ---
watches_data = [
    {
        'name': 'Royal Oak Selfwinding',
        'slug': 'royal-oak-selfwinding',
        'reference': 'CG-AP-001',
        'brand': brands['audemars-piguet'],
        'collection': collections['lujo'],
        'description': 'Reloj icónico con caja octogonal y bisel con tornillos visibles. Movimiento automático de manufactura con masa oscilante de oro.',
        'price': 28600.00,
        'stock': 3,
        'movement': 'automatic',
        'case_material': 'Acero inoxidable',
        'case_diameter': '41mm',
        'water_resistance': '50m',
        'crystal': 'sapphire',
        'strap_material': 'Acero inoxidable',
        'warranty': '5 años',
        'is_featured': True,
    },
    {
        'name': 'Nautilus 5711',
        'slug': 'nautilus-5711',
        'reference': 'CG-PP-001',
        'brand': brands['patek-philippe'],
        'collection': collections['lujo'],
        'description': 'Reloj deportivo de lujo con caja redondeada y bisel octogonal. Calibre automático de alta relojería.',
        'price': 34890.00,
        'stock': 2,
        'movement': 'automatic',
        'case_material': 'Acero inoxidable',
        'case_diameter': '40mm',
        'water_resistance': '120m',
        'crystal': 'sapphire',
        'strap_material': 'Acero inoxidable',
        'warranty': '2 años',
        'is_featured': True,
    },
    {
        'name': 'Submariner Date',
        'slug': 'submariner-date',
        'reference': 'CG-RX-001',
        'brand': brands['rolex'],
        'collection': collections['deportiva'],
        'description': 'Reloj de buceo profesional con bisel giratorio unidireccional. Referencia en la relojería deportiva.',
        'price': 11350.00,
        'stock': 5,
        'movement': 'automatic',
        'case_material': 'Acero Oystersteel',
        'case_diameter': '41mm',
        'water_resistance': '300m',
        'crystal': 'sapphire',
        'strap_material': 'Acero Oystersteel',
        'warranty': '5 años',
        'is_featured': True,
    },
    {
        'name': 'Datejust 36',
        'slug': 'datejust-36',
        'reference': 'CG-RX-002',
        'brand': brands['rolex'],
        'collection': collections['clasica'],
        'description': 'Reloj clásico con ventana de fecha y lente Cyclops. Símbolo de elegancia desde 1945.',
        'price': 10250.00,
        'stock': 7,
        'movement': 'automatic',
        'case_material': 'Acero Oystersteel y oro amarillo',
        'case_diameter': '36mm',
        'water_resistance': '100m',
        'crystal': 'sapphire',
        'strap_material': 'Acero Oystersteel y oro',
        'warranty': '5 años',
        'is_featured': False,
    },
    {
        'name': 'Speedmaster Moonwatch',
        'slug': 'speedmaster-moonwatch',
        'reference': 'CG-OM-001',
        'brand': brands['omega'],
        'collection': collections['deportiva'],
        'description': 'El reloj que llegó a la Luna. Cronógrafo manual con historia espacial incomparable.',
        'price': 7800.00,
        'stock': 8,
        'movement': 'manual',
        'case_material': 'Acero inoxidable',
        'case_diameter': '42mm',
        'water_resistance': '50m',
        'crystal': 'sapphire',
        'strap_material': 'Acero inoxidable',
        'warranty': '5 años',
        'is_featured': True,
    },
    {
        'name': 'Seamaster Diver 300M',
        'slug': 'seamaster-diver-300m',
        'reference': 'CG-OM-002',
        'brand': brands['omega'],
        'collection': collections['deportiva'],
        'description': 'Reloj de buceo con válvula de escape de helio y bisel cerámico. Co-Axial Master Chronometer.',
        'price': 5900.00,
        'stock': 6,
        'movement': 'automatic',
        'case_material': 'Acero inoxidable',
        'case_diameter': '42mm',
        'water_resistance': '300m',
        'crystal': 'sapphire',
        'strap_material': 'Caucho',
        'warranty': '5 años',
        'is_featured': False,
    },
    {
        'name': 'Carrera Chronograph',
        'slug': 'carrera-chronograph',
        'reference': 'CG-TH-001',
        'brand': brands['tag-heuer'],
        'collection': collections['deportiva'],
        'description': 'Cronógrafo deportivo inspirado en las carreras de automóviles. Diseño legible y dinámico.',
        'price': 6800.00,
        'stock': 10,
        'movement': 'automatic',
        'case_material': 'Acero inoxidable',
        'case_diameter': '44mm',
        'water_resistance': '100m',
        'crystal': 'sapphire',
        'strap_material': 'Cuero',
        'warranty': '2 años',
        'is_featured': False,
    },
    {
        'name': 'Monaco Calibre',
        'slug': 'monaco-calibre',
        'reference': 'CG-TH-002',
        'brand': brands['tag-heuer'],
        'collection': collections['edicion-limitada'],
        'description': 'Icónico reloj cuadrado con cronógrafo. Homenaje a la tradición de las carreras.',
        'price': 8300.00,
        'stock': 4,
        'movement': 'automatic',
        'case_material': 'Acero inoxidable',
        'case_diameter': '39mm',
        'water_resistance': '100m',
        'crystal': 'sapphire',
        'strap_material': 'Cuero',
        'warranty': '2 años',
        'is_featured': True,
    },
    {
        'name': 'Santos de Cartier',
        'slug': 'santos-de-cartier',
        'reference': 'CG-CA-001',
        'brand': brands['cartier'],
        'collection': collections['clasica'],
        'description': 'Primer reloj de pulsera para caballero. Diseño cuadrado con tornillos visibles y bisel pulido.',
        'price': 9200.00,
        'stock': 5,
        'movement': 'automatic',
        'case_material': 'Acero inoxidable',
        'case_diameter': '39.8mm',
        'water_resistance': '100m',
        'crystal': 'sapphire',
        'strap_material': 'Acero inoxidable',
        'warranty': '2 años',
        'is_featured': True,
    },
    {
        'name': 'Tank Française',
        'slug': 'tank-francaise',
        'reference': 'CG-CA-002',
        'brand': brands['cartier'],
        'collection': collections['clasica'],
        'description': 'Elegante reloj rectangular con cadena integrada al caso. Un ícono del Art Déco.',
        'price': 3700.00,
        'stock': 6,
        'movement': 'quartz',
        'case_material': 'Acero inoxidable',
        'case_diameter': '32mm',
        'water_resistance': '30m',
        'crystal': 'sapphire',
        'strap_material': 'Acero inoxidable',
        'warranty': '2 años',
        'is_featured': False,
    },
    {
        'name': 'Calatrava 5227',
        'slug': 'calatrava-5227',
        'reference': 'CG-PP-002',
        'brand': brands['patek-philippe'],
        'collection': collections['clasica'],
        'description': 'La esencia de la relojería clásica. Fondo de cristal de zafiro con grabado a mano.',
        'price': 42200.00,
        'stock': 1,
        'movement': 'automatic',
        'case_material': 'Oro rosa 18k',
        'case_diameter': '39mm',
        'water_resistance': '30m',
        'crystal': 'sapphire',
        'strap_material': 'Cuero de aligátor',
        'warranty': '2 años',
        'is_featured': True,
    },
    {
        'name': 'Royal Oak Offshore Diver',
        'slug': 'royal-oak-offshore-diver',
        'reference': 'CG-AP-002',
        'brand': brands['audemars-piguet'],
        'collection': collections['deportiva'],
        'description': 'Versión de buceo del Royal Oak con caja de 42mm y resistencia al agua de 300 metros.',
        'price': 28500.00,
        'stock': 2,
        'movement': 'automatic',
        'case_material': 'Acero inoxidable',
        'case_diameter': '42mm',
        'water_resistance': '300m',
        'crystal': 'sapphire',
        'strap_material': 'Caucho',
        'warranty': '5 años',
        'is_featured': False,
    },
]

for wd in watches_data:
    w, created = Watch.objects.get_or_create(reference=wd['reference'], defaults=wd)
    if created:
        print(f"  Watch: {w.name} (${w.price})")
    else:
        print(f"  Watch exists: {w.name}")

    # Official Patek Philippe photo (CC BY-SA 4.0) replaced the old illustration under a new name
    image_overrides = {'nautilus-5711': 'nautilus-5711-1a'}
    img_path = f"watches/{image_overrides.get(w.slug, w.slug)}.jpg"
    full_path = os.path.join(settings.MEDIA_ROOT, img_path)
    if os.path.exists(full_path):
        WatchImage.objects.get_or_create(
            watch=w,
            is_primary=True,
            defaults={'image': img_path, 'alt_text': f"{w.brand.name} {w.name}", 'order': 1}
        )

print("\nSeed data loaded successfully!")
print(f"  Brands: {Brand.objects.count()}")
print(f"  Collections: {Collection.objects.count()}")
print(f"  Watches: {Watch.objects.count()}")
print(f"  Watch Images: {WatchImage.objects.count()}")
