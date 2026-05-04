"""
Celery tasks for task operations.

This module contains EVENT-TRIGGERED task background tasks:
- Email notifications (task assigned, status changed, comments, etc.)
- Due date reminders
- Overdue notifications

Scheduled/periodic tasks are in modules/crons/tasks.py:
- check_tasks_due_soon: daily 8 AM
- check_overdue_tasks: daily 9 AM
"""
import logging
from celery import shared_task
from shared.utilities.tenant_compat import schema_context

logger = logging.getLogger(__name__)


# =============================================================================
# TASK EMAIL NOTIFICATION TASKS
# =============================================================================

@shared_task(bind=True, name='modules.tasks.tasks.send_task_email_task', max_retries=3, default_retry_delay=60, rate_limit='10/m')
def send_task_email_task(self, schema_name, template_type, task_id, to_user_id=None, additional_context=None):
    """
    Send task-related email notification in background.
    
    Args:
        schema_name: Tenant schema name for database context
        template_type: Email template type (e.g., 'new_task_alert', 'task_status_changed')
        task_id: ID of the task
        to_user_id: ID of the recipient user (optional)
        additional_context: Additional context for the email template
    """
    from modules.tasks.models import Task
    from shared.utilities.Mailer import Mailer
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        with schema_context(schema_name):
            task = Task.objects.get(id=task_id)
            to_user = User.objects.get(id=to_user_id) if to_user_id else None
            
            if not to_user:
                logger.warning(f"No recipient user for task {task_id} email")
                return {'status': 'error', 'message': 'No recipient user'}
            
            mailer = Mailer()
            mailer.send_task_email(
                template_type=template_type,
                task=task,
                to_user=to_user,
                additional_context=additional_context or {}
            )
            logger.info(f"Sent {template_type} email for task {task.id}")
            return {'status': 'success', 'task_id': task.id}
        
    except Task.DoesNotExist:
        logger.error(f"Task {task_id} not found for email task")
        return {'status': 'error', 'message': 'Task not found'}
    except User.DoesNotExist:
        logger.error(f"User {to_user_id} not found for email task")
        return {'status': 'error', 'message': 'User not found'}
    except Exception as e:
        logger.error(f"Failed to send {template_type} email: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.tasks.tasks.send_task_comment_notification_task', max_retries=3, default_retry_delay=60)
def send_task_comment_notification_task(self, schema_name, task_id, comment_id):
    """
    Send comment notification email for a task in background.
    
    Args:
        schema_name: Tenant schema name for database context
        task_id: ID of the task
        comment_id: ID of the comment
    """
    from modules.tasks.models import Task, TaskComment
    from shared.utilities.Mailer import Mailer
    
    try:
        with schema_context(schema_name):
            task = Task.objects.get(id=task_id)
            comment = TaskComment.objects.get(id=comment_id)
            mailer = Mailer()
            
            comment_preview = comment.message[:200] + '...' if len(comment.message) > 200 else comment.message
            
            # Notify task assignee if comment is from someone else
            if task.assignee and comment.author != task.assignee:
                mailer.send_task_email(
                    template_type='task_comment',
                    task=task,
                    to_user=task.assignee,
                    additional_context={
                        'comment_by': comment.author.get_full_name() if comment.author else 'Unknown',
                        'comment_content': comment_preview,
                        'recipient_name': task.assignee.get_full_name(),
                    }
                )
            
            # Notify task creator if different from assignee and comment author
            if task.created_by and task.created_by != task.assignee and task.created_by != comment.author:
                mailer.send_task_email(
                    template_type='task_comment',
                    task=task,
                    to_user=task.created_by,
                    additional_context={
                        'comment_by': comment.author.get_full_name() if comment.author else 'Unknown',
                        'comment_content': comment_preview,
                        'recipient_name': task.created_by.get_full_name(),
                    }
                )
            
            # Notify watchers
            for watcher in task.watchers.exclude(id__in=[comment.author_id, task.assignee_id if task.assignee else 0]).iterator():
                mailer.send_task_email(
                    template_type='task_comment',
                    task=task,
                    to_user=watcher,
                    additional_context={
                        'comment_by': comment.author.get_full_name() if comment.author else 'Unknown',
                        'comment_content': comment_preview,
                        'recipient_name': watcher.get_full_name(),
                    }
                )
            
            logger.info(f"Sent comment notification for task {task.id}")
            return {'status': 'success', 'task_id': task.id}
        
    except (Task.DoesNotExist, TaskComment.DoesNotExist) as e:
        logger.error(f"Task or comment not found for notification task: {e}")
        return {'status': 'error', 'message': str(e)}
    except Exception as e:
        logger.error(f"Failed to send task comment notification: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.tasks.tasks.send_task_mention_notification_task', max_retries=3, default_retry_delay=60)
def send_task_mention_notification_task(self, schema_name, task_id, comment_id, mentioned_user_id):
    """
    Send mention notification email for a task in background.
    
    Args:
        schema_name: Tenant schema name for database context
        task_id: ID of the task
        comment_id: ID of the comment containing the mention
        mentioned_user_id: ID of the mentioned user
    """
    from modules.tasks.models import Task, TaskComment
    from shared.utilities.Mailer import Mailer
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        with schema_context(schema_name):
            task = Task.objects.get(id=task_id)
            comment = TaskComment.objects.get(id=comment_id)
            mentioned_user = User.objects.get(id=mentioned_user_id)
            
            mailer = Mailer()
            mailer.send_task_email(
                template_type='task_mentioned',
                task=task,
                to_user=mentioned_user,
                additional_context={
                    'mentioned_user': mentioned_user.get_full_name(),
                    'mentioned_by': comment.author.get_full_name() if comment.author else 'Someone',
                    'mention_context': comment.message[:200] + '...' if len(comment.message) > 200 else comment.message,
                }
            )
            logger.info(f"Sent task mention notification to {mentioned_user.username} for task {task.id}")
            return {'status': 'success', 'user': mentioned_user.username}
        
    except (Task.DoesNotExist, TaskComment.DoesNotExist, User.DoesNotExist) as e:
        logger.error(f"Object not found for task mention notification: {e}")
        return {'status': 'error', 'message': str(e)}
    except Exception as e:
        logger.error(f"Failed to send task mention notification: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.tasks.tasks.send_task_due_soon_notification_task', max_retries=3, default_retry_delay=60)
def send_task_due_soon_notification_task(self, schema_name, task_id):
    """
    Send due soon reminder notification for a task.
    
    Args:
        schema_name: Tenant schema name for database context
        task_id: ID of the task
    """
    from modules.tasks.models import Task
    from shared.utilities.Mailer import Mailer
    from django.utils import timezone
    
    try:
        with schema_context(schema_name):
            task = Task.objects.get(id=task_id)
            
            if not task.assignee or not task.due_date:
                return {'status': 'skipped', 'reason': 'no_assignee_or_due_date'}
            
            # Calculate time remaining
            now = timezone.now().date()
            days_remaining = (task.due_date - now).days
            if days_remaining < 0:
                time_remaining = 'Overdue'
            elif days_remaining == 0:
                time_remaining = 'Today'
            elif days_remaining == 1:
                time_remaining = 'Tomorrow'
            else:
                time_remaining = f'{days_remaining} days'
            
            mailer = Mailer()
            mailer.send_task_email(
                template_type='task_due_soon',
                task=task,
                to_user=task.assignee,
                additional_context={
                    'assignee_name': task.assignee.get_full_name(),
                    'due_date': task.due_date.strftime('%Y-%m-%d'),
                    'time_remaining': time_remaining,
                }
            )
            logger.info(f"Sent due soon notification for task {task.id}")
            return {'status': 'success', 'task_id': task.id}
        
    except Task.DoesNotExist:
        logger.error(f"Task {task_id} not found for due soon notification")
        return {'status': 'error', 'message': 'Task not found'}
    except Exception as e:
        logger.error(f"Failed to send task due soon notification: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.tasks.tasks.send_task_overdue_notification_task', max_retries=3, default_retry_delay=60)
def send_task_overdue_notification_task(self, schema_name, task_id):
    """
    Send overdue notification for a task.
    
    Args:
        schema_name: Tenant schema name for database context
        task_id: ID of the task
    """
    from modules.tasks.models import Task
    from shared.utilities.Mailer import Mailer
    from django.utils import timezone
    
    try:
        with schema_context(schema_name):
            task = Task.objects.get(id=task_id)
            
            if not task.assignee or not task.due_date:
                return {'status': 'skipped', 'reason': 'no_assignee_or_due_date'}
            
            # Calculate overdue time
            now = timezone.now().date()
            days_overdue = (now - task.due_date).days
            if days_overdue == 1:
                overdue_time = '1 day'
            else:
                overdue_time = f'{days_overdue} days'
            
            mailer = Mailer()
            mailer.send_task_email(
                template_type='overdue_task_alert',
                task=task,
                to_user=task.assignee,
                additional_context={
                    'assignee_name': task.assignee.get_full_name(),
                    'due_date': task.due_date.strftime('%Y-%m-%d'),
                    'overdue_time': overdue_time,
                }
            )
            logger.info(f"Sent overdue notification for task {task.id}")
            return {'status': 'success', 'task_id': task.id}
        
    except Task.DoesNotExist:
        logger.error(f"Task {task_id} not found for overdue notification")
        return {'status': 'error', 'message': 'Task not found'}
    except Exception as e:
        logger.error(f"Failed to send task overdue notification: {e}")
        raise self.retry(exc=e)


# =============================================================================
# PERIODIC TASK CHECKS
# Note: Scheduled cron tasks moved to modules/crons/tasks.py
# - check_tasks_due_soon: daily 8 AM
# - check_overdue_tasks: daily 9 AM
# =============================================================================
