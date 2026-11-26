from celery import shared_task

from modules.crons.tasks.sla import (
    _process_business_hours,
    _process_holidays,
    _process_sla_breaches,
    _process_sla_warnings,
)
from modules.crons.utils.constants import OPEN_TICKET_STATUSES
from shared.utilities.cron_lock import is_due, run_locked

SLA_HOLIDAY_INTERVAL = 30 * 60
SLA_BREACH_INTERVAL = 3 * 60


@shared_task(bind=True, name='modules.crons.tasks.run_sla_engine', ignore_result=True)
def run_sla_engine(self):
    """
    Runs every minute: business hours pause/resume (every run), holiday
    pause/resume (every 30 min), breach warnings and breaches (every 3 min).
    """
    return run_locked('sla', _run_sla_steps)


def _run_sla_steps():
    """
    Business hours -> holidays -> warnings -> breaches, in that order, so a ticket
    is never warned or escalated in the same pass its clock should be paused.
    """
    from modules.sla.models import SLASettings, TicketSLA

    # Cheap skip when there is nothing to track
    if not TicketSLA.objects.filter(
        ticket__status__in=OPEN_TICKET_STATUSES, ticket__merged_into__isnull=True,
    ).exists():
        return {}
    if not SLASettings.get_settings().enabled:
        return {}

    result = {'business_hours': sum(_process_business_hours())}
    if is_due('sla:holidays', SLA_HOLIDAY_INTERVAL):
        result['holidays'] = sum(_process_holidays())
    if is_due('sla:breaches', SLA_BREACH_INTERVAL):
        result['warnings_queued'] = _process_sla_warnings()
        result['breaches_handled'] = _process_sla_breaches()
    return result
