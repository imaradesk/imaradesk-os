from django.db import models
from django.utils import timezone
from cryptography.fernet import Fernet
from django.conf import settings
import base64

class SMTP(models.Model):
    enabled = models.BooleanField(default=False, verbose_name="SMTP Enabled", help_text="Whether to use custom SMTP instead of system default")
    active = models.BooleanField(default=True, verbose_name="Active", help_text="Whether this SMTP configuration is currently active")
    host = models.CharField(max_length=255, verbose_name="SMTP Host")
    port = models.PositiveIntegerField(verbose_name="SMTP Port")
    username = models.CharField(max_length=255, verbose_name="SMTP Username")
    password_encrypted = models.TextField(verbose_name="SMTP Password (Encrypted)", blank=True, default='')
    use_tls = models.BooleanField(default=True, verbose_name="Use TLS")
    use_ssl = models.BooleanField(default=False, verbose_name="Use SSL")
    default_from_email = models.EmailField(verbose_name="Default From Email")
    sender_name = models.CharField(max_length=255, blank=True, null=True, verbose_name="Sender Name")
    reply_to_email = models.EmailField(blank=True, null=True, verbose_name="Reply-To Email")
    
    @staticmethod
    def _get_fernet():
        """Get Fernet instance using Django's SECRET_KEY."""
        # Use first 32 bytes of SECRET_KEY as encryption key
        key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode())
        return Fernet(key)
    
    def set_password(self, raw_password):
        """Encrypt and store the SMTP password."""
        if raw_password:
            fernet = self._get_fernet()
            self.password_encrypted = fernet.encrypt(raw_password.encode()).decode()
        else:
            self.password_encrypted = ''
    
    def get_password(self):
        """Decrypt and return the SMTP password."""
        if self.password_encrypted:
            try:
                fernet = self._get_fernet()
                return fernet.decrypt(self.password_encrypted.encode()).decode()
            except Exception:
                return ''
        return ''

    class Meta:
        verbose_name = "SMTP Setting"
        verbose_name_plural = "SMTP Settings"
        db_table = 'setting_smtp'

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
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_featured = models.BooleanField(default=False, help_text="Show in featured apps")
    
    # Metadata
    version = models.CharField(max_length=20, default='1.0.0')
    developer = models.CharField(max_length=200, default='Imaradesk')
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
    Uninstalling deactivates the record so app settings survive a reinstall.
    """
    app = models.ForeignKey(App, on_delete=models.CASCADE, related_name='installations')
    installed_at = models.DateTimeField(auto_now_add=True, null=True, blank=True,)
    first_installed_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="Original installation date - never changes")
    is_active = models.BooleanField(default=True, help_text="Is the app currently active?")
    uninstalled_at = models.DateTimeField(null=True, blank=True, help_text="When the app was uninstalled")
    
    # Settings (JSON field for app-specific configuration)
    settings = models.JSONField(default=dict, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Installed App"
        verbose_name_plural = "Installed Apps"
        unique_together = ['app']  # One installation per app per tenant
        db_table = 'setting_installed_apps'
    
    def __str__(self):
        return self.app.name


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
        
        # Survey templates
        ('survey_invitation', 'Survey Invitation'),
        ('survey_reminder', 'Survey Reminder'),
        
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
        Shared makaosmart-style design lives in
        shared.utilities.templates.email_base; this stays a thin alias so
        every tenant mail picks up the new look with zero sender changes.
        """
        from shared.utilities.templates.email_base import tenant_base_template
        return tenant_base_template()
    
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
        
        from shared.utilities.templates.email_base import text_to_email_html, strip_trailing_signoff

        rendered_subject = replace_vars(self.subject, context)

        # Lay out the plain-text body (details panels, buttons, quotes) with
        # tokens still in place, then wrap it in the base template
        body_html_content = text_to_email_html(self.body_text or self.body_html)

        # The footer carries the sign-off, so drop a sign-off the body repeats
        body_html_content = strip_trailing_signoff(body_html_content)

        # Get the base template and insert content
        try:
            use_business_name = NotificationSettings.get_settings().use_business_name_in_footer
        except Exception:
            use_business_name = False
        from shared.utilities.templates.email_base import tenant_base_template
        base_template = tenant_base_template(use_business_name=use_business_name)
        rendered_html = base_template.replace('{{email_title}}', self.name)
        rendered_html = rendered_html.replace('{{email_body}}', body_html_content)
        # Multi-line values (comments, messages) keep their line breaks in HTML
        html_context = {k: str(v).replace('\r\n', '\n').replace('\n', '<br>') for k, v in context.items()}
        rendered_html = replace_vars(rendered_html, html_context)
        
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
        default=False,
        help_text="When a ticket is assigned"
    )
    notify_ticket_status_changed = models.BooleanField(
        default=True,
        help_text="When ticket status is updated (open, pending, resolved, closed)"
    )
    notify_ticket_priority_changed = models.BooleanField(
        default=False,
        help_text="When ticket priority is updated (low, medium, high, urgent)"
    )
    notify_new_comment = models.BooleanField(
        default=True,
        help_text="When someone comments on a ticket"
    )
    notify_ticket_merged = models.BooleanField(
        default=False,
        help_text="When tickets are merged together"
    )
    notify_ticket_mentioned = models.BooleanField(
        default=False,
        help_text="When someone is mentioned using @username in a ticket"
    )
    
    # Task Notifications
    notify_task_assigned = models.BooleanField(
        default=False,
        help_text="When a task is assigned to you"
    )
    notify_task_status_changed = models.BooleanField(
        default=True,
        help_text="When task status is updated"
    )
    notify_task_comment = models.BooleanField(
        default=True,
        help_text="When someone comments on your task"
    )
    notify_task_due_soon = models.BooleanField(
        default=True,
        help_text="24 hours before task is due"
    )
    notify_task_overdue = models.BooleanField(
        default=False,
        help_text="When a task passes its due date"
    )
    # KB Notifications
    notify_kb_article_updated = models.BooleanField(
        default=False,
        help_text="When an article you follow is updated"
    )
    notify_kb_article_approved = models.BooleanField(
        default=False,
        help_text="When your draft article is approved"
    )
    
    # Asset Notifications
    notify_asset_assigned = models.BooleanField(
        default=True,
        help_text="When an asset is assigned to you"
    )
    notify_asset_status_changed = models.BooleanField(
        default=True,
        help_text="When asset status is updated"
    )
    notify_asset_maintenance_due = models.BooleanField(
        default=True,
        help_text="When asset maintenance is scheduled"
    )
    notify_asset_warranty_expiring = models.BooleanField(
        default=True,
        help_text="30 days before warranty expires"
    )
    
    # Survey Notifications
    notify_survey_response = models.BooleanField(
        default=False,
        help_text="When someone responds to your survey"
    )
    notify_survey_completed = models.BooleanField(
        default=False,
        help_text="When a survey reaches 100% completion"
    )
    notify_survey_reminder = models.BooleanField(
        default=False,
        help_text="Remind about incomplete survey responses"
    )
    
    # SLA Notifications
    notify_sla_resolution_warning = models.BooleanField(
        default=False,
        help_text="When SLA resolution time is almost breaching (warning threshold)"
    )
    notify_sla_resolution_breached = models.BooleanField(
        default=False,
        help_text="When SLA resolution time has been breached"
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
    
    # Email branding
    use_business_name_in_footer = models.BooleanField(
        default=False,
        help_text="Sign emails 'The <business name> Team' instead of 'The Imaradesk Team'"
    )
    
    # No longer shown in the UI; kept so upgraded installs keep their saved choices
    notify_ticket_reassigned = models.BooleanField(
        default=False,
        help_text="When a ticket is reassigned to another agent"
    )
    notify_ticket_group_assigned = models.BooleanField(
        default=True,
        help_text="When a ticket is assigned to a group (notifies all group members)"
    )
    notify_kb_article_published = models.BooleanField(
        default=False,
        help_text="When a knowledge base article is published"
    )
    notify_kb_feedback_received = models.BooleanField(
        default=False,
        help_text="When feedback is received on a knowledge base article"
    )
    notify_sla_response_warning = models.BooleanField(
        default=False,
        help_text="When a ticket is approaching first response SLA breach"
    )
    notify_sla_response_breached = models.BooleanField(
        default=False,
        help_text="When a ticket has breached first response SLA"
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


class BoardColumn(models.Model):
    """
    Board column configuration for Kanban-style task boards.
    Each tenant can customize their board columns.
    """
    
    class BoardType(models.TextChoices):
        TASK = 'task', 'Task Board'
        TICKET = 'ticket', 'Ticket Board'
    
    class DefaultColors(models.TextChoices):
        GRAY = 'bg-gray-500', 'Gray'
        BLUE = 'bg-blue-500', 'Blue'
        GREEN = 'bg-green-500', 'Green'
        YELLOW = 'bg-yellow-500', 'Yellow'
        ORANGE = 'bg-orange-500', 'Orange'
        RED = 'bg-red-500', 'Red'
        PURPLE = 'bg-purple-500', 'Purple'
        PINK = 'bg-pink-500', 'Pink'
    
    # Identification
    board_type = models.CharField(
        max_length=20,
        choices=BoardType.choices,
        default=BoardType.TASK,
        help_text="Type of board this column belongs to"
    )
    column_id = models.CharField(
        max_length=50,
        help_text="Internal identifier matching status value (e.g., 'todo', 'in_progress')"
    )
    
    # Display settings
    label = models.CharField(
        max_length=100,
        help_text="Display label for the column"
    )
    color = models.CharField(
        max_length=50,
        choices=DefaultColors.choices,
        default=DefaultColors.GRAY,
        help_text="Color class for the column indicator"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional description shown in tooltips"
    )
    
    # Configuration
    position = models.PositiveIntegerField(
        default=0,
        help_text="Display order of the column"
    )
    is_visible = models.BooleanField(
        default=True,
        help_text="Whether this column is visible on the board"
    )
    wip_limit = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Work-in-progress limit for this column (optional)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Board Column"
        verbose_name_plural = "Board Columns"
        db_table = 'setting_board_columns'
        ordering = ['board_type', 'position']
        unique_together = ['board_type', 'column_id']
    
    def __str__(self):
        return f"{self.get_board_type_display()} - {self.label}"
    
    @classmethod
    def get_task_columns(cls):
        """Get all task board columns in order"""
        return cls.objects.filter(board_type=cls.BoardType.TASK, is_visible=True).order_by('position')
    
    @classmethod
    def get_ticket_columns(cls):
        """Get all ticket board columns in order"""
        return cls.objects.filter(board_type=cls.BoardType.TICKET, is_visible=True).order_by('position')
    
    @classmethod
    def seed_default_task_columns(cls):
        """Create default task board columns if none exist"""
        if cls.objects.filter(board_type=cls.BoardType.TASK).exists():
            return 0
        
        default_columns = [
            {'column_id': 'todo', 'label': 'To Do', 'color': 'bg-gray-500', 'position': 0, 'description': 'Tasks that haven\'t been started yet'},
            {'column_id': 'in_progress', 'label': 'In Progress', 'color': 'bg-blue-500', 'position': 1, 'description': 'Tasks currently being worked on'},
            {'column_id': 'review', 'label': 'In Review', 'color': 'bg-purple-500', 'position': 2, 'description': 'Tasks waiting for review'},
            {'column_id': 'done', 'label': 'Done', 'color': 'bg-green-500', 'position': 3, 'description': 'Completed tasks'},
        ]
        
        for col_data in default_columns:
            cls.objects.create(board_type=cls.BoardType.TASK, **col_data)
        
        return len(default_columns)
    
    @classmethod
    def seed_default_ticket_columns(cls):
        """Create default ticket board columns if none exist"""
        if cls.objects.filter(board_type=cls.BoardType.TICKET).exists():
            return 0
        
        default_columns = [
            {'column_id': 'new', 'label': 'New', 'color': 'bg-blue-500', 'position': 0, 'description': 'Newly created tickets'},
            {'column_id': 'open', 'label': 'Open', 'color': 'bg-yellow-500', 'position': 1, 'description': 'Tickets being processed'},
            {'column_id': 'in_progress', 'label': 'In Progress', 'color': 'bg-orange-500', 'position': 2, 'description': 'Actively worked on'},
            {'column_id': 'pending', 'label': 'On Hold', 'color': 'bg-gray-500', 'position': 3, 'description': 'Waiting for customer response'},
            {'column_id': 'resolved', 'label': 'Resolved', 'color': 'bg-green-500', 'position': 4, 'description': 'Issue has been resolved'},
            {'column_id': 'closed', 'label': 'Closed', 'color': 'bg-gray-500', 'position': 5, 'description': 'Ticket is closed'},
        ]
        
        for col_data in default_columns:
            cls.objects.create(board_type=cls.BoardType.TICKET, **col_data)
        
        return len(default_columns)


class Channel(models.Model):
    """
    Communication channels available for a tenant's inboxes.
    Seeded on tenant creation and managed via administration settings.
    """

    CHANNEL_STATUS_CHOICES = [
        ('active', 'Active'),
        ('coming_soon', 'Coming Soon'),
    ]

    channel_id = models.CharField(max_length=50, unique=True, help_text="Unique channel identifier (e.g., 'email', 'slack')")
    name = models.CharField(max_length=100, help_text="Display name")
    description = models.TextField(help_text="Channel description")
    icon = models.CharField(max_length=50, help_text="Ant Design icon name")
    icon_bg = models.CharField(max_length=20, default='#f3f4f6', help_text="Icon background color")
    icon_color = models.CharField(max_length=20, default='#6b7280', help_text="Icon color")
    is_activated = models.BooleanField(default=True, help_text="Whether the channel is enabled for this tenant")
    status = models.CharField(max_length=20, choices=CHANNEL_STATUS_CHOICES, default='active', help_text="Channel availability status")
    is_connected = models.BooleanField(default=False, help_text="Whether the channel has been configured/connected")
    inbox_count = models.PositiveIntegerField(default=0, help_text="Number of inboxes using this channel")
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    config = models.JSONField(default=dict, blank=True, help_text="Channel-specific configuration")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Channel"
        verbose_name_plural = "Channels"
        ordering = ['order', 'name']
        db_table = 'conf_channels'

    def __str__(self):
        return f"{self.name} ({'Active' if self.is_activated else 'Disabled'})"

    @classmethod
    def seed_default_channels(cls):
        """Sync default channels. Creates new, updates existing, deletes removed. Returns (created, updated, deleted) counts."""
        from shared.utilities.enums.channels import ChannelsRegistry

        created_count = 0
        updated_count = 0
        deleted_count = 0

        default_channels = ChannelsRegistry.get_all_channels()
        valid_ids = ChannelsRegistry.get_all_channel_ids()

        # Delete channels no longer in the registry
        orphaned = cls.objects.exclude(channel_id__in=valid_ids)
        deleted_count = orphaned.count()
        orphaned.delete()

        for ch_data in default_channels:
            channel, created = cls.objects.get_or_create(
                channel_id=ch_data['channel_id'],
                defaults=ch_data,
            )
            if created:
                created_count += 1
            else:
                # Update existing channel fields (except is_activated and is_connected which are tenant state)
                changed = False
                for field in ('name', 'description', 'icon', 'icon_bg', 'icon_color', 'status', 'order'):
                    if getattr(channel, field) != ch_data[field]:
                        setattr(channel, field, ch_data[field])
                        changed = True
                if changed:
                    channel.save()
                    updated_count += 1

        return created_count, updated_count, deleted_count

