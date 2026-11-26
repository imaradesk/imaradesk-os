"""Invalidate the SLA engine's business-hours skip window when the schedule changes."""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import BusinessHours, SLASettings


@receiver([post_save, post_delete], sender=BusinessHours)
@receiver([post_save, post_delete], sender=SLASettings)
def reset_business_hours_window(sender, **kwargs):
    from modules.crons.tasks import clear_business_hours_window
    clear_business_hours_window()
