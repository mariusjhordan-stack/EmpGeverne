"""
Second catalogue batch for Cronos Genève: new brands + 38 watches with real photography.
Run after seed_data.py:  python manage.py shell < scripts/seed_more_watches.py

Images live in media/watches/<slug>.jpg (Wikimedia Commons, free licences; credits in
frontend/src/assets/editorial/SOURCES.md). Prices are USD list prices (last known list price
for discontinued references); see the Obsidian note for sources and which ones are estimates.
Idempotent: existing watches (by reference) are left untouched except for the price.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from catalog.models import Brand, Collection, Watch, WatchImage

NEW_BRANDS = [
    ('Breitling', 'breitling', 'Suiza', 'Instrumentos para la aviación desde 1884, cronógrafos de referencia.'),
    ('IWC Schaffhausen', 'iwc', 'Suiza', 'Ingeniería relojera de Schaffhausen desde 1868, célebre por sus relojes de piloto.'),
    ('Tudor', 'tudor', 'Suiza', 'Herramientas de buceo y aventura con la robustez heredada de Rolex.'),
    ('Grand Seiko', 'grand-seiko', 'Japón', 'Precisión japonesa y acabado Zaratsu, la cumbre de la relojería nipona.'),
    ('Seiko', 'seiko', 'Japón', 'Relojería japonesa fundada en 1881, pionera del buceo profesional.'),
    ('Jaeger-LeCoultre', 'jaeger-lecoultre', 'Suiza', 'La Grande Maison del Vallée de Joux, más de 1 200 calibres creados.'),
    ('Panerai', 'panerai', 'Italia', 'Relojes nacidos para los buzos de la Marina italiana, de Florencia al mundo.'),
    ('Breguet', 'breguet', 'Suiza', 'Desde 1775, inventora del tourbillon y del guilloché clásico.'),
    ('Zenith', 'zenith', 'Suiza', 'Manufactura de Le Locle, creadora del cronógrafo automático El Primero.'),
    ('Blancpain', 'blancpain', 'Suiza', 'La marca relojera más antigua del mundo, madre del reloj de buceo moderno.'),
    ('Longines', 'longines', 'Suiza', 'Elegancia y tradición desde 1832 en Saint-Imier.'),
    ('Hamilton', 'hamilton', 'Suiza', 'Espíritu americano y precisión suiza, de los campos de batalla al cine.'),
    ('Tissot', 'tissot', 'Suiza', 'Innovación accesible desde 1853 en Le Locle.'),
]

for name, slug, country, desc in NEW_BRANDS:
    Brand.objects.get_or_create(slug=slug, defaults={'name': name, 'country': country, 'description': desc})

B = {b.slug: b for b in Brand.objects.all()}
C = {c.slug: c for c in Collection.objects.all()}

# (slug, name, ref, brand, collection, price, movement, case, diameter, wr, strap, stock, featured, description)
W = [
    ('gmt-master-ii', 'GMT-Master II', 'CG-RX-003', 'rolex', 'deportiva', 10800, 'automatic', 'Oystersteel', '40mm', '100m', 'Oyster de acero', 3, True,
     'El reloj de los pilotos transatlánticos: segundo huso horario con aguja GMT y bisel bicolor de 24 horas.'),
    ('cosmograph-daytona', 'Cosmograph Daytona', 'CG-RX-004', 'rolex', 'lujo', 21400, 'automatic', 'Rolesor (acero y oro amarillo)', '40mm', '100m', 'Oyster Rolesor', 2, True,
     'El cronógrafo de las carreras de resistencia, con taquímetro grabado y combinación de acero y oro.'),
    ('explorer', 'Explorer', 'CG-RX-005', 'rolex', 'deportiva', 7350, 'automatic', 'Oystersteel', '36mm', '100m', 'Oyster de acero', 4, False,
     'Nacido tras la primera ascensión al Everest: esfera negra legible, índices 3-6-9 y una sobriedad absoluta.'),
    ('explorer-ii', 'Explorer II', 'CG-RX-006', 'rolex', 'deportiva', 10550, 'automatic', 'Oystersteel', '42mm', '100m', 'Oyster de acero', 3, False,
     'Para espeleólogos y exploradores polares: aguja naranja de 24 horas para distinguir el día de la noche.'),
    ('air-king', 'Air-King', 'CG-RX-007', 'rolex', 'deportiva', 7900, 'automatic', 'Oystersteel', '40mm', '100m', 'Oyster de acero', 4, False,
     'Homenaje a la aviación con escala de minutos prominente y su característico logotipo verde y amarillo.'),
    ('sea-dweller', 'Sea-Dweller', 'CG-RX-008', 'rolex', 'deportiva', 14100, 'automatic', 'Oystersteel', '43mm', '1220m', 'Oyster de acero', 2, False,
     'El reloj de los buzos de saturación, con válvula de helio y hermeticidad hasta 1 220 metros.'),
    ('deepsea-sea-dweller', 'Deepsea Sea-Dweller', 'CG-RX-009', 'rolex', 'deportiva', 15450, 'automatic', 'Oystersteel y titanio RLX', '44mm', '3900m', 'Oyster de acero', 2, False,
     'La esfera degradada D-blue rinde homenaje a la inmersión de James Cameron a la fosa de las Marianas.'),
    ('sky-dweller', 'Sky-Dweller', 'CG-RX-010', 'rolex', 'lujo', 49650, 'automatic', 'Oro blanco 18k', '42mm', '100m', 'Oyster de oro blanco', 1, True,
     'Complicación de viajero con doble huso y calendario anual Saros, controlada desde el bisel Ring Command.'),
    ('milgauss', 'Milgauss', 'CG-RX-011', 'rolex', 'deportiva', 9850, 'automatic', 'Oystersteel', '40mm', '100m', 'Oyster de acero', 2, False,
     'Resistente a 1 000 gauss, con cristal verde y su aguja de segundos en forma de rayo.'),
    ('yacht-master-ii', 'Yacht-Master II', 'CG-RX-012', 'rolex', 'deportiva', 19850, 'automatic', 'Oystersteel', '44mm', '100m', 'Oyster de acero', 1, False,
     'Cronógrafo de regatas con cuenta atrás programable de 1 a 10 minutos y memoria mecánica.'),
    ('aqua-terra-150m', 'Seamaster Aqua Terra 150M', 'CG-OM-003', 'omega', 'clasica', 7400, 'automatic', 'Acero inoxidable', '41mm', '150m', 'Acero inoxidable', 4, False,
     'Esfera con motivo de cubierta de teca y calibre Master Chronometer certificado por METAS.'),
    ('aquanaut-advanced-research', 'Aquanaut Advanced Research 5650G', 'CG-PP-003', 'patek-philippe', 'edicion-limitada', 59000, 'automatic', 'Oro blanco 18k', '40.8mm', '120m', 'Caucho compuesto', 1, True,
     'Edición limitada a 500 piezas con segundo huso horario y espiral Spiromax de silicio.'),
    ('calatrava-5196', 'Calatrava 5196', 'CG-PP-004', 'patek-philippe', 'clasica', 26600, 'manual', 'Oro amarillo 18k', '37mm', '30m', 'Piel de aligátor', 2, False,
     'El Calatrava más puro: cuerda manual, segundero pequeño y proporciones de 1932.'),
    ('calatrava-travel-time', 'Calatrava Travel Time', 'CG-PP-005', 'patek-philippe', 'lujo', 48000, 'automatic', 'Oro blanco 18k', '42mm', '30m', 'Piel de becerro', 1, False,
     'Hora local y de origen con dos agujas superpuestas y correctores de huso patentados.'),
    ('royal-oak-chronograph', 'Royal Oak Chronograph', 'CG-AP-003', 'audemars-piguet', 'lujo', 43800, 'automatic', 'Acero inoxidable', '41mm', '50m', 'Acero inoxidable', 1, True,
     'El octógono de Gérald Genta con esfera Grande Tapisserie y cronógrafo de tres contadores.'),
    ('royal-oak-offshore-chronograph', 'Royal Oak Offshore Chronograph', 'CG-AP-004', 'audemars-piguet', 'deportiva', 34000, 'automatic', 'Acero inoxidable', '42mm', '100m', 'Caucho', 2, False,
     'La versión musculosa del Royal Oak: caja sobredimensionada, pulsadores revestidos y carácter rebelde.'),
    ('pasha-de-cartier', 'Pasha de Cartier', 'CG-CA-003', 'cartier', 'clasica', 7450, 'automatic', 'Acero inoxidable', '41mm', '100m', 'Acero intercambiable', 3, False,
     'Caja redonda con la corona protegida por un capuchón encadenado y su cuadrícula central.'),
    ('panthere-de-cartier', 'Panthère de Cartier', 'CG-CA-004', 'cartier', 'lujo', 7400, 'quartz', 'Acero y oro amarillo 18k', '27mm', '30m', 'Brazalete de eslabones', 3, False,
     'El icono joyero de los años ochenta: brazalete fluido como la piel de una pantera.'),
    ('aquaracer-chronograph', 'Aquaracer Chronograph', 'CG-TH-003', 'tag-heuer', 'deportiva', 3500, 'quartz', 'Acero inoxidable', '41mm', '300m', 'Acero inoxidable', 5, False,
     'Cronógrafo de buceo con bisel unidireccional y esfera de alto contraste.'),
    ('superocean-44', 'Superocean 44', 'CG-BR-001', 'breitling', 'deportiva', 5350, 'automatic', 'Acero inoxidable', '44mm', '1000m', 'Acero inoxidable', 4, False,
     'Reloj de buceo profesional hermético hasta 1 000 metros con válvula de helio.'),
    ('navitimer-chronograph', 'Navitimer B01 Chronograph', 'CG-BR-002', 'breitling', 'clasica', 9400, 'automatic', 'Acero inoxidable', '43mm', '30m', 'Piel', 3, True,
     'La regla de cálculo circular más famosa de la aviación, con calibre manufactura B01.'),
    ('chronomat-bluebird', 'Chronomat Bluebird', 'CG-BR-003', 'breitling', 'deportiva', 8600, 'automatic', 'Acero inoxidable', '42mm', '200m', 'Rouleaux de acero', 2, False,
     'Cronógrafo de los años ochenta reinterpretado con bisel de jinetillos y brazalete Rouleaux.'),
    ('big-pilot-saint-exupery', 'Big Pilot Saint-Exupéry', 'CG-IW-001', 'iwc', 'edicion-limitada', 14900, 'automatic', 'Acero inoxidable', '46mm', '60m', 'Piel marrón', 1, False,
     'Corona cónica, 7 días de reserva de marcha y un homenaje al autor de El Principito.'),
    ('pilots-watch-mark-xv', "Pilot's Watch Mark XV", 'CG-IW-002', 'iwc', 'deportiva', 4900, 'automatic', 'Acero inoxidable', '38mm', '60m', 'Piel', 2, False,
     'Descendiente directo de los relojes de navegación de la RAF, con jaula antimagnética.'),
    ('pelagos', 'Pelagos', 'CG-TU-001', 'tudor', 'deportiva', 5200, 'automatic', 'Titanio', '42mm', '500m', 'Titanio', 4, False,
     'Buceo en titanio con cierre que compensa la compresión del traje de neopreno.'),
    ('grand-seiko-hi-beat', 'Hi-Beat 36000', 'CG-GS-001', 'grand-seiko', 'clasica', 6600, 'automatic', 'Acero inoxidable', '40mm', '100m', 'Acero inoxidable', 3, False,
     'Calibre de 10 alternancias por segundo y pulido Zaratsu de espejo sin distorsión.'),
    ('grand-seiko-sbgw231', 'SBGW231', 'CG-GS-002', 'grand-seiko', 'clasica', 5100, 'manual', 'Acero inoxidable', '37.3mm', '30m', 'Piel de cocodrilo', 3, False,
     'Recreación del primer Grand Seiko de 1960: cuerda manual y esfera marfil impecable.'),
    ('prospex-marinemaster', 'Prospex Marinemaster 300', 'CG-SK-001', 'seiko', 'deportiva', 3400, 'automatic', 'Acero inoxidable', '44mm', '300m', 'Acero inoxidable', 5, False,
     'Caja monobloque de buceo profesional y calibre de alta gama hecho a mano en Japón.'),
    ('reverso-classic', 'Reverso Classic', 'CG-JL-001', 'jaeger-lecoultre', 'clasica', 8500, 'manual', 'Acero inoxidable', '45.6 x 27.4mm', '30m', 'Piel de aligátor', 3, True,
     'La caja reversible art déco nacida en 1931 para los jugadores de polo.'),
    ('master-ultra-thin-perpetual', 'Master Ultra Thin Perpetual', 'CG-JL-002', 'jaeger-lecoultre', 'lujo', 24000, 'automatic', 'Acero inoxidable', '39mm', '50m', 'Piel de aligátor', 1, False,
     'Calendario perpetuo ultrafino con fase lunar que no necesita corrección hasta 2100.'),
    ('radiomir-california', 'Radiomir California', 'CG-PA-001', 'panerai', 'clasica', 8400, 'manual', 'Acero inoxidable', '47mm', '100m', 'Piel envejecida', 2, False,
     'Esfera California con números romanos y arábigos, herencia directa de los prototipos de 1936.'),
    ('classique-9067', 'Classique Chronographe 9067', 'CG-BG-001', 'breguet', 'lujo', 30000, 'automatic', 'Oro blanco 18k', '35mm', '30m', 'Piel de aligátor', 1, False,
     'Guilloché a mano, agujas Breguet de punta hueca y caja estriada característica.'),
    ('el-primero-chronograph', 'El Primero Chronograph', 'CG-ZN-001', 'zenith', 'deportiva', 10500, 'automatic', 'Acero inoxidable', '42mm', '100m', 'Piel', 2, False,
     'El primer cronógrafo automático de alta frecuencia, a 36 000 alternancias por hora.'),
    ('fifty-fathoms', 'Fifty Fathoms', 'CG-BP-001', 'blancpain', 'deportiva', 15700, 'automatic', 'Acero inoxidable', '45mm', '300m', 'Tela de lona', 2, True,
     'El reloj de buceo original de 1953, diseñado para los nadadores de combate franceses.'),
    ('master-collection-retrograde', 'Master Collection Retrograde', 'CG-LG-001', 'longines', 'clasica', 3500, 'automatic', 'Acero inoxidable', '41mm', '30m', 'Piel de aligátor', 4, False,
     'Complicaciones retrógradas de segundos y día de la semana con esfera de grano de cebada.'),
    ('spirit-zulu-time', 'Spirit Zulu Time', 'CG-LG-002', 'longines', 'deportiva', 3500, 'automatic', 'Acero inoxidable', '42mm', '100m', 'Acero inoxidable', 4, False,
     'GMT verdadero con bisel cerámico de 24 horas, inspirado en los pioneros de la aviación.'),
    ('khaki-field-mechanical', 'Khaki Field Mechanical', 'CG-HM-001', 'hamilton', 'clasica', 595, 'manual', 'Acero inoxidable', '38mm', '50m', 'Tela NATO', 8, False,
     'El reloj de campo militar por excelencia, con 80 horas de reserva y cuerda manual.'),
    ('prx-chronograph', 'PRX Chronograph', 'CG-TS-001', 'tissot', 'deportiva', 1950, 'automatic', 'Acero inoxidable', '42mm', '100m', 'Acero integrado', 6, False,
     'Diseño integrado de los años setenta con cronógrafo automático y esfera en tablero.'),
]

for (slug, name, ref, brand, coll, price, mov, case, dia, wr, strap, stock, featured, desc) in W:
    w, created = Watch.objects.get_or_create(reference=ref, defaults=dict(
        slug=slug, name=name, brand=B[brand], collection=C.get(coll), price=price, movement=mov,
        case_material=case, case_diameter=dia, water_resistance=wr, crystal='sapphire', strap_material=strap,
        warranty='5 años' if brand == 'rolex' else '2 años', stock=stock, is_featured=featured, description=desc,
    ))
    if not created and float(w.price) != float(price):
        w.price = price
        w.save(update_fields=['price'])
    img = f'watches/{slug}.jpg'
    if os.path.exists(os.path.join(settings.MEDIA_ROOT, img)) and not w.images.exists():
        WatchImage.objects.create(watch=w, image=img, alt_text=f'{w.brand.name} {w.name}', is_primary=True, order=1)
    print(('  + ' if created else '  = ') + f'{w.brand.name} {w.name} (${price})')

# corrected photography for two existing watches
for slug, new_img in [('carrera-chronograph', 'watches/carrera-chronograph-cv2010.jpg'), ('seamaster-diver-300m', 'watches/seamaster-diver-300m-new.jpg')]:
    w = Watch.objects.filter(slug=slug).first()
    if w and os.path.exists(os.path.join(settings.MEDIA_ROOT, new_img)):
        WatchImage.objects.filter(watch=w, is_primary=True).update(image=new_img)
        print(f'  ~ new photo for {w.name}')

print(f'\nBrands: {Brand.objects.count()} · Watches: {Watch.objects.count()} · Images: {WatchImage.objects.count()}')
