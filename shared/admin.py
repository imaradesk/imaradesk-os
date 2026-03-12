from django.contrib import admin
from .models import Client, Domain


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_on', 'is_active', 'is_verified']
    list_filter = ['is_active', 'is_verified', 'created_on']
    search_fields = ['name', 'description']
    readonly_fields = ['created_on', 'verified_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description')
        }),
        ('Status', {
            'fields': ('is_active', 'is_verified', 'verified_at', 'created_on')
        }),
    )


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['domain', 'tenant', 'is_primary']
    list_filter = ['is_primary']
    search_fields = ['domain', 'tenant__name']
