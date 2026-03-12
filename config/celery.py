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
    # Process emails every 10 seconds (more reasonable than 1 second for email polling)
    'process-assigned-system-emails': {
        'task': 'modules.crons.tasks.process_tenant_emails',
        'schedule': 10.0,  # Every 10 seconds
        'options': {'queue': 'email_processing'}
    },
    # Process Outlook emails every 60 seconds
    'process-outlook-emails': {
        'task': 'modules.crons.tasks.process_outlook_emails',
        'schedule': 60.0,  # Every 60 seconds
        'options': {'queue': 'email_processing'}
    },
    # Process Custom IMAP emails every 60 seconds
    'process-custom-imap-emails': {
        'task': 'modules.crons.tasks.process_custom_imap_emails',
        'schedule': 60.0,  # Every 60 seconds
        'options': {'queue': 'email_processing'}
    },
    # Send weekly performance reports - every Sunday at midnight
    'send-weekly-performance-reports': {
        'task': 'modules.crons.tasks.send_weekly_performance_reports',
        'schedule': crontab(hour=0, minute=0, day_of_week='sunday'),
        'options': {'queue': 'reports'}
    },
    # # Check SLA breach warnings - every 5 minutes
    # 'check-sla-breach-warnings': {
    #     'task': 'modules.crons.tasks.check_sla_breach_warnings',
    #     'schedule': crontab(minute='*/5'),  # Every 5 minutes
    #     'options': {'queue': 'sla_notifications'}
    # },
    # # Handle SLA breaches - every 5 minutes
    # 'handle-sla-breaches': {
    #     'task': 'modules.crons.tasks.handle_sla_breaches',
    #     'schedule': crontab(minute='*/5'),  # Every 5 minutes
    #     'options': {'queue': 'sla_notifications'}
    # },
     # Check SLA breach warnings - every 2 seconds
    'check-sla-breach-warnings': {
        'task': 'modules.crons.tasks.check_sla_breach_warnings',
        'schedule': 20.0,  # Every 2 seconds
        'options': {'queue': 'sla_notifications'}
    },

    # Handle SLA breaches - every 2 seconds
    'handle-sla-breaches': {
        'task': 'modules.crons.tasks.handle_sla_breaches',
        'schedule': 20.0,  # Every 2 seconds
        'options': {'queue': 'sla_notifications'}
    },
    # Auto-close resolved tickets - every 30 minutes
    'auto-close-resolved-tickets': {
        'task': 'modules.crons.tasks.auto_close_resolved_tickets',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
        'options': {'queue': 'celery'}
    },
}

# Task routing - separate queues for different task types
app.conf.task_routes = {
    'modules.crons.tasks.process_*': {'queue': 'email_processing'},
    'modules.crons.tasks.send_weekly_*': {'queue': 'reports'},
    'modules.crons.tasks.check_sla_*': {'queue': 'sla_notifications'},
    'modules.crons.tasks.handle_sla_*': {'queue': 'sla_notifications'},
    'modules.crons.tasks.close_single_ticket_task': {'queue': 'celery'},
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
