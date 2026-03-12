from django.contrib import admin
from .models import Organization, UserProfile, Role, Group


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "description", "created_at")
	search_fields = ("name", "description")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "description", "is_system", "created_at")
	list_filter = ("is_system",)
	search_fields = ("name", "description")


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "plan", "domain", "created_at")
	list_filter = ("plan",)
	search_fields = ("name", "domain")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
	list_display = ("id", "user", "full_name", "is_agent", "is_customer", "role", "organization", "updated_at")
	list_filter = ("is_agent", "is_customer", "role", "organization")
	search_fields = ("user__username", "full_name", "department", "job_title")
