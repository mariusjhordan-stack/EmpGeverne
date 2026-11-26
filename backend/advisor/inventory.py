"""The advisor's view of the catalogue: active watches with stock, read once per request."""
import re
import unicodedata
from dataclasses import dataclass, field
from decimal import Decimal

from catalog.models import Watch


def normalize(text):
    """Lower case, without accents, trimmed (the fallback rules work on this form)."""
    text = unicodedata.normalize('NFD', text or '')
    return ''.join(c for c in text if not unicodedata.combining(c)).lower().strip()


MOVEMENT_EN = {
    'automatic': 'automatic', 'manual': 'manual winding', 'quartz': 'quartz',
    'solar': 'solar', 'spring_drive': 'Spring Drive',
}
CRYSTAL_EN = {'sapphire': 'sapphire crystal', 'mineral': 'mineral crystal', 'acrylic': 'acrylic'}

# Style of a watch, inferred from its data (the store's collections are Clásica / Deportiva / Lujo...).
_STYLE_WORDS = {
    'div': r'buceo|buzo|diver|submarin|inmersion|fathoms|dweller|deepsea|pelagos|marinemaster|superocean|aquanaut',
    'sport': r'deport|sport|regata|carrera|racing|offshore',
    'dress': r'vestir|elegan|dress|formal|clasic|classic|ultra thin|ultrafin|calatrava|reverso|tank',
    'chrono': r'cronograf|chronograph|chronomat|daytona|speedmaster',
    'field': r'piloto|pilot|aviaci|aviador|navitimer|campo|field|explor|militar',
    'gmt': r'\bgmt\b|zona horaria|husos? horarios?|time zone|travel time|zulu|viaj',
    'minimal': r'minimal|sencill|simple|pureza|sobri',
    'digital': r'digital',
}


@dataclass
class Item:
    id: int
    slug: str
    name: str
    brand: str
    collection: str
    collection_slug: str
    price: Decimal
    stock: int
    movement: str
    movement_es: str
    case_diameter: str
    case_material: str
    strap_material: str
    water_resistance: str
    crystal: str
    crystal_es: str
    reference: str
    description: str
    dial: str
    warranty: str
    image_url: str | None
    styles: set = field(default_factory=set)

    @property
    def full_name(self):
        return f'{self.brand} {self.name}'

    @property
    def water_meters(self):
        m = re.search(r'(\d+)\s*m\b', self.water_resistance or '', re.I)
        return int(m.group(1)) if m else 0


def _styles(item):
    blob = normalize(' '.join([item.name, item.collection, item.description, item.reference]))
    found = {key for key, words in _STYLE_WORDS.items() if re.search(words, blob)}
    if item.water_meters >= 200:
        found.add('div')
    if item.collection_slug.startswith('deport'):
        found.add('sport')
    if item.collection_slug.startswith('clasic'):
        found.add('dress')
    if item.movement == 'quartz' and 'digital' in blob:
        found.add('digital')
    return found


def _image_url(watch, build_url):
    images = list(watch.images.all())  # prefetched, ordered by `order`
    img = next((i for i in images if i.is_primary), images[0] if images else None)
    if not img or not img.image:
        return None
    url = img.image.url
    return build_url(url) if build_url else url


def load_items(build_url=None):
    """Watches the store can sell right now, cheapest first."""
    watches = (Watch.objects.filter(is_active=True, stock__gt=0)
               .select_related('brand', 'collection').prefetch_related('images').order_by('price', 'id'))
    items = []
    for w in watches:
        item = Item(
            id=w.id, slug=w.slug, name=w.name, brand=w.brand.name,
            collection=w.collection.name if w.collection else '',
            collection_slug=w.collection.slug if w.collection else '',
            price=w.price, stock=w.stock,
            movement=w.movement, movement_es=w.get_movement_display(),
            case_diameter=w.case_diameter or '', case_material=w.case_material or '',
            strap_material=w.strap_material or '', water_resistance=w.water_resistance or '',
            crystal=w.crystal, crystal_es=w.get_crystal_display(),
            reference=w.reference or '', description=w.description or '',
            dial=getattr(w, 'dial_color', '') or '', warranty=w.warranty or '',
            image_url=_image_url(w, build_url),
        )
        item.styles = _styles(item)
        items.append(item)
    return items


def card(item, shown):
    """A recommended watch as the API returns it; every figure comes from the database."""
    return {
        'id': item.id,
        'slug': item.slug,
        'name': item.name,
        'brand_name': item.brand,
        'price': str(item.price),
        'shown_price': shown.price(item.price),
        'primary_image': item.image_url,
        'reference': item.reference,
    }
