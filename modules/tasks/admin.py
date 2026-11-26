from django.contrib import admin
from .models import Project, ProjectActivity, Task, TaskType, TaskComment, TaskAttachment, TaskActivityStream


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'task_type', 'priority', 'created_by', 'assignee', 'due_date', 'created_at')
    list_filter = ('status', 'task_type', 'priority', 'group', 'created_at', 'due_date')
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
            'fields': ('project', 'related_ticket', 'converted_from_ticket', 'converted_to_ticket', 'converted_to_work_item')
        }),
        ('Additional', {
            'fields': ('tags', 'due_date', 'completed_at', 'created_at', 'updated_at')
        }),
    )


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'status', 'owner', 'target_date', 'is_archived', 'updated_at')
    list_filter = ('status', 'is_archived')
    search_fields = ('name', 'description')
    readonly_fields = ('uuid', 'created_at', 'updated_at', 'archived_at')


@admin.register(ProjectActivity)
class ProjectActivityAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'activity_type', 'actor', 'created_at')
    list_filter = ('activity_type',)


@admin.register(TaskType)
class TaskTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'color', 'position', 'is_active')
    list_editable = ('position', 'is_active')
