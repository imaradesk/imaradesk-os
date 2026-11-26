from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class SLASettings(models.Model):
    """
    Global SLA settings - controls whether SLA is enabled/disabled
    Only one instance should exist
    """
    enabled = models.BooleanField(
        default=False,
        help_text="Enable or disable SLA tracking globally"
    )
    auto_pause_resolved = models.BooleanField(
        default=True,
        help_text="Automatically pause SLA when ticket is resolved"
    )
    auto_resume_reopened = models.BooleanField(
        default=True,
        help_text="Automatically resume SLA when ticket is reopened"
    )
    escalation_enabled = models.BooleanField(
        default=True,
        help_text="Enable automatic escalation when SLA is breached"
    )
    send_notifications = models.BooleanField(
        default=True,
        help_text="Send notifications for SLA warnings and breaches"
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "SLA Settings"
        verbose_name_plural = "SLA Settings"
        db_table = "sla_settings"
    
    def __str__(self):
        return f"SLA Settings ({'Enabled' if self.enabled else 'Disabled'})"
    
    @classmethod
    def get_settings(cls):
        """Get or create the SLA settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class SLAPolicy(models.Model):
    """
    SLA Policy defines service level agreements for ticket handling.
    Includes response time and resolution time targets based on priority.
    """
    PRIORITY_CHOICES = [
        ('urgent', 'Urgent'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    name = models.CharField(max_length=200, help_text="Policy name (e.g., Urgent Priority SLA)")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, help_text="Ticket priority this policy applies to")
    description = models.TextField(blank=True, help_text="Policy description")
    
    # Response and resolution times in minutes
    first_response_time = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Target time for first response (in minutes)"
    )
    resolution_time = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Target time for ticket resolution (in minutes)"
    )
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Business hours settings
    apply_business_hours = models.BooleanField(
        default=True,
        help_text="Only count time during business hours"
    )
    
    # Additional policy settings
    apply_holidays = models.BooleanField(
        default=False,
        help_text="Exclude holidays from SLA time calculation"
    )
    send_escalation_emails = models.BooleanField(
        default=False,
        help_text="Send email notifications when SLA is at risk of breach"
    )
    auto_assign_on_breach = models.BooleanField(
        default=False,
        help_text="Send escalation email to administrator when SLA is breached"
    )
    pause_on_pending = models.BooleanField(
        default=False,
        help_text="Pause SLA timer when ticket status is pending"
    )
    
    # Custom trigger rules
    use_custom_rules = models.BooleanField(
        default=False,
        help_text="Use custom rules instead of simple priority matching"
    )
    custom_rules = models.JSONField(
        default=list,
        blank=True,
        help_text="JSON array of custom trigger rules"
    )
    rules_logic = models.CharField(
        max_length=10,
        default='AND',
        choices=[('AND', 'AND'), ('OR', 'OR')],
        help_text="Logic to combine rules (AND/OR)"
    )
    
    # Notification settings
    notify_before_breach = models.IntegerField(
        default=30,
        validators=[MinValueValidator(0)],
        help_text="Send notification X minutes before SLA breach (0 to disable)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "SLA Policy"
        verbose_name_plural = "SLA Policies"
        ordering = ['-priority']
        db_table = "sla_policy"
    
    def __str__(self):
        return f"{self.name} ({self.get_priority_display()})"
    
    def get_first_response_display(self):
        """Convert minutes to human-readable format"""
        return self._format_minutes(self.first_response_time)
    
    def get_resolution_time_display(self):
        """Convert minutes to human-readable format"""
        return self._format_minutes(self.resolution_time)
    
    @staticmethod
    def _format_minutes(minutes):
        """Format minutes into human-readable time"""
        if minutes < 60:
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
        elif minutes < 1440:  # Less than 24 hours
            hours = minutes // 60
            remaining_mins = minutes % 60
            if remaining_mins == 0:
                return f"{hours} hour{'s' if hours != 1 else ''}"
            return f"{hours}h {remaining_mins}m"
        else:  # Days
            days = minutes // 1440
            remaining_hours = (minutes % 1440) // 60
            if remaining_hours == 0:
                return f"{days} day{'s' if days != 1 else ''}"
            return f"{days}d {remaining_hours}h"


class BusinessHours(models.Model):
    """
    Defines business operating hours for SLA calculations.
    Only one active business hours configuration should exist.
    """
    WEEKDAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    name = models.CharField(max_length=200, default="Default Business Hours")
    timezone = models.CharField(max_length=100, default='UTC', help_text="Timezone for business hours")
    
    # Individual day settings
    monday_enabled = models.BooleanField(default=True)
    monday_start = models.TimeField(default='09:00:00')
    monday_end = models.TimeField(default='17:00:00')
    
    tuesday_enabled = models.BooleanField(default=True)
    tuesday_start = models.TimeField(default='09:00:00')
    tuesday_end = models.TimeField(default='17:00:00')
    
    wednesday_enabled = models.BooleanField(default=True)
    wednesday_start = models.TimeField(default='09:00:00')
    wednesday_end = models.TimeField(default='17:00:00')
    
    thursday_enabled = models.BooleanField(default=True)
    thursday_start = models.TimeField(default='09:00:00')
    thursday_end = models.TimeField(default='17:00:00')
    
    friday_enabled = models.BooleanField(default=True)
    friday_start = models.TimeField(default='09:00:00')
    friday_end = models.TimeField(default='17:00:00')
    
    saturday_enabled = models.BooleanField(default=False)
    saturday_start = models.TimeField(default='09:00:00')
    saturday_end = models.TimeField(default='17:00:00')
    
    sunday_enabled = models.BooleanField(default=False)
    sunday_start = models.TimeField(default='09:00:00')
    sunday_end = models.TimeField(default='17:00:00')
    
    # Options
    pause_outside_hours = models.BooleanField(default=True, help_text="Pause SLA timer outside business hours")
    exclude_holidays = models.BooleanField(default=True, help_text="Exclude holidays from SLA calculations")
    
    is_active = models.BooleanField(default=True, help_text="Is this the active business hours configuration")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Business Hours"
        verbose_name_plural = "Business Hours"
        db_table = "sla_business_hours"
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Ensure only one active configuration
        if self.is_active:
            BusinessHours.objects.filter(is_active=True).update(is_active=False)
        super().save(*args, **kwargs)
    
    def is_business_hours(self, dt):
        """Check if given datetime falls within business hours"""
        weekday = dt.weekday()
        day_name = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][weekday]
        
        enabled = getattr(self, f'{day_name}_enabled')
        if not enabled:
            return False
        
        start_time = getattr(self, f'{day_name}_start')
        end_time = getattr(self, f'{day_name}_end')
        
        current_time = dt.time()
        return start_time <= current_time <= end_time


class Holiday(models.Model):
    """
    Defines holidays when SLA timers should be paused.
    """
    name = models.CharField(max_length=200, help_text="Holiday name")
    date = models.DateField(help_text="Holiday date")
    recurring = models.BooleanField(default=True, help_text="Does this holiday recur annually?")
    status = models.CharField(
        max_length=20,
        choices=[('active', 'Active'), ('inactive', 'Inactive')],
        default='active'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Holiday"
        verbose_name_plural = "Holidays"
        ordering = ['date']
        db_table = "sla_holiday"
    
    def __str__(self):
        return f"{self.name} - {self.date}"
    
    def is_holiday(self, date):
        """Check if given date matches this holiday"""
        if self.status != 'active':
            return False
        
        if self.recurring:
            # For recurring holidays, only check month and day
            return (self.date.month == date.month and self.date.day == date.day)
        else:
            # For one-time holidays, exact date match
            return self.date == date


class TicketSLA(models.Model):
    """
    Tracks SLA policy application to tickets.
    Links a ticket to its applicable SLA policy and tracks compliance.
    """
    ticket = models.OneToOneField(
        "ticket.Ticket",
        on_delete=models.CASCADE,
        related_name='sla'
    )
    policy = models.ForeignKey(
        SLAPolicy,
        on_delete=models.PROTECT,
        help_text="SLA policy applied to this ticket"
    )
    
    # Due dates
    response_due_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When first response is due"
    )
    resolution_due_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When ticket resolution is due"
    )
    
    # When an agent first replied publicly; stops the response clock
    first_responded_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the first agent response was sent"
    )

    # Set when the clock was restarted (e.g. the priority changed to one with its own policy)
    restarted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the SLA clock was last restarted, null if it never was"
    )
    restart_count = models.PositiveIntegerField(
        default=0,
        help_text="How many times the SLA clock has been restarted"
    )
    
    # Breach tracking
    response_breached = models.BooleanField(
        default=False,
        help_text="Has first response SLA been breached?"
    )
    resolution_breached = models.BooleanField(
        default=False,
        help_text="Has resolution SLA been breached?"
    )
    
    # Hold functionality
    is_on_hold = models.BooleanField(
        default=False,
        help_text="Is the SLA timer currently on hold?"
    )
    hold_reason = models.TextField(
        blank=True,
        help_text="Reason for putting SLA on hold"
    )
    hold_started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the hold was started"
    )
    total_hold_time = models.IntegerField(
        default=0,
        help_text="Total time in minutes that SLA has been on hold"
    )
    
    # Warning notification tracking
    breach_warning_sent_response = models.BooleanField(
        default=False,
        help_text="Has breach warning been sent for first response SLA?"
    )
    breach_warning_sent_resolution = models.BooleanField(
        default=False,
        help_text="Has breach warning been sent for resolution SLA?"
    )
    
    # Breach handling tracking
    breach_email_sent = models.BooleanField(
        default=False,
        help_text="Has SLA breached email been sent?"
    )
    escalation_email_sent = models.BooleanField(
        default=False,
        help_text="Has escalation email been sent?"
    )
    auto_assigned_on_breach = models.BooleanField(
        default=False,
        help_text="Was ticket auto-assigned due to breach?"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Ticket SLA"
        verbose_name_plural = "Ticket SLAs"
        db_table = "sla_ticket"
        indexes = [
            models.Index(fields=['policy']),
            models.Index(fields=['response_due_at']),
            models.Index(fields=['resolution_due_at']),
            # SLA engine: running clocks due for warning/breach
            models.Index(fields=['is_on_hold', 'resolution_breached', 'resolution_due_at'], name='sla_tkt_running_due_idx'),
            # SLA engine: clocks held by business hours / holidays
            models.Index(fields=['is_on_hold', 'hold_reason'], name='sla_tkt_hold_reason_idx'),
            # SLA engine: first-response breach marking
            models.Index(fields=['response_breached', 'response_due_at'], name='sla_tkt_resp_due_idx'),
        ]
    
    def __str__(self):
        return f"SLA for Ticket #{self.ticket.ticket_number} - {self.policy.name}"
    
    def calculate_due_dates(self, start_time=None):
        """Calculate response and resolution due dates based on policy."""
        from datetime import timedelta
        
        # Start from ticket creation time unless the clock starts later (e.g. a draft being submitted)
        start_time = start_time or self.ticket.created_at
        
        # Calculate response due date
        self.response_due_at = start_time + timedelta(minutes=self.policy.first_response_time)
        
        # Calculate resolution due date
        self.resolution_due_at = start_time + timedelta(minutes=self.policy.resolution_time)
        
        self.save()

    @property
    def clock_started_at(self):
        """When the current SLA targets started counting."""
        return self.restarted_at or self.created_at

    def restart(self, policy, start_time=None):
        """
        Move this SLA onto `policy` and start its clock afresh from `start_time` (default now).

        Targets are measured from the restart, never from ticket creation, so
        time spent under the previous policy can't make the new one breach.
        An agent reply that already happened is kept and counts as the first
        response, so it is not judged against the new targets.
        """
        start_time = start_time or timezone.now()

        self.policy = policy
        self.restarted_at = start_time
        self.restart_count += 1

        # A hold belonged to the old clock, except that a pending ticket stays paused
        self.total_hold_time = 0
        if self.ticket.status == 'pending':
            self.is_on_hold = True
            self.hold_reason = 'Ticket placed on hold'
            self.hold_started_at = start_time
        else:
            self.is_on_hold = False
            self.hold_reason = ''
            self.hold_started_at = None

        # Breach and notification tracking starts over for the new targets
        self.response_breached = False
        self.resolution_breached = False
        self.breach_warning_sent_response = False
        self.breach_warning_sent_resolution = False
        self.breach_email_sent = False
        self.escalation_email_sent = False
        self.auto_assigned_on_breach = False

        self.calculate_due_dates(start_time=start_time)
    
    def hold(self, reason):
        """Put SLA timer on hold."""
        if not self.is_on_hold:
            self.is_on_hold = True
            self.hold_reason = reason
            self.hold_started_at = timezone.now()
            self.save()
    
    def resume(self):
        """Resume SLA timer from hold."""
        if self.is_on_hold and self.hold_started_at:
            from datetime import timedelta
            
            # Calculate hold duration
            hold_duration = timezone.now() - self.hold_started_at
            hold_minutes = int(hold_duration.total_seconds() / 60)
            
            # Add to total hold time
            self.total_hold_time += hold_minutes
            
            # Extend due dates by hold duration
            if self.response_due_at:
                self.response_due_at += timedelta(minutes=hold_minutes)
            if self.resolution_due_at:
                self.resolution_due_at += timedelta(minutes=hold_minutes)
            
            # Clear hold status
            self.is_on_hold = False
            self.hold_started_at = None
            self.save()
