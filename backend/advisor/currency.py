"""Monedas en que el cliente lee los precios. La tienda cobra en dólares; soles y euros son conversiones
indicativas con las mismas tasas que muestra la web (1 USD = 3.38 PEN = 0.86 EUR)."""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True)
class DisplayCurrency:
    code: str
    per_dollar: Decimal
    english: str
    spanish: str
    symbol: str

    def to_usd(self, amount):
        return (Decimal(amount) / self.per_dollar).quantize(Decimal('0.01'), ROUND_HALF_UP)

    def price(self, usd):
        """Un precio guardado en dólares, como lo lee el cliente, redondeado: "S/ 30,927"."""
        return self.amount(Decimal(usd) * self.per_dollar)

    def amount(self, value):
        """Una cantidad que ya está en esta moneda."""
        n = format(Decimal(value).quantize(Decimal('1'), ROUND_HALF_UP), ',')
        return f'{self.symbol}{n}'

    def name(self, spanish=False):
        return self.spanish if spanish else self.english


USD = DisplayCurrency('USD', Decimal('1'), 'US dollars', 'dólares', 'US$ ')
PEN = DisplayCurrency('PEN', Decimal('3.38'), 'Peruvian soles', 'soles', 'S/ ')
EUR = DisplayCurrency('EUR', Decimal('0.86'), 'euros', 'euros', '€')

CURRENCIES = {c.code: c for c in (USD, PEN, EUR)}


def currency_of(code, default=USD):
    """La moneda de un código, o `default` si falta o no es una de las tres."""
    if isinstance(code, str):
        return CURRENCIES.get(code.strip().upper(), default)
    return default
