"""TLS verificado aunque el Python no traiga certificados (el de python.org en macOS no los trae)."""
import os
import ssl
from functools import lru_cache

from django.core.mail.backends.smtp import EmailBackend


@lru_cache(maxsize=1)
def verified_ssl_context():
    """Contexto TLS que verifica certificados: el del sistema si existe; si no, certifi o un paquete conocido."""
    paths = ssl.get_default_verify_paths()
    if (paths.cafile and os.path.exists(paths.cafile)) or (paths.capath and os.path.isdir(paths.capath)):
        return ssl.create_default_context()
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass
    for bundle in ('/etc/ssl/cert.pem', '/etc/ssl/certs/ca-certificates.crt'):
        if os.path.exists(bundle):
            return ssl.create_default_context(cafile=bundle)
    return ssl.create_default_context()


class VerifiedSMTPBackend(EmailBackend):
    """SMTP de Django con el contexto TLS de arriba (si no, Gmail falla con CERTIFICATE_VERIFY_FAILED)."""

    @property
    def ssl_context(self):
        if self.ssl_certfile or self.ssl_keyfile:
            return super().ssl_context
        return verified_ssl_context()
