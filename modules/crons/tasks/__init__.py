"""
Scheduled (Celery Beat) jobs. The schedule lives in config/celery.py.

- run_sla_engine: every minute - business hours, holidays, SLA warnings and breaches
- run_daily_task_reminders: daily 8 AM - task due soon and overdue notifications
- auto_close_resolved_tickets: every 30 minutes
- send_weekly_performance_reports: Sunday midnight

Event-triggered tasks live in their module's tasks.py.
"""
from modules.crons.tasks.reports import send_weekly_performance_reports  # noqa: F401
from modules.crons.tasks.scheduler import run_sla_engine  # noqa: F401
from modules.crons.tasks.sla import clear_business_hours_window, send_sla_notification  # noqa: F401
from modules.crons.tasks.task_reminders import run_daily_task_reminders  # noqa: F401
from modules.crons.tasks.tickets import auto_close_resolved_tickets  # noqa: F401
