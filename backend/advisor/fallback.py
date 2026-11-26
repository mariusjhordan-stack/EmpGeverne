"""Basic mode: answers from catalogue data alone, without any AI. Every figure is a stored value.
Port of CatalogFallback (Java)."""
import re
from dataclasses import dataclass
from decimal import Decimal

from . import faq
from .currency import EUR, PEN, USD
from .inventory import MOVEMENT_EN, CRYSTAL_EN, normalize

MAX_CARDS = 3


@dataclass
class Budget:
    """The customer's limit: in dollars to compare with prices, and as they said it to repeat it back."""
    usd: Decimal
    amount: Decimal
    currency: str
    label: str


@dataclass
class Answer:
    text: str
    items: list
    budget: Budget | None


# "20000", "20 000", "20.000", "20,000", "20k", "20 mil"; not sizes, depths or hours.
_AMOUNT = re.compile(
    r'(?<![\w.,])(\d{1,3}(?:[.,   ]\d{3})+|\d{1,7})(?:[.,]\d{1,2})?\s*(k\b|mil\b|thousand\b)?'
    r'(?!\s*(?:mm|m|cm|metros?|meters?|atm|bar|horas?|hours?|anos?|years?)\b)(?!\w)')
_SOLES = re.compile(r'\b(soles?|pen)\b|s/')
_EUROS = re.compile(r'\b(euros?|eur)\b|€')
_DOLLARS = re.compile(r'\$|\busd\b|dolar|dollar')
# Currencies the shop does not show prices in.
_OTHER_CURRENCY = re.compile(
    r'\b(pesos?|francos?|francs?|libras?|pounds?|yen(es)?|yuan(es)?|reales?|rupias?|rupees?|bolivares?'
    r'|chf|gbp|mxn|jpy|cny|brl|clp|cop|ars)\b|£|¥')
_DETAILS = re.compile(
    r'\bmm\b|milimetro|tamano|diametro|\bsize|diameter|movimiento|movement|automatic|cuarzo|quartz|agua|water|material'
    r'|correa|strap|precio|price|cuesta|cost|stock|disponib|availab|reserva|compar|caracter|brazalete|bracelet|pulsera'
    r'|cristal|crystal|vidrio|color|autonomia|cuanto dura|referencia|reference|quedan|unidades|pila|bateria|battery'
    r'|sumerg|mojar|nadar|swim|muneca|wrist|\beste\b|\bese\b|detail|detalle|esfera|dial|garantia|warranty')
# Words that narrow a question to some specifications (kept in step with _describe).
_SPECIFIC = re.compile(
    r'precio|price|cuesta|cost|vale|\bmm\b|milimetro|tamano|diametro|size|diameter|grande|muneca|wrist|movimiento|movement'
    r'|automatic|cuarzo|quartz|cuerda|pila|bateria|battery|material|acero|steel|\boro\b|gold|agua|water|sumerg|mojar|nadar|swim|buce'
    r'|correa|strap|brazalete|bracelet|pulsera|cristal|crystal|vidrio|zafiro|sapphire|esfera|dial|color'
    r'|referencia|reference|stock|disponib|availab|quedan|unidades|\bhay\b|garantia|warranty')
_WATCHES = re.compile(
    r'reloj|watch|presupuesto|budget|dolar|dollar|usd|\$|soles?\b|euros?\b|€|s/|regalo|gift|compr|buy|recom|barat|cheap'
    r'|caro|expensive|coleccion|collection|catalogo|catalog|marca|brand|movimiento|movement|automatic|modelo|\bmodels?\b'
    r'|carrito|cart|pedido|order|favorit|^(hola|hi|hello|hey|buenas|buenos)\b')
# Style keyword in the customer's text -> style key (see inventory._STYLE_WORDS).
_STYLES = [
    (re.compile(r'buce|buzo|\bdiv(e|er|ing)|\bmar\b|nadar|swim'), 'div'),
    (re.compile(r'cronog|chrono'), 'chrono'),
    (re.compile(r'deport|sport'), 'sport'),
    (re.compile(r'formal|vestir|elegan|dress|boda|wedding|oficina|office'), 'dress'),
    (re.compile(r'pilot|aviador|aviacion|campo\b|field|explorad|aventura|adventure'), 'field'),
    (re.compile(r'\bgmt\b|viaj|travel|zona horaria'), 'gmt'),
    (re.compile(r'minimal|sencill|simple'), 'minimal'),
    (re.compile(r'digital'), 'digital'),
]
# Words of watch names too generic to mean that watch.
_GENERIC = {
    'chronograph', 'chronographe', 'professional', 'collection', 'master', 'watch', 'classic', 'classique', 'pilot',
    'diver', 'calibre', 'automatic', 'mechanical', 'field', 'edition', 'limited', 'heritage', 'sport', 'perpetual',
    'travel', 'ultra', 'advanced', 'research', 'quartz', 'steel', 'royal', 'grand',
    # Spanish words, colours and materials that also describe what the customer wants.
    'cronos', 'geneve', 'reloj', 'clasico', 'clasica', 'elegante', 'negro', 'negra', 'blanco', 'blanca', 'verde',
    'dorado', 'dorada', 'plata', 'plateado', 'titanio', 'acero', 'ceramica', 'cuero', 'edicion', 'especial',
    'black', 'white', 'green', 'silver', 'titanium', 'ceramic', 'leather',
}
_PLURAL = re.compile(r'relojes|watches|modelos|models|cuales|todos|mas barat|mas car|cheapest|most expensive')


def refusal(es, shown):
    return (f'Solo puedo ayudarte con los relojes de Cronos Genève. ¿Qué presupuesto aproximado tienes, en {shown.name(True)}?'
            if es else
            f'I can only help with the watches at Cronos Genève. What is your approximate budget, in {shown.name(False)}?')


def ask_budget(es, shown):
    return (f'¿Qué presupuesto aproximado tienes, en {shown.name(True)}?' if es
            else f'What is your approximate budget, in {shown.name(False)}?')


def stated(text):
    """The currency a message names, or None when it names none of the three the shop shows."""
    if _SOLES.search(text):
        return PEN
    if _EUROS.search(text):
        return EUR
    if _DOLLARS.search(text):
        return USD
    return None


def amount(text, shown):
    """A budget in the message, in the currency it names or else in the one the customer reads prices in."""
    if _OTHER_CURRENCY.search(text):
        return None
    found = None
    for m in _AMOUNT.finditer(text):
        value = Decimal(re.sub(r'[.,\s  ]', '', m.group(1)))
        if m.group(2):
            value *= 1000
        if value >= 50:
            found = value
    if found is None:
        return None
    cur = stated(text) or shown
    return Budget(usd=cur.to_usd(found), amount=found, currency=cur.code, label=cur.amount(found))


def named(text, items):
    """Watches the text mentions by a distinctive word of their name, or by reference."""
    out = []
    for item in items:
        brand = normalize(item.brand)
        ref = normalize(item.reference)
        hit = len(ref) >= 4 and re.search(r'(?<![a-z0-9])' + re.escape(ref) + r'(?![a-z0-9])', text)
        if not hit:
            for word in re.split(r'[^a-z0-9]+', normalize(item.name)):
                if (len(word) >= 5 and not word.isdigit() and word not in brand and word not in _GENERIC
                        and style(word) is None and not _WATCHES.search(word)
                        and re.search(r'(?<![a-z0-9])' + re.escape(word), text)):
                    hit = True
                    break
        if hit:
            out.append(item)
    return out


def style(text):
    for pattern, key in _STYLES:
        if pattern.search(text):
            return key
    return None


def find_budget(user_texts, items, shown):
    """The latest budget stated in the customer's messages (skipping messages that only name a watch)."""
    for t in reversed([normalize(x) for x in user_texts]):
        if not named(t, items) or stated(t) is not None:
            b = amount(t, shown)
            if b is not None:
                return b
    return None


def _price(item, shown):
    return shown.price(item.price)


def _line(item, shown):
    return f'\n• {item.full_name} ({_price(item, shown)})'


def answer(user_texts, all_texts, items, es, shown):
    """user_texts: the customer's messages, oldest first; all_texts: every message, oldest first."""
    newest_first = [normalize(t) for t in reversed(user_texts)]
    last = newest_first[0]
    budget = find_budget(user_texts, items, shown)
    mentioned = named(last, items)
    wanted = style(last)

    general = faq.answer(last, es)
    if general and not mentioned:
        return Answer(general, [], budget)
    if _OTHER_CURRENCY.search(last) and not mentioned:
        text = (f'¿Cuánto sería en {shown.name(True)}? Te muestro los precios en soles, dólares o euros.' if es
                else f'How much is that in {shown.name(False)}? I can show prices in soles, US dollars or euros.')
        return Answer(text, [], budget)
    plural = bool(_PLURAL.search(last))
    if _DETAILS.search(last) and not (plural and not mentioned):
        about = mentioned
        for earlier in reversed(all_texts):  # "how many mm is it?" refers to the last watch mentioned
            if about:
                break
            about = named(normalize(earlier), items)
        if about:
            picked = about[:MAX_CARDS]
            return Answer('\n'.join(_describe(p, last, es, shown) for p in picked), picked, budget)
    elif mentioned:
        picked = mentioned[:MAX_CARDS]
        return Answer('\n'.join(_describe(p, last, es, shown) for p in picked), picked, budget)

    listing = _listing(last, budget, wanted, items, es, shown)
    if listing is not None:
        return listing
    in_scope = (amount(last, shown) is not None or wanted is not None or _DETAILS.search(last)
                or _WATCHES.search(last))
    if not in_scope:
        return Answer(refusal(es, shown), [], budget)
    if budget is None:
        return Answer(ask_budget(es, shown), [], None)
    for earlier in newest_first[1:]:
        if wanted is not None:
            break
        wanted = style(earlier)

    fits = sorted((i for i in items if i.price <= budget.usd), key=lambda i: i.price, reverse=True)
    if not fits:
        return Answer(_nothing_within(budget, items, es, shown), [], budget)
    styled = fits if wanted is None else [i for i in fits if wanted in i.styles]
    if not styled:
        intro = ((f'No tenemos ese estilo dentro de {budget.label}, pero sí estas opciones:') if es
                 else f'We do not have that style within {budget.label}, but these are available:')
        picked = fits[:MAX_CARDS]
    else:
        intro = (f'Estas opciones entran en tu presupuesto de {budget.label}:' if es
                 else f'These options are within your budget of {budget.label}:')
        picked = styled[:MAX_CARDS]
    return Answer(intro + ''.join(_line(p, shown) for p in picked), picked, budget)


def _nothing_within(budget, items, es, shown):
    lowest = min(items, key=lambda i: i.price, default=None)
    cheapest = f'{lowest.full_name} ({_price(lowest, shown)})' if lowest else '-'
    return (f'No tenemos relojes por {budget.label} o menos. El más accesible es: {cheapest}.' if es
            else f'We have no watches at {budget.label} or less. The most affordable is: {cheapest}.')


def _brand_in(text, items):
    """The brand the text names: full name first, then its first word (e.g. "tag", "iwc")."""
    brands = sorted({i.brand for i in items}, key=len, reverse=True)
    for b in brands:
        if re.search(r'\b' + re.escape(normalize(b)) + r'\b', text):
            return b
    for b in brands:
        first = normalize(b).split(' ')[0]
        if len(first) >= 3 and first != 'grand' and re.search(r'\b' + re.escape(first) + r'\b', text):
            return b
    return None


def _listing(text, budget, wanted, items, es, shown):
    """Cheapest / most expensive / by brand / by movement / everything; always within the budget when known."""
    cheap = bool(re.search(r'barat|economic|accesible|cheap|affordable|lowest', text))
    expensive = not cheap and bool(re.search(r'mas caro|costos|expensive|highest', text))
    brand = _brand_in(text, items)
    movement = ('automatic' if 'automatic' in text else 'quartz' if re.search(r'cuarzo|quartz', text)
                else 'manual' if re.search(r'cuerda|manual', text) else 'solar' if 'solar' in text
                else 'spring_drive' if 'spring drive' in text else None)
    everything = bool(re.search(r'que relojes|cuales (hay|tienen|son)|todos|catalogo|modelos|which watches|what watches|models', text))
    if not (cheap or expensive or brand or movement or everything):
        return None
    found = [i for i in items
             if (brand is None or i.brand == brand)
             and (movement is None or i.movement == movement)
             and (wanted is None or wanted in i.styles)
             and (budget is None or i.price <= budget.usd)]
    found.sort(key=lambda i: i.price, reverse=expensive)
    found = found[:3 if cheap or expensive else 12]
    if not found and budget is not None and brand is not None:
        # The shop does carry the brand: say so with its prices, but recommend nothing over budget.
        over = sorted((i for i in items if i.brand == brand), key=lambda i: i.price)[:12]
        if over:
            intro = (f'Sí tenemos {brand}, aunque por encima de tu presupuesto de {budget.label}:' if es
                     else f'We do carry {brand}, although above your budget of {budget.label}:')
            return Answer(intro + ''.join(_line(i, shown) for i in over), [], budget)
    if not found:
        if budget is not None:
            return Answer(_nothing_within(budget, items, es, shown) if not any(i.price <= budget.usd for i in items)
                          else ('No tenemos un reloj así dentro de tu presupuesto de ' + budget.label + '.' if es
                                else 'We have no watch like that within your budget of ' + budget.label + '.'),
                          [], budget)
        return Answer('No tenemos un reloj así.' if es else 'We have no watch like that.', [], budget)
    intro = (('De menor a mayor precio:' if es else 'From the lowest price:') if cheap
             else ('De mayor a menor precio:' if es else 'From the highest price:') if expensive
             else ('Esto es lo que tenemos:' if es else 'This is what we have:'))
    return Answer(intro + ''.join(_line(i, shown) for i in found), found[:MAX_CARDS], budget)


def _describe(item, question, es, shown):
    """Only the specifications asked about, or the main ones when the question is open."""
    parts = []
    everything = not _SPECIFIC.search(question)

    def add(label_es, label_en, value):
        if value:
            parts.append(f'{label_es if es else label_en} {value}')

    def asked(pattern):
        return bool(re.search(pattern, question))

    if everything or asked(r'precio|price|cuesta|cost|vale'):
        add('precio', 'price', _price(item, shown))
    if everything or asked(r'\bmm\b|milimetro|tamano|diametro|size|diameter|grande|muneca|wrist'):
        add('diámetro', 'diameter', item.case_diameter)
    if everything or asked(r'movimiento|movement|automatic|cuarzo|quartz|cuerda|pila|bateria|battery'):
        add('movimiento', 'movement', item.movement_es.lower() if es else MOVEMENT_EN.get(item.movement, item.movement))
    if everything or asked(r'material|acero|steel|\boro\b|gold'):
        add('caja de', 'case', item.case_material)
    if everything or asked(r'agua|water|sumerg|mojar|nadar|swim|buce'):
        add('resistencia al agua', 'water resistance', item.water_resistance)
    if everything or asked(r'correa|strap|brazalete|bracelet|pulsera'):
        add('correa', 'strap', item.strap_material)
    if asked(r'cristal|crystal|vidrio|zafiro|sapphire'):
        add('cristal', 'crystal', item.crystal_es.lower() if es else CRYSTAL_EN.get(item.crystal, item.crystal))
    if asked(r'esfera|dial|color'):
        add('esfera', 'dial', item.dial)
    if asked(r'referencia|reference'):
        add('referencia', 'reference', item.reference)
    if asked(r'stock|disponib|availab|quedan|unidades|\bhay\b'):
        add('unidades disponibles', 'units available', str(item.stock))
    if asked(r'garantia|warranty'):
        add('garantía', 'warranty', item.warranty)
    if not parts:
        return f'{item.full_name}: ' + ('no tengo ese dato.' if es else 'I do not have that information.')
    return f'{item.full_name}: ' + ', '.join(parts) + '.'
