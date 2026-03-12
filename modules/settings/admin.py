from django.contrib import admin
from .models import App, InstalledApp, KnowledgeBaseSettings, SecuritySettings, SecuritySettings


@admin.register(App)
class AppAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'is_free', 'status', 'is_featured', 'install_count']
    list_filter = ['category', 'status', 'is_free', 'is_featured']
    search_fields = ['name', 'description', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['install_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'description', 'long_description', 'icon', 'category')
        }),
        ('Pricing', {
            'fields': ('price', 'is_free')
        }),
        ('Status & Visibility', {
            'fields': ('status', 'is_featured')
        }),
        ('Metadata', {
            'fields': ('version', 'developer', 'install_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(InstalledApp)
class InstalledAppAdmin(admin.ModelAdmin):
    list_display = ['app', 'subscription_status', 'is_active', 'installed_at', 'trial_ends_at']
    list_filter = ['subscription_status', 'is_active']
    search_fields = ['app__name']
    readonly_fields = ['installed_at', 'updated_at']
    
    fieldsets = (
        ('App Information', {
            'fields': ('app', 'is_active')
        }),
        ('Subscription', {
            'fields': ('subscription_status', 'trial_ends_at', 'next_billing_date')
        }),
        ('Configuration', {
            'fields': ('settings',)
        }),
        ('Metadata', {
            'fields': ('installed_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SecuritySettings)
class SecuritySettingsAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'enable_email_2fa', 'enable_authenticator_2fa', 'require_2fa_for_admins', 'updated_at']
    
    fieldsets = (
        ('Two-Factor Authentication Methods', {
            'fields': ('enable_email_2fa', 'enable_authenticator_2fa')
        }),
        ('2FA Requirements', {
            'fields': ('require_2fa_for_admins', 'require_2fa_for_all_users')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def has_add_permission(self, request):
        return not SecuritySettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(KnowledgeBaseSettings)
class KnowledgeBaseSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Access Control', {
            'fields': ('public_access', 'require_login_to_view', 'allow_article_rating', 'allow_article_comments')
        }),
        ('Article Creation & Publishing', {
            'fields': ('require_approval', 'auto_publish_on_approval')
        }),
        ('Approval Workflow', {
            'fields': ('notify_approvers',),
            'classes': ('collapse',)
        }),
        ('Notifications', {
            'fields': ('notify_author_on_approval', 'notify_author_on_rejection'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Only allow one instance
        return not KnowledgeBaseSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion
        return False

