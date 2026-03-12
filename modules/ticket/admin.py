from django.contrib import admin
from .models import Ticket, Task, Department, TicketAttachment, TicketComment, ActivityStream, WorkItem


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
    search_fields = ('name', 'description')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'priority', 'created_by', 'assignee', 'due_date', 'created_at')
    list_filter = ('status', 'priority', 'group', 'created_at', 'due_date')
    search_fields = ('title', 'description')
    filter_horizontal = ('watchers',)
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'status', 'priority')
        }),
        ('Assignment', {
            'fields': ('created_by', 'assignee', 'watchers', 'group')
        }),
        ('Relationships', {
            'fields': ('related_ticket', 'converted_from_ticket')
        }),
        ('Additional', {
            'fields': ('tags', 'due_date', 'completed_at', 'created_at', 'updated_at')
        }),
    )


class TicketAttachmentInline(admin.TabularInline):
    model = TicketAttachment
    extra = 0
    readonly_fields = ('uploaded_at',)


class TicketCommentInline(admin.TabularInline):
    model = TicketComment
    extra = 0
    readonly_fields = ('created_at', 'updated_at')


class ActivityStreamInline(admin.TabularInline):
    model = ActivityStream
    extra = 0
    readonly_fields = ('created_at',)
    can_delete = False


class WorkItemInline(admin.TabularInline):
    model = WorkItem
    extra = 0
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    fields = ('title', 'description', 'status', 'priority', 'assignee', 'due_date', 'created_by')


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket_number', 'title', 'status', 'priority', 'type', 'get_requester_display', 'assignee', 'department', 'source', 'created_at')
    list_filter = ('status', 'priority', 'type', 'department', 'source', 'is_guest_ticket', 'created_at')
    search_fields = ('title', 'description', 'ticket_number', 'guest_name', 'guest_email', 'requester__username', 'requester__email')
    filter_horizontal = ('watchers',)
    date_hierarchy = 'created_at'
    readonly_fields = ('ticket_number', 'created_at', 'updated_at', 'resolved_at')
    inlines = [WorkItemInline, TicketAttachmentInline, TicketCommentInline, ActivityStreamInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('ticket_number', 'title', 'description', 'status', 'priority', 'type', 'source')
        }),
        ('Requester Information', {
            'fields': ('requester', 'is_guest_ticket', 'guest_name', 'guest_email', 'guest_phone')
        }),
        ('Assignment', {
            'fields': ('assignee', 'watchers', 'department', 'group')
        }),
        ('Additional', {
            'fields': ('tags', 'created_at', 'updated_at', 'resolved_at')
        }),
    )
    
    def get_requester_display(self, obj):
        """Display requester name or guest name."""
        if obj.is_guest_ticket:
            return f"{obj.guest_name} (Guest)"
        elif obj.requester:
            return str(obj.requester)
        return "N/A"
    get_requester_display.short_description = 'Requester'


@admin.register(TicketAttachment)
class TicketAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'uploaded_at')
    list_filter = ('file_type', 'uploaded_at')
    search_fields = ('file_name', 'ticket__title')
    readonly_fields = ('uploaded_at',)


@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'author', 'is_internal', 'created_at')
    list_filter = ('is_internal', 'created_at')
    search_fields = ('message', 'ticket__title', 'author__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ActivityStream)
class ActivityStreamAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'activity_type', 'actor', 'description', 'created_at')
    list_filter = ('activity_type', 'created_at')
    search_fields = ('description', 'ticket__title', 'actor__username')
    readonly_fields = ('created_at',)


@admin.register(WorkItem)
class WorkItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'ticket', 'status', 'priority', 'assignee', 'due_date', 'created_at')
    list_filter = ('status', 'priority', 'created_at', 'due_date')
    search_fields = ('title', 'description', 'ticket__title', 'ticket__ticket_number')
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'ticket', 'status', 'priority')
        }),
        ('Assignment', {
            'fields': ('created_by', 'assignee', 'due_date')
        }),
        ('Dates', {
            'fields': ('completed_at', 'created_at', 'updated_at')
        }),
    )


