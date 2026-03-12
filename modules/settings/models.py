from django.db import models
from django.utils import timezone


class App(models.Model):
    """
    Represents an installable app/plugin in the marketplace
    """
    CATEGORY_CHOICES = [
        ('automation', 'Automation'),
        ('communication', 'Communication'),
        ('productivity', 'Productivity'),
        ('asset', 'Asset Management'),
        ('reporting', 'Reporting & Analytics'),
        ('integration', 'Integration'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('coming_soon', 'Coming Soon'),
        ('beta', 'Beta'),
        ('deprecated', 'Deprecated'),
    ]
    
    name = models.CharField(max_length=200, help_text="App name")
    slug = models.SlugField(unique=True, help_text="URL-friendly identifier")
    description = models.TextField(help_text="Short description")
    long_description = models.TextField(help_text="Detailed description with features")
    icon = models.CharField(max_length=50, default='puzzle', help_text="Icon name or emoji")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Monthly price in USD")
    is_free = models.BooleanField(default=False, help_text="Is this app free?")
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_featured = models.BooleanField(default=False, help_text="Show in featured apps")
    
    # Metadata
    version = models.CharField(max_length=20, default='1.0.0')
    developer = models.CharField(max_length=200, default='ImaraDesk')
    install_count = models.IntegerField(default=0, help_text="Number of installations")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "App"
        verbose_name_plural = "Apps"
        ordering = ['-is_featured', 'name']
        db_table = 'setting_apps'
    
    def __str__(self):
        return self.name


class InstalledApp(models.Model):
    """
    Tracks which apps are installed for each tenant.
    Records are never deleted to prevent trial abuse.
    """
    app = models.ForeignKey(App, on_delete=models.CASCADE, related_name='installations')
    installed_at = models.DateTimeField(auto_now_add=True, null=True, blank=True,)
    first_installed_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Original installation date - never changes")
    is_active = models.BooleanField(default=True, help_text="Is the app currently active?")
    uninstalled_at = models.DateTimeField(null=True, blank=True, help_text="When the app was uninstalled")
    
    # Subscription info
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('trial', 'Trial'),
            ('active', 'Active'),
            ('cancelled', 'Cancelled'),
            ('suspended', 'Suspended'),
            ('expired', 'Expired'),
        ],
        default='trial'
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    next_billing_date = models.DateTimeField(null=True, blank=True)
    
    # Settings (JSON field for app-specific configuration)
    settings = models.JSONField(default=dict, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Installed App"
        verbose_name_plural = "Installed Apps"
        unique_together = ['app']  # One installation per app per tenant
        db_table = 'setting_installed_apps'
    
    def __str__(self):
        return f"{self.app.name} - {self.subscription_status}"
    
    @property
    def is_trial_expired(self):
        """Check if trial period has ended."""
        if self.subscription_status != 'trial':
            return False
        if self.trial_ends_at is None:
            return False
        from django.utils import timezone
        return timezone.now() > self.trial_ends_at
    
    @property
    def trial_days_remaining(self):
        """Calculate remaining trial days."""
        if self.trial_ends_at is None:
            return None
        from django.utils import timezone
        remaining = self.trial_ends_at - timezone.now()
        days = remaining.days
        return max(0, days)


class EmailTemplate(models.Model):
    """
    Email templates for tenant communications
    """
    TYPE_CHOICES = [
        # Ticket template
        ('ticket_created', 'Ticket Created'),
        ('ticket_assigned', 'Ticket Assigned'),
        ('ticket_resolved', 'Ticket Resolved'),
        ('ticket_closed', 'Ticket Closed'),
        ('ticket_updated', 'Ticket Updated'),
        ('ticket_status_changed', 'Ticket Status Changed'),
        ('ticket_priority_changed', 'Ticket Priority Changed'),
        ('ticket_merged', 'Ticket Merged'),
        ('new_activity_notice', 'New Activity Notice'),
        ('new_message_auto_response', 'Message Auto Response'),
        ('new_ticket_notice', 'New Ticket Notice (Agent)'),
        ('response_reply_template', 'Agent Response Reply'),
        ('internal_activity_alert', 'Internal Activity Alert'),
        ('new_message_alert', 'New Message Alert (Agent)'),
        ('overdue_ticket_alert', 'Overdue Ticket Alert'),
        ('ticket_transfer_alert', 'Ticket Transfer Alert'),
        
        # Task templates
        ('task_new_activity_alert', 'Task Activity Alert (Agent)'),
        ('task_new_activity_notice', 'Task Activity Notice (User)'),
        ('new_task_alert', 'New Task Alert'),
        ('overdue_task_alert', 'Overdue Task Alert'),
        ('task_assignment_alert', 'Task Assignment Alert'),
        ('task_transfer_alert', 'Task Transfer Alert'),
        
        # SLA templates
        ('sla_reminder', 'SLA Reminder'),
        ('sla_escalation_notice_task', 'SLA Escalation Notice (Task)'),
        ('sla_escalation_notice', 'SLA Escalation Notice (Ticket)'),
        ('sla_first_response_breach', 'First Response SLA Breach'),
        ('sla_resolution_breach', 'Resolution SLA Breach'),
        ('sla_resolved_notice', 'Ticket Resolved Within SLA'),
        ('sla_breach_warning', 'SLA Breach Warning'),
        ('sla_breached', 'SLA Breached'),
        
        # Comment templates
        ('comment_add_notice', 'Comment Added Notice'),
        ('comment_reply_notice', 'Comment Reply Notice'),
        ('user_mentioned', 'User Mentioned in Ticket'),
        
        # User templates
        ('welcome_user', 'Welcome Email'),
        ('password_reset', 'Password Reset'),
        
        # Report templates
        ('weekly_report', 'Weekly Report'),
        
        # Custom
        ('custom', 'Custom Template'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('draft', 'Draft'),
        ('archived', 'Archived'),
    ]
    
    name = models.CharField(max_length=200, help_text="Template name")
    template_type = models.CharField(max_length=50, choices=TYPE_CHOICES, unique=True, help_text="Template type")
    subject = models.CharField(max_length=500, help_text="Email subject with placeholders like {{ticket_number}}")
    body_html = models.TextField(help_text="HTML email body with placeholders")
    body_text = models.TextField(blank=True, help_text="Plain text fallback")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Available variables for this template
    available_variables = models.JSONField(
        default=dict,
        help_text="Available variables like {'ticket_number': 'Ticket number', 'user_name': 'User name'}"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Email Template"
        verbose_name_plural = "Email Templates"
        ordering = ['template_type']
        db_table = 'setting_email_templates'
    
    def __str__(self):
        return f"{self.name} ({self.template_type})"
    
    @staticmethod
    def get_base_template():
        """
        Returns the base HTML email template wrapper.
        The body content will be inserted where {{email_body}} placeholder is.
        """
        return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{email_title}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #e5e5e5;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">{{email_title}}</h1>
                        </td>
                    </tr>
                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <div style="font-size: 15px; line-height: 1.6; color: #4a4a4a;">
{{email_body}}
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e5e5e5;">
                            <p style="margin: 0; font-size: 13px; color: #888888; text-align: center;">
                                {{company_name}}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''
    
    def render(self, context):
        """
        Render template with context variables
        
        Args:
            context: Dictionary of variables to replace in template
        
        Returns:
            Tuple of (rendered_subject, rendered_body_html, rendered_body_text)
        """
        import re
        
        def replace_vars(text, ctx):
            # Replace {{variable}} with context values
            def replacer(match):
                var_name = match.group(1).strip()
                return str(ctx.get(var_name, match.group(0)))
            return re.sub(r'{{\s*([^}]+)\s*}}', replacer, text)
        
        # Convert plain text body to HTML paragraphs
        def text_to_html(text):
            if not text:
                return ''
            # First replace variables in the text
            text = replace_vars(text, context)
            # Split by double newlines for paragraphs
            paragraphs = text.strip().split('\n\n')
            html_parts = []
            for para in paragraphs:
                # Handle single line breaks within paragraphs
                lines = para.strip().split('\n')
                formatted_lines = '<br>'.join(line.strip() for line in lines if line.strip())
                if formatted_lines:
                    html_parts.append(f'<p style="margin: 0 0 16px 0;">{formatted_lines}</p>')
            return '\n'.join(html_parts)
        
        rendered_subject = replace_vars(self.subject, context)
        
        # Convert body_text to HTML and wrap in base template
        body_html_content = text_to_html(self.body_text or self.body_html)
        
        # Get the base template and insert content
        base_template = self.get_base_template()
        rendered_html = base_template.replace('{{email_title}}', self.name)
        rendered_html = rendered_html.replace('{{email_body}}', body_html_content)
        rendered_html = replace_vars(rendered_html, context)
        
        # Plain text version
        rendered_text = replace_vars(self.body_text, context) if self.body_text else ''
        
        return rendered_subject, rendered_html, rendered_text


class SecuritySettings(models.Model):
    """
    Security configuration settings - Two-Factor Authentication
    """
    # Two-Factor Authentication Methods
    enable_email_2fa = models.BooleanField(
        default=True,
        help_text="Allow email-based two-factor authentication"
    )
    enable_authenticator_2fa = models.BooleanField(
        default=True,
        help_text="Allow authenticator app (TOTP) two-factor authentication"
    )
    
    # 2FA Requirements
    require_2fa_for_admins = models.BooleanField(
        default=False,
        help_text="Require 2FA for all admin users"
    )
    require_2fa_for_all_users = models.BooleanField(
        default=False,
        help_text="Require 2FA for all users"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Security Settings"
        verbose_name_plural = "Security Settings"
        db_table = 'setting_security_config'
    
    def __str__(self):
        return "Security Settings"
    
    def save(self, *args, **kwargs):
        # Ensure only one settings instance exists (singleton pattern)
        if not self.pk and SecuritySettings.objects.exists():
            existing = SecuritySettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the security settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class KnowledgeBaseSettings(models.Model):
    """
    Knowledge Base configuration settings
    """
    # Access Control
    public_access = models.BooleanField(
        default=True,
        help_text="Allow unauthenticated users to view published articles"
    )
    require_login_to_view = models.BooleanField(
        default=False,
        help_text="Require users to login to view any articles"
    )
    allow_article_rating = models.BooleanField(
        default=True,
        help_text="Allow users to rate articles as helpful/not helpful"
    )
    allow_article_comments = models.BooleanField(
        default=True,
        help_text="Allow users to comment on articles"
    )
    
    # Article Creation & Publishing
    require_approval = models.BooleanField(
        default=True,
        help_text="Require approval before articles are published"
    )
    auto_publish_on_approval = models.BooleanField(
        default=True,
        help_text="Automatically publish articles when approved"
    )
    
    # Approval Workflow
    notify_approvers = models.BooleanField(
        default=True,
        help_text="Send email notifications to approvers"
    )
    
    # Notifications
    notify_author_on_approval = models.BooleanField(
        default=True,
        help_text="Notify author when article is approved"
    )
    notify_author_on_rejection = models.BooleanField(
        default=True,
        help_text="Notify author when article is rejected"
    )
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Knowledge Base Settings"
        verbose_name_plural = "Knowledge Base Settings"
        db_table = 'setting_kb'
    
    def __str__(self):
        return "Knowledge Base Settings"
    
    def save(self, *args, **kwargs):
        # Ensure only one settings instance exists (singleton pattern)
        if not self.pk and KnowledgeBaseSettings.objects.exists():
            # Update existing instance instead of creating new one
            existing = KnowledgeBaseSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the KB settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class SettingsView(models.Model):
    """Configurable views for tickets, tasks, and knowledge base."""
    
    TYPE_CHOICES = [
        ('TICKET', 'Ticket'),
        ('TASK', 'Task'),
        ('KB', 'Knowledge Base'),
    ]
    
    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        db_index=True,
        help_text="Type of view (Ticket, Task, or KB)"
    )
    view_id = models.CharField(
        max_length=100,
        help_text="Unique identifier for the view (e.g., 'all_tickets', 'my_tasks')"
    )
    label = models.CharField(
        max_length=200,
        help_text="Display label for the view"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional description of what this view displays"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this view is enabled and visible to users"
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Whether this is the default view to show"
    )
    order = models.IntegerField(
        default=0,
        help_text="Display order (lower numbers appear first)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Settings View"
        verbose_name_plural = "Settings Views"
        db_table = 'setting_view'
        ordering = ['type', 'order', 'label']
        unique_together = ['type', 'view_id']
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.label}"


class NotificationSettings(models.Model):
    """
    Business-level notification settings.
    Controls which notifications are enabled for the entire organization.
    """
    # Ticket Notifications
    notify_new_ticket_created = models.BooleanField(
        default=True,
        help_text="When a new ticket is submitted"
    )
    notify_ticket_assigned = models.BooleanField(
        default=True,
        help_text="When a ticket is assigned"
    )
    notify_ticket_status_changed = models.BooleanField(
        default=True,
        help_text="When ticket status is updated (open, pending, resolved, closed)"
    )
    notify_ticket_priority_changed = models.BooleanField(
        default=True,
        help_text="When ticket priority is updated (low, medium, high, urgent)"
    )
    notify_new_comment = models.BooleanField(
        default=True,
        help_text="When someone comments on a ticket"
    )
    notify_ticket_reassigned = models.BooleanField(
        default=False,
        help_text="When a ticket is reassigned to another agent"
    )
    notify_ticket_group_assigned = models.BooleanField(
        default=True,
        help_text="When a ticket is assigned to a group (notifies all group members)"
    )
    notify_ticket_merged = models.BooleanField(
        default=True,
        help_text="When tickets are merged together"
    )
    notify_ticket_mentioned = models.BooleanField(
        default=True,
        help_text="When someone is mentioned using @username in a ticket"
    )
    
    # Reports
    weekly_performance_report = models.BooleanField(
        default=False,
        help_text="Send weekly summary of team performance and metrics"
    )
    weekly_report_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Email address to receive weekly reports"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Notification Settings"
        verbose_name_plural = "Notification Settings"
        db_table = 'setting_notifications'
    
    def __str__(self):
        return "Notification Settings"
    
    def save(self, *args, **kwargs):
        # Ensure only one settings instance exists (singleton pattern)
        if not self.pk and NotificationSettings.objects.exists():
            existing = NotificationSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the notification settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings

