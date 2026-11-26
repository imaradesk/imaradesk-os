import logging

logger = logging.getLogger(__name__)


# =============================================================================
# SHARED HELPER FUNCTIONS
# =============================================================================

def _get_business_context():
    """Business name and base URL used in emails."""
    from shared.utilities.organization import organization_name, site_url

    return {
        'company_name': organization_name('Support'),
        'base_url': site_url(),
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


def _send_escalation_email(mailer, ticket, ticket_sla, business_context=None):
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
        logger.warning(f"[CRON] SLA escalation template not found")
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


def _send_breach_email(mailer, ticket, ticket_sla, business_context=None):
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
        logger.warning(f"[CRON] SLA breached template not found")
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


def _send_admin_escalation_email(mailer, ticket, ticket_sla, admin_user, business_context=None):
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
        logger.warning(f"[CRON] SLA escalation template not found")
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
