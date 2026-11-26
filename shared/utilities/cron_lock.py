"""
Redis-backed helpers for scheduled (Celery Beat) jobs.

The default Django cache is per-process locmem, so cross-worker locks and
throttles must go through Redis directly.
"""
import logging

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

_client = None

LOCK_TTL = 300  # matches CELERY_TASK_TIME_LIMIT so a crashed worker can't hold a lock forever


def _redis():
    global _client
    if _client is None:
        import redis
        _client = redis.Redis.from_url(settings.REDIS_URL)
    return _client


def acquire_lock(name, ttl=LOCK_TTL):
    try:
        return bool(_redis().set(f'cron:lock:{name}', '1', nx=True, ex=ttl))
    except Exception as e:
        # Redis down: keep jobs running, just lose overlap protection
        logger.warning(f"[CRON] Lock unavailable for {name}: {e}")
        return True


def release_lock(name):
    try:
        _redis().delete(f'cron:lock:{name}')
    except Exception:
        pass


def is_due(name, interval_seconds):
    """True at most once per interval across all workers."""
    try:
        return bool(_redis().set(f'cron:due:{name}', '1', nx=True, ex=interval_seconds))
    except Exception:
        return True


def is_due_daily(name, hour=0):
    """True once per UTC day, on the first call at or after `hour`."""
    now = timezone.now()
    if now.hour < hour:
        return False
    try:
        key = f'cron:daily:{name}:{now.date().isoformat()}'
        return bool(_redis().set(key, '1', nx=True, ex=2 * 86400))
    except Exception:
        return False


def run_locked(name, func, close_db=False):
    """Run func under a lock, isolating its failure from other jobs."""
    if not acquire_lock(name):
        return {'status': 'skipped', 'reason': 'already_processing'}
    try:
        return func()
    except Exception as e:
        logger.exception(f"[CRON] Job '{name}' failed: {e}")
        return {'status': 'error', 'error': str(e)}
    finally:
        release_lock(name)
        if close_db:
            # Each thread has its own DB connection; close it so they don't leak
            from django.db import connection
            connection.close()


def is_snoozed(name):
    try:
        return bool(_redis().exists(f'cron:snooze:{name}'))
    except Exception:
        return False


def snooze(name, seconds):
    """Skip `name` until `seconds` from now (is_snoozed returns True meanwhile)."""
    if seconds <= 0:
        return
    try:
        _redis().set(f'cron:snooze:{name}', '1', ex=int(seconds))
    except Exception:
        pass


def unsnooze(name):
    try:
        _redis().delete(f'cron:snooze:{name}')
    except Exception:
        pass
