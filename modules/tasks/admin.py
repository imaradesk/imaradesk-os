from django.contrib import admin
from .models import Task, TaskComment, TaskAttachment, TaskActivityStream


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
