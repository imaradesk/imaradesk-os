"""
SLA utility functions for ticket management.
"""
from .models import SLASettings, SLAPolicy, TicketSLA


def enforce_sla_on_ticket(ticket):
    """
    Apply SLA policy to a newly created ticket.
    
    Args:
        ticket: Ticket instance
    
    Returns:
        TicketSLA instance if policy was applied, None otherwise
    """
    # Step 1: Check if SLA is activated globally
    sla_settings = SLASettings.get_settings()
    if not sla_settings.enabled:
        return None
    
    # Step 2: Find policy matching ticket priority
    # Map ticket priority to policy priority
    priority_mapping = {
        'urgent': 'critical',
        'high': 'high',
        'normal': 'medium',
        'low': 'low',
    }
    
    policy_priority = priority_mapping.get(ticket.priority.lower(), 'medium')
    
    # First, try to get an active policy with apply_to_new_tickets=True for this priority
    policy = SLAPolicy.objects.filter(
        priority=policy_priority,
        status='active',
        apply_to_new_tickets=True
    ).first()
    
    # If no policy with apply_to_new_tickets=True, get any active policy with matching priority
    if not policy:
        policy = SLAPolicy.objects.filter(
            priority=policy_priority,
            status='active'
        ).first()
    
    if not policy:
        return None
    
    # Step 3: Create TicketSLA and calculate due dates
    ticket_sla = TicketSLA.objects.create(
        ticket=ticket,
        policy=policy
    )
    
    # Calculate due dates based on policy
    ticket_sla.calculate_due_dates()
    
    return ticket_sla


def send_sla_breach_warning(ticket_sla, breach_type='first_response'):
    """
    Send SLA breach warning email.
    
    Args:
        ticket_sla: TicketSLA instance
        breach_type: 'first_response' or 'resolution'
    """
    from shared.utilities.Mailer import Mailer
    from datetime import datetime, timedelta
    import logging
    
    logger = logging.getLogger(__name__)
    mailer = Mailer()
    
    try:
        ticket = ticket_sla.ticket
        
        # Calculate time remaining
        if breach_type == 'first_response' and ticket_sla.first_response_due:
            due_time = ticket_sla.first_response_due
            template_type = 'sla_breach_warning'
        elif breach_type == 'resolution' and ticket_sla.resolution_due:
            due_time = ticket_sla.resolution_due
            template_type = 'sla_breach_warning'
        else:
            return
        
        time_remaining = due_time - datetime.now(due_time.tzinfo)
        hours_remaining = int(time_remaining.total_seconds() / 3600)
        minutes_remaining = int((time_remaining.total_seconds() % 3600) / 60)
        
        time_str = f"{hours_remaining}h {minutes_remaining}m" if hours_remaining > 0 else f"{minutes_remaining}m"
        
        # Send to assigned agent
        if ticket.assigned_to:
            mailer.send_ticket_email(
                template_type=template_type,
                ticket=ticket,
                to_user=ticket.assigned_to,
                additional_context={
                    'time_remaining': time_str,
                }
            )
    except Exception as e:
        logger.error(f"Failed to send SLA breach warning: {e}")


def send_sla_breach_notification(ticket_sla, breach_type='first_response'):
    """
    Send SLA breach notification email when SLA is actually breached.
    
    Args:
        ticket_sla: TicketSLA instance
        breach_type: 'first_response' or 'resolution'
    """
    from shared.utilities.Mailer import Mailer
    from datetime import datetime
    import logging
    
    logger = logging.getLogger(__name__)
    mailer = Mailer()
    
    try:
        ticket = ticket_sla.ticket
        
        # Determine template and calculate breach time
        if breach_type == 'first_response':
            template_type = 'sla_first_response_breach'
            due_time = ticket_sla.first_response_due
            target_time = ticket_sla.policy.first_response_time
        else:
            template_type = 'sla_resolution_breach'
            due_time = ticket_sla.resolution_due
            target_time = ticket_sla.policy.resolution_time
        
        # Calculate how long it has been since creation
        elapsed = datetime.now(ticket.created_at.tzinfo) - ticket.created_at
        elapsed_hours = int(elapsed.total_seconds() / 3600)
        
        # Send to assigned agent
        if ticket.assigned_to:
            mailer.send_ticket_email(
                template_type=template_type,
                ticket=ticket,
                to_user=ticket.assigned_to,
                additional_context={
                    'target_time': f"{target_time} hours",
                    'elapsed_time': f"{elapsed_hours} hours",
                }
            )
    except Exception as e:
        logger.error(f"Failed to send SLA breach notification: {e}")


def send_sla_escalation_notice(ticket_sla):
    """
    Send SLA escalation notice to admin/manager.
    
    Args:
        ticket_sla: TicketSLA instance
    """
    from shared.utilities.Mailer import Mailer
    from datetime import datetime
    from django.contrib.auth import get_user_model
    import logging
    
    logger = logging.getLogger(__name__)
    mailer = Mailer()
    User = get_user_model()
    
    try:
        ticket = ticket_sla.ticket
        
        # Calculate breach duration
        now = datetime.now(ticket.created_at.tzinfo)
        if ticket_sla.resolution_due:
            breach_time = now - ticket_sla.resolution_due
            breach_hours = int(breach_time.total_seconds() / 3600)
            breach_str = f"{breach_hours} hours"
        else:
            breach_str = "Unknown"
        
        # Get all admins/managers
        admins = User.objects.filter(is_staff=True, is_active=True)
        
        for admin in admins:
            if admin.email:
                mailer.send_ticket_email(
                    template_type='sla_escalation_notice',
                    ticket=ticket,
                    to_user=admin,
                    additional_context={
                        'admin_name': admin.get_full_name(),
                        'assigned_to': ticket.assigned_to.get_full_name() if ticket.assigned_to else 'Unassigned',
                        'breached_duration': breach_str,
                    }
                )
    except Exception as e:
        logger.error(f"Failed to send SLA escalation notice: {e}")