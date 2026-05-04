from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import connection
from shared.models import Client
from .models import TicketComment, TicketAttachment, ActivityStream, Ticket
from modules.ticket.tasks import (
    send_ticket_email_task,
    send_guest_email_task,
    send_comment_notification_task,
    send_mention_notification_task,
    send_ticket_merged_notification_task,
    send_group_assignment_notification_task,
    send_survey_to_ticket_caller_task,
)
import logging

logger = logging.getLogger(__name__)


def get_current_schema():
    """Get the current tenant schema name."""
    return 'default'


def get_notification_settings():
    """Get notification settings (cached per request if possible)."""
    try:
        from modules.settings.models import NotificationSettings
        return NotificationSettings.get_settings()
    except Exception as e:
        logger.error(f"Failed to get notification settings: {e}")
        return None


def is_notification_enabled(setting_name):
    """Check if a specific notification is enabled."""
    settings = get_notification_settings()
    if settings is None:
        return True  # Default to enabled if settings unavailable
    return getattr(settings, setting_name, True)


def get_guest_email_context(ticket, extra_context=None):
    """Build common context for guest email notifications."""
    from django.conf import settings as django_settings
    from django.db import connection
    
    # Get company name from current tenant
    try:
        company_name = Client.get_current().name
    except Exception:
        company_name = 'Support Team'
    
    # Build ticket URL
    base_url = getattr(django_settings, 'SITE_URL', '')
    ticket_url = f"{base_url}/portal/track/{ticket.ticket_number}" if base_url else ''
    
    recipient_name = ticket.guest_name or ticket.guest_email.split('@')[0]
    
    context = {
        'customer_name': recipient_name,
        'ticket_number': ticket.ticket_number,
        'ticket_subject': ticket.title,
        'ticket_url': ticket_url,
        'company_name': company_name,
    }
    
    if extra_context:
        context.update(extra_context)
    
    return context


# Store original values before save for change detection
_ticket_original_values = {}


@receiver(pre_save, sender=Ticket)
def store_original_ticket_values(sender, instance, **kwargs):
    """Store original values before save to detect changes."""
    if instance.pk:
        try:
            original = Ticket.objects.get(pk=instance.pk)
            _ticket_original_values[instance.pk] = {
                'status': original.status,
                'priority': original.priority,
                'assignee_id': original.assignee_id,
                'group_id': original.group_id,
                'tags': original.tags.copy() if original.tags else [],
                'type': original.type,
            }
        except Ticket.DoesNotExist:
            pass


@receiver(post_save, sender=Ticket)
def enforce_sla_on_new_ticket(sender, instance, created, **kwargs):
    """Automatically apply SLA policy to newly created tickets."""
    if created:
        try:
            from modules.sla.utils import enforce_sla_on_ticket
            enforce_sla_on_ticket(instance)
        except Exception as e:
            logger.error(f"Failed to apply SLA to ticket {instance.ticket_number}: {str(e)}")


@receiver(post_save, sender=Ticket)
def reevaluate_sla_on_ticket_update(sender, instance, created, **kwargs):
    """
    Re-evaluate SLA policy when ticket properties change.
    
    This handles cases where:
    - Ticket priority changes (needs different SLA policy)
    - Ticket group changes (may trigger different advanced rules)
    - Ticket tags change (may trigger different advanced rules)
    - Ticket type changes (may trigger different advanced rules)
    """
    if created:
        return  # New tickets are handled by enforce_sla_on_new_ticket
    
    # Get original values
    original = _ticket_original_values.get(instance.pk)
    if not original:
        return
    
    # Check if any SLA-relevant fields changed
    sla_relevant_changed = (
        original['priority'] != instance.priority or
        original['group_id'] != instance.group_id or
        original['tags'] != (instance.tags or []) or
        original['type'] != instance.type
    )
    
    if not sla_relevant_changed:
        return
    
    try:
        from modules.sla.utils import reassign_sla_on_ticket_update
        reassign_sla_on_ticket_update(instance, old_priority=original['priority'])
        logger.info(f"Re-evaluated SLA for ticket {instance.ticket_number} after property change")
    except Exception as e:
        logger.error(f"Failed to re-evaluate SLA for ticket {instance.ticket_number}: {str(e)}")


@receiver(post_save, sender=Ticket)
def send_ticket_notifications(sender, instance, created, **kwargs):
    """
    Centralized email notifications for ticket events.
    Checks NotificationSettings before sending any email.
    Emails are sent as background tasks for better UI responsiveness.
    """
    schema_name = get_current_schema()
    
    try:
        if created:
            # === NEW TICKET CREATED ===
            if is_notification_enabled('notify_new_ticket_created'):
                # Send to requester (or guest email)
                if instance.requester:
                    send_ticket_email_task.delay(
                        schema_name=schema_name,
                        template_type='ticket_created',
                        ticket_id=instance.id,
                        to_user_id=instance.requester.id
                    )
                    logger.info(f"Queued ticket_created email to requester for {instance.ticket_number}")
                elif instance.is_guest_ticket and instance.guest_email:
                    # Send to guest email
                    send_guest_email_task.delay(
                        schema_name=schema_name,
                        template_type='ticket_created',
                        to_email=instance.guest_email,
                        context=get_guest_email_context(instance, {
                            'ticket_priority': instance.get_priority_display(),
                            'ticket_status': instance.get_status_display(),
                        })
                    )
                    logger.info(f"Queued ticket_created email to guest {instance.guest_email} for {instance.ticket_number}")
            
            # === TICKET ASSIGNED (on creation) ===
            if instance.assignee and is_notification_enabled('notify_ticket_assigned'):
                send_ticket_email_task.delay(
                    schema_name=schema_name,
                    template_type='new_ticket_notice',
                    ticket_id=instance.id,
                    to_user_id=instance.assignee.id
                )
                logger.info(f"Queued new_ticket_notice email to assignee for {instance.ticket_number}")
            
            # === GROUP ASSIGNED (on creation) ===
            if instance.group and is_notification_enabled('notify_ticket_group_assigned'):
                send_group_assignment_notification_task.delay(
                    schema_name=schema_name,
                    ticket_id=instance.id,
                    group_id=instance.group.id
                )
                logger.info(f"Queued group assignment email for {instance.ticket_number} to group {instance.group.name}")
        else:
            # Get original values for change detection
            original = _ticket_original_values.pop(instance.pk, None)
            if not original:
                return
            
            # === STATUS CHANGED ===
            if original['status'] != instance.status:
                if is_notification_enabled('notify_ticket_status_changed'):
                    # Notify requester about status change
                    if instance.requester:
                        send_ticket_email_task.delay(
                            schema_name=schema_name,
                            template_type='ticket_status_changed',
                            ticket_id=instance.id,
                            to_user_id=instance.requester.id,
                            additional_context={
                                'old_status': original['status'],
                                'new_status': instance.status,
                            }
                        )
                        logger.info(f"Queued status_changed email for {instance.ticket_number}")
                    elif instance.is_guest_ticket and instance.guest_email:
                        send_guest_email_task.delay(
                            schema_name=schema_name,
                            template_type='ticket_status_changed',
                            to_email=instance.guest_email,
                            context=get_guest_email_context(instance, {
                                'old_status': original['status'],
                                'new_status': instance.status,
                            })
                        )
                
                # === TICKET RESOLVED ===
                if instance.status == 'resolved' and original['status'] != 'resolved':
                    _handle_ticket_resolved(instance, schema_name)
            
            # === PRIORITY CHANGED ===
            if original['priority'] != instance.priority:
                if is_notification_enabled('notify_ticket_priority_changed'):
                    # Notify requester about priority change
                    if instance.requester:
                        send_ticket_email_task.delay(
                            schema_name=schema_name,
                            template_type='ticket_priority_changed',
                            ticket_id=instance.id,
                            to_user_id=instance.requester.id,
                            additional_context={
                                'old_priority': original['priority'],
                                'new_priority': instance.priority,
                            }
                        )
                        logger.info(f"Queued priority_changed email for {instance.ticket_number}")
            
            # === TICKET REASSIGNED ===
            if original['assignee_id'] != instance.assignee_id:
                if instance.assignee:
                    # Check if this is reassignment (had previous assignee) or first assignment
                    if original['assignee_id']:
                        # Reassignment
                        if is_notification_enabled('notify_ticket_reassigned'):
                            send_ticket_email_task.delay(
                                schema_name=schema_name,
                                template_type='ticket_assigned',
                                ticket_id=instance.id,
                                to_user_id=instance.assignee.id,
                                additional_context={
                                    'is_reassignment': True,
                                }
                            )
                            logger.info(f"Queued reassignment email for {instance.ticket_number}")
                    else:
                        # First assignment
                        if is_notification_enabled('notify_ticket_assigned'):
                            send_ticket_email_task.delay(
                                schema_name=schema_name,
                                template_type='ticket_assigned',
                                ticket_id=instance.id,
                                to_user_id=instance.assignee.id
                            )
                            logger.info(f"Queued assignment email for {instance.ticket_number}")
            
            # === GROUP REASSIGNED ===
            # This is grouped test
            if original['group_id'] != instance.group_id:
                if instance.group and is_notification_enabled('notify_ticket_group_assigned'):
                    send_group_assignment_notification_task.delay(
                        schema_name=schema_name,
                        ticket_id=instance.id,
                        group_id=instance.group.id
                    )
                    logger.info(f"Queued group assignment email for {instance.ticket_number} to group {instance.group.name}")
    except Exception as e:
        logger.error(f"Failed to queue ticket notification: {e}")


def _handle_ticket_resolved(instance, schema_name):
    """Handle ticket resolved - send notifications and trigger survey."""
    # Notify requester (as background task)
    if instance.requester:
        send_ticket_email_task.delay(
            schema_name=schema_name,
            template_type='ticket_resolved',
            ticket_id=instance.id,
            to_user_id=instance.requester.id
        )
    elif instance.is_guest_ticket and instance.guest_email:
        send_guest_email_task.delay(
            schema_name=schema_name,
            template_type='ticket_resolved',
            to_email=instance.guest_email,
            context=get_guest_email_context(instance)
        )
    
    # Trigger survey if surveys app is installed and active
    try:
        logger.info(f"[SURVEY] Starting survey trigger process for ticket {instance.ticket_number}")
        
        from modules.settings.models import InstalledApp
        
        try:
            installed_app = InstalledApp.objects.select_related('app').get(
                app__slug='surveys',
                is_active=True
            )
            logger.info(f"[SURVEY] Surveys app found - subscription_status: {installed_app.subscription_status}")
        except InstalledApp.DoesNotExist:
            logger.info(f"[SURVEY] Surveys app NOT installed or not active")
            return
        
        # Check if trial expired
        if installed_app.subscription_status == 'trial' and installed_app.is_trial_expired:
            installed_app.subscription_status = 'expired'
            installed_app.save(update_fields=['subscription_status'])
            logger.info(f"[SURVEY] Surveys app trial expired")
            return
        
        if installed_app.subscription_status == 'expired':
            logger.info(f"[SURVEY] Surveys app subscription expired")
            return
        
        # App is valid - check if surveys are enabled in settings
        from modules.surveys.models import SurveySettings
        settings = SurveySettings.get_settings()
        
        if not settings.enabled:
            logger.info(f"[SURVEY] Surveys disabled in settings")
            return
        
        # Send survey using ticket.caller (works for both registered users and guests)
        # send_survey_to_ticket_caller_task is already imported at the top from modules.ticket.tasks
        send_survey_to_ticket_caller_task.delay(
            schema_name=schema_name,
            ticket_id=instance.id
        )
        logger.info(f"[SURVEY] Queued survey task for ticket {instance.ticket_number}")
        
    except Exception as survey_error:
        logger.error(f"[SURVEY] Failed to trigger survey: {survey_error}")

        # @TODO: This is to add another test


@receiver(post_save, sender=TicketComment)
def create_comment_activity(sender, instance, created, **kwargs):
    """Create activity stream entry when a comment is added."""
    if created:
        # Get actor name - use guest_name for guest/Telegram tickets when author is None
        if instance.author:
            actor_name = instance.author.get_full_name() or instance.author.username
        elif instance.ticket.is_guest_ticket and instance.ticket.guest_name:
            actor_name = instance.ticket.guest_name
        else:
            actor_name = "Guest"
        
        description = f"Comment added by {actor_name}"
        
        if instance.is_internal:
            description = f"Internal note added by {actor_name}"
        
        ActivityStream.objects.create(
            ticket=instance.ticket,
            activity_type=ActivityStream.ActivityType.COMMENT_ADDED,
            actor=instance.author,
            description=description,
            metadata={
                'comment_id': instance.id,
                'is_internal': instance.is_internal,
                'has_attachments': len(instance.attachments) > 0
            }
        )


@receiver(post_save, sender=TicketComment)
def send_comment_notifications(sender, instance, created, **kwargs):
    """Send email notifications for comments based on notification settings (as background tasks)."""
    if not created:
        return
    
    # Check if comment notifications are enabled
    if not is_notification_enabled('notify_new_comment'):
        return
    
    schema_name = get_current_schema()
    
    try:
        ticket = instance.ticket
        
        # For internal notes, only notify agents
        if instance.is_internal:
            if ticket.assignee and instance.author != ticket.assignee:
                send_comment_notification_task.delay(
                    schema_name=schema_name,
                    ticket_id=ticket.id,
                    comment_id=instance.id,
                    notification_type='internal'
                )
        else:
            # For public comments
            # If customer commented, notify agent
            if instance.author == ticket.requester:
                if ticket.assignee:
                    send_comment_notification_task.delay(
                        schema_name=schema_name,
                        ticket_id=ticket.id,
                        comment_id=instance.id,
                        notification_type='customer_to_agent'
                    )
            # If agent commented, notify customer
            else:
                send_comment_notification_task.delay(
                    schema_name=schema_name,
                    ticket_id=ticket.id,
                    comment_id=instance.id,
                    notification_type='agent_to_customer'
                )
    except Exception as e:
        logger.error(f"Failed to queue comment notification: {e}")


@receiver(post_save, sender=TicketComment)
def send_mention_notifications(sender, instance, created, **kwargs):
    """Send email notifications when users are mentioned in comments (as background tasks)."""
    if not created:
        return
    
    # Check if mention notifications are enabled
    if not is_notification_enabled('notify_ticket_mentioned'):
        return
    
    # Check if there are any mentions
    if not instance.mentions.exists():
        return
    
    schema_name = get_current_schema()
    
    try:
        for mentioned_user in instance.mentions.all():
            # Don't notify the author
            if mentioned_user == instance.author:
                continue
            
            send_mention_notification_task.delay(
                schema_name=schema_name,
                ticket_id=instance.ticket.id,
                comment_id=instance.id,
                mentioned_user_id=mentioned_user.id
            )
            logger.info(f"Queued mention notification to {mentioned_user.username} for ticket {instance.ticket.ticket_number}")
    except Exception as e:
        logger.error(f"Failed to queue mention notification: {e}")


@receiver(post_save, sender=TicketComment)
def send_telegram_notification(sender, instance, created, **kwargs):
    """Send Telegram notification when agent replies to a Telegram-sourced ticket."""
    if not created:
        return
    
    try:
        # Skip internal notes
        if instance.is_internal:
            return
        
        # Only for Telegram-sourced tickets
        if instance.ticket.source != 'telegram':
            return
        
        # Skip messages that came from Telegram (prefixed with [Telegram])
        if instance.message.startswith('[Telegram]'):
            return
        
        # This is an agent reply - send to Telegram
        from modules.integrations.views.telegram import send_ticket_reply_to_telegram
        
        success = send_ticket_reply_to_telegram(
            ticket=instance.ticket,
            comment_text=instance.message,
            is_resolution=False
        )
        
        if success:
            logger.info(f"Sent Telegram notification for comment on ticket {instance.ticket.ticket_number}")
        
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")


@receiver(post_save, sender=Ticket)
def send_telegram_resolution_notification(sender, instance, **kwargs):
    """Send Telegram notification when a ticket is resolved."""
    try:
        # Only for Telegram-sourced tickets
        if instance.source != 'telegram':
            return
        
        # Check if status changed to resolved
        if instance.status not in ['resolved', 'closed']:
            return
        
        # Get original status to check if it changed
        if instance.pk:
            try:
                original = Ticket.objects.get(pk=instance.pk)
                if original.status in ['resolved', 'closed']:
                    return  # Already was resolved/closed
            except Ticket.DoesNotExist:
                return
        
        from modules.integrations.views.telegram import send_ticket_reply_to_telegram
        
        resolution_message = "Your support request has been resolved. Thank you for contacting us!"
        
        # Use resolution comment if available
        last_comment = instance.comments.filter(is_internal=False).last()
        if last_comment and not last_comment.message.startswith('[Telegram]'):
            resolution_message = last_comment.message
        
        success = send_ticket_reply_to_telegram(
            ticket=instance,
            comment_text=resolution_message,
            is_resolution=True
        )
        
        if success:
            logger.info(f"Sent Telegram resolution notification for ticket {instance.ticket_number}")
        
    except Exception as e:
        logger.error(f"Failed to send Telegram resolution notification: {e}")


@receiver(post_save, sender=TicketAttachment)
def create_attachment_activity(sender, instance, created, **kwargs):
    """Create activity stream entry when an attachment is added."""
    if created:
        # Check if uploaded by a user, otherwise check if guest ticket
        if instance.uploaded_by:
            actor_name = instance.uploaded_by.get_full_name()
        elif instance.ticket.is_guest_ticket and instance.ticket.guest_name:
            actor_name = instance.ticket.guest_name
        elif instance.ticket.caller:
            actor_name = instance.ticket.caller.get_full_name()
        else:
            actor_name = "Customer"
        
        ActivityStream.objects.create(
            ticket=instance.ticket,
            activity_type=ActivityStream.ActivityType.ATTACHMENT_ADDED,
            actor=instance.uploaded_by,
            description=f"A file was attached to ticket by {actor_name}",
            metadata={
                'attachment_id': instance.id,
                'file_name': instance.file_name,
                'file_type': instance.file_type,
                'file_size': instance.file_size
            }
        )


# ============================================
# Utility function for sending ticket merged notification
# ============================================

def send_ticket_merged_notification(primary_ticket, merged_tickets, merged_by=None):
    """
    Send notification when tickets are merged (as background tasks).
    Call this function from the merge view/action.
    """
    if not is_notification_enabled('notify_ticket_merged'):
        return
    
    schema_name = get_current_schema()
    
    try:
        # Notify requesters of merged tickets
        for merged_ticket in merged_tickets:
            send_ticket_merged_notification_task.delay(
                schema_name=schema_name,
                primary_ticket_id=primary_ticket.id,
                merged_ticket_id=merged_ticket.id,
                merged_by_id=merged_by.id if merged_by else None
            )
        logger.info(f"Queued merge notifications for ticket {primary_ticket.ticket_number}")
    except Exception as e:
        logger.error(f"Failed to queue ticket merged notification: {e}")
