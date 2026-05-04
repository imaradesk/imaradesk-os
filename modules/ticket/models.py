from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from modules.users.models import Organization
import uuid

User = get_user_model()


class Department(models.Model):
    """Department for ticket categorization."""
    name = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        db_table = 'ticket_department'
    
    def __str__(self):
        return self.name


class Ticket(models.Model):
    """Ticket model for support/helpdesk system."""

    TICKET_SOURCE_CHOICES = [
        ('email', 'Email'),
        ('web', 'Web/Portal'),
        ('phone', 'Phone'),
        ('chat', 'Live Chat'),
        ('chatbot', 'AI Chatbot'),
        ('api', 'API/Integrations'),
        ('internal', 'Internal/Staff-created'),
        ('customer_portal', 'Customer Portal'),
        ('telegram', 'Telegram'),
        ('whatsapp', 'WhatsApp'),
    ]

    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        NEW = 'new', 'New'
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        PENDING = 'pending', 'Pending'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'
    
    class Type(models.TextChoices):
        QUESTION = 'question', 'Question'
        INCIDENT = 'incident', 'Incident'
        PROBLEM = 'problem', 'Problem'
        TASK = 'task', 'Task'
    
    # Ticket Number
    ticket_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        editable=False,
        db_index=True,
        help_text="Unique ticket number (9-character alphanumeric string)"
    )
    
    # Basic Information
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    # Source field
    source = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        choices=TICKET_SOURCE_CHOICES,
        default='web',
        help_text="How the ticket was created"
    )

    # Channel relationship
    channel = models.ForeignKey(
        'settings.Channel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets',
        help_text="Communication channel through which this ticket was created"
    )

    
    # People
    requester = models.ForeignKey(
        User, 
        related_name='requested_tickets', 
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Person who submitted the ticket (null for guest tickets)"
    )
    assignee = models.ForeignKey(
        User, 
        related_name='assigned_tickets', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Agent assigned to handle the ticket"
    )

    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        blank=True,
        null=True,
        help_text="Universally unique identifier for the ticket"
    )
    
    # Guest ticket fields (for tickets from non-authenticated users)
    is_guest_ticket = models.BooleanField(
        default=False,
        help_text="Whether this ticket was created by a guest (non-authenticated user)"
    )
    
    guest_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Name of guest who created the ticket"
    )
    guest_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Email of guest who created the ticket"
    )
    guest_phone = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Phone number of guest who created the ticket"
    )
    watchers = models.ManyToManyField(
        User, 
        related_name='watching_tickets', 
        blank=True,
        help_text="Users watching this ticket for updates"
    )
    
    # Categorization
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.QUESTION)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    group = models.ForeignKey('users.Group', on_delete=models.SET_NULL, null=True, blank=True, help_text="Assignment group for the ticket")
    tags = models.JSONField(default=list, blank=True, help_text="List of tags for categorization")
    
    # Merge tracking
    merged_into = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='merged_tickets',
        help_text="Parent ticket this ticket was merged into"
    )
    merged_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this ticket was merged"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    @property
    def is_merged(self):
        """Check if this ticket has been merged into another ticket."""
        return self.merged_into is not None
    
    @property
    def caller(self):
        """
        Get the ticket requester info (name, email) regardless of whether
        it's a registered user or guest.
        
        Returns:
            dict: {'name': str, 'email': str}
        """
        if self.requester:
            return {
                'name': self.requester.get_full_name() or self.requester.username,
                'email': self.requester.email,
            }
        elif self.is_guest_ticket:
            return {
                'name': self.guest_name or (self.guest_email.split('@')[0] if self.guest_email else 'Guest'),
                'email': self.guest_email or '',
            }
        return {
            'name': 'Unknown',
            'email': '',
        }

    @property
    def computed_status(self):
        """
        Get a dynamically computed status based on actual ticket state.
        This provides a more accurate status than the stored status field
        by considering assignee, SLA state, and resolution.
        
        Returns:
            str: The computed status (new, open, in_progress, pending, resolved, closed)
        """
        # If explicitly closed, respect that
        if self.status == 'closed':
            return 'closed'
        
        # If explicitly resolved, respect that
        if self.status == 'resolved':
            return 'resolved'
        
        # Check SLA hold state (for pending/on hold)
        try:
            if hasattr(self, 'sla') and self.sla and self.sla.is_on_hold:
                return 'pending'  # On Hold / Pending
        except Exception:
            pass
        
        # If status is explicitly set to in_progress or pending, respect it
        if self.status in ['in_progress', 'pending']:
            return self.status
        
        # Determine based on assignment for new/open statuses
        if self.assignee is not None:
            # Has agent assigned - at minimum it's "open"
            return 'open'
        
        # No assignee - it's new
        return 'new'

    @property
    def sla_info(self):
        """
        Get comprehensive SLA information for this ticket.
        
        Returns:
            dict or None: SLA data including status, due dates, breach info, 
                         time remaining/overdue, or None if no SLA attached or ticket is merged.
        """
        # Merged tickets should not show SLA info
        if self.merged_into_id is not None:
            return None
        
        # Closed/resolved tickets should not show SLA info
        if self.status in ['closed', 'resolved']:
            return None
        
        try:
            ticket_sla = self.sla
        except Exception:
            return None
        
        if not ticket_sla:
            return None
        
        # If SLA is on hold, return hold state without breach info
        if ticket_sla.is_on_hold:
            return {
                'policy_name': ticket_sla.policy.name if ticket_sla.policy else None,
                'overall_status': 'on_hold',
                'is_on_hold': True,
                'hold_reason': ticket_sla.hold_reason,
                'response': {
                    'due_at': ticket_sla.response_due_at.isoformat() if ticket_sla.response_due_at else None,
                    'breached': False,
                    'status': 'on_hold',
                    'hours_remaining': None,
                    'hours_overdue': None,
                },
                'resolution': {
                    'due_at': ticket_sla.resolution_due_at.isoformat() if ticket_sla.resolution_due_at else None,
                    'breached': False,
                    'status': 'on_hold',
                    'hours_remaining': None,
                    'hours_overdue': None,
                },
            }
        
        now = timezone.now()
        
        # Calculate response SLA details
        response_due = ticket_sla.response_due_at
        response_breached = ticket_sla.response_breached
        response_remaining = None
        response_overdue = None
        response_status = 'pending'
        
        if response_due:
            time_diff = response_due - now
            total_seconds = time_diff.total_seconds()
            
            if response_breached or total_seconds < 0:
                response_status = 'breached'
                response_overdue = abs(total_seconds) / 3600  # hours
            else:
                response_remaining = total_seconds / 3600  # hours
                if response_remaining <= 1:  # Less than 1 hour
                    response_status = 'at_risk'
                else:
                    response_status = 'on_track'
        
        # Calculate resolution SLA details
        resolution_due = ticket_sla.resolution_due_at
        resolution_breached = ticket_sla.resolution_breached
        resolution_remaining = None
        resolution_overdue = None
        resolution_status = 'pending'
        
        if resolution_due:
            time_diff = resolution_due - now
            total_seconds = time_diff.total_seconds()
            
            if resolution_breached or total_seconds < 0:
                resolution_status = 'breached'
                resolution_overdue = abs(total_seconds) / 3600  # hours
            else:
                resolution_remaining = total_seconds / 3600  # hours
                if resolution_remaining <= 2:  # Less than 2 hours
                    resolution_status = 'at_risk'
                else:
                    resolution_status = 'on_track'
        
        # Overall SLA status (based on calculated statuses, not just DB flags)
        if resolution_status == 'breached':
            overall_status = 'breached'
        elif response_status == 'at_risk' or resolution_status == 'at_risk':
            overall_status = 'at_risk'
        else:
            overall_status = 'on_track'
        
        return {
            'policy_name': ticket_sla.policy.name if ticket_sla.policy else None,
            'overall_status': overall_status,
            'is_on_hold': False,
            'hold_reason': None,
            'response': {
                'due_at': response_due.isoformat() if response_due else None,
                'breached': response_status == 'breached',
                'status': response_status,
                'hours_remaining': round(response_remaining, 2) if response_remaining is not None else None,
                'hours_overdue': round(response_overdue, 2) if response_overdue is not None else None,
            },
            'resolution': {
                'due_at': resolution_due.isoformat() if resolution_due else None,
                'breached': resolution_status == 'breached',
                'status': resolution_status,
                'hours_remaining': round(resolution_remaining, 2) if resolution_remaining is not None else None,
                'hours_overdue': round(resolution_overdue, 2) if resolution_overdue is not None else None,
            },
        }

    class Meta:
        ordering = ['-created_at']
        db_table = 'ticket'
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['assignee', 'status']),
            models.Index(fields=['requester']),
            models.Index(fields=['priority']),
        ]
    
    def __str__(self):
        if self.ticket_number:
            return f"{self.ticket_number} - {self.title}"
        return f"#{self.id} - {self.title}"
    
    def _generate_ticket_number(self):
        """Generate a unique ticket number in format INC{6-char hex from UUID}"""
        import uuid
        
        max_attempts = 100
        for _ in range(max_attempts):
            # Generate ticket number like INC04E5B
            code = uuid.uuid4().hex[:6].upper()
            ticket_number = f"INC{code}"
            
            # Check if this ticket number already exists
            if not Ticket.objects.filter(ticket_number=ticket_number).exists():
                return ticket_number
        
        # Fallback: use timestamp-based code if random fails
        from django.utils import timezone
        timestamp = str(int(timezone.now().timestamp() * 1000))
        code = uuid.uuid5(uuid.NAMESPACE_DNS, timestamp).hex[:6].upper()
        return f"INC{code}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_instance = None
        
        # Generate ticket number for new tickets
        if is_new and not self.ticket_number:
            self.ticket_number = self._generate_ticket_number()
        
        if not is_new:
            try:
                old_instance = Ticket.objects.get(pk=self.pk)
            except Ticket.DoesNotExist:
                pass
        
        # Auto-set resolved_at when status changes to resolved
        # Clear resolved_at when status is no longer resolved or closed
        if self.status == self.Status.RESOLVED:
            if not self.resolved_at or (old_instance and old_instance.status != self.Status.RESOLVED):
                from django.utils import timezone
                self.resolved_at = timezone.now()
        elif self.status not in (self.Status.RESOLVED, self.Status.CLOSED) and self.resolved_at:
            self.resolved_at = None
        
        super().save(*args, **kwargs)
        
        # Create activity stream entries
        if is_new:
            # Get creator name for activity log
            creator_name = 'Unknown'
            if self.is_guest_ticket and self.guest_name:
                creator_name = f"{self.guest_name} (Guest)"
            elif self.requester:
                creator_name = self.requester.get_full_name() if self.requester.get_full_name() else self.requester.username
            
            ActivityStream.objects.create(
                ticket=self,
                activity_type=ActivityStream.ActivityType.TICKET_CREATED,
                actor=self.requester,
                description=f"Ticket created by {creator_name}",
                metadata={'initial_status': self.status, 'initial_priority': self.priority, 'is_guest': self.is_guest_ticket}
            )
        elif old_instance:
            # Track status changes
            if old_instance.status != self.status:
                ActivityStream.objects.create(
                    ticket=self,
                    activity_type=ActivityStream.ActivityType.STATUS_CHANGED,
                    description=f"Status changed from {old_instance.get_status_display()} to {self.get_status_display()}",
                    metadata={'old_value': old_instance.status, 'new_value': self.status}
                )
            
            # Track priority changes
            if old_instance.priority != self.priority:
                ActivityStream.objects.create(
                    ticket=self,
                    activity_type=ActivityStream.ActivityType.PRIORITY_CHANGED,
                    description=f"Priority changed from {old_instance.get_priority_display()} to {self.get_priority_display()}",
                    metadata={'old_value': old_instance.priority, 'new_value': self.priority}
                )
            
            # Track assignment changes
            if old_instance.assignee != self.assignee:
                if self.assignee:
                    ActivityStream.objects.create(
                        ticket=self,
                        activity_type=ActivityStream.ActivityType.ASSIGNED,
                        actor=self.assignee,
                        description=f"Assigned to {self.assignee.get_full_name() or self.assignee.username}",
                        metadata={'assignee_id': self.assignee.id}
                    )
                else:
                    ActivityStream.objects.create(
                        ticket=self,
                        activity_type=ActivityStream.ActivityType.UNASSIGNED,
                        description=f"Unassigned from {old_instance.assignee.get_full_name() if old_instance.assignee else 'Unknown'}",
                        metadata={'previous_assignee_id': old_instance.assignee.id if old_instance.assignee else None}
                    )
            
            # Track department changes
            if old_instance.department != self.department:
                ActivityStream.objects.create(
                    ticket=self,
                    activity_type=ActivityStream.ActivityType.DEPARTMENT_CHANGED,
                    description=f"Department changed to {self.department.name if self.department else 'None'}",
                    metadata={
                        'old_value': old_instance.department.name if old_instance.department else None,
                        'new_value': self.department.name if self.department else None
                    }
                )



class TicketAttachment(models.Model):
    """File attachments for tickets."""
    ticket = models.ForeignKey(
        Ticket,
        related_name='attachments',
        on_delete=models.CASCADE
    )
    file_url = models.URLField(max_length=500, help_text="URL of the uploaded file")
    file_name = models.CharField(max_length=255, help_text="Original filename")
    file_size = models.IntegerField(help_text="File size in bytes", null=True, blank=True)
    file_type = models.CharField(max_length=100, blank=True, help_text="MIME type of the file")
    is_internal = models.BooleanField(default=False, help_text="Internal attachments are only visible to agents")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        db_table = 'ticket_attachment'
    
    def __str__(self):
        return f"{self.file_name} - Ticket #{self.ticket.id}"


class TicketComment(models.Model):
    """Comments and replies on tickets."""
    ticket = models.ForeignKey(
        Ticket,
        related_name='comments',
        on_delete=models.CASCADE
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        help_text="User who wrote the comment"
    )
    message = models.TextField(help_text="Comment content")
    
    # Attachments for this specific comment
    attachments = models.JSONField(
        default=list,
        blank=True,
        help_text="List of attachment objects with url, name, size, type"
    )
    
    # Internal notes (only visible to agents)
    is_internal = models.BooleanField(
        default=False,
        help_text="Internal note visible only to agents"
    )
    
    # User mentions (@username)
    mentions = models.ManyToManyField(
        User,
        related_name='mentioned_in_comments',
        blank=True,
        help_text="Users mentioned in this comment"
    )
    
    # Reply metadata
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        help_text="Parent comment if this is a reply"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        db_table = 'ticket_comment'
        indexes = [
            models.Index(fields=['ticket', '-created_at']),
            models.Index(fields=['author']),
        ]
    
    def __str__(self):
        return f"Comment by {self.author} on Ticket #{self.ticket.id}"


class ActivityStream(models.Model):
    """Activity log for ticket events."""
    
    class ActivityType(models.TextChoices):
        TICKET_CREATED = 'ticket_created', 'Ticket Created'
        TICKET_UPDATED = 'ticket_updated', 'Ticket Updated'
        STATUS_CHANGED = 'status_changed', 'Status Changed'
        PRIORITY_CHANGED = 'priority_changed', 'Priority Changed'
        ASSIGNED = 'assigned', 'Assigned'
        UNASSIGNED = 'unassigned', 'Unassigned'
        COMMENT_ADDED = 'comment_added', 'Comment Added'
        ATTACHMENT_ADDED = 'attachment_added', 'Attachment Added'
        TAG_ADDED = 'tag_added', 'Tag Added'
        TAG_REMOVED = 'tag_removed', 'Tag Removed'
        WATCHER_ADDED = 'watcher_added', 'Watcher Added'
        WATCHER_REMOVED = 'watcher_removed', 'Watcher Removed'
        DEPARTMENT_CHANGED = 'department_changed', 'Department Changed'
        DUE_DATE_SET = 'due_date_set', 'Due Date Set'
        DUE_DATE_CHANGED = 'due_date_changed', 'Due Date Changed'
        WORKITEM_ADDED = 'workitem_added', 'Work Item Added'
        WORKITEM_UPDATED = 'workitem_updated', 'Work Item Updated'
        WORKITEM_STATUS_CHANGED = 'workitem_status_changed', 'Work Item Status Changed'
        WORKITEM_COMPLETED = 'workitem_completed', 'Work Item Completed'
        TICKET_MERGED = 'ticket_merged', 'Ticket Merged'
        REOPENED = 'reopened', 'Ticket Reopened'
    
    ticket = models.ForeignKey(
        Ticket,
        related_name='activities',
        on_delete=models.CASCADE
    )
    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="User who performed the action"
    )
    
    # Activity details
    description = models.TextField(
        help_text="Human-readable description of the activity"
    )
    
    # Store additional metadata as JSON
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional data like old_value, new_value, etc."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        db_table = 'ticket_activity_stream'
        indexes = [
            models.Index(fields=['ticket', '-created_at']),
            models.Index(fields=['activity_type']),
            models.Index(fields=['actor']),
        ]
        verbose_name_plural = 'Activity streams'
    
    def __str__(self):
        actor_name = self.actor.get_full_name() if self.actor else "System"
        return f"{self.activity_type} by {actor_name} on Ticket #{self.ticket.id}"


class WorkItem(models.Model):
    """Work items/tasks within a ticket."""
    
    class Status(models.TextChoices):
        TODO = 'todo', 'To Do'
        IN_PROGRESS = 'in_progress', 'In Progress'
        DONE = 'done', 'Done'
        CANCELLED = 'cancelled', 'Cancelled'
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'
    
    # Basic Information
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Relationships
    ticket = models.ForeignKey(
        Ticket,
        related_name='work_items',
        on_delete=models.CASCADE,
        help_text="Ticket this work item belongs to"
    )
    
    # People
    created_by = models.ForeignKey(
        User,
        related_name='created_work_items',
        on_delete=models.CASCADE,
        help_text="User who created the work item"
    )
    assignee = models.ForeignKey(
        User,
        related_name='assigned_work_items',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="User assigned to complete the work item"
    )
    
    # Categorization
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    
    # Work notes
    work_notes = models.TextField(blank=True, help_text="Notes added when completing the work item")
    
    # Dates
    due_date = models.DateField(null=True, blank=True, help_text="Work item due date")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        db_table = 'ticket_work_item'
        indexes = [
            models.Index(fields=['ticket', 'status']),
            models.Index(fields=['assignee']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"Work Item #{self.id} - {self.title} (Ticket {self.ticket.ticket_number})"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_instance = None
        
        if not is_new:
            try:
                old_instance = WorkItem.objects.get(pk=self.pk)
            except WorkItem.DoesNotExist:
                pass
        
        # Auto-set completed_at when status changes to done
        if self.status == self.Status.DONE and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()
        elif self.status != self.Status.DONE and self.completed_at:
            # Clear completed_at if status changes from done to something else
            self.completed_at = None
        
        super().save(*args, **kwargs)
        
        # Create activity stream entries
        if is_new:
            ActivityStream.objects.create(
                ticket=self.ticket,
                activity_type=ActivityStream.ActivityType.WORKITEM_ADDED,
                actor=self.created_by,
                description=f"Work item '{self.title}' added",
                metadata={'work_item_id': self.id, 'title': self.title, 'priority': self.priority}
            )
        elif old_instance:
            # Track status changes
            if old_instance.status != self.status:
                ActivityStream.objects.create(
                    ticket=self.ticket,
                    activity_type=ActivityStream.ActivityType.WORKITEM_STATUS_CHANGED,
                    description=f"Work item '{self.title}' status changed from {old_instance.get_status_display()} to {self.get_status_display()}",
                    metadata={
                        'work_item_id': self.id,
                        'title': self.title,
                        'old_status': old_instance.status,
                        'new_status': self.status
                    }
                )
                
                # Special case for completion
                if self.status == self.Status.DONE:
                    metadata = {'work_item_id': self.id, 'title': self.title}
                    if self.work_notes:
                        metadata['work_notes'] = self.work_notes
                    ActivityStream.objects.create(
                        ticket=self.ticket,
                        activity_type=ActivityStream.ActivityType.WORKITEM_COMPLETED,
                        description=f"Work item '{self.title}' completed",
                        metadata=metadata
                    )


