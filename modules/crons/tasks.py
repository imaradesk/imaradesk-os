"""
AUTHOR: Kilunda Titus

Celery scheduled tasks (crons).

This module contains ALL tasks that run on a schedule via Celery Beat:

TICKETS & SLA:
- send_weekly_performance_reports: Sunday midnight - weekly performance emails
- check_sla_breach_warnings: every 20s - SLA warning notifications
- handle_sla_breaches: every 20s - SLA breach handling + auto-assignment
- manage_sla_business_hours: every minute - pause/resume SLA based on business hours
- manage_sla_holidays: every 30 min - pause/resume SLA based on holidays
- auto_close_resolved_tickets: every 30 min - auto-close resolved tickets

TASKS:
- check_tasks_due_soon: daily 8 AM - due soon reminders
- check_overdue_tasks: daily 9 AM - overdue notifications

SURVEYS:
- process_pending_survey_invitations: every 60s - process pending invitations
- send_survey_reminders: daily 9 AM - reminder emails

ASSETS:
- check_asset_maintenance_due: daily 7 AM - maintenance due reminders + auto-create tickets
- check_asset_warranty_expiring: daily 7:30 AM - warranty expiry notifications
- check_overdue_checkouts: every 30 min - overdue checkout reminders
- check_low_stock_alerts: daily 8 AM - low stock inventory alerts
- calculate_asset_depreciation: daily 2 AM - recalculate depreciated values

SUBSCRIPTIONS:
- check_free_account_expiry: daily 7 AM - expire trials + send reminder emails

Event-triggered tasks live in their respective module's tasks.py:
- modules/ticket/tasks.py: Ticket notification tasks
- modules/tasks/tasks.py: Task notification tasks
- modules/surveys/tasks.py: Survey invitation sending (rate-limited)
- modules/email_to_ticket/tasks.py: Email processing tasks
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


# =============================================================================
# WEEKLY REPORTS CRON
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.send_weekly_performance_reports', max_retries=3, default_retry_delay=300)
def send_weekly_performance_reports(self):
    """
    Scheduled task: Send weekly performance reports via email.
    Runs every Sunday at midnight (00:00).
    """
    from django.db import connection
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    from modules.settings.models import NotificationSettings
    
    logger.info("[CRON] Starting weekly performance reports...")
    
    try:
        from shared.models import Client
        tenants_processed = 0
        reports_sent = 0
        
        for tenant in Client.objects.filter(is_active=True):
            with tenant_context(tenant):
                try:
                    settings = NotificationSettings.get_settings()
                    
                    if settings.weekly_performance_report and settings.weekly_report_email:
                        logger.info(f"[CRON] Would send weekly report to {settings.weekly_report_email} for tenant {tenant.schema_name}")
                        reports_sent += 1
                    
                    tenants_processed += 1
                    
                except Exception as tenant_error:
                    logger.error(f"[CRON] Error processing tenant {tenant.schema_name}: {tenant_error}")
        
        result = {
            'status': 'completed',
            'tenants_processed': tenants_processed,
            'reports_sent': reports_sent,
        }
        
        logger.info(f"[CRON] Weekly performance reports completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[CRON] Weekly performance reports failed: {e}")
        raise self.retry(exc=e)


# =============================================================================
# SLA BREACH WARNING CRON
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.check_sla_breach_warnings', max_retries=3, default_retry_delay=60)
def check_sla_breach_warnings(self):
    """
    Scheduled task: Check for tickets approaching SLA breach and send warnings.
    Runs every 20 seconds via Celery Beat.
    """
    from django.db import connection
    from django.utils import timezone
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    from datetime import timedelta
    
    logger.info("[CRON] Starting SLA breach warning check...")
    
    try:
        from shared.models import Client
        tenants_processed = 0
        warnings_sent = 0
        
        for tenant in Client.objects.filter(is_active=True):
            with tenant_context(tenant):
                try:
                    tenant_warnings = _process_tenant_sla_warnings(tenant.schema_name)
                    warnings_sent += tenant_warnings
                    tenants_processed += 1
                    
                except Exception as tenant_error:
                    logger.error(f"[CRON] Error processing SLA warnings for tenant {tenant.schema_name}: {tenant_error}")
        
        result = {
            'status': 'completed',
            'tenants_processed': tenants_processed,
            'warnings_sent': warnings_sent,
        }
        
        logger.info(f"[CRON] SLA breach warning check completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[CRON] SLA breach warning check failed: {e}")
        raise self.retry(exc=e)


# =============================================================================
# SLA BREACH HANDLING CRON
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.handle_sla_breaches', max_retries=3, default_retry_delay=60)
def handle_sla_breaches(self):
    """
    Scheduled task: Handle tickets that have breached SLA.
    Runs every 20 seconds via Celery Beat.
    """
    from django.db import connection
    from django.utils import timezone
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    
    logger.info("[CRON] Starting SLA breach handling...")
    
    try:
        from shared.models import Client
        tenants_processed = 0
        breaches_handled = 0
        
        for tenant in Client.objects.filter(is_active=True):
            with tenant_context(tenant):
                try:
                    tenant_breaches = _process_tenant_sla_breaches(tenant.schema_name)
                    breaches_handled += tenant_breaches
                    tenants_processed += 1
                    
                except Exception as tenant_error:
                    logger.error(f"[CRON] Error handling SLA breaches for tenant {tenant.schema_name}: {tenant_error}")
        
        result = {
            'status': 'completed',
            'tenants_processed': tenants_processed,
            'breaches_handled': breaches_handled,
        }
        
        logger.info(f"[CRON] SLA breach handling completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[CRON] SLA breach handling failed: {e}")
        raise self.retry(exc=e)


# =============================================================================
# AUTO-CLOSE RESOLVED TICKETS CRON
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.auto_close_resolved_tickets')
def auto_close_resolved_tickets(self):
    """
    Scheduled task: Auto-close tickets that have been resolved for more than AUTO_CLOSE_INTERVAL_MINUTES.
    Runs every 30 minutes via Celery Beat.
    """
    from django.conf import settings as django_settings
    from shared.models import Client
    
    interval = getattr(django_settings, 'AUTO_CLOSE_INTERVAL_MINUTES', 1440)
    logger.info(f"[AUTO-CLOSE] Starting auto-close resolved tickets task (interval: {interval} minutes)...")
    
    tenants = Client.objects.filter(is_active=True)
    
    tenants_processed = 0
    tickets_closed = 0
    
    for tenant in tenants:
        try:
            logger.info(f"[AUTO-CLOSE] Processing tenant: {tenant.schema_name}")
            closed = _queue_tickets_for_closing(tenant.schema_name)
            tickets_closed += closed
            tenants_processed += 1
        except Exception as e:
            logger.error(f"[AUTO-CLOSE] Error processing tenant {tenant.schema_name}: {e}")
    
    logger.info(f"[AUTO-CLOSE] Scan completed. Tenants: {tenants_processed}, Tickets closed: {tickets_closed}")
    return {'tenants_processed': tenants_processed, 'tickets_closed': tickets_closed}


@shared_task(bind=True, name='modules.crons.tasks.close_single_ticket_task', max_retries=2, default_retry_delay=30)
def close_single_ticket_task(self, schema_name, ticket_id):
    """
    Close a single resolved ticket.
    """
    from shared.utilities.tenant_compat import schema_context
    from modules.ticket.models import Ticket
    
    logger.info(f"[AUTO-CLOSE] Task received: closing ticket {ticket_id} in {schema_name}")
    
    try:
        with schema_context(schema_name):
            ticket = Ticket.objects.get(id=ticket_id)
            
            if ticket.status == 'resolved':
                ticket.status = 'closed'
                ticket.save(update_fields=['status'])
                logger.info(f"[AUTO-CLOSE] Closed ticket #{ticket.ticket_number} in {schema_name}")
                return {'status': 'closed', 'ticket_id': ticket_id}
            else:
                logger.info(f"[AUTO-CLOSE] Ticket #{ticket.ticket_number} status changed to '{ticket.status}', skipping")
                return {'status': 'skipped', 'ticket_id': ticket_id, 'reason': 'status_changed'}
                
    except Ticket.DoesNotExist:
        logger.warning(f"[AUTO-CLOSE] Ticket {ticket_id} not found in {schema_name}")
        return {'status': 'error', 'ticket_id': ticket_id, 'reason': 'not_found'}
    except Exception as e:
        logger.error(f"[AUTO-CLOSE] Error closing ticket {ticket_id} in {schema_name}: {e}", exc_info=True)
        raise self.retry(exc=e)


# =============================================================================
# SLA HELPER FUNCTIONS
# =============================================================================

def _process_tenant_sla_warnings(tenant_schema):
    """Process SLA warnings for a single tenant."""
    from django.utils import timezone
    from django.db.models import F, Q
    from datetime import timedelta
    from modules.sla.models import SLASettings, TicketSLA
    from modules.settings.models import EmailTemplate
    from shared.utilities.Mailer import Mailer
    
    warnings_sent = 0
    now = timezone.now()
    
    logger.info(f"[SLA-WARNING] Processing tenant: {tenant_schema}")
    logger.info(f"[SLA-WARNING] Current time: {now}")
    
    sla_settings = SLASettings.get_settings()
    logger.info(f"[SLA-WARNING] SLA Settings - enabled: {sla_settings.enabled}, send_notifications: {sla_settings.send_notifications}")
    
    if not sla_settings.enabled:
        logger.info(f"[SLA-WARNING] SKIPPING - SLA is disabled for tenant {tenant_schema}")
        return 0
    
    if not sla_settings.send_notifications:
        logger.info(f"[SLA-WARNING] SKIPPING - SLA notifications disabled for tenant {tenant_schema}")
        return 0
    
    # Check granular notification setting
    from modules.settings.models import NotificationSettings
    notification_settings = NotificationSettings.get_settings()
    if not getattr(notification_settings, 'notify_sla_resolution_warning', True):
        logger.info(f"[SLA-WARNING] SKIPPING - SLA resolution warning notifications disabled for tenant {tenant_schema}")
        return 0
    
    try:
        template = EmailTemplate.objects.only(
            'id', 'subject', 'body_html', 'body_text'
        ).get(
            template_type='sla_breach_warning',
            status='active'
        )
        logger.info(f"[SLA-WARNING] Found template: {template.id}")
    except EmailTemplate.DoesNotExist:
        logger.warning(f"[SLA-WARNING] SKIPPING - Template 'sla_breach_warning' not found or not active for tenant {tenant_schema}")
        return 0
    
    business_context = _get_business_context()
    mailer = Mailer()
    
    ticket_slas = TicketSLA.objects.select_related(
        'ticket', 'policy'
    ).prefetch_related(
        'ticket__group__members__user',
    ).only(
        'id', 'resolution_due_at', 'resolution_breached', 'breach_warning_sent_resolution',
        'is_on_hold',
        'ticket__id', 'ticket__ticket_number', 'ticket__title', 'ticket__priority',
        'ticket__status', 'ticket__merged_into', 'ticket__assignee_id', 'ticket__group_id',
        'policy__id', 'policy__notify_before_breach'
    ).filter(
        is_on_hold=False,
        ticket__status__in=['new', 'open', 'in_progress', 'pending'],
        ticket__merged_into__isnull=True,
        resolution_due_at__isnull=False,
        resolution_breached=False,
        breach_warning_sent_resolution=False,
        policy__notify_before_breach__gt=0,
        resolution_due_at__gt=now,
        resolution_due_at__lte=now + timedelta(hours=24)
    )
    
    ticket_sla_count = ticket_slas.count()
    logger.info(f"[SLA-WARNING] Tickets matching warning criteria: {ticket_sla_count}")
    
    for ticket_sla in ticket_slas:
        ticket = ticket_sla.ticket
        policy = ticket_sla.policy
        
        warning_threshold = timedelta(minutes=policy.notify_before_breach)
        time_until_breach = ticket_sla.resolution_due_at - now
        
        logger.info(f"[SLA-WARNING] Checking ticket #{ticket.ticket_number}: "
                   f"due_at={ticket_sla.resolution_due_at}, "
                   f"time_until_breach={time_until_breach}, "
                   f"warning_threshold={warning_threshold}, "
                   f"within_threshold={time_until_breach <= warning_threshold}")
        
        if time_until_breach <= warning_threshold:
            recipients = _get_warning_recipients(ticket)
            logger.info(f"[SLA-WARNING] Ticket #{ticket.ticket_number} - Recipients found: {recipients}")
            
            if recipients:
                logger.info(f"[SLA-WARNING] Sending warning email for ticket #{ticket.ticket_number} to {len(recipients)} recipients")
                _send_sla_warning_email(
                    mailer, template, ticket, ticket_sla,
                    'Resolution', time_until_breach, recipients,
                    business_context
                )
                ticket_sla.breach_warning_sent_resolution = True
                ticket_sla.save(update_fields=['breach_warning_sent_resolution'])
                warnings_sent += len(recipients)
                logger.info(f"[SLA-WARNING] SUCCESS - Sent resolution SLA warning for ticket #{ticket.ticket_number}")
            else:
                logger.warning(f"[SLA-WARNING] SKIPPING - No recipients for ticket #{ticket.ticket_number} (no group members or assignee)")
        else:
            logger.info(f"[SLA-WARNING] SKIPPING ticket #{ticket.ticket_number} - Not within warning threshold yet")
    
    logger.info(f"[SLA-WARNING] Tenant {tenant_schema} completed - {warnings_sent} warnings sent")
    return warnings_sent


def _process_tenant_sla_breaches(tenant_schema):
    """Process SLA breaches for a single tenant."""
    from django.utils import timezone
    from django.db.models import Q
    from modules.sla.models import SLASettings, TicketSLA
    from modules.settings.models import EmailTemplate, NotificationSettings
    from shared.utilities.Mailer import Mailer
    
    breaches_handled = 0
    now = timezone.now()
    
    logger.info(f"[SLA-BREACH] Processing tenant: {tenant_schema}")
    logger.info(f"[SLA-BREACH] Current time: {now}")
    
    sla_settings = SLASettings.get_settings()
    logger.info(f"[SLA-BREACH] SLA Settings - enabled: {sla_settings.enabled}")
    
    if not sla_settings.enabled:
        logger.info(f"[SLA-BREACH] SKIPPING - SLA is disabled for tenant {tenant_schema}")
        return 0

    if not sla_settings.send_notifications:
        logger.info(f"[SLA-BREACH] SKIPPING - SLA notifications disabled for tenant {tenant_schema}")
        return 0

    notification_settings = NotificationSettings.get_settings()
    sla_breach_notification_enabled = getattr(notification_settings, 'notify_sla_resolution_breached', True)

    business_context = _get_business_context()
    admin_user = None
    admin_user_fetched = False
    
    mailer = Mailer()
    
    ticket_slas = TicketSLA.objects.select_related(
        'ticket', 'policy'
    ).prefetch_related(
        'ticket__group__members__user',
    ).only(
        'id', 'resolution_due_at', 'resolution_breached', 'is_on_hold',
        'escalation_email_sent', 'breach_email_sent', 'auto_assigned_on_breach',
        'ticket__id', 'ticket__ticket_number', 'ticket__title', 'ticket__priority',
        'ticket__status', 'ticket__merged_into', 'ticket__assignee_id', 'ticket__group_id',
        'policy__id', 'policy__name', 'policy__send_escalation_emails', 'policy__auto_assign_on_breach'
    ).filter(
        is_on_hold=False,
        ticket__status__in=['new', 'open', 'in_progress', 'pending'],
        ticket__merged_into__isnull=True,
        resolution_due_at__isnull=False,
        resolution_due_at__lt=now,
    ).filter(
        Q(escalation_email_sent=False, policy__send_escalation_emails=True) |
        Q(breach_email_sent=False, policy__send_escalation_emails=True) |
        Q(auto_assigned_on_breach=False, policy__auto_assign_on_breach=True) |
        Q(resolution_breached=False)
    )
    
    ticket_sla_count = ticket_slas.count()
    logger.info(f"[SLA-BREACH] Tickets matching breach criteria (with pending actions): {ticket_sla_count}")
    
    for ticket_sla in ticket_slas:
        ticket = ticket_sla.ticket
        policy = ticket_sla.policy
        
        logger.info(f"[SLA-BREACH] Processing ticket #{ticket.ticket_number}: "
                   f"policy={policy.name if policy else 'N/A'}, "
                   f"send_escalation_emails={policy.send_escalation_emails}, "
                   f"auto_assign_on_breach={policy.auto_assign_on_breach}")
        
        needs_save = False
        if not ticket_sla.resolution_breached:
            ticket_sla.resolution_breached = True
            needs_save = True
            logger.info(f"[SLA-BREACH] Marked ticket #{ticket.ticket_number} as breached")
        
        handled = False
        
        if policy.send_escalation_emails and not ticket_sla.escalation_email_sent:
            if sla_breach_notification_enabled:
                logger.info(f"[SLA-BREACH] Sending escalation email for ticket #{ticket.ticket_number}")
                _send_escalation_email(mailer, ticket, ticket_sla, tenant_schema, business_context)
            else:
                logger.info(f"[SLA-BREACH] Notifications disabled - marking escalation email as handled for #{ticket.ticket_number}")
            ticket_sla.escalation_email_sent = True
            handled = True
        else:
            logger.info(f"[SLA-BREACH] SKIPPING escalation email for #{ticket.ticket_number}: "
                       f"send_escalation_emails={policy.send_escalation_emails}, already_sent={ticket_sla.escalation_email_sent}")
        
        if policy.send_escalation_emails and not ticket_sla.breach_email_sent:
            if sla_breach_notification_enabled:
                logger.info(f"[SLA-BREACH] Sending breach email for ticket #{ticket.ticket_number}")
                _send_breach_email(mailer, ticket, ticket_sla, tenant_schema, business_context)
            else:
                logger.info(f"[SLA-BREACH] Notifications disabled - marking breach email as handled for #{ticket.ticket_number}")
            ticket_sla.breach_email_sent = True
            handled = True
        else:
            logger.info(f"[SLA-BREACH] SKIPPING breach email for #{ticket.ticket_number}: "
                       f"send_escalation_emails={policy.send_escalation_emails}, already_sent={ticket_sla.breach_email_sent}")
        
        if policy.auto_assign_on_breach and not ticket_sla.auto_assigned_on_breach:
            if not admin_user_fetched:
                admin_user = _get_admin_user()
                admin_user_fetched = True
                logger.info(f"[SLA-BREACH] Admin user for escalation: {admin_user.username if admin_user else 'NOT FOUND'}")
            
            if admin_user:
                ticket_sla.auto_assigned_on_breach = True
                handled = True
                
                logger.info(f"[SLA-BREACH] Sending escalation email to admin {admin_user.username} for ticket #{ticket.ticket_number}")
                _send_admin_escalation_email(mailer, ticket, ticket_sla, admin_user, tenant_schema, business_context)
            else:
                logger.warning(f"[SLA-BREACH] SKIPPING admin escalation for #{ticket.ticket_number} - No admin user found")
        else:
            logger.info(f"[SLA-BREACH] SKIPPING auto-assign for #{ticket.ticket_number}: "
                       f"auto_assign_on_breach={policy.auto_assign_on_breach}, already_assigned={ticket_sla.auto_assigned_on_breach}")
        
        if handled or needs_save:
            ticket_sla.save(update_fields=['resolution_breached', 'escalation_email_sent', 'breach_email_sent', 'auto_assigned_on_breach'])
            if handled:
                breaches_handled += 1
                logger.info(f"[SLA-BREACH] SUCCESS - Handled SLA breach for ticket #{ticket.ticket_number}")
            else:
                logger.info(f"[SLA-BREACH] Saved breach flag for ticket #{ticket.ticket_number} (actions already handled)")
        else:
            logger.info(f"[SLA-BREACH] No actions taken for ticket #{ticket.ticket_number} (all already handled)")
    
    logger.info(f"[SLA-BREACH] Tenant {tenant_schema} completed - {breaches_handled} breaches handled")
    return breaches_handled


# =============================================================================
# AUTO-CLOSE HELPER FUNCTIONS
# =============================================================================

def _queue_tickets_for_closing(schema_name):
    """Find resolved tickets older than AUTO_CLOSE_INTERVAL_MINUTES and close them directly."""
    from django.conf import settings
    from django.utils import timezone
    from datetime import timedelta
    from shared.utilities.tenant_compat import schema_context
    from modules.ticket.models import Ticket
    
    interval_minutes = getattr(settings, 'AUTO_CLOSE_INTERVAL_MINUTES', 1440)
    now = timezone.now()
    cutoff_time = now - timedelta(minutes=interval_minutes)
    
    logger.info(f"[AUTO-CLOSE] Tenant {schema_name}: checking for tickets resolved before {cutoff_time} (interval: {interval_minutes}m)")
    
    closed_count = 0
    with schema_context(schema_name):
        resolved_tickets = list(Ticket.objects.filter(
            status='resolved',
            resolved_at__lte=cutoff_time
        ).values_list('id', 'ticket_number', 'resolved_at'))
        
        count = len(resolved_tickets)
        logger.info(f"[AUTO-CLOSE] Tenant {schema_name}: found {count} resolved tickets past cutoff")
        
        if count > 0:
            for ticket_id, ticket_number, resolved_at in resolved_tickets:
                age_minutes = (now - resolved_at).total_seconds() / 60 if resolved_at else 0
                try:
                    ticket = Ticket.objects.get(id=ticket_id)
                    if ticket.status == 'resolved':
                        ticket.status = 'closed'
                        ticket.save(update_fields=['status'])
                        closed_count += 1
                        logger.info(f"[AUTO-CLOSE] Closed ticket #{ticket_number} (resolved {age_minutes:.0f}m ago)")
                    else:
                        logger.info(f"[AUTO-CLOSE] Ticket #{ticket_number} status changed to '{ticket.status}', skipping")
                except Ticket.DoesNotExist:
                    logger.warning(f"[AUTO-CLOSE] Ticket #{ticket_number} (id={ticket_id}) not found, skipping")
                except Exception as e:
                    logger.error(f"[AUTO-CLOSE] Error closing ticket #{ticket_number}: {e}", exc_info=True)
        else:
            logger.info(f"[AUTO-CLOSE] Tenant {schema_name}: no tickets to close")
        
        logger.info(f"[AUTO-CLOSE] Tenant {schema_name} completed - {closed_count}/{count} tickets closed")
        return closed_count


# =============================================================================
# SHARED HELPER FUNCTIONS
# =============================================================================

def _get_business_context():
    """Get cached business context for emails."""
    from django.conf import settings
    from shared.models import Client
    
    try:
        company_name = Client.get_current().name
    except Exception:
        company_name = 'Support'
    
    return {
        'company_name': company_name,
        'base_url': getattr(settings, 'SITE_URL', 'https://imaradesk.com')
    }


def _get_warning_recipients(ticket):
    """Get list of email recipients for SLA warning."""
    recipients = []
    
    if ticket.group_id and hasattr(ticket, 'group') and ticket.group:
        try:
            members = ticket.group.members.all()
            for profile in members:
                if profile.user.is_active and profile.user.email:
                    name = f"{profile.user.first_name} {profile.user.last_name}".strip() or profile.user.username
                    recipients.append((profile.user.email, name))
        except Exception:
            pass
    
    if not recipients and ticket.assignee_id:
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            if hasattr(ticket, 'assignee') and ticket.assignee:
                assignee = ticket.assignee
            else:
                assignee = User.objects.only(
                    'id', 'email', 'first_name', 'last_name', 'username'
                ).get(pk=ticket.assignee_id)
            
            if assignee.email:
                name = f"{assignee.first_name} {assignee.last_name}".strip() or assignee.username
                recipients.append((assignee.email, name))
        except Exception:
            pass
    
    return recipients


def _get_admin_user():
    """Get an Administrator user for auto-assignment."""
    from django.contrib.auth import get_user_model
    from modules.users.models import UserProfile
    
    User = get_user_model()
    
    try:
        admin_profile = UserProfile.objects.select_related('user', 'role').only(
            'id', 'user__id', 'user__username', 'user__email', 'user__first_name',
            'user__last_name', 'user__is_active', 'role__name'
        ).filter(
            role__name__iexact='Administrator',
            user__is_active=True
        ).first()
        
        if admin_profile:
            return admin_profile.user
        
        logger.warning("[CRON] No active Administrator user found")
        return None
        
    except Exception as e:
        logger.error(f"[CRON] Error finding admin user: {e}")
        return None


def _send_sla_warning_email(mailer, template, ticket, ticket_sla, sla_type, time_remaining, recipients, business_context=None):
    """Send SLA breach warning email to recipients."""
    total_seconds = int(time_remaining.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    
    if hours > 0:
        time_str = f"{hours}h {minutes}m"
    else:
        time_str = f"{minutes} minutes"
    
    if business_context is None:
        business_context = _get_business_context()
    
    ticket_url = f"{business_context['base_url']}/tickets/{ticket.uuid}"
    company_name = business_context['company_name']
    
    for email, name in recipients:
        try:
            context = {
                'agent_name': name,
                'ticket_number': ticket.ticket_number or f"#{ticket.id}",
                'ticket_subject': ticket.title,
                'ticket_priority': ticket.get_priority_display(),
                'time_remaining': f"{time_str} ({sla_type} SLA)",
                'ticket_url': ticket_url,
                'company_name': company_name,
                'sla_type': sla_type,
            }
            
            rendered_subject, rendered_html, rendered_text = template.render(context)
            
            mailer.send_raw_email(
                to_email=email,
                subject=rendered_subject or f'SLA Breach Warning - Ticket #{ticket.ticket_number}',
                body_html=rendered_html or '',
                body_text=rendered_text or '',
            )
            
            logger.info(f"[CRON] Sent SLA warning email to {email} for ticket #{ticket.ticket_number}")
            
        except Exception as e:
            logger.error(f"[CRON] Failed to send SLA warning email to {email}: {e}")


def _send_escalation_email(mailer, ticket, ticket_sla, tenant_schema, business_context=None):
    """Send SLA escalation notification email."""
    from modules.settings.models import EmailTemplate
    
    try:
        template = EmailTemplate.objects.only(
            'id', 'subject', 'body_html', 'body_text'
        ).get(
            template_type='sla_escalation_notice',
            status='active'
        )
    except EmailTemplate.DoesNotExist:
        logger.warning(f"[CRON] SLA escalation template not found for tenant {tenant_schema}")
        return
    
    recipients = _get_warning_recipients(ticket)
    if not recipients:
        return
    
    if business_context is None:
        business_context = _get_business_context()
    
    ticket_url = f"{business_context['base_url']}/tickets/{ticket.uuid}"
    company_name = business_context['company_name']
    
    for email, name in recipients:
        try:
            context = {
                'agent_name': name,
                'ticket_number': ticket.ticket_number or f"#{ticket.id}",
                'ticket_subject': ticket.title,
                'ticket_priority': ticket.get_priority_display(),
                'ticket_url': ticket_url,
                'company_name': company_name,
                'policy_name': ticket_sla.policy.name,
            }
            
            rendered_subject, rendered_html, rendered_text = template.render(context)
            
            mailer.send_raw_email(
                to_email=email,
                subject=rendered_subject or f'SLA Escalation - Ticket #{ticket.ticket_number}',
                body_html=rendered_html or '',
                body_text=rendered_text or '',
            )
            
            logger.info(f"[CRON] Sent escalation email to {email} for ticket #{ticket.ticket_number}")
            
        except Exception as e:
            logger.error(f"[CRON] Failed to send escalation email to {email}: {e}")


def _send_breach_email(mailer, ticket, ticket_sla, tenant_schema, business_context=None):
    """Send SLA breached notification email."""
    from modules.settings.models import EmailTemplate
    from django.utils import timezone
    
    try:
        template = EmailTemplate.objects.only(
            'id', 'subject', 'body_html', 'body_text'
        ).get(
            template_type='sla_breached',
            status='active'
        )
    except EmailTemplate.DoesNotExist:
        logger.warning(f"[CRON] SLA breached template not found for tenant {tenant_schema}")
        return
    
    recipients = _get_warning_recipients(ticket)
    if not recipients:
        return
    
    if business_context is None:
        business_context = _get_business_context()
    
    ticket_url = f"{business_context['base_url']}/tickets/{ticket.uuid}"
    company_name = business_context['company_name']
    
    now = timezone.now()
    overdue_time = now - ticket_sla.resolution_due_at
    overdue_hours = int(overdue_time.total_seconds() / 3600)
    overdue_minutes = int((overdue_time.total_seconds() % 3600) / 60)
    
    if overdue_hours > 0:
        overdue_str = f"{overdue_hours}h {overdue_minutes}m overdue"
    else:
        overdue_str = f"{overdue_minutes} minutes overdue"
    
    for email, name in recipients:
        try:
            context = {
                'agent_name': name,
                'ticket_number': ticket.ticket_number or f"#{ticket.id}",
                'ticket_subject': ticket.title,
                'ticket_priority': ticket.get_priority_display(),
                'ticket_url': ticket_url,
                'company_name': company_name,
                'policy_name': ticket_sla.policy.name,
                'overdue_time': overdue_str,
            }
            
            rendered_subject, rendered_html, rendered_text = template.render(context)
            
            mailer.send_raw_email(
                to_email=email,
                subject=rendered_subject or f'SLA Breached - Ticket #{ticket.ticket_number}',
                body_html=rendered_html or '',
                body_text=rendered_text or '',
            )
            
            logger.info(f"[CRON] Sent breach email to {email} for ticket #{ticket.ticket_number}")
            
        except Exception as e:
            logger.error(f"[CRON] Failed to send breach email to {email}: {e}")


def _send_admin_escalation_email(mailer, ticket, ticket_sla, admin_user, tenant_schema, business_context=None):
    """Send SLA breach escalation notification email to admin."""
    from modules.settings.models import EmailTemplate
    from django.utils import timezone
    
    try:
        template = EmailTemplate.objects.only(
            'id', 'subject', 'body_html', 'body_text'
        ).get(
            template_type='sla_escalation_notice',
            status='active'
        )
    except EmailTemplate.DoesNotExist:
        logger.warning(f"[CRON] SLA escalation template not found for tenant {tenant_schema}")
        return
    
    if not admin_user.email:
        logger.warning(f"[CRON] Admin user {admin_user.username} has no email address")
        return
    
    if business_context is None:
        business_context = _get_business_context()
    
    ticket_url = f"{business_context['base_url']}/tickets/{ticket.uuid}"
    company_name = business_context['company_name']
    
    now = timezone.now()
    overdue_time = now - ticket_sla.resolution_due_at
    overdue_hours = int(overdue_time.total_seconds() / 3600)
    overdue_minutes = int((overdue_time.total_seconds() % 3600) / 60)
    
    if overdue_hours > 0:
        overdue_str = f"{overdue_hours}h {overdue_minutes}m overdue"
    else:
        overdue_str = f"{overdue_minutes} minutes overdue"
    
    admin_name = f"{admin_user.first_name} {admin_user.last_name}".strip() or admin_user.username
    
    assignee_name = 'Unassigned'
    if ticket.assignee_id and hasattr(ticket, 'assignee') and ticket.assignee:
        assignee_name = f"{ticket.assignee.first_name} {ticket.assignee.last_name}".strip() or ticket.assignee.username
    
    try:
        context = {
            'agent_name': admin_name,
            'ticket_number': ticket.ticket_number or f"#{ticket.id}",
            'ticket_subject': ticket.title,
            'ticket_priority': ticket.get_priority_display(),
            'ticket_url': ticket_url,
            'company_name': company_name,
            'policy_name': ticket_sla.policy.name,
            'overdue_time': overdue_str,
            'current_assignee': assignee_name,
        }
        
        rendered_subject, rendered_html, rendered_text = template.render(context)
        
        mailer.send_raw_email(
            to_email=admin_user.email,
            subject=rendered_subject or f'SLA Escalation - Ticket #{ticket.ticket_number}',
            body_html=rendered_html or '',
            body_text=rendered_text or '',
        )
        
        logger.info(f"[CRON] Sent admin escalation email to {admin_user.email} for ticket #{ticket.ticket_number}")
        
    except Exception as e:
        logger.error(f"[CRON] Failed to send admin escalation email to {admin_user.email}: {e}")


# =============================================================================
# TASK DUE/OVERDUE CHECKS CRON
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.check_tasks_due_soon')
def check_tasks_due_soon(self):
    """
    Scheduled task: Check for tasks due within 24 hours and send reminders.
    Runs daily at 8 AM via Celery Beat.
    """
    from shared.utilities.tenant_compat import get_tenant_model, schema_context
    from modules.tasks.models import Task
    from modules.settings.models import NotificationSettings
    from modules.tasks.tasks import send_task_due_soon_notification_task
    from django.utils import timezone
    from datetime import timedelta
    
    logger.info("[CRON] Starting check for tasks due soon...")
    
    from shared.models import Client
    total_sent = 0
    
    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                # Check if notification is enabled
                settings = NotificationSettings.get_settings()
                if not getattr(settings, 'notify_task_due_soon', True):
                    continue
                
                # Get tasks due within 24 hours
                now = timezone.now().date()
                tomorrow = now + timedelta(days=1)
                
                due_soon_tasks = Task.objects.filter(
                    due_date=tomorrow,
                    status__in=['todo', 'in_progress', 'review'],
                    assignee__isnull=False,
                    due_soon_notification_sent=False
                )
                
                task_ids = list(due_soon_tasks.values_list('id', flat=True))
                for task_id in task_ids:
                    send_task_due_soon_notification_task.delay(tenant.schema_name, task_id)
                    total_sent += 1
                
                if task_ids:
                    Task.objects.filter(id__in=task_ids).update(due_soon_notification_sent=True)
                    
        except Exception as e:
            logger.error(f"[CRON] Error checking tasks due soon for tenant {tenant.schema_name}: {e}")
    
    logger.info(f"[CRON] Finished checking tasks due soon. Queued {total_sent} notifications.")
    return {'status': 'completed', 'notifications_queued': total_sent}


@shared_task(bind=True, name='modules.crons.tasks.check_overdue_tasks')
def check_overdue_tasks(self):
    """
    Scheduled task: Check for overdue tasks and send notifications.
    Runs daily at 9 AM via Celery Beat.
    """
    from shared.utilities.tenant_compat import get_tenant_model, schema_context
    from modules.tasks.models import Task
    from modules.settings.models import NotificationSettings
    from modules.tasks.tasks import send_task_overdue_notification_task
    from django.utils import timezone
    
    logger.info("[CRON] Starting check for overdue tasks...")
    
    from shared.models import Client
    total_sent = 0
    
    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                # Check if notification is enabled
                settings = NotificationSettings.get_settings()
                if not getattr(settings, 'notify_task_overdue', True):
                    continue
                
                # Get overdue tasks
                now = timezone.now().date()
                
                overdue_tasks = Task.objects.filter(
                    due_date__lt=now,
                    status__in=['todo', 'in_progress', 'review'],
                    assignee__isnull=False,
                    overdue_notification_sent=False
                )
                
                task_ids = list(overdue_tasks.values_list('id', flat=True))
                for task_id in task_ids:
                    send_task_overdue_notification_task.delay(tenant.schema_name, task_id)
                    total_sent += 1
                
                if task_ids:
                    Task.objects.filter(id__in=task_ids).update(overdue_notification_sent=True)
                    
        except Exception as e:
            logger.error(f"[CRON] Error checking overdue tasks for tenant {tenant.schema_name}: {e}")
    
    logger.info(f"[CRON] Finished checking overdue tasks. Queued {total_sent} notifications.")
    return {'status': 'completed', 'notifications_queued': total_sent}


# =============================================================================
# SURVEY CRONS
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.process_pending_survey_invitations', max_retries=3, default_retry_delay=60)
def process_pending_survey_invitations(self):
    """
    Scheduled task: Process pending survey invitations and send emails.
    Runs every 60 seconds via Celery Beat.
    """
    from shared.utilities.tenant_compat import get_tenant_model, schema_context
    from django.utils import timezone
    from django.db.models import Q
    
    logger.info("[CRON] Starting to process pending survey invitations...")
    
    from shared.models import Client
    total_sent = 0
    total_errors = 0
    
    # Process each tenant
    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                sent, errors = _process_tenant_survey_invitations(tenant.schema_name)
                total_sent += sent
                total_errors += errors
        except Exception as e:
            logger.error(f"[CRON] Error processing survey invitations for tenant {tenant.schema_name}: {e}")
            total_errors += 1
    
    result = {
        'status': 'completed',
        'invitations_sent': total_sent,
        'errors': total_errors,
    }
    
    logger.info(f"[CRON] Finished processing survey invitations: {result}")
    return result


@shared_task(bind=True, name='modules.crons.tasks.send_survey_reminders', max_retries=3, default_retry_delay=60)
def send_survey_reminders(self):
    """
    Scheduled task: Send reminders for unopened/incomplete survey invitations.
    Runs daily at 9 AM via Celery Beat.
    """
    from shared.utilities.tenant_compat import get_tenant_model, schema_context
    
    logger.info("[CRON] Starting to send survey reminders...")
    
    from shared.models import Client
    total_sent = 0
    
    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                sent = _send_tenant_survey_reminders(tenant.schema_name)
                total_sent += sent
        except Exception as e:
            logger.error(f"[CRON] Error sending survey reminders for tenant {tenant.schema_name}: {e}")
    
    logger.info(f"[CRON] Finished sending survey reminders. Total sent: {total_sent}")
    return {'reminders_sent': total_sent}


# =============================================================================
# SURVEY HELPER FUNCTIONS
# =============================================================================

def _process_tenant_survey_invitations(schema_name):
    """Process pending survey invitations for a specific tenant by queuing rate-limited tasks."""
    from modules.surveys.models import SurveyInvitation, SurveySettings
    from modules.surveys.tasks import send_single_survey_invitation
    from django.utils import timezone
    from django.db.models import Q
    
    queued_count = 0
    
    try:
        # Check if surveys are enabled
        settings = SurveySettings.get_settings()
        if not settings.enabled:
            return 0, 0
        
        now = timezone.now()
        
        # Get ALL pending invitations (regardless of scheduled_at)
        # Filter: status=pending AND (no expires_at OR expires_at > now)
        pending_invitations = SurveyInvitation.objects.filter(
            status=SurveyInvitation.Status.PENDING
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).values_list('id', flat=True)[:50]  # Process in batches
        
        # Queue individual rate-limited tasks for each invitation
        for invitation_id in pending_invitations:
            send_single_survey_invitation.delay(schema_name, invitation_id)
            queued_count += 1
        
        if queued_count > 0:
            logger.info(f"[CRON] Queued {queued_count} survey invitation tasks for {schema_name}")
        
        # Mark expired invitations
        expired_count = SurveyInvitation.objects.filter(
            status=SurveyInvitation.Status.PENDING,
            expires_at__lte=now
        ).update(status=SurveyInvitation.Status.EXPIRED)
        
        if expired_count > 0:
            logger.info(f"[CRON] Marked {expired_count} survey invitations as expired in {schema_name}")
        
    except Exception as e:
        logger.error(f"[CRON] Error in _process_tenant_survey_invitations for {schema_name}: {e}")
    
    return queued_count, 0


def _send_tenant_survey_reminders(schema_name):
    """Send survey reminders for a specific tenant."""
    from modules.surveys.models import SurveyInvitation, SurveySettings
    from modules.surveys.tasks import send_single_survey_invitation
    from django.utils import timezone
    from datetime import timedelta
    
    sent_count = 0
    
    try:
        settings = SurveySettings.get_settings()
        if not settings.enabled or not settings.send_reminders:
            return 0
        
        # Also check NotificationSettings
        from modules.settings.models import NotificationSettings
        notification_settings = NotificationSettings.get_settings()
        if not getattr(notification_settings, 'notify_survey_reminder', True):
            return 0
        
        reminder_days = settings.reminder_days or 3
        now = timezone.now()
        reminder_cutoff = now - timedelta(days=reminder_days)
        
        # Get invitations that were sent but not completed (no reminders sent yet)
        invitations = SurveyInvitation.objects.filter(
            status='sent',
            sent_at__lte=reminder_cutoff,
            expires_at__gt=now,  # Not expired
            reminder_count=0
        ).values_list('id', flat=True)[:50]
        
        for invitation_id in invitations:
            send_single_survey_invitation.delay(schema_name, invitation_id)
            # Increment reminder count
            from django.db.models import F
            SurveyInvitation.objects.filter(id=invitation_id).update(
                reminder_count=F('reminder_count') + 1,
                last_reminder_at=now
            )
            sent_count += 1
        
        if sent_count > 0:
            logger.info(f"[CRON] Queued {sent_count} survey reminders for {schema_name}")
            
    except Exception as e:
        logger.error(f"[CRON] Error sending survey reminders for {schema_name}: {e}")
    
    return sent_count


# =============================================================================
# SLA BUSINESS HOURS & HOLIDAY AUTO-PAUSE CRONS
# =============================================================================

# System hold reason constants - used to distinguish auto-holds from manual holds
HOLD_REASON_OUTSIDE_BUSINESS_HOURS = "SYSTEM_OUTSIDE_BUSINESS_HOURS"
HOLD_REASON_HOLIDAY = "SYSTEM_HOLIDAY"


@shared_task(bind=True, name='modules.crons.tasks.manage_sla_business_hours', max_retries=3, default_retry_delay=30)
def manage_sla_business_hours(self):
    """
    Scheduled task: Pause/resume SLA timers based on business hours.
    Runs every minute via Celery Beat.
    
    - When outside business hours: Pause all active ticket SLAs (if pause_outside_hours enabled)
    - When back in business hours: Resume SLAs that were paused for being outside hours
    """
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    
    logger.info("[CRON] Starting SLA business hours check...")
    
    try:
        from shared.models import Client
        tenants_processed = 0
        total_paused = 0
        total_resumed = 0
        
        for tenant in Client.objects.filter(is_active=True):
            with tenant_context(tenant):
                try:
                    paused, resumed = _process_tenant_business_hours(tenant.schema_name)
                    total_paused += paused
                    total_resumed += resumed
                    tenants_processed += 1
                except Exception as tenant_error:
                    logger.error(f"[CRON] Error processing business hours for tenant {tenant.schema_name}: {tenant_error}")
        
        result = {
            'status': 'completed',
            'tenants_processed': tenants_processed,
            'slas_paused': total_paused,
            'slas_resumed': total_resumed,
        }
        
        if total_paused > 0 or total_resumed > 0:
            logger.info(f"[CRON] SLA business hours check completed: {result}")
        
        return result
        
    except Exception as e:
        logger.error(f"[CRON] SLA business hours check failed: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.crons.tasks.manage_sla_holidays', max_retries=3, default_retry_delay=60)
def manage_sla_holidays(self):
    """
    Scheduled task: Pause/resume SLA timers based on holidays.
    Runs every 30 minutes via Celery Beat.
    
    - On holidays: Pause all active ticket SLAs (if exclude_holidays enabled)
    - After holidays: Resume SLAs that were paused for holidays
    """
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    
    logger.info("[CRON] Starting SLA holiday check...")
    
    try:
        from shared.models import Client
        tenants_processed = 0
        total_paused = 0
        total_resumed = 0
        
        for tenant in Client.objects.filter(is_active=True):
            with tenant_context(tenant):
                try:
                    paused, resumed = _process_tenant_holidays(tenant.schema_name)
                    total_paused += paused
                    total_resumed += resumed
                    tenants_processed += 1
                except Exception as tenant_error:
                    logger.error(f"[CRON] Error processing holidays for tenant {tenant.schema_name}: {tenant_error}")
        
        result = {
            'status': 'completed',
            'tenants_processed': tenants_processed,
            'slas_paused': total_paused,
            'slas_resumed': total_resumed,
        }
        
        if total_paused > 0 or total_resumed > 0:
            logger.info(f"[CRON] SLA holiday check completed: {result}")
        
        return result
        
    except Exception as e:
        logger.error(f"[CRON] SLA holiday check failed: {e}")
        raise self.retry(exc=e)


def _process_tenant_business_hours(tenant_schema):
    """Process business hours pause/resume for a single tenant."""
    from django.utils import timezone
    from modules.sla.models import SLASettings, BusinessHours, TicketSLA
    import pytz
    
    paused = 0
    resumed = 0
    
    # Check if SLA is enabled
    sla_settings = SLASettings.get_settings()
    if not sla_settings.enabled:
        return 0, 0
    
    # Get active business hours configuration
    try:
        business_hours = BusinessHours.objects.get(is_active=True)
    except BusinessHours.DoesNotExist:
        return 0, 0
    
    # Check if pause_outside_hours is enabled
    if not business_hours.pause_outside_hours:
        # If disabled but we have SLAs paused for business hours, resume them
        ticket_slas_to_resume = TicketSLA.objects.filter(
            is_on_hold=True,
            hold_reason=HOLD_REASON_OUTSIDE_BUSINESS_HOURS
        )
        for ticket_sla in ticket_slas_to_resume:
            _resume_sla(ticket_sla)
            resumed += 1
        return 0, resumed
    
    # Get current time in the configured timezone
    tz = pytz.timezone(business_hours.timezone)
    now_utc = timezone.now()
    now_local = now_utc.astimezone(tz)
    
    # Check if we're currently in business hours
    is_in_business = _is_within_business_hours(business_hours, now_local)
    
    if is_in_business:
        # Resume SLAs that were paused for being outside business hours
        ticket_slas_to_resume = TicketSLA.objects.select_related('ticket').filter(
            is_on_hold=True,
            hold_reason=HOLD_REASON_OUTSIDE_BUSINESS_HOURS,
            ticket__status__in=['new', 'open', 'in_progress', 'pending'],
            ticket__merged_into__isnull=True,
        )
        for ticket_sla in ticket_slas_to_resume:
            _resume_sla(ticket_sla)
            resumed += 1
            logger.info(f"[SLA-BIZ-HOURS] Resumed SLA for ticket #{ticket_sla.ticket.ticket_number} - back in business hours")
    else:
        # Pause SLAs that are not already on hold (for any reason)
        ticket_slas_to_pause = TicketSLA.objects.select_related('ticket').filter(
            is_on_hold=False,
            ticket__status__in=['new', 'open', 'in_progress', 'pending'],
            ticket__merged_into__isnull=True,
            resolution_breached=False,  # Don't pause already breached SLAs
        )
        for ticket_sla in ticket_slas_to_pause:
            _hold_sla(ticket_sla, HOLD_REASON_OUTSIDE_BUSINESS_HOURS)
            paused += 1
            logger.info(f"[SLA-BIZ-HOURS] Paused SLA for ticket #{ticket_sla.ticket.ticket_number} - outside business hours")
    
    return paused, resumed


def _process_tenant_holidays(tenant_schema):
    """Process holiday pause/resume for a single tenant."""
    from django.utils import timezone
    from modules.sla.models import SLASettings, BusinessHours, Holiday, TicketSLA
    import pytz
    
    paused = 0
    resumed = 0
    
    # Check if SLA is enabled
    sla_settings = SLASettings.get_settings()
    if not sla_settings.enabled:
        return 0, 0
    
    # Get active business hours configuration (for exclude_holidays setting and timezone)
    try:
        business_hours = BusinessHours.objects.get(is_active=True)
    except BusinessHours.DoesNotExist:
        return 0, 0
    
    # Check if exclude_holidays is enabled
    if not business_hours.exclude_holidays:
        # If disabled but we have SLAs paused for holidays, resume them
        ticket_slas_to_resume = TicketSLA.objects.filter(
            is_on_hold=True,
            hold_reason=HOLD_REASON_HOLIDAY
        )
        for ticket_sla in ticket_slas_to_resume:
            _resume_sla(ticket_sla)
            resumed += 1
        return 0, resumed
    
    # Get current date in the configured timezone
    tz = pytz.timezone(business_hours.timezone)
    now_utc = timezone.now()
    now_local = now_utc.astimezone(tz)
    today = now_local.date()
    
    # Check if today is a holiday
    is_holiday = _is_holiday(today)
    
    if is_holiday:
        # Pause SLAs that are not already on hold (for any reason)
        ticket_slas_to_pause = TicketSLA.objects.select_related('ticket').filter(
            is_on_hold=False,
            ticket__status__in=['new', 'open', 'in_progress', 'pending'],
            ticket__merged_into__isnull=True,
            resolution_breached=False,
        )
        for ticket_sla in ticket_slas_to_pause:
            _hold_sla(ticket_sla, HOLD_REASON_HOLIDAY)
            paused += 1
            logger.info(f"[SLA-HOLIDAY] Paused SLA for ticket #{ticket_sla.ticket.ticket_number} - holiday")
    else:
        # Resume SLAs that were paused for holidays
        ticket_slas_to_resume = TicketSLA.objects.select_related('ticket').filter(
            is_on_hold=True,
            hold_reason=HOLD_REASON_HOLIDAY,
            ticket__status__in=['new', 'open', 'in_progress', 'pending'],
            ticket__merged_into__isnull=True,
        )
        for ticket_sla in ticket_slas_to_resume:
            _resume_sla(ticket_sla)
            resumed += 1
            logger.info(f"[SLA-HOLIDAY] Resumed SLA for ticket #{ticket_sla.ticket.ticket_number} - holiday ended")
    
    return paused, resumed


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
    """Check if given date is a holiday."""
    from modules.sla.models import Holiday
    
    # Check for exact date match or recurring (same month/day)
    holidays = Holiday.objects.filter(status='active')
    
    for holiday in holidays:
        if holiday.recurring:
            # For recurring holidays, check month and day
            if holiday.date.month == date.month and holiday.date.day == date.day:
                return True
        else:
            # For one-time holidays, exact date match
            if holiday.date == date:
                return True
    
    return False


def _hold_sla(ticket_sla, reason):
    """Put SLA timer on hold with specific reason."""
    from django.utils import timezone
    
    if not ticket_sla.is_on_hold:
        ticket_sla.is_on_hold = True
        ticket_sla.hold_reason = reason
        ticket_sla.hold_started_at = timezone.now()
        ticket_sla.save(update_fields=['is_on_hold', 'hold_reason', 'hold_started_at'])


def _resume_sla(ticket_sla):
    """Resume SLA timer from hold and extend due dates."""
    from django.utils import timezone
    from datetime import timedelta
    
    if ticket_sla.is_on_hold and ticket_sla.hold_started_at:
        # Calculate hold duration
        hold_duration = timezone.now() - ticket_sla.hold_started_at
        hold_minutes = int(hold_duration.total_seconds() / 60)
        
        # Add to total hold time
        ticket_sla.total_hold_time += hold_minutes
        
        # Extend due dates by hold duration
        if ticket_sla.response_due_at:
            ticket_sla.response_due_at += timedelta(minutes=hold_minutes)
        if ticket_sla.resolution_due_at:
            ticket_sla.resolution_due_at += timedelta(minutes=hold_minutes)
        
        # Clear hold status
        ticket_sla.is_on_hold = False
        ticket_sla.hold_reason = ''
        ticket_sla.hold_started_at = None
        
        ticket_sla.save(update_fields=[
            'is_on_hold', 'hold_reason', 'hold_started_at',
            'total_hold_time', 'response_due_at', 'resolution_due_at'
        ])



# =============================================================================
# WORKSPACE DELETION CRON
# =============================================================================

@shared_task(bind=True, name="modules.crons.tasks.process_scheduled_workspace_deletions", max_retries=3, default_retry_delay=300)
def process_scheduled_workspace_deletions(self):
    """
    Scheduled task: Process workspaces that are due for deletion.
    Runs daily at 2 AM to check for workspaces past their grace period.
    """
    from django.utils import timezone
    from shared.utilities.tenant_compat import get_tenant_model
    
    logger.info("[CRON] Starting workspace deletion processing...")
    
    try:
        from shared.models import Client
        
        # Find workspaces scheduled for deletion where the scheduled date has passed
        due_for_deletion = Client.objects.filter(
            deletion_status="scheduled",
            deletion_scheduled_for__lte=timezone.now()
        )
        
        deleted_count = 0
        
        for tenant in due_for_deletion:
            try:
                logger.info(f"[CRON] Processing deletion for workspace: {tenant.schema_name}")
                
                # Update status to in_progress
                tenant.deletion_status = "in_progress"
                tenant.save(update_fields=["deletion_status"])
                
                # Trigger the actual deletion task
                delete_workspace_task.delay(tenant.id)
                deleted_count += 1
                
            except Exception as tenant_error:
                logger.error(f"[CRON] Error initiating deletion for {tenant.schema_name}: {tenant_error}")
        
        result = {
            "status": "completed",
            "deletions_initiated": deleted_count,
        }
        
        logger.info(f"[CRON] Workspace deletion processing completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[CRON] Error in workspace deletion cron: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name="modules.crons.tasks.delete_workspace_task", max_retries=3, default_retry_delay=60)
def delete_workspace_task(self, tenant_id):
    """
    Task to delete a single workspace and all its data.
    This runs as a background task to handle the heavy deletion process.
    """
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    from shared.models import Domain
    from shared.utilities.Mailer import Mailer
    from shared.utilities.templates import GlobalEmailTemplates
    from django.contrib.auth import get_user_model
    
    logger.info(f"[TASK] Starting deletion for tenant_id: {tenant_id}")
    
    try:
        from shared.models import Client
        tenant = Client.objects.get(id=tenant_id)
        
        schema_name = tenant.schema_name
        tenant_name = tenant.name
        requested_by = tenant.deletion_requested_by
        
        logger.info(f"[TASK] Deleting workspace: {tenant_name} ({schema_name})")
        
        # Collect admin emails BEFORE deletion (for scheduled deletions that reached their date)
        # Only send if this was a scheduled deletion (not immediate - immediate sends email in view)
        admin_emails = []
        if tenant.deletion_scheduled_for:  # This indicates it was a scheduled deletion
            try:
                with tenant_context(tenant):
                    User = get_user_model()
                    from modules.users.models import UserProfile
                    
                    # Get superuser emails
                    admin_emails = list(User.objects.filter(
                        is_superuser=True, 
                        is_active=True
                    ).values_list('email', flat=True))
                    
                    # Get Admin role emails
                    admin_profiles = UserProfile.objects.filter(
                        role__name='Admin',
                        user__is_active=True
                    ).select_related('user')
                    
                    for profile in admin_profiles:
                        if profile.user.email and profile.user.email not in admin_emails:
                            admin_emails.append(profile.user.email)
                    
                    logger.info(f"[TASK] Collected {len(admin_emails)} admin emails for deletion notification")
            except Exception as e:
                logger.warning(f"[TASK] Error collecting admin emails: {e}")
        
        # Send completion email for scheduled deletions BEFORE deleting
        if admin_emails:
            mailer = Mailer()
            template_data = GlobalEmailTemplates.ACCOUNT_DELETION_COMPLETE
            
            for email in admin_emails:
                try:
                    mailer.send_raw_email(
                        to_email=email,
                        subject=template_data['subject'],
                        body_html=template_data['body_html'],
                        body_text=template_data['body_text'],
                        context={
                            'user_name': email.split('@')[0],
                            'workspace_name': tenant_name,
                        },
                        use_default_smtp=True,
                        fail_silently=True
                    )
                    logger.info(f"[TASK] Deletion complete email sent to {email}")
                except Exception as e:
                    logger.error(f"[TASK] Failed to send deletion email to {email}: {e}")
        
        # 1. Delete all domains associated with this tenant
        Domain.objects.filter(tenant=tenant).delete()
        logger.info(f"[TASK] Deleted domains for {schema_name}")
        
        # 2. Delete the tenant (this will drop the schema if auto_drop_schema=True)
        # Note: django-tenants will handle schema deletion
        tenant.delete()
        
        logger.info(f"[TASK] Successfully deleted workspace: {tenant_name} ({schema_name})")
        
        return {
            "status": "deleted",
            "tenant_name": tenant_name,
            "schema_name": schema_name,
        }
        
    except Client.DoesNotExist:
        logger.error(f"[TASK] Tenant {tenant_id} not found")
        return {"status": "not_found", "tenant_id": tenant_id}
        
    except Exception as e:
        logger.error(f"[TASK] Error deleting tenant {tenant_id}: {e}")
        raise self.retry(exc=e)


# =============================================================================
# ASSET MAINTENANCE & WARRANTY CRONS
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.check_asset_maintenance_due', max_retries=3, default_retry_delay=60)
def check_asset_maintenance_due(self):
    """Check for asset maintenance schedules that are due. Runs daily at 7 AM."""
    from shared.utilities.tenant_compat import get_tenant_model, schema_context

    logger.info("[CRON] Starting check for asset maintenance due...")

    from shared.models import Client
    total_sent = 0

    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                from modules.settings.models import NotificationSettings
                settings = NotificationSettings.get_settings()
                if not getattr(settings, 'notify_asset_maintenance_due', True):
                    continue

                sent = _process_tenant_asset_maintenance(tenant.schema_name)
                total_sent += sent
        except Exception as e:
            logger.error(f"[CRON] Error checking asset maintenance for {tenant.schema_name}: {e}")

    logger.info(f"[CRON] Finished asset maintenance check. Notifications sent: {total_sent}")
    return {'maintenance_notifications_sent': total_sent}


def _process_tenant_asset_maintenance(schema_name):
    """Process asset maintenance due notifications for a single tenant."""
    from django.utils import timezone
    from datetime import timedelta
    from modules.assets.models import Asset, AssetSettings, MaintenanceSchedule
    from shared.utilities.Mailer import Mailer

    sent = 0
    now = timezone.now()
    tomorrow = now + timedelta(days=1)

    try:
        # Find maintenance schedules where next_due is within next 24 hours
        schedules = MaintenanceSchedule.objects.select_related(
            'asset', 'asset__assigned_user'
        ).filter(
            is_active=True,
            next_due__lte=tomorrow,
            next_due__gte=now,
            asset__status__in=['active', 'in_stock'],
        )

        if not schedules.exists():
            return 0

        mailer = Mailer()
        company_name = _get_business_context().get('company_name', 'Support Team')

        # Check if auto-create tickets is enabled
        asset_settings = AssetSettings.get_settings()
        auto_create = asset_settings.auto_create_maintenance_tickets

        for schedule in schedules:
            asset = schedule.asset
            user = asset.assigned_user or asset.created_by
            if not user or not user.email:
                continue

            mailer.send_email(
                template_type='asset_maintenance_due',
                to_emails=[user.email],
                context={
                    'agent_name': user.get_full_name() or user.username,
                    'asset_name': asset.name,
                    'asset_id': asset.asset_id,
                    'maintenance_title': schedule.title,
                    'due_date': schedule.next_due.strftime('%B %d, %Y') if schedule.next_due else 'N/A',
                    'company_name': company_name,
                }
            )
            sent += 1
            logger.info(f"[CRON] Sent maintenance due notification for asset {asset.asset_id}")

            # Auto-create maintenance ticket if enabled
            if auto_create:
                _auto_create_maintenance_ticket(schedule, asset, user)

    except Exception as e:
        logger.error(f"[CRON] Error processing asset maintenance for {schema_name}: {e}")

    return sent


def _auto_create_maintenance_ticket(schedule, asset, user):
    """Auto-create a ticket for a due maintenance schedule."""
    from modules.ticket.models import Ticket

    try:
        # Check if a ticket already exists for this schedule's current due date
        existing = Ticket.objects.filter(
            title__contains=f"[Maintenance] {schedule.title} - {asset.name} ({asset.asset_id})",
            status__in=[Ticket.Status.NEW, Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS, Ticket.Status.PENDING],
        ).exists()

        if existing:
            logger.info(f"[CRON] Maintenance ticket already exists for {asset.asset_id} - {schedule.title}")
            return

        ticket = Ticket.objects.create(
            title=f"[Maintenance] {schedule.title} - {asset.name} ({asset.asset_id})",
            description=(
                f"Scheduled maintenance is due for asset {asset.name} ({asset.asset_id}).\n\n"
                f"Maintenance: {schedule.title}\n"
                f"Due Date: {schedule.next_due.strftime('%B %d, %Y') if schedule.next_due else 'N/A'}\n"
                f"Description: {schedule.description or 'N/A'}\n\n"
                f"This ticket was auto-created by the system."
            ),
            source='internal',
            priority=Ticket.Priority.NORMAL,
            type=Ticket.Type.TASK,
            requester=user,
            assignee=asset.assigned_user,
            status=Ticket.Status.NEW,
        )
        logger.info(f"[CRON] Auto-created maintenance ticket {ticket.ticket_number} for asset {asset.asset_id}")

    except Exception as e:
        logger.error(f"[CRON] Error auto-creating maintenance ticket for {asset.asset_id}: {e}")


@shared_task(bind=True, name='modules.crons.tasks.check_asset_warranty_expiring', max_retries=3, default_retry_delay=60)
def check_asset_warranty_expiring(self):
    """Check for assets with warranties expiring in 30 days. Runs daily at 7:30 AM."""
    from shared.utilities.tenant_compat import get_tenant_model, schema_context

    logger.info("[CRON] Starting check for expiring asset warranties...")

    from shared.models import Client
    total_sent = 0

    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                from modules.settings.models import NotificationSettings
                settings = NotificationSettings.get_settings()
                if not getattr(settings, 'notify_asset_warranty_expiring', True):
                    continue

                sent = _process_tenant_asset_warranty(tenant.schema_name)
                total_sent += sent
        except Exception as e:
            logger.error(f"[CRON] Error checking asset warranties for {tenant.schema_name}: {e}")

    logger.info(f"[CRON] Finished asset warranty check. Notifications sent: {total_sent}")
    return {'warranty_notifications_sent': total_sent}


def _process_tenant_asset_warranty(schema_name):
    """Process asset warranty expiring notifications for a single tenant."""
    from django.utils import timezone
    from datetime import timedelta
    from modules.assets.models import Asset
    from shared.utilities.Mailer import Mailer

    sent = 0
    today = timezone.now().date()
    warning_date = today + timedelta(days=30)

    try:
        # Assets with warranty expiring in the next 30 days
        assets = Asset.objects.select_related('assigned_user', 'created_by').filter(
            warranty_expiry_date__gte=today,
            warranty_expiry_date__lte=warning_date,
            status__in=['active', 'in_stock'],
        )

        if not assets.exists():
            return 0

        mailer = Mailer()
        company_name = _get_business_context().get('company_name', 'Support Team')

        for asset in assets:
            user = asset.assigned_user or asset.created_by
            if not user or not user.email:
                continue

            days_remaining = (asset.warranty_expiry_date - today).days

            mailer.send_email(
                template_type='asset_warranty_expiring',
                to_emails=[user.email],
                context={
                    'agent_name': user.get_full_name() or user.username,
                    'asset_name': asset.name,
                    'asset_id': asset.asset_id,
                    'warranty_expiry_date': asset.warranty_expiry_date.strftime('%B %d, %Y'),
                    'days_remaining': str(days_remaining),
                    'company_name': company_name,
                }
            )
            sent += 1
            logger.info(f"[CRON] Sent warranty expiring notification for asset {asset.asset_id} ({days_remaining} days)")
    except Exception as e:
        logger.error(f"[CRON] Error processing asset warranties for {schema_name}: {e}")

    return sent


# =============================================================================
# OVERDUE CHECKOUT REMINDERS
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.check_overdue_checkouts', max_retries=3, default_retry_delay=60)
def check_overdue_checkouts(self):
    """Check for overdue or about-to-be-due asset checkouts. Runs every 30 minutes."""
    from shared.utilities.tenant_compat import get_tenant_model, schema_context

    logger.info("[CRON] Starting check for overdue asset checkouts...")

    from shared.models import Client
    total_sent = 0

    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                sent = _process_tenant_overdue_checkouts(tenant.schema_name)
                total_sent += sent
        except Exception as e:
            logger.error(f"[CRON] Error checking overdue checkouts for {tenant.schema_name}: {e}")

    logger.info(f"[CRON] Finished overdue checkouts check. Notifications sent: {total_sent}")
    return {'overdue_checkout_notifications_sent': total_sent}


def _process_tenant_overdue_checkouts(schema_name):
    """Process overdue and due-soon checkout notifications for a single tenant."""
    from django.utils import timezone
    from modules.assets.models import AssetCheckout, AssetSettings
    from shared.utilities.Mailer import Mailer

    sent = 0
    now = timezone.now()
    settings = AssetSettings.get_settings()
    reminder_days = settings.overdue_reminder_days or 1

    try:
        active_checkouts = AssetCheckout.objects.select_related(
            'asset', 'checked_out_to', 'checked_out_by'
        ).filter(status__in=[AssetCheckout.Status.CHECKED_OUT, AssetCheckout.Status.OVERDUE])

        if not active_checkouts.exists():
            return 0

        mailer = Mailer()
        company_name = _get_business_context().get('company_name', 'Support Team')

        for checkout in active_checkouts:
            user = checkout.checked_out_to
            if not user or not user.email:
                continue

            days_until_due = (checkout.due_date - now).total_seconds() / 86400

            # Due soon reminder (within reminder_days threshold)
            if 0 < days_until_due <= reminder_days:
                mailer.send_email(
                    template_type='asset_checkout_due_soon',
                    to_emails=[user.email],
                    context={
                        'agent_name': user.get_full_name() or user.username,
                        'asset_name': checkout.asset.name,
                        'asset_id': checkout.asset.asset_id,
                        'due_date': checkout.due_date.strftime('%B %d, %Y at %I:%M %p'),
                        'days_remaining': str(max(1, int(days_until_due))),
                        'company_name': company_name,
                    }
                )
                sent += 1

            # Overdue notification
            elif days_until_due <= 0:
                overdue_days = abs(int(days_until_due))
                # Update status to overdue
                if checkout.status != AssetCheckout.Status.OVERDUE:
                    checkout.status = AssetCheckout.Status.OVERDUE
                    checkout.save(update_fields=['status', 'updated_at'])

                # Send overdue notice to borrower
                mailer.send_email(
                    template_type='asset_checkout_overdue',
                    to_emails=[user.email],
                    context={
                        'agent_name': user.get_full_name() or user.username,
                        'asset_name': checkout.asset.name,
                        'asset_id': checkout.asset.asset_id,
                        'due_date': checkout.due_date.strftime('%B %d, %Y'),
                        'overdue_days': str(overdue_days),
                        'company_name': company_name,
                    }
                )
                sent += 1

                # Also notify the person who checked it out (admin)
                if checkout.checked_out_by and checkout.checked_out_by.email and checkout.checked_out_by != user:
                    mailer.send_email(
                        template_type='asset_checkout_overdue',
                        to_emails=[checkout.checked_out_by.email],
                        context={
                            'agent_name': checkout.checked_out_by.get_full_name() or checkout.checked_out_by.username,
                            'asset_name': checkout.asset.name,
                            'asset_id': checkout.asset.asset_id,
                            'due_date': checkout.due_date.strftime('%B %d, %Y'),
                            'overdue_days': str(overdue_days),
                            'borrower_name': user.get_full_name() or user.username,
                            'company_name': company_name,
                        }
                    )
                    sent += 1

    except Exception as e:
        logger.error(f"[CRON] Error processing overdue checkouts for {schema_name}: {e}")

    return sent


# =============================================================================
# LOW STOCK INVENTORY ALERTS
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.check_low_stock_alerts', max_retries=3, default_retry_delay=60)
def check_low_stock_alerts(self):
    """Check for inventory items below minimum stock level. Runs daily at 8 AM."""
    from shared.utilities.tenant_compat import get_tenant_model, schema_context

    logger.info("[CRON] Starting low stock inventory check...")

    from shared.models import Client
    total_sent = 0

    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                from modules.assets.models import AssetSettings
                settings = AssetSettings.get_settings()
                if not settings.low_stock_alert_enabled:
                    continue

                sent = _process_tenant_low_stock(tenant.schema_name, settings)
                total_sent += sent
        except Exception as e:
            logger.error(f"[CRON] Error checking low stock for {tenant.schema_name}: {e}")

    logger.info(f"[CRON] Finished low stock check. Alerts sent: {total_sent}")
    return {'low_stock_alerts_sent': total_sent}


def _process_tenant_low_stock(schema_name, settings):
    """Process low stock alerts for a single tenant."""
    from django.db import models as db_models
    from modules.assets.models import InventoryItem
    from shared.utilities.Mailer import Mailer

    sent = 0

    try:
        # Find items at or below minimum quantity
        low_stock_items = InventoryItem.objects.filter(
            is_active=True,
            quantity__lte=db_models.F('minimum_quantity'),
        ).order_by('quantity')

        if not low_stock_items.exists():
            return 0

        # Determine recipients
        notify_emails = settings.low_stock_notification_emails or []
        if not notify_emails:
            # Fall back to admins
            from django.contrib.auth import get_user_model
            User = get_user_model()
            notify_emails = list(
                User.objects.filter(is_active=True, is_staff=True)
                .values_list('email', flat=True)[:5]
            )

        if not notify_emails:
            return 0

        mailer = Mailer()
        company_name = _get_business_context().get('company_name', 'Support Team')

        items_data = []
        for item in low_stock_items[:20]:
            items_data.append({
                'name': item.name,
                'sku': item.sku,
                'quantity': item.quantity,
                'minimum_quantity': item.minimum_quantity,
                'status': 'Out of Stock' if item.quantity <= 0 else 'Low Stock',
                'location': str(item.location) if item.location else '-',
            })

        mailer.send_email(
            template_type='asset_low_stock_alert',
            to_emails=notify_emails,
            context={
                'items': items_data,
                'total_low_stock': low_stock_items.count(),
                'company_name': company_name,
            }
        )
        sent += 1
        logger.info(f"[CRON] Sent low stock alert for {low_stock_items.count()} items in {schema_name}")

    except Exception as e:
        logger.error(f"[CRON] Error processing low stock for {schema_name}: {e}")

    return sent


# =============================================================================
# ASSET DEPRECIATION CALCULATION
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.calculate_asset_depreciation', max_retries=3, default_retry_delay=60)
def calculate_asset_depreciation(self):
    """Recalculate depreciated values for all assets. Runs daily at 2 AM."""
    from shared.utilities.tenant_compat import get_tenant_model, schema_context

    logger.info("[CRON] Starting asset depreciation calculation...")

    from shared.models import Client
    total_updated = 0

    for tenant in Client.objects.filter(is_active=True):
        try:
            with schema_context(tenant.schema_name):
                from modules.assets.models import AssetSettings
                settings = AssetSettings.get_settings()
                if not settings.enable_depreciation:
                    continue

                updated = _process_tenant_depreciation(tenant.schema_name, settings)
                total_updated += updated
        except Exception as e:
            logger.error(f"[CRON] Error calculating depreciation for {tenant.schema_name}: {e}")

    logger.info(f"[CRON] Finished depreciation calculation. Assets updated: {total_updated}")
    return {'assets_depreciation_updated': total_updated}


def _process_tenant_depreciation(schema_name, settings):
    """Calculate depreciation for assets in a single tenant."""
    from django.utils import timezone
    from decimal import Decimal
    from modules.assets.models import Asset

    updated = 0
    today = timezone.now().date()
    method = settings.default_depreciation_method
    useful_life_years = settings.default_useful_life_years or 5

    try:
        # Only depreciate assets with a purchase cost and purchase date
        assets = Asset.objects.filter(
            purchase_cost__isnull=False,
            purchase_date__isnull=False,
            status__in=['active', 'in_stock', 'in_repair', 'in_maintenance'],
        )

        for asset in assets:
            if not asset.purchase_cost or not asset.purchase_date:
                continue

            age_days = (today - asset.purchase_date).days
            if age_days <= 0:
                continue

            useful_life_days = useful_life_years * 365

            if method == 'straight_line':
                # Straight line: equal depreciation each year
                if age_days >= useful_life_days:
                    new_value = Decimal('0.00')
                else:
                    daily_depreciation = asset.purchase_cost / Decimal(str(useful_life_days))
                    depreciation = daily_depreciation * Decimal(str(age_days))
                    new_value = max(Decimal('0.00'), asset.purchase_cost - depreciation)

            elif method == 'declining_balance':
                # Double declining balance
                rate = Decimal('2') / Decimal(str(useful_life_years))
                years_elapsed = Decimal(str(age_days)) / Decimal('365')
                new_value = asset.purchase_cost * (Decimal('1') - rate) ** years_elapsed
                new_value = max(Decimal('0.00'), new_value)
            else:
                continue

            new_value = new_value.quantize(Decimal('0.01'))

            if asset.current_value != new_value:
                asset.current_value = new_value
                asset.save(update_fields=['current_value', 'updated_at'])
                updated += 1

    except Exception as e:
        logger.error(f"[CRON] Error calculating depreciation for {schema_name}: {e}")

    return updated


# =============================================================================
# FREE ACCOUNT EXPIRY CHECK CRON
# =============================================================================

@shared_task(bind=True, name='modules.crons.tasks.check_free_account_expiry', max_retries=3, default_retry_delay=300)
def check_free_account_expiry(self):
    """
    Scheduled task: Check free trial subscriptions for upcoming expiry and expired accounts.
    - Sends reminder emails when trial expires within FREE_ACCOUNT_REMINDER_DAYS (default 5)
    - When trial expires, marks as EXPIRED (grace period begins - 4 days)
    - Sends grace period reminder emails during the grace period
    - After grace period (4 days), deactivates the tenant and sends deactivation notice
    Runs daily at 7:00 AM via Celery Beat.
    """
    from django.conf import settings
    from django.utils import timezone
    from modules.backoffice.models import Subscription
    from shared.models import Client
    from shared.utilities.Mailer import Mailer
    from shared.utilities.templates import GlobalEmailTemplates

    logger.info("[CRON] Starting free account expiry check...")

    reminder_days = getattr(settings, 'FREE_ACCOUNT_REMINDER_DAYS', 5)
    grace_period_days = getattr(settings, 'TRIAL_GRACE_PERIOD_DAYS', 4)
    now = timezone.now()
    reminders_sent = 0
    expired_count = 0
    deactivated_count = 0
    grace_reminders_sent = 0

    try:
        # Helper to build tenant URLs
        def _build_tenant_urls(tenant_schema):
            from django.conf import settings as django_settings
            primary_domain = getattr(django_settings, 'PRIMARY_DOMAIN', 'https://imaradesk.com')
            from urllib.parse import urlparse
            parsed = urlparse(primary_domain)
            scheme = parsed.scheme or 'https'
            base_domain = parsed.netloc or parsed.path
            login_url = f"{scheme}://{tenant_schema}.{base_domain}/login"
            upgrade_url = f"{scheme}://{tenant_schema}.{base_domain}/administration/billing"
            return login_url, upgrade_url

        mailer = Mailer()

        # 1. Handle grace period expiry - deactivate tenants whose grace period has ended
        grace_expired_subs = Subscription.objects.filter(
            status=Subscription.Status.EXPIRED,
            trial_ends_at__lte=now - timezone.timedelta(days=grace_period_days),
        )
        for sub in grace_expired_subs:
            try:
                tenant = Client.objects.get(schema_name=sub.tenant_schema)
                if not tenant.is_active:
                    continue  # Already deactivated

                tenant.is_active = False
                tenant.save(update_fields=['is_active'])
                sub.status = Subscription.Status.SUSPENDED
                sub.save(update_fields=['status'])
                deactivated_count += 1
                logger.info(f"[CRON] Grace period ended: {sub.tenant_schema} - tenant deactivated")

                # Send deactivation email
                if tenant.created_by_email:
                    user_name = tenant.created_by_name or tenant.created_by_email.split('@')[0]
                    login_url, upgrade_url = _build_tenant_urls(sub.tenant_schema)
                    template = GlobalEmailTemplates.TRIAL_DEACTIVATION_NOTICE
                    mailer.send_raw_email(
                        to_email=tenant.created_by_email,
                        subject=template['subject'],
                        body_html=template['body_html'],
                        body_text=template['body_text'],
                        context={
                            'user_name': user_name,
                            'workspace_name': tenant.name,
                            'upgrade_url': upgrade_url,
                        },
                        fail_silently=True,
                    )

            except Client.DoesNotExist:
                logger.warning(f"[CRON] Tenant not found for grace expiry: {sub.tenant_schema}")
            except Exception as e:
                logger.error(f"[CRON] Error deactivating {sub.tenant_schema}: {e}")

        # 2. Handle newly expired trials - mark as EXPIRED (starts grace period)
        newly_expired_subs = Subscription.objects.filter(
            status=Subscription.Status.TRIAL,
            trial_ends_at__lte=now,
        )
        for sub in newly_expired_subs:
            try:
                sub.status = Subscription.Status.EXPIRED
                sub.save(update_fields=['status'])
                expired_count += 1
                logger.info(f"[CRON] Trial expired: {sub.tenant_schema} - entering {grace_period_days}-day grace period")

                # Send grace period start email
                try:
                    tenant = Client.objects.get(schema_name=sub.tenant_schema)
                    if tenant.created_by_email:
                        user_name = tenant.created_by_name or tenant.created_by_email.split('@')[0]
                        login_url, upgrade_url = _build_tenant_urls(sub.tenant_schema)
                        grace_end_date = sub.trial_ends_at + timezone.timedelta(days=grace_period_days)
                        template = GlobalEmailTemplates.TRIAL_GRACE_PERIOD_NOTICE
                        mailer.send_raw_email(
                            to_email=tenant.created_by_email,
                            subject=template['subject'],
                            body_html=template['body_html'],
                            body_text=template['body_text'],
                            context={
                                'user_name': user_name,
                                'workspace_name': tenant.name,
                                'grace_period_days': grace_period_days,
                                'deactivation_date': grace_end_date.strftime('%B %d, %Y'),
                                'upgrade_url': upgrade_url,
                                'login_url': login_url,
                            },
                            fail_silently=True,
                        )
                except Client.DoesNotExist:
                    logger.warning(f"[CRON] Tenant not found for expired sub: {sub.tenant_schema}")

            except Exception as e:
                logger.error(f"[CRON] Error expiring subscription {sub.tenant_schema}: {e}")

        # 3. Send grace period reminder emails for EXPIRED subs still within grace period
        grace_subs = Subscription.objects.filter(
            status=Subscription.Status.EXPIRED,
            trial_ends_at__gt=now - timezone.timedelta(days=grace_period_days),
            trial_ends_at__lte=now,
        )
        for sub in grace_subs:
            try:
                tenant = Client.objects.get(schema_name=sub.tenant_schema)
                if not tenant.created_by_email or not tenant.is_active:
                    continue

                grace_end_date = sub.trial_ends_at + timezone.timedelta(days=grace_period_days)
                days_left = (grace_end_date - now).days
                if days_left < 1:
                    days_left = 1

                user_name = tenant.created_by_name or tenant.created_by_email.split('@')[0]
                login_url, upgrade_url = _build_tenant_urls(sub.tenant_schema)
                template = GlobalEmailTemplates.TRIAL_GRACE_PERIOD_NOTICE
                sent = mailer.send_raw_email(
                    to_email=tenant.created_by_email,
                    subject=template['subject'],
                    body_html=template['body_html'],
                    body_text=template['body_text'],
                    context={
                        'user_name': user_name,
                        'workspace_name': tenant.name,
                        'grace_period_days': days_left,
                        'deactivation_date': grace_end_date.strftime('%B %d, %Y'),
                        'upgrade_url': upgrade_url,
                        'login_url': login_url,
                    },
                    fail_silently=True,
                )
                if sent:
                    grace_reminders_sent += 1

            except Client.DoesNotExist:
                pass
            except Exception as e:
                logger.error(f"[CRON] Error sending grace reminder for {sub.tenant_schema}: {e}")

        # 4. Send reminder emails for trials expiring within reminder_days
        reminder_threshold = now + timezone.timedelta(days=reminder_days)
        expiring_subs = Subscription.objects.filter(
            status=Subscription.Status.TRIAL,
            trial_ends_at__gt=now,
            trial_ends_at__lte=reminder_threshold,
        )

        template = GlobalEmailTemplates.FREE_ACCOUNT_EXPIRY_REMINDER

        for sub in expiring_subs:
            try:
                tenant = Client.objects.get(schema_name=sub.tenant_schema)
                if not tenant.created_by_email:
                    logger.warning(f"[CRON] No admin email for tenant: {sub.tenant_schema}")
                    continue

                days_remaining = (sub.trial_ends_at - now).days
                if days_remaining < 1:
                    days_remaining = 1

                login_url, upgrade_url = _build_tenant_urls(sub.tenant_schema)
                user_name = tenant.created_by_name or tenant.created_by_email.split('@')[0]

                sent = mailer.send_raw_email(
                    to_email=tenant.created_by_email,
                    subject=template['subject'],
                    body_html=template['body_html'],
                    body_text=template['body_text'],
                    context={
                        'user_name': user_name,
                        'workspace_name': tenant.name,
                        'expiry_date': sub.trial_ends_at.strftime('%B %d, %Y'),
                        'days_remaining': days_remaining,
                        'login_url': login_url,
                        'upgrade_url': upgrade_url,
                    },
                    fail_silently=True,
                )

                if sent:
                    reminders_sent += 1
                    logger.info(f"[CRON] Expiry reminder sent to {tenant.created_by_email} ({days_remaining} days left)")
                else:
                    logger.warning(f"[CRON] Failed to send reminder to {tenant.created_by_email}")

            except Client.DoesNotExist:
                logger.warning(f"[CRON] Tenant not found for reminder: {sub.tenant_schema}")
            except Exception as e:
                logger.error(f"[CRON] Error sending reminder for {sub.tenant_schema}: {e}")

        result = {
            'status': 'completed',
            'expired': expired_count,
            'deactivated': deactivated_count,
            'reminders_sent': reminders_sent,
            'grace_reminders_sent': grace_reminders_sent,
        }
        logger.info(f"[CRON] Free account expiry check completed: {result}")
        return result

    except Exception as e:
        logger.error(f"[CRON] Free account expiry check failed: {e}")
        raise self.retry(exc=e)

