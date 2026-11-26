import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='modules.crons.tasks.send_weekly_performance_reports', ignore_result=True)
def send_weekly_performance_reports(self):
    """Weekly report job (Sunday midnight). Report delivery is not implemented yet; it only logs."""
    from modules.settings.models import NotificationSettings

    settings = NotificationSettings.get_settings()
    if settings.weekly_performance_report and settings.weekly_report_email:
        logger.info(f"[CRON] Would send weekly report to {settings.weekly_report_email}")
