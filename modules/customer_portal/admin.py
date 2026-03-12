from django.contrib import admin
from .models import (
    Customer, 
    CustomerContact, 
    CustomerTicket, 
    CustomerTicketComment,
    CustomerAsset,
    CustomerPortalSettings
)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'status', 'tier', 'account_owner', 'portal_enabled', 'created_at']
    list_filter = ['status', 'tier', 'portal_enabled', 'created_at']
    search_fields = ['name', 'email', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'email', 'phone', 'website')
        }),
        ('Address', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'),
            'classes': ('collapse',)
        }),
        ('Account Details', {
            'fields': ('status', 'tier', 'account_owner')
        }),
        ('Portal Access', {
            'fields': ('portal_enabled', 'allow_ticket_creation', 'allow_kb_access')
        }),
        ('Billing', {
            'fields': ('billing_email', 'tax_id'),
            'classes': ('collapse',)
        }),
        ('Notes & Custom Fields', {
            'fields': ('notes', 'custom_fields'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CustomerContact)
class CustomerContactAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'customer', 'email', 'role', 'is_primary', 'portal_access', 'created_at']
    list_filter = ['role', 'is_primary', 'portal_access', 'receive_notifications']
    search_fields = ['first_name', 'last_name', 'email', 'customer__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Customer', {
            'fields': ('customer', 'user')
        }),
        ('Contact Information', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'job_title')
        }),
        ('Role & Access', {
            'fields': ('role', 'is_primary', 'portal_access', 'receive_notifications')
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CustomerTicket)
class CustomerTicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_number', 'customer', 'subject', 'status', 'priority', 'assigned_to', 'created_at']
    list_filter = ['status', 'priority', 'portal_visible', 'created_at']
    search_fields = ['ticket_number', 'subject', 'customer__name', 'contact__email']
    readonly_fields = ['ticket_number', 'created_at', 'updated_at', 'resolved_at', 'closed_at']
    
    fieldsets = (
        ('Ticket Information', {
            'fields': ('ticket_number', 'customer', 'contact', 'subject', 'description')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'assigned_to')
        }),
        ('Portal Settings', {
            'fields': ('portal_visible',)
        }),
        ('Customer Satisfaction', {
            'fields': ('customer_satisfaction_rating', 'customer_feedback'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'resolved_at', 'closed_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_resolved', 'mark_as_closed']
    
    def mark_as_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='resolved', resolved_at=timezone.now())
        self.message_user(request, f'{updated} ticket(s) marked as resolved.')
    mark_as_resolved.short_description = "Mark selected tickets as resolved"
    
    def mark_as_closed(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='closed', closed_at=timezone.now())
        self.message_user(request, f'{updated} ticket(s) marked as closed.')
    mark_as_closed.short_description = "Mark selected tickets as closed"


@admin.register(CustomerTicketComment)
class CustomerTicketCommentAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'author', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['ticket__ticket_number', 'comment', 'author__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Comment Details', {
            'fields': ('ticket', 'author', 'comment', 'is_internal')
        }),
        ('Attachments', {
            'fields': ('attachments',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CustomerAsset)
class CustomerAssetAdmin(admin.ModelAdmin):
    list_display = ['name', 'asset_tag', 'customer', 'status', 'warranty_expiry', 'support_expiry', 'created_at']
    list_filter = ['status', 'warranty_expiry', 'support_expiry', 'created_at']
    search_fields = ['name', 'asset_tag', 'serial_number', 'customer__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Customer', {
            'fields': ('customer',)
        }),
        ('Asset Details', {
            'fields': ('name', 'asset_tag', 'serial_number', 'model', 'manufacturer')
        }),
        ('Status & Lifecycle', {
            'fields': ('status', 'purchase_date', 'warranty_expiry')
        }),
        ('Support', {
            'fields': ('support_level', 'support_expiry')
        }),
        ('Additional Information', {
            'fields': ('notes', 'custom_fields'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CustomerPortalSettings)
class CustomerPortalSettingsAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'enable_portal', 'allow_guest_tickets', 'updated_at']
    
    fieldsets = (
        ('Portal Branding', {
            'fields': ('portal_title', 'portal_logo', 'portal_welcome_message')
        }),
        ('Portal Features', {
            'fields': ('enable_portal', 'allow_guest_tickets', 'require_approval_for_new_contacts')
        }),
        ('Ticket Settings', {
            'fields': ('default_ticket_priority', 'auto_assign_tickets', 
                      'notify_on_new_ticket', 'notify_customer_on_update')
        }),
        ('Knowledge Base Integration', {
            'fields': ('show_kb_in_portal', 'suggest_kb_before_ticket')
        }),
        ('Customer Satisfaction', {
            'fields': ('enable_satisfaction_survey', 'survey_delay_hours')
        }),
        ('Asset Management', {
            'fields': ('show_assets_in_portal', 'allow_customers_to_add_assets')
        }),
        ('Security', {
            'fields': ('require_2fa_for_portal', 'session_timeout_minutes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def has_add_permission(self, request):
        return not CustomerPortalSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False
