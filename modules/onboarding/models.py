from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class OnboardingProgress(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='onboarding')

    # Step completion flags
    modules_completed = models.BooleanField(default=False)
    channels_completed = models.BooleanField(default=False)
    users_groups_completed = models.BooleanField(default=False)
    sla_completed = models.BooleanField(default=False)
    emails_smtp_completed = models.BooleanField(default=False)
    notifications_completed = models.BooleanField(default=False)

    # Step data (stores what user configured in each step)
    modules_data = models.JSONField(default=dict, blank=True)
    channels_data = models.JSONField(default=dict, blank=True)
    users_groups_data = models.JSONField(default=dict, blank=True)
    sla_data = models.JSONField(default=dict, blank=True)
    emails_smtp_data = models.JSONField(default=dict, blank=True)
    notifications_data = models.JSONField(default=dict, blank=True)

    # Current step (1-6), 0 = not started, 7 = complete
    current_step = models.IntegerField(default=1)
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'imd_onboarding_progress'

    def __str__(self):
        return f"Onboarding: {self.user.email} - Step {self.current_step}"

    STEP_FIELDS = {
        1: 'modules_completed',
        2: 'channels_completed',
        3: 'users_groups_completed',
        4: 'sla_completed',
        5: 'emails_smtp_completed',
        6: 'notifications_completed',
    }

    def get_step_status(self):
        return {
            1: self.modules_completed,
            2: self.channels_completed,
            3: self.users_groups_completed,
            4: self.sla_completed,
            5: self.emails_smtp_completed,
            6: self.notifications_completed,
        }
