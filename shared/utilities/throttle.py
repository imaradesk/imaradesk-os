"""Failed-sign-in lockout, keyed by email address.

Uses the default cache; with a per-process cache the effective limit is per worker."""
from django.core.cache import cache

LOGIN_MAX_FAILS = 5
LOGIN_LOCK_SECONDS = 15 * 60


def _key(email):
    return f'login-fail:{(email or "").strip().lower()}'


def login_locked(email):
    return cache.get(_key(email), 0) >= LOGIN_MAX_FAILS


def register_login_failure(email):
    key = _key(email)
    cache.add(key, 0, LOGIN_LOCK_SECONDS)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, LOGIN_LOCK_SECONDS)


def clear_login_failures(email):
    cache.delete(_key(email))


def rate_limited(request, scope, limit, window):
    """Count one hit for this client; True once more than `limit` hits land in `window` seconds.

    Signed-in users are counted per account, everyone else per remote address."""
    user = getattr(request, 'user', None)
    who = f'u{user.pk}' if user is not None and user.is_authenticated else request.META.get('REMOTE_ADDR', '')
    key = f'rate:{scope}:{who}'
    cache.add(key, 0, window)
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, window)
        count = 1
    return count > limit
