import logging

from celery import shared_task

from modules.crons.utils.constants import OPEN_TICKET_STATUSES
from modules.crons.utils.emails import (
    _get_admin_user,
    _get_business_context,
    _get_warning_recipients,
    _send_admin_escalation_email,
    _send_breach_email,
    _send_escalation_email,
    _send_sla_warning_email,
)

logger = logging.getLogger(__name__)


# System hold reason constants - used to distinguish auto-holds from manual holds
HOLD_REASON_OUTSIDE_BUSINESS_HOURS = "SYSTEM_OUTSIDE_BUSINESS_HOURS"
HOLD_REASON_HOLIDAY = "SYSTEM_HOLIDAY"


def _process_sla_warnings():
    """Flag tickets approaching resolution breach and queue warning emails. Returns emails queued."""
    from django.utils import timezone
    from datetime import timedelta
    from modules.sla.models import SLASettings, TicketSLA
    from modules.settings.models import EmailTemplate, NotificationSettings

    now = timezone.now()
    sla_settings = SLASettings.get_settings()
    if not sla_settings.enabled or not sla_settings.send_notifications:
        return 0
    if not getattr(NotificationSettings.get_settings(), 'notify_sla_resolution_warning', True):
        return 0
    if not EmailTemplate.objects.filter(template_type='sla_breach_warning', status='active').exists():
        logger.debug(f"[SLA-WARNING] No active 'sla_breach_warning' template")
        return 0

    ticket_slas = TicketSLA.objects.select_related(
        'ticket', 'policy'
    ).prefetch_related(
        'ticket__group__members__user',
    ).only(
        'id', 'resolution_due_at', 'breach_warning_sent_resolution',
        'ticket__id', 'ticket__assignee_id', 'ticket__group_id',
        'policy__id', 'policy__notify_before_breach'
    ).filter(
        is_on_hold=False,
        ticket__status__in=OPEN_TICKET_STATUSES,
        ticket__merged_into__isnull=True,
        resolution_due_at__isnull=False,
        resolution_breached=False,
        breach_warning_sent_resolution=False,
        policy__notify_before_breach__gt=0,
        resolution_due_at__gt=now,
        resolution_due_at__lte=now + timedelta(hours=24)
    )

    to_warn = []
    for ticket_sla in ticket_slas:
        if ticket_sla.resolution_due_at - now > timedelta(minutes=ticket_sla.policy.notify_before_breach):
            continue
        if _get_warning_recipients(ticket_sla.ticket):
            to_warn.append(ticket_sla.id)

    if not to_warn:
        return 0

    # Flag first so a slow mail queue can never cause a duplicate warning
    TicketSLA.objects.filter(id__in=to_warn).update(breach_warning_sent_resolution=True)
    for ticket_sla_id in to_warn:
        send_sla_notification.delay(ticket_sla_id, 'warning')

    logger.info(f"[SLA-WARNING] queued {len(to_warn)} warning(s)")
    return len(to_warn)


def _process_sla_breaches():
    """Mark breached SLAs and queue escalation/breach emails. Returns tickets handled."""
    from django.utils import timezone
    from django.db.models import Q
    from modules.sla.models import SLASettings, TicketSLA
    from modules.settings.models import NotificationSettings

    now = timezone.now()
    sla_settings = SLASettings.get_settings()
    if not sla_settings.enabled:
        return 0

    # First-response breaches: due time passed and no agent has replied yet
    TicketSLA.objects.filter(
        is_on_hold=False,
        response_breached=False,
        first_responded_at__isnull=True,
        response_due_at__isnull=False,
        response_due_at__lt=now,
        ticket__status__in=OPEN_TICKET_STATUSES,
        ticket__merged_into__isnull=True,
    ).update(response_breached=True)

    # Breaches must be recorded even when notifications are off; only the emails are skipped
    notify = sla_settings.send_notifications and getattr(
        NotificationSettings.get_settings(), 'notify_sla_resolution_breached', True
    )

    ticket_slas = TicketSLA.objects.select_related('policy').only(
        'id', 'resolution_breached', 'escalation_email_sent', 'breach_email_sent', 'auto_assigned_on_breach',
        'policy__id', 'policy__send_escalation_emails', 'policy__auto_assign_on_breach'
    ).filter(
        is_on_hold=False,
        ticket__status__in=OPEN_TICKET_STATUSES,
        ticket__merged_into__isnull=True,
        resolution_due_at__isnull=False,
        resolution_due_at__lt=now,
    ).filter(
        Q(escalation_email_sent=False, policy__send_escalation_emails=True) |
        Q(breach_email_sent=False, policy__send_escalation_emails=True) |
        Q(auto_assigned_on_breach=False, policy__auto_assign_on_breach=True) |
        Q(resolution_breached=False)
    )

    admin_user = _UNSET = object()
    changed, emails, handled = [], [], 0
    for ticket_sla in ticket_slas:
        policy = ticket_sla.policy
        acted = False
        dirty = not ticket_sla.resolution_breached
        ticket_sla.resolution_breached = True

        if policy.send_escalation_emails and not ticket_sla.escalation_email_sent:
            if notify:
                emails.append((ticket_sla.id, 'escalation'))
            ticket_sla.escalation_email_sent = True
            acted = True

        if policy.send_escalation_emails and not ticket_sla.breach_email_sent:
            if notify:
                emails.append((ticket_sla.id, 'breach'))
            ticket_sla.breach_email_sent = True
            acted = True

        if policy.auto_assign_on_breach and not ticket_sla.auto_assigned_on_breach:
            if admin_user is _UNSET:
                admin_user = _get_admin_user()
            if admin_user:
                emails.append((ticket_sla.id, 'admin_escalation'))
                ticket_sla.auto_assigned_on_breach = True
                acted = True

        if acted or dirty:
            changed.append(ticket_sla)
        handled += acted

    if changed:
        TicketSLA.objects.bulk_update(
            changed,
            ['resolution_breached', 'escalation_email_sent', 'breach_email_sent', 'auto_assigned_on_breach'],
            batch_size=500,
        )
    for ticket_sla_id, kind in emails:
        send_sla_notification.delay(ticket_sla_id, kind)

    if handled:
        logger.info(f"[SLA-BREACH] handled {handled} breach(es), queued {len(emails)} email(s)")
    return handled


@shared_task(bind=True, name='modules.crons.tasks.send_sla_notification', ignore_result=True)
def send_sla_notification(self, ticket_sla_id, kind):
    """Send one SLA email (warning / escalation / breach / admin_escalation) off the cron path."""
    from django.utils import timezone
    from modules.sla.models import TicketSLA
    from modules.settings.models import EmailTemplate
    from shared.utilities.Mailer import Mailer

    ticket_sla = TicketSLA.objects.select_related(
        'ticket', 'ticket__assignee', 'ticket__group', 'policy'
    ).prefetch_related('ticket__group__members__user').filter(id=ticket_sla_id).first()
    if ticket_sla is None:
        return

    mailer = Mailer()
    context = _get_business_context()
    ticket = ticket_sla.ticket

    if kind == 'warning':
        template = EmailTemplate.objects.filter(template_type='sla_breach_warning', status='active').first()
        recipients = _get_warning_recipients(ticket)
        if template and recipients:
            _send_sla_warning_email(
                mailer, template, ticket, ticket_sla, 'Resolution',
                ticket_sla.resolution_due_at - timezone.now(), recipients, context,
            )
    elif kind == 'escalation':
        _send_escalation_email(mailer, ticket, ticket_sla, context)
    elif kind == 'breach':
        _send_breach_email(mailer, ticket, ticket_sla, context)
    elif kind == 'admin_escalation':
        admin_user = _get_admin_user()
        if admin_user:
            _send_admin_escalation_email(mailer, ticket, ticket_sla, admin_user, context)


BUSINESS_HOURS_MAX_SNOOZE = 6 * 3600  # re-check at least this often as a safety net


BUSINESS_HOURS_WINDOW = 'sla:business_hours'


def clear_business_hours_window():
    """Force the next SLA engine run to re-evaluate business hours."""
    from shared.utilities.cron_lock import unsnooze
    unsnooze(BUSINESS_HOURS_WINDOW)


def _seconds_until_close(business_hours, now_local):
    """Seconds until today's business hours end (we are currently inside them)."""
    from datetime import datetime
    import pytz

    day = now_local.strftime('%A').lower()
    end = getattr(business_hours, f'{day}_end')
    close_at = pytz.timezone(business_hours.timezone).localize(datetime.combine(now_local.date(), end))
    return (close_at - now_local).total_seconds()


def _process_business_hours():
    """
    Pause/resume SLA timers for business hours. Returns (paused, resumed).

    During business hours nothing changes until closing time, so after resuming
    the check is snoozed until then. Outside hours it runs every pass, because
    new tickets must be paused as they arrive (one indexed UPDATE).
    """
    from django.utils import timezone
    from modules.sla.models import SLASettings, BusinessHours, TicketSLA
    from shared.utilities.cron_lock import is_snoozed, snooze
    import pytz

    window = BUSINESS_HOURS_WINDOW
    if is_snoozed(window):
        return 0, 0

    if not SLASettings.get_settings().enabled:
        snooze(window, BUSINESS_HOURS_MAX_SNOOZE)
        return 0, 0
    business_hours = BusinessHours.objects.filter(is_active=True).first()
    if business_hours is None:
        snooze(window, BUSINESS_HOURS_MAX_SNOOZE)
        return 0, 0

    on_hold = TicketSLA.objects.filter(is_on_hold=True, hold_reason=HOLD_REASON_OUTSIDE_BUSINESS_HOURS)
    if not business_hours.pause_outside_hours:
        resumed = _resume_slas(on_hold)
        snooze(window, BUSINESS_HOURS_MAX_SNOOZE)
        return 0, resumed

    now_local = timezone.now().astimezone(pytz.timezone(business_hours.timezone))
    if _is_within_business_hours(business_hours, now_local):
        paused, resumed = 0, _resume_slas(on_hold.filter(
            ticket__status__in=OPEN_TICKET_STATUSES, ticket__merged_into__isnull=True,
        ))
        snooze(window, min(_seconds_until_close(business_hours, now_local), BUSINESS_HOURS_MAX_SNOOZE))
    else:
        paused, resumed = _hold_slas(HOLD_REASON_OUTSIDE_BUSINESS_HOURS), 0

    if paused or resumed:
        logger.info(f"[SLA-BIZ-HOURS] paused {paused}, resumed {resumed}")
    return paused, resumed


def _process_holidays():
    """Pause/resume SLA timers for holidays. Returns (paused, resumed)."""
    from django.utils import timezone
    from modules.sla.models import SLASettings, BusinessHours, TicketSLA
    import pytz

    if not SLASettings.get_settings().enabled:
        return 0, 0
    business_hours = BusinessHours.objects.filter(is_active=True).first()
    if business_hours is None:
        return 0, 0

    on_hold = TicketSLA.objects.filter(is_on_hold=True, hold_reason=HOLD_REASON_HOLIDAY)
    if not business_hours.exclude_holidays:
        return 0, _resume_slas(on_hold)

    today = timezone.now().astimezone(pytz.timezone(business_hours.timezone)).date()
    if _is_holiday(today):
        paused, resumed = _hold_slas(HOLD_REASON_HOLIDAY), 0
    else:
        paused, resumed = 0, _resume_slas(on_hold.filter(
            ticket__status__in=OPEN_TICKET_STATUSES, ticket__merged_into__isnull=True,
        ))

    if paused or resumed:
        logger.info(f"[SLA-HOLIDAY] paused {paused}, resumed {resumed}")
    return paused, resumed


def _hold_slas(reason):
    """Put every running, unbreached SLA on an open ticket on hold in one UPDATE."""
    from django.utils import timezone
    from modules.sla.models import TicketSLA

    ids = list(TicketSLA.objects.filter(
        is_on_hold=False,
        ticket__status__in=OPEN_TICKET_STATUSES,
        ticket__merged_into__isnull=True,
        resolution_breached=False,
    ).values_list('id', flat=True))
    if not ids:
        return 0
    return TicketSLA.objects.filter(id__in=ids, is_on_hold=False).update(
        is_on_hold=True, hold_reason=reason, hold_started_at=timezone.now(),
    )


def _resume_slas(queryset):
    """Resume held SLAs, extending due dates by each one's hold time, in one bulk UPDATE."""
    from django.utils import timezone
    from datetime import timedelta
    from modules.sla.models import TicketSLA

    now = timezone.now()
    rows = list(queryset.filter(hold_started_at__isnull=False).only(
        'id', 'is_on_hold', 'hold_reason', 'hold_started_at',
        'total_hold_time', 'response_due_at', 'resolution_due_at',
    ))
    for ticket_sla in rows:
        hold_minutes = int((now - ticket_sla.hold_started_at).total_seconds() / 60)
        ticket_sla.total_hold_time += hold_minutes
        if ticket_sla.response_due_at:
            ticket_sla.response_due_at += timedelta(minutes=hold_minutes)
        if ticket_sla.resolution_due_at:
            ticket_sla.resolution_due_at += timedelta(minutes=hold_minutes)
        ticket_sla.is_on_hold = False
        ticket_sla.hold_reason = ''
        ticket_sla.hold_started_at = None

    if rows:
        TicketSLA.objects.bulk_update(rows, [
            'is_on_hold', 'hold_reason', 'hold_started_at',
            'total_hold_time', 'response_due_at', 'resolution_due_at',
        ], batch_size=500)
    return len(rows)


def _is_within_business_hours(business_hours, dt):
    """Check if given datetime is within configured business hours."""
    weekday = dt.weekday()
    day_name = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][weekday]
    
    enabled = getattr(business_hours, f'{day_name}_enabled')
    if not enabled:
        return False
    
    start_time = getattr(business_hours, f'{day_name}_start')
    end_time = getattr(business_hours, f'{day_name}_end')
    
    current_time = dt.time()
    return start_time <= current_time <= end_time


def _is_holiday(date):
    """Check if given date is a holiday (exact date, or same month/day if recurring)."""
    from django.db.models import Q
    from modules.sla.models import Holiday

    return Holiday.objects.filter(status='active').filter(
        Q(recurring=False, date=date) |
        Q(recurring=True, date__month=date.month, date__day=date.day)
    ).exists()
