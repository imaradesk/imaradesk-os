import logging

from celery import shared_task

from shared.utilities.cron_lock import run_locked

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='modules.crons.tasks.run_daily_task_reminders', ignore_result=True)
def run_daily_task_reminders(self):
    """Daily at 8 AM: due-soon and overdue task notifications."""
    return {
        'due_soon_queued': run_locked('tasks_due_soon', _process_tasks_due_soon),
        'overdue_queued': run_locked('tasks_overdue', _process_overdue_tasks),
    }


def _process_tasks_due_soon():
    """Queue due-soon notifications for tasks due tomorrow."""
    from datetime import timedelta
    from django.utils import timezone
    from modules.settings.models import NotificationSettings
    from modules.tasks.models import Task
    from modules.tasks.tasks import send_task_due_soon_notification_task

    if not NotificationSettings.get_settings().notify_task_due_soon:
        return 0

    tomorrow = timezone.now().date() + timedelta(days=1)
    task_ids = list(Task.objects.filter(
        due_date=tomorrow,
        status__in=['todo', 'in_progress', 'review'],
        assignee__isnull=False,
        due_soon_notification_sent=False
    ).values_list('id', flat=True))

    for task_id in task_ids:
        send_task_due_soon_notification_task.delay(task_id)
    if task_ids:
        Task.objects.filter(id__in=task_ids).update(due_soon_notification_sent=True)
    return len(task_ids)


def _process_overdue_tasks():
    """Queue overdue notifications for past-due tasks."""
    from django.utils import timezone
    from modules.settings.models import NotificationSettings
    from modules.tasks.models import Task
    from modules.tasks.tasks import send_task_overdue_notification_task

    if not NotificationSettings.get_settings().notify_task_overdue:
        return 0

    task_ids = list(Task.objects.filter(
        due_date__lt=timezone.now().date(),
        status__in=['todo', 'in_progress', 'review'],
        assignee__isnull=False,
        overdue_notification_sent=False
    ).values_list('id', flat=True))

    for task_id in task_ids:
        send_task_overdue_notification_task.delay(task_id)
    if task_ids:
        Task.objects.filter(id__in=task_ids).update(overdue_notification_sent=True)
    return len(task_ids)
