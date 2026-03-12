from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Group(models.Model):
	"""Agent groups for organizing support agents."""
	name = models.CharField(max_length=128, unique=True)
	description = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["name"]

	def __str__(self):
		return self.name


class Role(models.Model):
	"""Custom role model for fine-grained permissions."""
	name = models.CharField(max_length=64, unique=True)
	description = models.TextField(blank=True)
	permissions = models.JSONField(default=list, help_text="List of permission codes")
	is_system = models.BooleanField(default=False, help_text="System roles cannot be deleted")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["name"]

	def __str__(self):
		return self.name
	
	def has_permission(self, permission_code):
		"""Check if role has a specific permission."""
		return permission_code in self.permissions


class Organization(models.Model):
	class Plan(models.TextChoices):
		BASIC = "basic", "Basic"
		PROFESSIONAL = "professional", "Professional"
		ENTERPRISE = "enterprise", "Enterprise"

	name = models.CharField(max_length=128, unique=True)
	domain = models.CharField(max_length=128, blank=True, help_text="Primary domain for the organization")
	plan = models.CharField(max_length=32, choices=Plan.choices, default=Plan.BASIC)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["name"]
		indexes = [
			models.Index(fields=["plan"]),
		]

	def __str__(self):
		return self.name


class UserProfile(models.Model):
	user = models.OneToOneField(User, related_name="profile", on_delete=models.CASCADE)

	full_name = models.CharField(max_length=128, blank=True)
	phone = models.CharField(max_length=32, blank=True)
	job_title = models.CharField(max_length=64, blank=True)
	department = models.CharField(max_length=64, blank=True)
	timezone = models.CharField(max_length=64, blank=True, default="UTC")
	avatar_url = models.URLField(blank=True)

	is_agent = models.BooleanField(default=False)
	is_customer = models.BooleanField(default=True)

	# Two-Factor Authentication
	email_2fa_enabled = models.BooleanField(default=False, help_text="Email-based 2FA is enabled")
	authenticator_2fa_enabled = models.BooleanField(default=False, help_text="Authenticator app 2FA is enabled")
	totp_secret = models.CharField(max_length=64, blank=True, help_text="TOTP secret key for authenticator app")
	email_2fa_code = models.CharField(max_length=6, blank=True, help_text="Temporary email verification code")
	email_2fa_code_expires = models.DateTimeField(null=True, blank=True, help_text="Email code expiration time")

	organization = models.ForeignKey(Organization, related_name="members", on_delete=models.SET_NULL, null=True, blank=True)
	role = models.ForeignKey(Role, related_name="users", on_delete=models.SET_NULL, null=True, blank=True)
	groups = models.ManyToManyField(Group, related_name="members", blank=True)
	custom_permissions = models.JSONField(default=list, help_text="Additional permissions specific to this user")

	preferences = models.JSONField(default=dict, blank=True)

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["user__username"]
		indexes = [
			models.Index(fields=["is_agent"]),
			models.Index(fields=["organization"]),
		]

	def __str__(self):
		return self.full_name or self.user.get_username()
	
	def has_permission(self, permission_code):
		"""Check if user has a specific permission through role or custom permissions."""
		# Check custom permissions first
		if permission_code in self.custom_permissions:
			return True
		# Check role permissions
		if self.role and self.role.has_permission(permission_code):
			return True
		return False
