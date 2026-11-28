"""
Boleta de compra en PDF (A4), con el formato de una boleta de venta electrónica peruana:
emisor y recuadro con serie y número, datos del cliente, detalle con columnas, importe en letras,
op. gravada / IGV / total, código QR del pedido y pie legal.

Usa ReportLab con las fuentes base de PDF (Helvetica, Times y Courier), así no depende de fuentes
instaladas en la máquina. Es un comprobante de demostración de un proyecto académico: no tiene valor tributario.
"""
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .receipt import receipt_context

INK = colors.HexColor('#111111')
NIGHT = colors.HexColor('#16161a')
WHITE = colors.white
SOFT = colors.HexColor('#f6f3ec')
BRONZE = colors.HexColor('#86591a')
MUTE = colors.HexColor('#7d776b')
DIM = colors.HexColor('#3d3a34')
LINE = colors.HexColor('#d9d2c3')
RULE = colors.HexColor('#ece6da')

MARGIN = 16 * mm
WIDTH = A4[0] - 2 * MARGIN - 12  # ancho útil (menos el relleno de 6 pt del marco a cada lado)


def _style(name, **kw):
    base = dict(fontName='Helvetica', fontSize=8.5, leading=11.5, textColor=DIM)
    base.update(kw)
    return ParagraphStyle(name, **base)


S = {
    'brand': _style('brand', fontName='Times-Roman', fontSize=21, leading=23, textColor=INK),
    'tag': _style('tag', fontName='Helvetica-Bold', fontSize=6.5, leading=9, textColor=BRONZE),
    'issuer': _style('issuer', fontSize=7.5, leading=10.5, textColor=MUTE),
    'box_kind': _style('box_kind', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=INK, alignment=TA_CENTER),
    'box_no': _style('box_no', fontName='Courier-Bold', fontSize=13, leading=16, textColor=BRONZE, alignment=TA_CENTER),
    'box_note': _style('box_note', fontSize=6.5, leading=9, textColor=MUTE, alignment=TA_CENTER),
    'label': _style('label', fontName='Helvetica-Bold', fontSize=6.5, leading=9, textColor=MUTE),
    'field': _style('field', fontSize=8.5, leading=11.5, textColor=INK),
    'th': _style('th', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=WHITE),
    'th_r': _style('th_r', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=WHITE, alignment=TA_RIGHT),
    'th_c': _style('th_c', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=WHITE, alignment=TA_CENTER),
    'cell_c': _style('cell_c', textColor=INK, alignment=TA_CENTER),
    'cell_r': _style('cell_r', textColor=INK, alignment=TA_RIGHT),
    'item': _style('item', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=INK),
    'item_sub': _style('item_sub', fontSize=7.5, leading=10, textColor=MUTE),
    'words': _style('words', fontName='Helvetica-Bold', fontSize=7.5, leading=10.5, textColor=INK),
    'tot_l': _style('tot_l', fontSize=8.5, leading=11, textColor=DIM),
    'tot_r': _style('tot_r', fontSize=8.5, leading=11, textColor=INK, alignment=TA_RIGHT),
    'grand_l': _style('grand_l', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=WHITE),
    'grand_r': _style('grand_r', fontName='Helvetica-Bold', fontSize=11, leading=13, textColor=WHITE, alignment=TA_RIGHT),
    'small': _style('small', fontSize=7, leading=9.5, textColor=MUTE),
}

_FLAT = [
    ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
]


def _p(text, style):
    return Paragraph(escape(str(text)), S[style])


def _field(label, value):
    return [_p(label.upper(), 'label'), Spacer(1, 0.6 * mm), _p(value, 'field')]


def _qr(url, size):
    widget = QrCodeWidget(url, barBorder=0)
    x1, y1, x2, y2 = widget.getBounds()
    drawing = Drawing(size, size, transform=[size / (x2 - x1), 0, 0, size / (y2 - y1), 0, 0])
    drawing.add(widget)
    return drawing


def build_receipt_pdf(order):
    """Devuelve los bytes del PDF de la boleta."""
    ctx, _ = receipt_context(order)
    store = ctx['store']
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=14 * mm, bottomMargin=22 * mm,
        title=f"Boleta de venta {ctx['receipt_number']} — {store['name']}", author=store['name'],
        subject=f"Pedido {order.order_number}", creator=store['name'],
    )
    story = []

    # 1. Emisor (izquierda) y recuadro del documento (derecha).
    issuer = [
        _p('CRONOS GENÈVE', 'brand'), Spacer(1, 1.2 * mm),
        _p(store['tagline'].upper(), 'tag'), Spacer(1, 2.5 * mm),
        _p(store['address'], 'issuer'),
        _p(f"{store['email']}  ·  {ctx['store_url'].replace('http://', '').replace('https://', '')}", 'issuer'),
    ]
    doc_box = Table([
        [_p('BOLETA DE VENTA ELECTRÓNICA', 'box_kind')],
        [_p(ctx['receipt_number'], 'box_no')],
        [_p('Documento de demostración · sin valor tributario', 'box_note')],
    ], colWidths=[62 * mm])
    doc_box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1.1, INK),
        ('LINEBELOW', (0, 0), (-1, 0), 0.6, LINE),
        ('TOPPADDING', (0, 0), (-1, -1), 2.4 * mm), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.4 * mm),
        ('TOPPADDING', (0, 1), (-1, 1), 3 * mm),
    ]))
    head = Table([[issuer, doc_box]], colWidths=[WIDTH - 62 * mm, 62 * mm])
    head.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')] + _FLAT))
    story += [head, Spacer(1, 6 * mm)]

    # 2. Datos del cliente y del documento.
    half = WIDTH / 2
    address = (f"{order.shipping_street}, {order.shipping_city}, {order.shipping_state} "
               f"{order.shipping_postal_code}, {order.shipping_country}")
    data = Table([
        [_field('Cliente', ctx['customer']), _field('Fecha de emisión', ctx['issued'])],
        [_field('Correo electrónico', ctx['email']), _field('N.º de pedido', order.order_number)],
        [_field('Dirección de entrega', address), _field('Moneda  ·  Forma de pago', 'Dólares (USD)  ·  Contado')],
    ], colWidths=[half * 1.15, half * 0.85])
    data.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.6, LINE),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, RULE),
        ('LINEAFTER', (0, 0), (0, -1), 0.4, RULE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3.5 * mm), ('RIGHTPADDING', (0, 0), (-1, -1), 3.5 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 2.4 * mm), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.4 * mm),
    ]))
    story += [data, Spacer(1, 6 * mm)]

    # 3. Detalle con columnas.
    photo = 13 * mm
    w_qty, w_unit, w_amount = 17 * mm, 30 * mm, 30 * mm
    w_desc = WIDTH - w_qty - w_unit - w_amount
    rows = [[_p('CANT.', 'th_c'), _p('DESCRIPCIÓN', 'th'), _p('P. UNITARIO', 'th_r'), _p('IMPORTE', 'th_r')]]
    for item in ctx['items']:
        text = [_p(item['name'], 'item'), _p(f"{item['brand']}  ·  Ref. {item['reference']}", 'item_sub')]
        if item['photo']:
            desc = Table([[Image(BytesIO(item['photo']), width=photo, height=photo), text]],
                         colWidths=[photo + 3.5 * mm, w_desc - photo - 3.5 * mm - 7 * mm])
            desc.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')] + _FLAT))
        else:
            desc = text
        rows.append([
            _p(item['quantity'], 'cell_c'), desc,
            _p(item['unit_price'].replace('USD ', ''), 'cell_r'),
            _p(item['subtotal'].replace('USD ', ''), 'cell_r'),
        ])
    detail = Table(rows, colWidths=[w_qty, w_desc, w_unit, w_amount], repeatRows=1)
    detail.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NIGHT),
        ('BOX', (0, 0), (-1, -1), 0.6, LINE),
        ('LINEBELOW', (0, 1), (-1, -1), 0.4, RULE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, SOFT]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3.5 * mm), ('RIGHTPADDING', (0, 0), (-1, -1), 3.5 * mm),
        ('TOPPADDING', (0, 0), (-1, 0), 2.2 * mm), ('BOTTOMPADDING', (0, 0), (-1, 0), 2.2 * mm),
        ('TOPPADDING', (0, 1), (-1, -1), 2.6 * mm), ('BOTTOMPADDING', (0, 1), (-1, -1), 2.6 * mm),
    ]))
    story += [detail, Spacer(1, 4 * mm)]

    # 4. Importe en letras, pago y QR (izquierda) y totales (derecha).
    w_tot = 76 * mm
    w_left = WIDTH - w_tot - 5 * mm
    qr_size = 22 * mm
    left_text = [
        _p('SON', 'label'), Spacer(1, 0.6 * mm), _p(ctx['amount_words'], 'words'), Spacer(1, 3.5 * mm),
        _p('PAGO', 'label'), Spacer(1, 0.6 * mm), _p(ctx['payment_method'], 'field'),
        _p(f"Operación: {ctx['payment_reference']}", 'small'), Spacer(1, 3.5 * mm),
        _p('Escanee el código para ver el estado de su pedido.', 'small'),
    ]
    left = Table([[left_text, _qr(ctx['order_url'], qr_size)]],
                 colWidths=[w_left - qr_size - 4 * mm, qr_size + 4 * mm])
    left.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('ALIGN', (1, 0), (1, 0), 'RIGHT')] + _FLAT))
    zero = 'USD 0.00'
    totals = Table([
        [_p('Op. gravada', 'tot_l'), _p(ctx['subtotal'], 'tot_r')],
        [_p('Op. exonerada', 'tot_l'), _p(zero, 'tot_r')],
        [_p('Op. inafecta', 'tot_l'), _p(zero, 'tot_r')],
        [_p(f"IGV ({ctx['igv_rate']} %)", 'tot_l'), _p(ctx['tax'], 'tot_r')],
        [_p('IMPORTE TOTAL', 'grand_l'), _p(ctx['total'], 'grand_r')],
    ], colWidths=[w_tot * 0.5, w_tot * 0.5])
    totals.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.6, LINE),
        ('LINEBELOW', (0, 0), (-1, -3), 0.4, RULE),
        ('BACKGROUND', (0, -1), (-1, -1), NIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3.5 * mm), ('RIGHTPADDING', (0, 0), (-1, -1), 3.5 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 1.8 * mm), ('BOTTOMPADDING', (0, 0), (-1, -1), 1.8 * mm),
        ('TOPPADDING', (0, -1), (-1, -1), 3 * mm), ('BOTTOMPADDING', (0, -1), (-1, -1), 3 * mm),
    ]))
    summary = Table([[left, totals]], colWidths=[w_left + 5 * mm, w_tot])
    summary.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (0, 0), 5 * mm),
        ('RIGHTPADDING', (1, 0), (1, 0), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story += [summary, Spacer(1, 8 * mm)]

    # 5. Observaciones.
    notes = ['Conserve este documento para cualquier consulta sobre su pedido.']
    if ctx['is_demo']:
        notes.append('Pago de demostración: no se realizó ningún cargo bancario real.')
    observations = Table([[[_p('OBSERVACIONES', 'label'), Spacer(1, 0.8 * mm),
                            Paragraph('<br/>'.join(escape(n) for n in notes), S['small'])]]], colWidths=[WIDTH])
    observations.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.6, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 3.5 * mm), ('RIGHTPADDING', (0, 0), (-1, -1), 3.5 * mm),
        ('TOPPADDING', (0, 0), (-1, -1), 2.6 * mm), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.6 * mm),
    ]))
    story.append(observations)

    def frame(canvas, document):
        canvas.saveState()
        # Filete de bronce arriba y pie legal con número de página.
        canvas.setFillColor(BRONZE)
        canvas.rect(0, A4[1] - 3 * mm, A4[0], 3 * mm, stroke=0, fill=1)
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN + 6, 15 * mm, A4[0] - MARGIN - 6, 15 * mm)
        canvas.setFont('Helvetica', 6.5)
        canvas.setFillColor(MUTE)
        canvas.drawString(MARGIN + 6, 11 * mm,
                          f"Representación impresa de la boleta de venta {ctx['receipt_number']} · "
                          'Proyecto académico, documento de demostración sin valor tributario.')
        canvas.drawRightString(A4[0] - MARGIN - 6, 11 * mm, f"Página {document.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=frame, onLaterPages=frame)
    return buffer.getvalue()
