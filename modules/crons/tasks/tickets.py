import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='modules.crons.tasks.auto_close_resolved_tickets')
def auto_close_resolved_tickets(self):
    """Close tickets that have been resolved for more than AUTO_CLOSE_INTERVAL_MINUTES."""
    return {'tickets_closed': _close_resolved_tickets()}


def _close_resolved_tickets():
    """Find resolved tickets older than AUTO_CLOSE_INTERVAL_MINUTES and close them directly."""
    from django.conf import settings
    from django.utils import timezone
    from datetime import timedelta
    from modules.ticket.models import Ticket
    
    interval_minutes = getattr(settings, 'AUTO_CLOSE_INTERVAL_MINUTES', 1440)
    now = timezone.now()
    cutoff_time = now - timedelta(minutes=interval_minutes)
    
    logger.info(f"[AUTO-CLOSE] checking for tickets resolved before {cutoff_time} (interval: {interval_minutes}m)")
    
    closed_count = 0
    resolved_tickets = list(Ticket.objects.filter(
        status='resolved',
        resolved_at__lte=cutoff_time
    ).values_list('id', 'ticket_number', 'resolved_at'))
    
    count = len(resolved_tickets)
    logger.info(f"[AUTO-CLOSE] found {count} resolved tickets past cutoff")
    
    if count > 0:
        for ticket_id, ticket_number, resolved_at in resolved_tickets:
            age_minutes = (now - resolved_at).total_seconds() / 60 if resolved_at else 0
            try:
                ticket = Ticket.objects.get(id=ticket_id)
                if ticket.status == 'resolved':
                    ticket.status = 'closed'
                    ticket.save(update_fields=['status'])
                    closed_count += 1
                    logger.info(f"[AUTO-CLOSE] Closed ticket #{ticket_number} (resolved {age_minutes:.0f}m ago)")
                else:
                    logger.info(f"[AUTO-CLOSE] Ticket #{ticket_number} status changed to '{ticket.status}', skipping")
            except Ticket.DoesNotExist:
                logger.warning(f"[AUTO-CLOSE] Ticket #{ticket_number} (id={ticket_id}) not found, skipping")
            except Exception as e:
                logger.error(f"[AUTO-CLOSE] Error closing ticket #{ticket_number}: {e}", exc_info=True)
    else:
        logger.info(f"[AUTO-CLOSE] no tickets to close")
    
    logger.info(f"[AUTO-CLOSE] Completed - {closed_count}/{count} tickets closed")
    return closed_count
