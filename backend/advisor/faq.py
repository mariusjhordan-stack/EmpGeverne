"""General watch questions answered without AI. The input is lower case and without accents."""
import re

_ASK = (r'(?=.*(que es|que son|que significa|que diferencia|diferencia|como funciona|para que sirve|explica|mejor'
        r'|what is|what are|what does|difference|how does|explain|better|\bor\b|\bo\b))')


def _entry(regex, es, en):
    return re.compile(regex, re.DOTALL), es, en


_ENTRIES = [
    _entry(r'(?=.*(automatic))(?=.*(cuarzo|quartz)).*',
           'Un automático se da cuerda con el movimiento de la muñeca y se valora por su mecánica. Uno de cuarzo usa pila, es más preciso y necesita menos cuidado.',
           'An automatic is wound by the motion of your wrist and is valued for its mechanics. A quartz watch uses a battery, is more accurate and needs less care.'),
    _entry(_ASK + r'.*automatic.*',
           'Un reloj automático es mecánico: un rotor le da cuerda con el movimiento de la muñeca. Si no lo usas, se detiene al agotarse la reserva de marcha.',
           'An automatic watch is mechanical: a rotor winds it as your wrist moves. Left unworn, it stops when the power reserve runs out.'),
    _entry(_ASK + r'.*(cuarzo|quartz).*',
           'Un reloj de cuarzo funciona con pila y un cristal de cuarzo que marca el ritmo. Es muy preciso y de poco mantenimiento.',
           'A quartz watch runs on a battery, with a quartz crystal keeping time. It is very accurate and low maintenance.'),
    _entry(_ASK + r'.*(cuerda|manual).*',
           'Un reloj de cuerda manual es mecánico y se carga girando la corona.',
           'A manual watch is mechanical and is wound by turning the crown.'),
    _entry(_ASK + r'.*(cronografo|chronograph).*',
           'Un cronógrafo es un reloj que además mide intervalos de tiempo, como un cronómetro, con pulsadores.',
           'A chronograph also measures elapsed time, like a stopwatch, using pushers.'),
    _entry(_ASK + r'.*\bgmt\b.*',
           'GMT indica que el reloj muestra una segunda zona horaria, útil para viajar.',
           'GMT means the watch shows a second time zone, useful for travelling.'),
    _entry(_ASK + r'.*(bisel|bezel).*',
           'El bisel es el anillo que rodea el cristal. En los relojes de buceo gira para medir el tiempo de inmersión.',
           'The bezel is the ring around the crystal. On dive watches it rotates to time the dive.'),
    _entry(_ASK + r'.*(zafiro|sapphire).*',
           'El cristal de zafiro es muy duro y resiste muy bien las rayaduras.',
           'Sapphire crystal is very hard and resists scratches very well.'),
    _entry(_ASK + r'.*(reserva|power reserve).*',
           'La reserva de marcha es el tiempo que un reloj mecánico funciona sin darle cuerda.',
           'Power reserve is how long a mechanical watch runs without winding.'),
    _entry(_ASK + r'.*(resistencia al agua|water resistance|atm).*',
           'La resistencia al agua es la presión soportada en pruebas, no una profundidad de uso libre: como guía, 50 m resiste salpicaduras, 100 m sirve para nadar y 200 m o más para deportes acuáticos.',
           'Water resistance is tested pressure, not a depth to use freely: as a guide, 50 m handles splashes, 100 m suits swimming and 200 m or more suits water sports.'),
    _entry(r'.*(cuidar|cuidado|cuido|limpi|manten|revision|how (do i|to) (clean|care)|maintenance|service interval).*',
           'Límpialo con un paño suave, evita golpes, imanes y químicos, y enjuágalo con agua dulce tras el mar si es resistente al agua. Los mecánicos conviene revisarlos periódicamente según indique el fabricante.',
           'Clean it with a soft cloth, avoid knocks, magnets and chemicals, and rinse it in fresh water after the sea if it is water resistant. Mechanical watches need periodic service as the maker advises.'),
    _entry(r'.*(que tamano|que talla|muneca|what size|wrist).*(?<!mm)',
           'Como guía, en muñecas pequeñas (menos de 16 cm) suelen quedar bien 36–39 mm; en medianas (16–18 cm), 39–42 mm; y en grandes, 42 mm o más.',
           'As a guide, small wrists (under 16 cm) suit 36–39 mm, medium wrists (16–18 cm) 39–42 mm, and larger wrists 42 mm or more.'),
    _entry(r'.*(garantia|warranty|envio|entrega|delivery|shipping|descuento|discount|oferta|devoluc|return policy|refund).*',
           'La garantía de cada reloj figura en su ficha. No tengo información sobre envíos, devoluciones ni descuentos, así que prefiero no inventarla.',
           'Each watch lists its warranty on its page. I do not have information about delivery, returns or discounts, so I would rather not guess.'),
    _entry(r'.*(como compro|como comprar|como pago|como se paga|como puedo (comprar|pagar)|metodos? de pago'
           r'|how (do|can) i (buy|pay|order)|payment method|checkout).*',
           'Abre el reloj que te guste, agrégalo al carrito, inicia sesión y completa el pago (es una tienda de demostración). Puedes seguir tu pedido en «Mis pedidos».',
           'Open the watch you like, add it to the cart, sign in and complete the payment (this is a demo store). You can follow your order under “My orders”.'),
]


def answer(text, spanish):
    for pattern, es, en in _ENTRIES:
        if pattern.fullmatch(text):
            return es if spanish else en
    return None
