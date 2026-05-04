from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


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
    
    # UUID
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        blank=True,
        null=True,
        help_text="Universally unique identifier for the task"
    )
    
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
        'ticket.Ticket',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='related_tasks',
        help_text="Ticket this task is related to"
    )
    converted_from_ticket = models.ForeignKey(
        'ticket.Ticket',
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
    
    # Notification tracking
    overdue_notification_sent = models.BooleanField(default=False, help_text="Has overdue notification been sent?")
    due_soon_notification_sent = models.BooleanField(default=False, help_text="Has due soon notification been sent?")
    
    class Meta:
        ordering = ['-created_at']
        db_table = 'task'
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
        db_table = 'task_comment'
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
        db_table = 'task_attachment'
    
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
        db_table = 'task_activity_stream'
        indexes = [
            models.Index(fields=['task', '-created_at']),
            models.Index(fields=['activity_type']),
            models.Index(fields=['actor']),
        ]
        verbose_name_plural = 'Task activity streams'
    
    def __str__(self):
        actor_name = self.actor.get_full_name() if self.actor else "System"
        return f"{self.activity_type} by {actor_name} on Task #{self.task.id}"
