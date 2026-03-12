from django.contrib import admin
from .models import SLAPolicy, BusinessHours, Holiday, SLASettings, TicketSLA


@admin.register(SLASettings)
class SLASettingsAdmin(admin.ModelAdmin):
    list_display = ['enabled', 'auto_pause_resolved', 'escalation_enabled', 'send_notifications', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('SLA Status', {
            'fields': ('enabled',),
            'description': 'Enable or disable SLA tracking globally'
        }),
        ('Automation Settings', {
            'fields': ('auto_pause_resolved', 'auto_resume_reopened', 'escalation_enabled')
        }),
        ('Notifications', {
            'fields': ('send_notifications',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Only allow one instance
        return not SLASettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion
        return False


@admin.register(SLAPolicy)
class SLAPolicyAdmin(admin.ModelAdmin):
    list_display = ['name', 'priority', 'first_response_time', 'resolution_time', 'status', 'created_at']
    list_filter = ['priority', 'status', 'apply_business_hours']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'priority', 'description', 'status')
        }),
        ('SLA Targets', {
            'fields': ('first_response_time', 'resolution_time')
        }),
        ('Configuration', {
            'fields': ('apply_business_hours', 'notify_before_breach')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(BusinessHours)
class BusinessHoursAdmin(admin.ModelAdmin):
    list_display = ['name', 'timezone', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('General', {
            'fields': ('name', 'timezone', 'is_active')
        }),
        ('Monday', {
            'fields': ('monday_enabled', 'monday_start', 'monday_end')
        }),
        ('Tuesday', {
            'fields': ('tuesday_enabled', 'tuesday_start', 'tuesday_end')
        }),
        ('Wednesday', {
            'fields': ('wednesday_enabled', 'wednesday_start', 'wednesday_end')
        }),
        ('Thursday', {
            'fields': ('thursday_enabled', 'thursday_start', 'thursday_end')
        }),
        ('Friday', {
            'fields': ('friday_enabled', 'friday_start', 'friday_end')
        }),
        ('Saturday', {
            'fields': ('saturday_enabled', 'saturday_start', 'saturday_end')
        }),
        ('Sunday', {
            'fields': ('sunday_enabled', 'sunday_start', 'sunday_end')
        }),
        ('Options', {
            'fields': ('pause_outside_hours', 'exclude_holidays')
        }),
    )


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'recurring', 'status', 'created_at']
    list_filter = ['recurring', 'status', 'date']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'


@admin.register(TicketSLA)
class TicketSLAAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'policy', 'response_due_at', 'resolution_due_at', 'response_breached', 'resolution_breached', 'created_at']
    list_filter = ['response_breached', 'resolution_breached', 'policy']
    search_fields = ['ticket__ticket_number', 'ticket__title']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Ticket & Policy', {
            'fields': ('ticket', 'policy')
        }),
        ('Due Dates', {
            'fields': ('response_due_at', 'resolution_due_at')
        }),
        ('Breach Status', {
            'fields': ('response_breached', 'resolution_breached')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Don't allow manual creation - should be automatic
        return False
