"""
Centralized Celery scheduled tasks (crons).

This module contains all scheduled tasks that run via Celery Beat.
Each task is a wrapper that calls the actual implementation in
the respective module.

Tasks:
- SLA breach warnings and handling
- Auto-close resolved tickets
- Weekly performance reports
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


# =============================================================================
# WEEKLY REPORTS CRON
# =============================================================================

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_weekly_performance_reports(self):
    """
    Scheduled task: Send weekly performance reports via email.
    Runs every Sunday at midnight (00:00).
    
    This task sends a weekly summary of team performance metrics
    to configured recipients (from NotificationSettings.weekly_report_email).
    """
    from django.db import connection
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    from modules.settings.models import NotificationSettings
    
    logger.info("[CRON] Starting weekly performance reports...")
    
    try:
        TenantModel = get_tenant_model()
        tenants_processed = 0
        reports_sent = 0
        
        # Process each tenant
        for tenant in TenantModel.objects.exclude(schema_name='public'):
            with tenant_context(tenant):
                try:
                    settings = NotificationSettings.get_settings()
                    
                    # Check if weekly report is enabled and email is configured
                    if settings.weekly_performance_report and settings.weekly_report_email:
                        # TODO: Implement actual report generation and sending
                        # - Gather metrics (tickets created, resolved, avg response time, etc.)
                        # - Generate report HTML/PDF
                        # - Send email using Mailer
                        
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

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_sla_breach_warnings(self):
    """
    Scheduled task: Check for tickets approaching SLA breach and send warnings.
    Runs every 5 minutes.
    
    For each tenant:
    1. Check if SLA is enabled and notifications are enabled
    2. Find tickets with SLA that are approaching breach (within notify_before_breach minutes)
    3. Send warning email to group members (if ticket has group) or assignee
    4. Mark the ticket SLA as warning sent to avoid duplicate notifications
    """
    from django.db import connection
    from django.utils import timezone
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    from datetime import timedelta
    
    logger.info("[CRON] Starting SLA breach warning check...")
    
    try:
        TenantModel = get_tenant_model()
        tenants_processed = 0
        warnings_sent = 0
        
        # Process each tenant
        for tenant in TenantModel.objects.exclude(schema_name='public'):
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


def _process_tenant_sla_warnings(tenant_schema):
    """
    Process SLA warnings for a single tenant.
    
    Returns:
        Number of warnings sent
    """
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
    
    # Check if SLA is enabled and notifications are turned on
    sla_settings = SLASettings.get_settings()
    logger.info(f"[SLA-WARNING] SLA Settings - enabled: {sla_settings.enabled}, send_notifications: {sla_settings.send_notifications}")
    
    if not sla_settings.enabled:
        logger.info(f"[SLA-WARNING] SKIPPING - SLA is disabled for tenant {tenant_schema}")
        return 0
    
    if not sla_settings.send_notifications:
        logger.info(f"[SLA-WARNING] SKIPPING - SLA notifications disabled for tenant {tenant_schema}")
        return 0
    
    # Get the email template (cached for this tenant)
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
    
    # Cache business profile for email context
    business_context = _get_business_context()
    
    mailer = Mailer()
    
    # First, check what TicketSLAs exist at all
    all_ticket_slas = TicketSLA.objects.select_related('ticket', 'policy').all()
    logger.info(f"[SLA-WARNING] Total TicketSLA records: {all_ticket_slas.count()}")
    
    for ts in all_ticket_slas:
        logger.info(f"[SLA-WARNING] TicketSLA #{ts.id}: ticket=#{ts.ticket.ticket_number if ts.ticket else 'N/A'}, "
                   f"status={ts.ticket.status if ts.ticket else 'N/A'}, "
                   f"on_hold={ts.is_on_hold}, "
                   f"resolution_due_at={ts.resolution_due_at}, "
                   f"resolution_breached={ts.resolution_breached}, "
                   f"breach_warning_sent={ts.breach_warning_sent_resolution}, "
                   f"policy_notify_before={ts.policy.notify_before_breach if ts.policy else 0}")
    
    # Optimized query: Filter at database level
    # Only get tickets that:
    # - Are not on hold
    # - Have active status
    # - Not merged
    # - Have resolution_due_at set
    # - Not already breached
    # - Warning not already sent
    # - Policy has notify_before_breach > 0
    ticket_slas = TicketSLA.objects.select_related(
        'ticket', 'policy'
    ).prefetch_related(
        'ticket__group__members__user',  # Prefetch group members for recipients
    ).only(
        'id', 'resolution_due_at', 'resolution_breached', 'breach_warning_sent_resolution',
        'is_on_hold',
        'ticket__id', 'ticket__ticket_number', 'ticket__title', 'ticket__priority',
        'ticket__status', 'ticket__merged_into', 'ticket__assignee_id', 'ticket__group_id',
        'policy__id', 'policy__notify_before_breach'
    ).filter(
        is_on_hold=False,
        ticket__status__in=['new', 'open', 'in_progress', 'pending'],
        ticket__merged_into__isnull=True,  # Not merged
        resolution_due_at__isnull=False,
        resolution_breached=False,
        breach_warning_sent_resolution=False,
        policy__notify_before_breach__gt=0,
        # Due time is in the future but within max warning window (e.g., 24 hours)
        resolution_due_at__gt=now,
        resolution_due_at__lte=now + timedelta(hours=24)  # Reasonable max threshold
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
        
        # Check if within this specific policy's warning threshold
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


def _get_business_context():
    """
    Get cached business context for emails.
    
    Returns:
        dict with company_name, base_url
    """
    from django.conf import settings
    from shared.models import Client
    
    try:
        org = Client.get_current()
        company_name = org.name if org else 'Support'
    except Exception:
        company_name = 'Support'
    
    return {
        'company_name': company_name,
        'base_url': getattr(settings, 'SITE_URL', 'https://imaradesk.com')
    }


def _get_warning_recipients(ticket):
    """
    Get list of email recipients for SLA warning.
    
    Priority:
    1. If ticket has a group, return all group members' emails (uses prefetched data)
    2. If ticket has an assignee, return assignee's email
    3. Return empty list (skip notification)
    
    Returns:
        List of (email, name) tuples
    """
    recipients = []
    
    if ticket.group_id and hasattr(ticket, 'group') and ticket.group:
        # Use prefetched group members if available
        try:
            members = ticket.group.members.all()  # Uses prefetch cache if available
            for profile in members:
                if profile.user.is_active and profile.user.email:
                    name = f"{profile.user.first_name} {profile.user.last_name}".strip() or profile.user.username
                    recipients.append((profile.user.email, name))
        except Exception:
            pass
    
    if not recipients and ticket.assignee_id:
        # Assignee fallback - may need to fetch
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


def _send_sla_warning_email(mailer, template, ticket, ticket_sla, sla_type, time_remaining, recipients, business_context=None):
    """
    Send SLA breach warning email to recipients.
    
    Args:
        mailer: Mailer instance
        template: EmailTemplate instance
        ticket: Ticket instance
        ticket_sla: TicketSLA instance
        sla_type: 'First Response' or 'Resolution'
        time_remaining: timedelta until breach
        recipients: List of (email, name) tuples
        business_context: Optional cached business context dict
    """
    # Format time remaining
    total_seconds = int(time_remaining.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    
    if hours > 0:
        time_str = f"{hours}h {minutes}m"
    else:
        time_str = f"{minutes} minutes"
    
    # Use cached business context or fetch
    if business_context is None:
        business_context = _get_business_context()
    
    ticket_url = f"{business_context['base_url']}/tickets/{ticket.id}"
    company_name = business_context['company_name']
    
    for email, name in recipients:
        try:
            # Prepare context
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
            
            # Render template - returns tuple (subject, body_html, body_text)
            rendered_subject, rendered_html, rendered_text = template.render(context)
            
            # Send email
            mailer.send_raw_email(
                to_email=email,
                subject=rendered_subject or f'SLA Breach Warning - Ticket #{ticket.ticket_number}',
                html_content=rendered_html or '',
                text_content=rendered_text or '',
            )
            
            logger.info(f"[CRON] Sent SLA warning email to {email} for ticket #{ticket.ticket_number}")
            
        except Exception as e:
            logger.error(f"[CRON] Failed to send SLA warning email to {email}: {e}")


# =============================================================================
# SLA BREACH HANDLING CRON
# =============================================================================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def handle_sla_breaches(self):
    """
    Scheduled task: Handle tickets that have breached SLA.
    Runs every 5 minutes.
    
    For each tenant:
    1. Find tickets where resolution SLA is breached
    2. If policy has send_escalation_emails ON: send escalation and breach emails
    3. If policy has auto_assign_on_breach ON: assign to an Administrator
    4. If NotificationSettings.notify_ticket_reassigned is ON and auto-assigned: send reassignment email
    """
    from django.db import connection
    from django.utils import timezone
    from shared.utilities.tenant_compat import get_tenant_model, tenant_context
    
    logger.info("[CRON] Starting SLA breach handling...")
    
    try:
        TenantModel = get_tenant_model()
        tenants_processed = 0
        breaches_handled = 0
        
        # Process each tenant
        for tenant in TenantModel.objects.exclude(schema_name='public'):
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


def _process_tenant_sla_breaches(tenant_schema):
    """
    Process SLA breaches for a single tenant.
    
    Returns:
        Number of breaches handled
    """
    from django.utils import timezone
    from django.db.models import Q
    from modules.sla.models import SLASettings, TicketSLA
    from modules.settings.models import EmailTemplate, NotificationSettings
    from shared.utilities.Mailer import Mailer
    
    breaches_handled = 0
    now = timezone.now()
    
    logger.info(f"[SLA-BREACH] Processing tenant: {tenant_schema}")
    logger.info(f"[SLA-BREACH] Current time: {now}")
    
    # Check if SLA is enabled
    sla_settings = SLASettings.get_settings()
    logger.info(f"[SLA-BREACH] SLA Settings - enabled: {sla_settings.enabled}")
    
    if not sla_settings.enabled:
        logger.info(f"[SLA-BREACH] SKIPPING - SLA is disabled for tenant {tenant_schema}")
        return 0
    
    # Get notification settings (cached)
    notification_settings = NotificationSettings.get_settings()
    
    # Cache business context for emails
    business_context = _get_business_context()
    
    # Cache admin user for auto-assignment (only fetch once per tenant)
    admin_user = None
    admin_user_fetched = False
    
    mailer = Mailer()
    
    # First, check what TicketSLAs exist that could be breached
    all_ticket_slas = TicketSLA.objects.select_related('ticket', 'policy').all()
    logger.info(f"[SLA-BREACH] Total TicketSLA records: {all_ticket_slas.count()}")
    
    for ts in all_ticket_slas:
        is_past_due = ts.resolution_due_at and ts.resolution_due_at < now
        logger.info(f"[SLA-BREACH] TicketSLA #{ts.id}: ticket=#{ts.ticket.ticket_number if ts.ticket else 'N/A'}, "
                   f"status={ts.ticket.status if ts.ticket else 'N/A'}, "
                   f"on_hold={ts.is_on_hold}, "
                   f"resolution_due_at={ts.resolution_due_at}, "
                   f"is_past_due={is_past_due}, "
                   f"escalation_sent={ts.escalation_email_sent}, "
                   f"breach_sent={ts.breach_email_sent}, "
                   f"auto_assigned={ts.auto_assigned_on_breach}, "
                   f"policy_send_escalation={ts.policy.send_escalation_emails if ts.policy else False}, "
                   f"policy_auto_assign={ts.policy.auto_assign_on_breach if ts.policy else False}")
    
    # Optimized query: Only fetch tickets that are:
    # - Not on hold
    # - Active status
    # - Not merged
    # - Resolution due date has passed (breached)
    # - Have pending actions (emails not sent OR auto-assign not done)
    ticket_slas = TicketSLA.objects.select_related(
        'ticket', 'policy'
    ).prefetch_related(
        'ticket__group__members__user',  # Prefetch for recipients
    ).only(
        'id', 'resolution_due_at', 'resolution_breached', 'is_on_hold',
        'escalation_email_sent', 'breach_email_sent', 'auto_assigned_on_breach',
        'ticket__id', 'ticket__ticket_number', 'ticket__title', 'ticket__priority',
        'ticket__status', 'ticket__merged_into', 'ticket__assignee_id', 'ticket__group_id',
        'policy__id', 'policy__name', 'policy__send_escalation_emails', 'policy__auto_assign_on_breach'
    ).filter(
        is_on_hold=False,
        ticket__status__in=['new', 'open', 'in_progress', 'pending'],
        ticket__merged_into__isnull=True,  # Not merged
        resolution_due_at__isnull=False,
        resolution_due_at__lt=now,  # Past due = breached
    ).filter(
        # Only get tickets with pending actions
        Q(escalation_email_sent=False, policy__send_escalation_emails=True) |
        Q(breach_email_sent=False, policy__send_escalation_emails=True) |
        Q(auto_assigned_on_breach=False, policy__auto_assign_on_breach=True)
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
        
        # Mark as breached if not already (single update)
        if not ticket_sla.resolution_breached:
            ticket_sla.resolution_breached = True
            logger.info(f"[SLA-BREACH] Marked ticket #{ticket.ticket_number} as breached")
        
        handled = False
        
        # Handle escalation emails
        if policy.send_escalation_emails and not ticket_sla.escalation_email_sent:
            logger.info(f"[SLA-BREACH] Sending escalation email for ticket #{ticket.ticket_number}")
            _send_escalation_email(mailer, ticket, ticket_sla, tenant_schema, business_context)
            ticket_sla.escalation_email_sent = True
            handled = True
        else:
            logger.info(f"[SLA-BREACH] SKIPPING escalation email for #{ticket.ticket_number}: "
                       f"send_escalation_emails={policy.send_escalation_emails}, already_sent={ticket_sla.escalation_email_sent}")
        
        # Send breach email
        if policy.send_escalation_emails and not ticket_sla.breach_email_sent:
            logger.info(f"[SLA-BREACH] Sending breach email for ticket #{ticket.ticket_number}")
            _send_breach_email(mailer, ticket, ticket_sla, tenant_schema, business_context)
            ticket_sla.breach_email_sent = True
            handled = True
        else:
            logger.info(f"[SLA-BREACH] SKIPPING breach email for #{ticket.ticket_number}: "
                       f"send_escalation_emails={policy.send_escalation_emails}, already_sent={ticket_sla.breach_email_sent}")
        
        # Handle auto-assignment to admin
        if policy.auto_assign_on_breach and not ticket_sla.auto_assigned_on_breach:
            # Lazy fetch admin user (only once per tenant)
            if not admin_user_fetched:
                admin_user = _get_admin_user()
                admin_user_fetched = True
                logger.info(f"[SLA-BREACH] Admin user for auto-assign: {admin_user.username if admin_user else 'NOT FOUND'}")
            
            if admin_user:
                old_assignee = ticket.assignee if hasattr(ticket, 'assignee') else None
                ticket.assignee = admin_user
                ticket.save(update_fields=['assignee'])
                ticket_sla.auto_assigned_on_breach = True
                handled = True
                
                logger.info(f"[SLA-BREACH] Auto-assigned ticket #{ticket.ticket_number} to admin {admin_user.username}")
                
                # Send reassignment email if enabled
                if notification_settings.notify_ticket_reassigned:
                    logger.info(f"[SLA-BREACH] Sending reassignment email for ticket #{ticket.ticket_number}")
                    _send_reassignment_email(mailer, ticket, admin_user, old_assignee, tenant_schema, business_context)
            else:
                logger.warning(f"[SLA-BREACH] SKIPPING auto-assign for #{ticket.ticket_number} - No admin user found")
        else:
            logger.info(f"[SLA-BREACH] SKIPPING auto-assign for #{ticket.ticket_number}: "
                       f"auto_assign_on_breach={policy.auto_assign_on_breach}, already_assigned={ticket_sla.auto_assigned_on_breach}")
        
        if handled:
            ticket_sla.save(update_fields=['resolution_breached', 'escalation_email_sent', 'breach_email_sent', 'auto_assigned_on_breach'])
            breaches_handled += 1
            logger.info(f"[SLA-BREACH] SUCCESS - Handled SLA breach for ticket #{ticket.ticket_number}")
        else:
            logger.info(f"[SLA-BREACH] No actions taken for ticket #{ticket.ticket_number} (all already handled)")
    
    logger.info(f"[SLA-BREACH] Tenant {tenant_schema} completed - {breaches_handled} breaches handled")
    return breaches_handled


def _get_admin_user():
    """
    Get an Administrator user for auto-assignment.
    Uses optimized single query with join.
    
    Returns:
        User instance or None
    """
    from django.contrib.auth import get_user_model
    from modules.users.models import UserProfile
    
    User = get_user_model()
    
    try:
        # Single optimized query: join UserProfile -> Role -> User
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
    
    # Use cached business context or fetch
    if business_context is None:
        business_context = _get_business_context()
    
    ticket_url = f"{business_context['base_url']}/tickets/{ticket.id}"
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
                html_content=rendered_html or '',
                text_content=rendered_text or '',
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
    
    # Use cached business context or fetch
    if business_context is None:
        business_context = _get_business_context()
    
    ticket_url = f"{business_context['base_url']}/tickets/{ticket.id}"
    company_name = business_context['company_name']
    
    # Calculate how long overdue
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
                html_content=rendered_html or '',
                text_content=rendered_text or '',
            )
            
            logger.info(f"[CRON] Sent breach email to {email} for ticket #{ticket.ticket_number}")
            
        except Exception as e:
            logger.error(f"[CRON] Failed to send breach email to {email}: {e}")


def _send_reassignment_email(mailer, ticket, new_assignee, old_assignee, tenant_schema, business_context=None):
    """Send ticket reassignment notification email."""
    from modules.settings.models import EmailTemplate
    
    try:
        template = EmailTemplate.objects.only(
            'id', 'subject', 'body_html', 'body_text'
        ).get(
            template_type='ticket_assigned',
            status='active'
        )
    except EmailTemplate.DoesNotExist:
        logger.warning(f"[CRON] Ticket assigned template not found for tenant {tenant_schema}")
        return
    
    if not new_assignee.email:
        return
    
    # Use cached business context or fetch
    if business_context is None:
        business_context = _get_business_context()
    
    ticket_url = f"{business_context['base_url']}/tickets/{ticket.id}"
    company_name = business_context['company_name']
    
    new_name = f"{new_assignee.first_name} {new_assignee.last_name}".strip() or new_assignee.username
    old_name = None
    if old_assignee:
        old_name = f"{old_assignee.first_name} {old_assignee.last_name}".strip() or old_assignee.username
    
    try:
        context = {
            'agent_name': new_name,
            'ticket_number': ticket.ticket_number or f"#{ticket.id}",
            'ticket_subject': ticket.title,
            'ticket_priority': ticket.get_priority_display(),
            'ticket_url': ticket_url,
            'company_name': company_name,
            'assigned_by': 'System (SLA Breach Auto-Assignment)',
            'previous_assignee': old_name or 'Unassigned',
        }
        
        rendered_subject, rendered_html, rendered_text = template.render(context)
        
        mailer.send_raw_email(
            to_email=new_assignee.email,
            subject=rendered_subject or f'Ticket Assigned - #{ticket.ticket_number}',
            html_content=rendered_html or '',
            text_content=rendered_text or '',
        )
        
        logger.info(f"[CRON] Sent reassignment email to {new_assignee.email} for ticket #{ticket.ticket_number}")
        
    except Exception as e:
        logger.error(f"[CRON] Failed to send reassignment email: {e}")


# =============================================================================
# AUTO-CLOSE RESOLVED TICKETS
# =============================================================================

@shared_task(bind=True)
def auto_close_resolved_tickets(self):
    """
    Scheduled task: Auto-close tickets that have been resolved for more than 1 hour.
    
    Loops through all active tenants and queues ticket closing tasks where:
    - status = 'resolved'
    - resolved_at is older than 1 hour
    
    Runs every 30 minutes.
    """
    from shared.utilities.tenant_compat import get_public_schema_name
    from shared.models import Client
    
    logger.info("[CRON] Starting auto-close resolved tickets task...")
    
    # Get all active tenants
    tenants = Client.objects.filter(is_active=True).exclude(
        schema_name=get_public_schema_name()
    )
    
    tenants_processed = 0
    tickets_queued = 0
    
    for tenant in tenants:
        try:
            queued = _queue_tickets_for_closing(tenant.schema_name)
            tickets_queued += queued
            tenants_processed += 1
        except Exception as e:
            logger.error(f"[CRON] Error processing tenant {tenant.schema_name}: {e}")
    
    logger.info(f"[CRON] Auto-close scan completed. Tenants: {tenants_processed}, Tickets queued: {tickets_queued}")
    return {'tenants_processed': tenants_processed, 'tickets_queued': tickets_queued}


def _queue_tickets_for_closing(schema_name):
    """
    Find resolved tickets older than 1 hour and queue them for closing.
    
    Returns count of tickets queued.
    """
    from django.utils import timezone
    from datetime import timedelta
    from shared.utilities.tenant_compat import schema_context
    from modules.ticket.models import Ticket
    
    # Close tickets resolved more than 1 hour ago
    cutoff_time = timezone.now() - timedelta(hours=1)
    
    with schema_context(schema_name):
        # Find resolved tickets older than cutoff
        resolved_ticket_ids = list(Ticket.objects.filter(
            status='resolved',
            resolved_at__lte=cutoff_time
        ).values_list('id', flat=True))
        
        count = len(resolved_ticket_ids)
        
        if count > 0:
            # Queue each ticket for closing as a separate task
            for ticket_id in resolved_ticket_ids:
                close_single_ticket_task.delay(schema_name, ticket_id)
            logger.info(f"[CRON] Queued {count} tickets for closing in {schema_name}")
        
        return count


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def close_single_ticket_task(self, schema_name, ticket_id):
    """
    Close a single resolved ticket.
    
    Args:
        schema_name: Tenant schema name
        ticket_id: ID of the ticket to close
    """
    from shared.utilities.tenant_compat import schema_context
    from modules.ticket.models import Ticket
    
    try:
        with schema_context(schema_name):
            ticket = Ticket.objects.get(id=ticket_id)
            
            # Only close if still resolved (might have been reopened)
            if ticket.status == 'resolved':
                ticket.status = 'closed'
                ticket.save(update_fields=['status'])
                logger.info(f"[CRON] Closed ticket #{ticket.ticket_number} in {schema_name}")
                return {'status': 'closed', 'ticket_id': ticket_id}
            else:
                logger.info(f"[CRON] Ticket #{ticket.ticket_number} status changed to {ticket.status}, skipping")
                return {'status': 'skipped', 'ticket_id': ticket_id, 'reason': 'status_changed'}
                
    except Ticket.DoesNotExist:
        logger.warning(f"[CRON] Ticket {ticket_id} not found in {schema_name}")
        return {'status': 'error', 'ticket_id': ticket_id, 'reason': 'not_found'}
    except Exception as e:
        logger.error(f"[CRON] Error closing ticket {ticket_id}: {e}")
        raise self.retry(exc=e)
