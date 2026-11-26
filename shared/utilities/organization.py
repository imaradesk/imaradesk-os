"""Details of the organization running this install, used in emails and links."""
from django.conf import settings


def organization_name(default='Support Team'):
    """Business name configured under Administration > General."""
    try:
        from shared.models import Client

        client = Client.objects.first()
        if client and client.name:
            return client.name
    except Exception:
        pass
    return default


def site_url(path=''):
    """Absolute URL on this install, based on the SITE_URL setting."""
    base = getattr(settings, 'SITE_URL', '') or 'http://localhost:8000'
    return f"{base.rstrip('/')}{path}"


def absolute_url(request, path):
    """Absolute URL for links sent by email.

    Prefers SITE_URL (not influenced by the Host header); falls back to the request."""
    base = getattr(settings, 'SITE_URL', '')
    if base:
        return f"{base.rstrip('/')}{path}"
    return request.build_absolute_uri(path)
