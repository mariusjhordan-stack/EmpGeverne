import uuid
from abc import ABC, abstractmethod
from decimal import Decimal
from django.conf import settings


class PaymentResult:
    def __init__(self, success, reference, gateway, raw_response=None, error=None):
        self.success = success
        self.reference = reference
        self.gateway = gateway
        self.raw_response = raw_response or {}
        self.error = error


class PaymentGateway(ABC):
    @abstractmethod
    def process_payment(self, amount: Decimal, method: str, metadata: dict) -> PaymentResult:
        pass


class DemoGateway(PaymentGateway):
    def process_payment(self, amount: Decimal, method: str, metadata: dict) -> PaymentResult:
        reference = f"PAY-{uuid.uuid4().hex[:10].upper()}"
        return PaymentResult(
            success=True,
            reference=reference,
            gateway='demo',
            raw_response={'method': method, 'is_demo': True},
        )


class StripeGateway(PaymentGateway):
    """
    Stripe payment gateway integration.

    Required environment variables:
        STRIPE_SECRET_KEY - Stripe API secret key
        STRIPE_PUBLISHABLE_KEY - Stripe publishable key (for frontend)
        STRIPE_WEBHOOK_SECRET - Webhook signing secret

    To activate:
        1. pip install stripe
        2. Set PAYMENT_GATEWAY=stripe in .env
        3. Set the three STRIPE_* variables above
    """

    def process_payment(self, amount: Decimal, method: str, metadata: dict) -> PaymentResult:
        try:
            import stripe
        except ImportError:
            return PaymentResult(
                success=False,
                reference='',
                gateway='stripe',
                error='stripe package not installed. Run: pip install stripe',
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        if not stripe.api_key:
            return PaymentResult(
                success=False,
                reference='',
                gateway='stripe',
                error='STRIPE_SECRET_KEY not configured.',
            )

        try:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),
                currency='usd',
                metadata=metadata,
                automatic_payment_methods={'enabled': True},
            )
            return PaymentResult(
                success=True,
                reference=intent.id,
                gateway='stripe',
                raw_response={'client_secret': intent.client_secret},
            )
        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                reference='',
                gateway='stripe',
                error=str(e),
            )


def get_payment_gateway() -> PaymentGateway:
    gateway_type = getattr(settings, 'PAYMENT_GATEWAY', 'demo')
    if gateway_type == 'stripe':
        return StripeGateway()
    return DemoGateway()
