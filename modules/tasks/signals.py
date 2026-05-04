"""
Task signals - Handle task events and notifications.

This module provides:
- Change detection for tasks (status, assignee, priority, etc.)
- Email notification triggers
- Activity stream updates

Similar pattern to ticket signals for consistency.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import connection
from modules.tasks.models import Task, TaskComment
from modules.tasks.tasks import (
    send_task_email_task,
    send_task_comment_notification_task,
    send_task_mention_notification_task,
)
import logging
import re

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


# Store original values before save for change detection
_task_original_values = {}


@receiver(pre_save, sender=Task)
def store_original_task_values(sender, instance, **kwargs):
    """Store original values before save to detect changes."""
    if instance.pk:
        try:
            original = Task.objects.get(pk=instance.pk)
            _task_original_values[instance.pk] = {
                'status': original.status,
                'priority': original.priority,
                'assignee_id': original.assignee_id,
                'group_id': original.group_id,
                'due_date': original.due_date,
            }
        except Task.DoesNotExist:
            pass


@receiver(post_save, sender=Task)
def send_task_notifications(sender, instance, created, **kwargs):
    """
    Centralized email notifications for task events.
    Checks NotificationSettings before sending any email.
    Emails are sent as background tasks for better UI responsiveness.
    """
    schema_name = get_current_schema()
    
    try:
        if created:
            # === NEW TASK ASSIGNED ===
            if instance.assignee and is_notification_enabled('notify_task_assigned'):
                send_task_email_task.delay(
                    schema_name=schema_name,
                    template_type='new_task_alert',
                    task_id=instance.id,
                    to_user_id=instance.assignee.id,
                    additional_context={
                        'assignee_name': instance.assignee.get_full_name(),
                        'due_date': instance.due_date.strftime('%Y-%m-%d') if instance.due_date else 'Not set',
                        'assigned_by': instance.created_by.get_full_name() if instance.created_by else 'System',
                    }
                )
                logger.info(f"Queued new_task_alert email to assignee for task {instance.id}")
            
            # Notify watchers on creation
            if instance.pk:
                for watcher in instance.watchers.all():
                    if watcher != instance.assignee:
                        send_task_email_task.delay(
                            schema_name=schema_name,
                            template_type='new_task_alert',
                            task_id=instance.id,
                            to_user_id=watcher.id,
                            additional_context={
                                'assignee_name': watcher.get_full_name(),
                                'due_date': instance.due_date.strftime('%Y-%m-%d') if instance.due_date else 'Not set',
                                'assigned_by': instance.created_by.get_full_name() if instance.created_by else 'System',
                            }
                        )
        else:
            # Get original values for change detection
            original = _task_original_values.pop(instance.pk, None)
            if not original:
                return
            
            # === STATUS CHANGED ===
            if original['status'] != instance.status:
                if is_notification_enabled('notify_task_status_changed'):
                    # Notify assignee about status change
                    if instance.assignee:
                        send_task_email_task.delay(
                            schema_name=schema_name,
                            template_type='task_status_changed',
                            task_id=instance.id,
                            to_user_id=instance.assignee.id,
                            additional_context={
                                'assignee_name': instance.assignee.get_full_name(),
                                'old_status': original['status'],
                                'new_status': instance.status,
                                'updated_by': 'System',  # TODO: Pass actual user
                            }
                        )
                        logger.info(f"Queued status_changed email for task {instance.id}")
                    
                    # Notify watchers
                    for watcher in instance.watchers.exclude(id=instance.assignee_id if instance.assignee else 0):
                        send_task_email_task.delay(
                            schema_name=schema_name,
                            template_type='task_status_changed',
                            task_id=instance.id,
                            to_user_id=watcher.id,
                            additional_context={
                                'assignee_name': watcher.get_full_name(),
                                'old_status': original['status'],
                                'new_status': instance.status,
                                'updated_by': 'System',
                            }
                        )
            
            # === TASK REASSIGNED ===
            if original['assignee_id'] != instance.assignee_id:
                if instance.assignee and is_notification_enabled('notify_task_assigned'):
                    send_task_email_task.delay(
                        schema_name=schema_name,
                        template_type='new_task_alert',
                        task_id=instance.id,
                        to_user_id=instance.assignee.id,
                        additional_context={
                            'assignee_name': instance.assignee.get_full_name(),
                            'due_date': instance.due_date.strftime('%Y-%m-%d') if instance.due_date else 'Not set',
                            'assigned_by': 'System',  # Could be enhanced to track who made the change
                        }
                    )
                    logger.info(f"Queued assignment email for task {instance.id}")
                    
    except Exception as e:
        logger.error(f"Failed to queue task notification: {e}")


@receiver(post_save, sender=TaskComment)
def send_task_comment_notifications(sender, instance, created, **kwargs):
    """
    Send notifications for new task comments.
    """
    if not created:
        return
    
    schema_name = get_current_schema()
    task = instance.task
    
    try:
        # Check if comment notifications are enabled
        if not is_notification_enabled('notify_task_comment'):
            return
        
        # Queue comment notification
        send_task_comment_notification_task.delay(
            schema_name=schema_name,
            task_id=task.id,
            comment_id=instance.id
        )
        logger.info(f"Queued comment notification for task {task.id}")
        
        # Check for mentions and send mention notifications
        if is_notification_enabled('notify_task_mentioned'):
            _process_task_mentions(instance, schema_name)
            
    except Exception as e:
        logger.error(f"Failed to queue task comment notification: {e}")


def _process_task_mentions(comment, schema_name):
    """Extract @mentions from comment and send notifications."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Find all @mentions in the comment message
    mention_pattern = r'@(\w+)'
    matches = re.findall(mention_pattern, comment.message)
    
    if not matches:
        return
    
    # Find users by username
    for username in matches:
        try:
            mentioned_user = User.objects.get(username=username)
            
            # Don't notify the comment author
            if mentioned_user == comment.author:
                continue
            
            send_task_mention_notification_task.delay(
                schema_name=schema_name,
                task_id=comment.task_id,
                comment_id=comment.id,
                mentioned_user_id=mentioned_user.id
            )
            logger.info(f"Queued mention notification for user {username} in task {comment.task_id}")
            
        except User.DoesNotExist:
            logger.debug(f"Mentioned user @{username} not found")
