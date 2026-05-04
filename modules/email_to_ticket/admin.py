from django.contrib import admin
from .models import HelpEmail, ProcessedEmail, OutlookMailbox, CustomIMAPMailbox


@admin.register(OutlookMailbox)
class OutlookMailboxAdmin(admin.ModelAdmin):
    list_display = ['email_address', 'display_name', 'is_active', 'auto_create_tickets', 'last_sync_at']
    list_filter = ['is_active', 'auto_create_tickets', 'auto_reply']
    search_fields = ['email_address', 'display_name']
    readonly_fields = ['mailbox_id', 'azure_tenant_id', 'token_expires_at', 'created_at', 'updated_at', 'last_sync_at']

    fieldsets = (
        ('Mailbox Info', {
            'fields': ('email_address', 'display_name', 'mailbox_id', 'is_active')
        }),
        ('OAuth Credentials', {
            'fields': ('access_token', 'refresh_token', 'token_expires_at', 'scope', 'azure_tenant_id'),
            'classes': ('collapse',),
            'description': 'OAuth tokens are managed automatically. Only edit if you know what you are doing.'
        }),
        ('Ticket Settings', {
            'fields': ('auto_create_tickets', 'auto_reply', 'default_priority')
        }),
        ('Processing Settings', {
            'fields': ('folder_to_watch', 'mark_as_read', 'move_to_folder')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_sync_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CustomIMAPMailbox)
class CustomIMAPMailboxAdmin(admin.ModelAdmin):
    list_display = ['email_address', 'display_name', 'imap_host', 'is_active', 'last_sync_at']
    list_filter = ['is_active', 'auto_create_tickets']
    search_fields = ['email_address', 'display_name', 'imap_host']
    readonly_fields = ['created_at', 'updated_at', 'last_sync_at']

    fieldsets = (
        ('Mailbox Info', {
            'fields': ('email_address', 'display_name', 'is_active')
        }),
        ('IMAP Settings', {
            'fields': ('imap_host', 'imap_port', 'imap_use_ssl', 'username', 'password')
        }),
        ('SMTP Settings', {
            'fields': ('enable_smtp', 'smtp_host', 'smtp_port', 'smtp_use_tls', 'smtp_use_ssl'),
            'classes': ('collapse',),
        }),
        ('Ticket Settings', {
            'fields': ('auto_create_tickets', 'auto_reply', 'default_priority')
        }),
        ('Processing Settings', {
            'fields': ('folder_to_watch', 'mark_as_read', 'move_to_folder')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_sync_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(HelpEmail)
class HelpEmailAdmin(admin.ModelAdmin):
    list_display = ['email_address', 'is_active', 'auto_create_tickets', 'created_at']
    list_filter = ['is_active', 'auto_create_tickets', 'auto_reply']
    search_fields = ['email_address']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ProcessedEmail)
class ProcessedEmailAdmin(admin.ModelAdmin):
    list_display = ['message_id', 'from_address', 'subject', 'ticket_created', 'processed_at']
    list_filter = ['ticket_created', 'processed_at']
    search_fields = ['message_id', 'from_address', 'subject', 'ticket_number']
    readonly_fields = ['message_id', 'from_address', 'to_address', 'subject',
                       'received_at', 'processed_at', 'ticket_created', 'ticket_number', 'error_message']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
