"""
Celery configuration for ImaraDesk.

This module sets up Celery for background task processing with:
- Redis as message broker
- Django settings integration
- Celery Beat for scheduled tasks
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('coredesk')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

app.conf.beat_schedule = {
    # Process IMAP emails every 10 seconds
    'process-emails': {
        'task': 'modules.email_to_ticket.tasks.process_emails',
        'schedule': 10.0,
        'options': {'queue': 'email_processing'}
    },
    # Process Outlook emails every 60 seconds
    'process-outlook-emails': {
        'task': 'modules.email_to_ticket.tasks.process_outlook_emails_task',
        'schedule': 60.0,
        'options': {'queue': 'email_processing'}
    },
    # Process Custom IMAP emails every 60 seconds
    'process-custom-imap-emails': {
        'task': 'modules.email_to_ticket.tasks.process_custom_imap_emails_task',
        'schedule': 60.0,
        'options': {'queue': 'email_processing'}
    },
    # SLA engine every minute: business hours, holidays (30 min), warnings + breaches (3 min)
    'run-sla-engine': {
        'task': 'modules.crons.tasks.run_sla_engine',
        'schedule': 60.0,
        'options': {'queue': 'sla_notifications', 'expires': 60}
    },
    # Task reminders daily at 8 AM: due soon + overdue
    'run-daily-task-reminders': {
        'task': 'modules.crons.tasks.run_daily_task_reminders',
        'schedule': crontab(hour=8, minute=0),
        'options': {'queue': 'celery'}
    },
    # Auto-close resolved tickets - every 30 minutes
    'auto-close-resolved-tickets': {
        'task': 'modules.crons.tasks.auto_close_resolved_tickets',
        'schedule': crontab(minute='*/30'),
        'options': {'queue': 'celery'}
    },
    # Send weekly performance reports - every Sunday at midnight
    'send-weekly-performance-reports': {
        'task': 'modules.crons.tasks.send_weekly_performance_reports',
        'schedule': crontab(hour=0, minute=0, day_of_week='sunday'),
        'options': {'queue': 'reports'}
    },
}

# Task routing - separate queues for different task types
app.conf.task_routes = {
    'modules.email_to_ticket.tasks.*': {'queue': 'email_processing'},
    'modules.crons.tasks.send_weekly_*': {'queue': 'reports'},
    'modules.crons.tasks.run_sla_engine': {'queue': 'sla_notifications'},
    'modules.crons.tasks.send_sla_notification': {'queue': 'sla_notifications'},
    'modules.crons.tasks.auto_close_resolved_tickets': {'queue': 'celery'},
}

# Task execution settings
app.conf.task_acks_late = True  # Acknowledge tasks after completion
app.conf.task_reject_on_worker_lost = True  # Reject tasks if worker dies
app.conf.worker_prefetch_multiplier = 1  # Don't prefetch too many tasks to ensure fair distribution


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    print(f'Request: {self.request!r}')
