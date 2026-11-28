"""
Boleta de compra por correo.

Se envía al correo de la cuenta (el de Google si entró con Google) cuando el pedido queda pagado,
y se puede volver a pedir desde la ficha del pedido. Lleva el detalle de cada pieza con su foto,
la operación gravada, el IGV (18 %), el total, el pago y la dirección de envío.

Es un comprobante de demostración del proyecto académico: no tiene valor tributario.
"""
import logging
from decimal import Decimal
from io import BytesIO

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from .serializers import primary_image

logger = logging.getLogger(__name__)

IGV_RATE = Decimal('18')
THUMB = 160  # px del lado de la foto dentro del correo (se muestra a 80 px, nítida en pantallas retina)
PAPER = (250, 248, 243)


class ReceiptEmail(EmailMultiAlternatives):
    """Correo con las fotos dentro del HTML (multipart/related), no como adjuntos sueltos."""

    def __init__(self, *args, inline_images=(), **kwargs):
        super().__init__(*args, **kwargs)
        self.inline_images = list(inline_images)

    def message(self, *args, **kwargs):
        msg = super().message(*args, **kwargs)
        html = msg.get_body(preferencelist=('html',))
        if html is not None:
            for cid, data in self.inline_images:
                html.add_related(
                    data, maintype='image', subtype='jpeg', cid=f'<{cid}>',
                    disposition='inline', filename=cid.split('@')[0] + '.jpg',
                )
        return msg


STORE = {
    'name': 'Cronos Genève',
    'tagline': 'Relojería de alta gama',
    'address': 'Av. Javier Prado Este 4200, Lima, Perú',
    'email': 'contacto@cronosgeneve.com',
}

_UNITS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce',
          'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
          'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
          'veintiocho', 'veintinueve']
_TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
_HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
             'setecientos', 'ochocientos', 'novecientos']


def _below_thousand(n):
    if n == 100:
        return 'cien'
    words = [_HUNDREDS[n // 100]] if n >= 100 else []
    rest = n % 100
    if rest < 30:
        words.append(_UNITS[rest])
    else:
        words.append(_TENS[rest // 10] + (f' y {_UNITS[rest % 10]}' if rest % 10 else ''))
    return ' '.join(w for w in words if w)


def number_to_words(n):
    """Entero en letras (español), hasta 999 999 999: 4897 -> 'cuatro mil ochocientos noventa y siete'."""
    if n == 0:
        return 'cero'
    millions, rest = divmod(n, 1_000_000)
    thousands, units = divmod(rest, 1000)
    parts = []
    if millions:
        parts.append('un millón' if millions == 1 else f'{_below_thousand(millions)} millones'.replace('uno millones', 'un millones'))
    if thousands:
        parts.append('mil' if thousands == 1 else f'{_below_thousand(thousands)} mil'.replace('uno mil', 'un mil'))
    if units:
        parts.append(_below_thousand(units))
    # 'uno' se apocopa delante de mil/millones: veintiún mil, treinta y un mil.
    return ' '.join(parts).replace('veintiun ', 'veintiún ')


def amount_in_words(value):
    """Importe como en las boletas: 'CUATRO MIL OCHOCIENTOS NOVENTA Y SIETE CON 00/100 DÓLARES AMERICANOS'."""
    value = Decimal(value).quantize(Decimal('0.01'))
    whole = int(value)
    cents = int((value - whole) * 100)
    return f"{number_to_words(whole)} con {cents:02d}/100 dólares americanos".upper()


def receipt_number(order):
    """Serie y correlativo de la boleta (demostración): B001-00000042."""
    return f"B001-{order.pk:08d}"


def _money(value):
    return f"USD {Decimal(value):,.2f}"


def _thumbnail(watch):
    """Foto principal del reloj como JPEG cuadrado (los correos no siempre muestran WebP)."""
    img = primary_image(watch)
    if img is None:
        return None
    try:
        from PIL import Image
        with img.image.open('rb') as fh, Image.open(fh) as source:
            source.thumbnail((THUMB, THUMB))
            canvas = Image.new('RGB', (THUMB, THUMB), PAPER)
            rgba = source.convert('RGBA')
            canvas.paste(rgba, ((THUMB - rgba.width) // 2, (THUMB - rgba.height) // 2), rgba)
            out = BytesIO()
            canvas.save(out, 'JPEG', quality=88)
            return out.getvalue()
    except (OSError, ValueError):
        logger.warning('No se pudo preparar la foto de %s para la boleta.', watch, exc_info=True)
        return None


def _customer_name(user):
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.email


def receipt_context(order):
    """Datos de la boleta (los usan el correo y el PDF). Cada pieza lleva su foto en JPEG (o None)."""
    user = order.user
    items, images = [], []
    for i, item in enumerate(order.items.select_related('watch').prefetch_related('watch__images')):
        cid = None
        photo = _thumbnail(item.watch) if item.watch else None
        if photo:
            cid = f"pieza-{i}@cronos"
            images.append((cid, photo))
        items.append({
            'brand': item.watch_brand,
            'name': item.watch_name,
            'reference': item.watch_reference,
            'quantity': item.quantity,
            'unit_price': _money(item.unit_price),
            'subtotal': _money(item.subtotal),
            'cid': cid,
            'photo': photo,
        })

    payment = getattr(order, 'payment', None)
    issued = timezone.localtime(payment.paid_at if payment else order.created_at)
    store_url = settings.FRONTEND_URL.rstrip('/')
    context = {
        'order': order,
        'customer': _customer_name(user),
        'email': user.email,
        'issued': issued.strftime('%d/%m/%Y %H:%M'),
        'items': items,
        'item_count': sum(item['quantity'] for item in items),
        'subtotal': _money(order.subtotal),
        'igv_rate': IGV_RATE,
        'tax': _money(order.tax),
        'total': _money(order.total),
        'payment_method': payment.get_method_display() if payment else 'Pendiente',
        'payment_reference': payment.reference if payment else '—',
        'is_demo': payment.is_demo if payment else True,
        'order_url': f"{store_url}/pedidos/{order.order_number}",
        'store_url': store_url,
        'receipt_number': receipt_number(order),
        'amount_words': amount_in_words(order.total),
        'store': STORE,
    }
    return context, images


def build_receipt(order):
    """Arma el correo (texto + HTML con las fotos incrustadas) sin enviarlo."""
    context, images = receipt_context(order)
    user = order.user
    subject = f"Su boleta de compra {order.order_number} — Cronos Genève"
    message = ReceiptEmail(
        subject=subject,
        body=render_to_string('orders/receipt.txt', context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
        inline_images=images,
    )
    message.attach_alternative(render_to_string('orders/receipt.html', context), 'text/html')
    return message


def email_configured():
    """False si el correo solo se imprime en la terminal (faltan EMAIL_HOST_USER / EMAIL_HOST_PASSWORD)."""
    return not settings.EMAIL_BACKEND.endswith('console.EmailBackend')


def send_receipt(order):
    """Envía la boleta y devuelve True si salió. Nunca rompe la compra: si el correo falla, lo registra."""
    if not order.user.email:
        return False
    try:
        build_receipt(order).send()
    except Exception:  # SMTP caído, credenciales malas, sin internet…
        logger.exception('No se pudo enviar la boleta del pedido %s.', order.order_number)
        return False
    return email_configured()
