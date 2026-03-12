from django.db import models
from django.contrib.auth import get_user_model
from modules.users.models import Organization

User = get_user_model()


class Department(models.Model):
    """Department for ticket categorization."""
    name = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Task(models.Model):
    """Task model for internal work items."""
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        TODO = 'todo', 'To Do'
        IN_PROGRESS = 'in_progress', 'In Progress'
        REVIEW = 'review', 'In Review'
        DONE = 'done', 'Done'
        CANCELLED = 'cancelled', 'Cancelled'
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'
    
    # Basic Information
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    # People
    created_by = models.ForeignKey(
        User,
        related_name='created_tasks',
        on_delete=models.CASCADE,
        help_text="User who created the task"
    )
    assignee = models.ForeignKey(
        User,
        related_name='assigned_tasks',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="User assigned to complete the task"
    )
    watchers = models.ManyToManyField(
        User,
        related_name='watching_tasks',
        blank=True,
        help_text="Users watching this task for updates"
    )
    
    # Categorization
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    group = models.ForeignKey('users.Group', on_delete=models.SET_NULL, null=True, blank=True, help_text="Assignment group for the task")
    tags = models.JSONField(default=list, blank=True, help_text="List of tags for categorization")
    
    # Relationships
    related_ticket = models.ForeignKey(
        'Ticket',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='related_tasks',
        help_text="Ticket this task is related to"
    )
    converted_from_ticket = models.ForeignKey(
        'Ticket',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='converted_tasks',
        help_text="Original ticket if this task was converted from a ticket"
    )
    
    # Dates
    due_date = models.DateField(null=True, blank=True, help_text="Task due date")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['assignee', 'status']),
            models.Index(fields=['created_by']),
            models.Index(fields=['priority']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"Task #{self.id} - {self.title}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_instance = None
        
        if not is_new:
            try:
                old_instance = Task.objects.get(pk=self.pk)
            except Task.DoesNotExist:
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
            TaskActivityStream.objects.create(
                task=self,
                activity_type=TaskActivityStream.ActivityType.TASK_CREATED,
                actor=self.created_by,
                description=f"Task created by {self.created_by.get_full_name() if self.created_by else 'Unknown'}",
                metadata={'initial_status': self.status, 'initial_priority': self.priority}
            )
        elif old_instance:
            # Track status changes
            if old_instance.status != self.status:
                TaskActivityStream.objects.create(
                    task=self,
                    activity_type=TaskActivityStream.ActivityType.STATUS_CHANGED,
                    description=f"Status changed from {old_instance.get_status_display()} to {self.get_status_display()}",
                    metadata={'old_value': old_instance.status, 'new_value': self.status}
                )
            
            # Track priority changes
            if old_instance.priority != self.priority:
                TaskActivityStream.objects.create(
                    task=self,
                    activity_type=TaskActivityStream.ActivityType.PRIORITY_CHANGED,
                    description=f"Priority changed from {old_instance.get_priority_display()} to {self.get_priority_display()}",
                    metadata={'old_value': old_instance.priority, 'new_value': self.priority}
                )
            
            # Track assignment changes
            if old_instance.assignee != self.assignee:
                if self.assignee:
                    TaskActivityStream.objects.create(
                        task=self,
                        activity_type=TaskActivityStream.ActivityType.ASSIGNED,
                        actor=self.assignee,
                        description=f"Assigned to {self.assignee.get_full_name() or self.assignee.username}",
                        metadata={'assignee_id': self.assignee.id}
                    )
                else:
                    TaskActivityStream.objects.create(
                        task=self,
                        activity_type=TaskActivityStream.ActivityType.UNASSIGNED,
                        description=f"Unassigned from {old_instance.assignee.get_full_name() if old_instance.assignee else 'Unknown'}",
                        metadata={'previous_assignee_id': old_instance.assignee.id if old_instance.assignee else None}
                    )
            
            # Track group changes
            if old_instance.group != self.group:
                TaskActivityStream.objects.create(
                    task=self,
                    activity_type=TaskActivityStream.ActivityType.GROUP_CHANGED,
                    description=f"Group changed to {self.group.name if self.group else 'None'}",
                    metadata={
                        'old_value': old_instance.group.name if old_instance.group else None,
                        'new_value': self.group.name if self.group else None
                    }
                )
            
            # Track due date changes
            if old_instance.due_date != self.due_date:
                if old_instance.due_date is None and self.due_date:
                    TaskActivityStream.objects.create(
                        task=self,
                        activity_type=TaskActivityStream.ActivityType.DUE_DATE_SET,
                        description=f"Due date set to {self.due_date.strftime('%Y-%m-%d')}",
                        metadata={'due_date': self.due_date.strftime('%Y-%m-%d')}
                    )
                elif old_instance.due_date and self.due_date:
                    TaskActivityStream.objects.create(
                        task=self,
                        activity_type=TaskActivityStream.ActivityType.DUE_DATE_CHANGED,
                        description=f"Due date changed from {old_instance.due_date.strftime('%Y-%m-%d')} to {self.due_date.strftime('%Y-%m-%d')}",
                        metadata={
                            'old_value': old_instance.due_date.strftime('%Y-%m-%d'),
                            'new_value': self.due_date.strftime('%Y-%m-%d')
                        }
                    )


class TaskComment(models.Model):
    """Comments and replies on tasks."""
    task = models.ForeignKey(
        Task,
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
        indexes = [
            models.Index(fields=['task', '-created_at']),
            models.Index(fields=['author']),
        ]
    
    def __str__(self):
        return f"Comment by {self.author} on Task #{self.task.id}"


class TaskAttachment(models.Model):
    """File attachments for tasks."""
    task = models.ForeignKey(
        Task,
        related_name='attachments',
        on_delete=models.CASCADE
    )
    file_url = models.URLField(max_length=500, help_text="URL of the uploaded file")
    file_name = models.CharField(max_length=255, help_text="Original filename")
    file_size = models.IntegerField(help_text="File size in bytes", null=True, blank=True)
    file_type = models.CharField(max_length=100, blank=True, help_text="MIME type of the file")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.file_name} - Task #{self.task.id}"


class TaskActivityStream(models.Model):
    """Activity log for task events."""
    
    class ActivityType(models.TextChoices):
        TASK_CREATED = 'task_created', 'Task Created'
        TASK_UPDATED = 'task_updated', 'Task Updated'
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
        GROUP_CHANGED = 'group_changed', 'Group Changed'
        DUE_DATE_SET = 'due_date_set', 'Due Date Set'
        DUE_DATE_CHANGED = 'due_date_changed', 'Due Date Changed'
    
    task = models.ForeignKey(
        Task,
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
        indexes = [
            models.Index(fields=['task', '-created_at']),
            models.Index(fields=['activity_type']),
            models.Index(fields=['actor']),
        ]
        verbose_name_plural = 'Task activity streams'
    
    def __str__(self):
        actor_name = self.actor.get_full_name() if self.actor else "System"
        return f"{self.activity_type} by {actor_name} on Task #{self.task.id}"


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

    class Meta:
        ordering = ['-created_at']
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
        if self.status == self.Status.RESOLVED and not self.resolved_at:
            from django.utils import timezone
            self.resolved_at = timezone.now()
        
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


