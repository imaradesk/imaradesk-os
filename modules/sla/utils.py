"""
SLA utility functions for ticket management.

This module provides comprehensive SLA policy matching and enforcement for tickets.
It supports both simple priority-based matching and advanced rule evaluation.
"""
from django.utils import timezone
from .models import SLASettings, SLAPolicy, TicketSLA
import logging

logger = logging.getLogger(__name__)

# Priority ordering for policy selection (higher index = higher priority)
POLICY_PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent']

# Mapping from ticket priority to policy priority
TICKET_TO_POLICY_PRIORITY = {
    'urgent': 'urgent',
    'high': 'high',
    'normal': 'medium',
    'low': 'low',
}


def get_active_policies():
    """
    Get all active SLA policies ordered by priority (highest first).
    
    Returns:
        QuerySet: Active SLA policies ordered by priority
    """
    return SLAPolicy.objects.filter(status='active').order_by(
        # Order by priority (urgent > high > medium > low)
        # Using a CASE expression for proper ordering
        '-priority'
    )


def get_ticket_field_value(ticket, field_name):
    """
    Extract the value of a field from a ticket for rule matching.
    
    Args:
        ticket: Ticket instance
        field_name: Name of the field to extract
        
    Returns:
        The field value in a format suitable for comparison
    """
    if field_name == 'priority':
        return ticket.priority.lower() if ticket.priority else ''
    
    elif field_name == 'tag':
        # Tags is a JSONField (list), return as-is for multi-value comparison
        return ticket.tags if ticket.tags else []
    
    elif field_name == 'assignment_group':
        # Return the group ID as string for comparison
        return str(ticket.group_id) if ticket.group_id else ''
    
    elif field_name == 'type':
        return ticket.type.lower() if ticket.type else ''
    
    elif field_name == 'channel':
        # Check both source and channel relationship
        if ticket.channel:
            return ticket.channel.slug.lower() if hasattr(ticket.channel, 'slug') else ticket.channel.name.lower()
        return ticket.source.lower() if ticket.source else ''
    
    elif field_name == 'requester_type':
        # Determine if requester is customer or employee
        if ticket.requester:
            # Check if the requester is a staff member (employee)
            if ticket.requester.is_staff:
                return 'employee'
            return 'customer'
        elif ticket.is_guest_ticket:
            return 'customer'
        return ''
    
    # Fallback: try to get the attribute directly
    return getattr(ticket, field_name, '')


def evaluate_rule_condition(ticket, rule):
    """
    Evaluate a single rule condition against a ticket.
    
    Args:
        ticket: Ticket instance
        rule: Rule dict with keys: field, operator, value
        
    Returns:
        bool: True if the rule matches, False otherwise
    """
    field = rule.get('field', '')
    operator = rule.get('operator', 'equals')
    rule_value = str(rule.get('value', '')).lower().strip()
    
    ticket_value = get_ticket_field_value(ticket, field)
    
    # Handle tag field specially (it's a list)
    if field == 'tag':
        # ticket_value is a list of tags
        tags_lower = [str(t).lower().strip() for t in ticket_value] if ticket_value else []
        
        if operator == 'equals':
            return rule_value in tags_lower
        elif operator == 'not_equals':
            return rule_value not in tags_lower
        elif operator == 'contains':
            return any(rule_value in tag for tag in tags_lower)
        elif operator == 'not_contains':
            return not any(rule_value in tag for tag in tags_lower)
        elif operator == 'is_empty':
            return len(tags_lower) == 0
        elif operator == 'is_not_empty':
            return len(tags_lower) > 0
        else:
            return False
    
    # Convert ticket value to string for comparison
    ticket_value_str = str(ticket_value).lower().strip() if ticket_value else ''
    
    # Evaluate based on operator
    if operator == 'equals':
        return ticket_value_str == rule_value
    
    elif operator == 'not_equals':
        return ticket_value_str != rule_value
    
    elif operator == 'contains':
        return rule_value in ticket_value_str
    
    elif operator == 'not_contains':
        return rule_value not in ticket_value_str
    
    elif operator == 'starts_with':
        return ticket_value_str.startswith(rule_value)
    
    elif operator == 'ends_with':
        return ticket_value_str.endswith(rule_value)
    
    elif operator == 'is_empty':
        return ticket_value_str == ''
    
    elif operator == 'is_not_empty':
        return ticket_value_str != ''
    
    # Unknown operator - default to false
    return False


def evaluate_custom_rules(ticket, policy):
    """
    Evaluate all custom rules for a policy against a ticket.
    
    Args:
        ticket: Ticket instance
        policy: SLAPolicy instance with custom rules
        
    Returns:
        bool: True if all rules match (for AND) or any rule matches (for OR)
    """
    rules = policy.custom_rules or []
    
    if not rules:
        # No rules defined - this shouldn't happen but return False to be safe
        return False
    
    logic = policy.rules_logic.upper() if policy.rules_logic else 'AND'
    
    results = []
    for rule in rules:
        result = evaluate_rule_condition(ticket, rule)
        results.append(result)
        logger.debug(f"Rule evaluation: {rule} -> {result}")
    
    if logic == 'AND':
        return all(results)
    else:  # OR
        return any(results)


def policy_matches_ticket(policy, ticket):
    """
    Check if a policy matches a ticket based on its configuration.
    
    For Simple Mode (use_custom_rules=False):
        - Policy matches if the ticket priority matches the policy priority
          (get_active_policies already restricts this to active policies)
    
    For Advanced Mode (use_custom_rules=True):
        - Policy matches if all custom rules evaluate to True (AND) or any rule (OR)
    
    Args:
        policy: SLAPolicy instance
        ticket: Ticket instance
        
    Returns:
        bool: True if policy matches the ticket
    """
    if policy.use_custom_rules:
        # Advanced mode: evaluate custom rules
        return evaluate_custom_rules(ticket, policy)
    else:
        # Simple mode: match based on priority
        # Map ticket priority to policy priority format
        ticket_priority = ticket.priority.lower() if ticket.priority else 'normal'
        policy_priority_expected = TICKET_TO_POLICY_PRIORITY.get(ticket_priority, 'medium')
        
        return policy.priority.lower() == policy_priority_expected


def get_matching_policies(ticket):
    """
    Find all SLA policies that match a ticket.
    
    Args:
        ticket: Ticket instance
        
    Returns:
        list: List of matching SLAPolicy instances
    """
    active_policies = get_active_policies()
    matching = []
    
    for policy in active_policies:
        if policy_matches_ticket(policy, ticket):
            matching.append(policy)
            logger.debug(f"Policy '{policy.name}' matches ticket {ticket.ticket_number}")
    
    return matching


def select_highest_priority_policy(matching_policies):
    """
    Select the best policy from a list of matching policies.
    
    Selection rules (in order of precedence):
    1. Advanced rules policies take precedence over simple mode policies
       (they are more specific/targeted)
    2. Among policies of the same type, higher priority wins
       Priority order: urgent > high > medium > low
    
    Args:
        matching_policies: List of SLAPolicy instances
        
    Returns:
        SLAPolicy: The best matching policy, or None if list is empty
    """
    if not matching_policies:
        return None
    
    if len(matching_policies) == 1:
        return matching_policies[0]
    
    # Separate advanced rules policies from simple mode policies
    advanced_policies = [p for p in matching_policies if p.use_custom_rules]
    simple_policies = [p for p in matching_policies if not p.use_custom_rules]
    
    # Priority sort key function
    def priority_sort_key(policy):
        priority = policy.priority.lower() if policy.priority else 'low'
        try:
            return POLICY_PRIORITY_ORDER.index(priority)
        except ValueError:
            return -1  # Unknown priority goes last
    
    # Prefer advanced rules policies (more specific)
    if advanced_policies:
        # Sort by priority and pick highest
        sorted_policies = sorted(advanced_policies, key=priority_sort_key, reverse=True)
        selected = sorted_policies[0]
        logger.info(f"Selected advanced rules policy '{selected.name}' (priority: {selected.priority}) from {len(matching_policies)} matching policies")
        return selected
    
    # Fall back to simple mode policies
    sorted_policies = sorted(simple_policies, key=priority_sort_key, reverse=True)
    selected = sorted_policies[0]
    
    logger.info(f"Selected simple mode policy '{selected.name}' (priority: {selected.priority}) from {len(matching_policies)} matching policies")
    
    return selected


def find_best_policy_for_ticket(ticket):
    """
    Find the best SLA policy for a ticket.
    
    This function:
    1. Gets all matching policies (simple mode or advanced rules)
    2. If multiple match, selects the one with highest priority
    
    Args:
        ticket: Ticket instance
        
    Returns:
        SLAPolicy: Best matching policy, or None if no match
    """
    matching_policies = get_matching_policies(ticket)
    
    if not matching_policies:
        logger.debug(f"No SLA policies match ticket {ticket.ticket_number}")
        return None
    
    return select_highest_priority_policy(matching_policies)


def enforce_sla_on_ticket(ticket, start_time=None):
    """
    Apply SLA policy to a newly created ticket.
    
    This function:
    1. Checks if SLA is globally enabled
    2. Finds matching policies based on simple mode (priority) or advanced rules
    3. If multiple policies match, picks the one with highest priority
    4. Creates TicketSLA record and calculates due dates
    
    Args:
        ticket: Ticket instance
        start_time: When the SLA clock starts (defaults to ticket creation)
    
    Returns:
        TicketSLA instance if policy was applied, None otherwise
    """
    # Drafts are not live tickets yet, the clock starts when they are submitted
    if ticket.status == 'draft':
        return None

    # Step 1: Check if SLA is activated globally
    sla_settings = SLASettings.get_settings()
    if not sla_settings.enabled:
        logger.debug("SLA is globally disabled, skipping policy enforcement")
        return None
    
    # Step 2: Check if ticket already has an SLA attached
    if hasattr(ticket, 'sla') and ticket.sla:
        logger.debug(f"Ticket {ticket.ticket_number} already has SLA attached")
        return ticket.sla
    
    # Step 3: Find the best matching policy
    policy = find_best_policy_for_ticket(ticket)
    
    if not policy:
        logger.debug(f"No matching SLA policy found for ticket {ticket.ticket_number}")
        return None
    
    logger.info(f"Applying SLA policy '{policy.name}' to ticket {ticket.ticket_number}")
    
    # Step 4: Create TicketSLA and calculate due dates
    ticket_sla = TicketSLA.objects.create(
        ticket=ticket,
        policy=policy
    )
    
    # Calculate due dates based on policy
    ticket_sla.calculate_due_dates(start_time=start_time)
    
    return ticket_sla


def reassign_sla_on_ticket_update(ticket, old_priority=None):
    """
    Re-evaluate and potentially reassign SLA when ticket is updated.
    
    This is called when ticket properties change (e.g., priority, tags, group)
    and the SLA might need to be updated based on new policy matches.
    
    Args:
        ticket: Ticket instance
        old_priority: Previous priority value (optional)
        
    Returns:
        TicketSLA instance if policy was changed/applied, None otherwise
    """
    # Check if SLA is globally enabled
    sla_settings = SLASettings.get_settings()
    if not sla_settings.enabled:
        return None
    
    if ticket.status == 'draft':
        return None

    # Finished or merged tickets keep the SLA outcome they already have,
    # restarting it would only manufacture a breach on a ticket nobody is working
    if ticket.status in ('resolved', 'closed') or ticket.merged_into_id:
        return getattr(ticket, 'sla', None)

    # Find best matching policy for updated ticket
    new_policy = find_best_policy_for_ticket(ticket)
    
    # Check if ticket already has SLA
    existing_sla = getattr(ticket, 'sla', None)
    now = timezone.now()
    
    if not new_policy:
        # The ticket no longer matches any policy, so the old SLA must not keep running
        if existing_sla:
            existing_sla.delete()
            logger.info(f"Removed SLA from ticket {ticket.ticket_number}: no policy matches anymore")
        return None
    
    if existing_sla:
        # Only update if the new policy is different
        if existing_sla.policy_id == new_policy.id:
            return existing_sla
        
        old_policy = existing_sla.policy
        existing_sla.restart(new_policy, start_time=now)
        _log_sla_restart(ticket, old_policy, new_policy, old_priority)
        logger.info(
            f"Restarted SLA for ticket {ticket.ticket_number}: "
            f"'{old_policy.name}' -> '{new_policy.name}'"
        )
        return existing_sla
    else:
        # The ticket had no SLA until now, so its clock starts now as well
        ticket_sla = TicketSLA.objects.create(
            ticket=ticket,
            policy=new_policy,
            first_responded_at=_first_public_agent_reply_at(ticket),
        )
        ticket_sla.calculate_due_dates(start_time=now)
        logger.info(f"Applied SLA policy '{new_policy.name}' to ticket {ticket.ticket_number}")
        return ticket_sla


def _first_public_agent_reply_at(ticket):
    """
    When an agent first replied publicly, so a ticket gaining an SLA late
    doesn't wait for a response it already received. None if nobody has.
    """
    reply = (
        ticket.comments
        .filter(is_internal=False, author__isnull=False)
        .exclude(author_id=ticket.requester_id)
        .order_by('created_at')
        .first()
    )
    return reply.created_at if reply else None


def _log_sla_restart(ticket, old_policy, new_policy, old_priority=None):
    """Record the restart on the ticket's activity history."""
    from modules.ticket.models import ActivityStream

    try:
        reason = ''
        if old_priority and old_priority != ticket.priority:
            labels = dict(ticket.Priority.choices)
            reason = (
                f" after the priority changed from "
                f"{labels.get(old_priority, old_priority)} to {ticket.get_priority_display()}"
            )
        ActivityStream.objects.create(
            ticket=ticket,
            activity_type=ActivityStream.ActivityType.TICKET_UPDATED,
            description=(
                f"SLA restarted{reason}: now following \"{new_policy.name}\", "
                f"targets count from this change"
            ),
            metadata={
                'sla_restart': True,
                'old_policy': old_policy.name,
                'new_policy': new_policy.name,
                'old_priority': old_priority,
                'new_priority': ticket.priority,
            },
        )
    except Exception as e:
        logger.error(f"Failed to log SLA restart for ticket {ticket.ticket_number}: {e}")


def record_first_response(comment):
    """
    Stop the first-response clock when an agent replies publicly.

    Internal notes and the requester's own messages don't count. If the reply
    came after the due time the response SLA is marked as breached.
    """
    from django.utils import timezone

    if comment.is_internal or not comment.author_id:
        return None

    ticket = comment.ticket
    if comment.author_id == ticket.requester_id:
        return None

    ticket_sla = getattr(ticket, 'sla', None)
    if not ticket_sla or ticket_sla.first_responded_at:
        return ticket_sla

    now = timezone.now()
    ticket_sla.first_responded_at = now
    if ticket_sla.response_due_at and now > ticket_sla.response_due_at:
        ticket_sla.response_breached = True
    ticket_sla.save(update_fields=['first_responded_at', 'response_breached', 'updated_at'])
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
        if breach_type == 'first_response' and ticket_sla.response_due_at:
            due_time = ticket_sla.response_due_at
            template_type = 'sla_breach_warning'
        elif breach_type == 'resolution' and ticket_sla.resolution_due_at:
            due_time = ticket_sla.resolution_due_at
            template_type = 'sla_breach_warning'
        else:
            return
        
        time_remaining = due_time - datetime.now(due_time.tzinfo)
        hours_remaining = int(time_remaining.total_seconds() / 3600)
        minutes_remaining = int((time_remaining.total_seconds() % 3600) / 60)
        
        time_str = f"{hours_remaining}h {minutes_remaining}m" if hours_remaining > 0 else f"{minutes_remaining}m"
        
        # Send to assigned agent
        if ticket.assignee:
            mailer.send_ticket_email(
                template_type=template_type,
                ticket=ticket,
                to_user=ticket.assignee,
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
            due_time = ticket_sla.response_due_at
            target_time = ticket_sla.policy.first_response_time
        else:
            template_type = 'sla_resolution_breach'
            due_time = ticket_sla.resolution_due_at
            target_time = ticket_sla.policy.resolution_time
        
        # Calculate how long it has been since creation
        elapsed = timezone.now() - ticket_sla.clock_started_at
        elapsed_minutes = int(elapsed.total_seconds() / 60)
        
        # Send to assigned agent
        if ticket.assignee:
            mailer.send_ticket_email(
                template_type=template_type,
                ticket=ticket,
                to_user=ticket.assignee,
                additional_context={
                    'target_time': SLAPolicy._format_minutes(target_time),
                    'elapsed_time': SLAPolicy._format_minutes(elapsed_minutes),
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
        if ticket_sla.resolution_due_at:
            breach_time = now - ticket_sla.resolution_due_at
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
                        'assigned_to': ticket.assignee.get_full_name() if ticket.assignee else 'Unassigned',
                        'breached_duration': breach_str,
                    }
                )
    except Exception as e:
        logger.error(f"Failed to send SLA escalation notice: {e}")