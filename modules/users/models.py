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
		db_table = "auth_imara_group"

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
		db_table = "auth_imara_role"

	def __str__(self):
		return self.name
	
	def has_permission(self, permission_code):
		"""Check if role has a specific permission."""
		return permission_code in self.permissions


class Organization(models.Model):
	"""Business Unit model - represents organizational units/departments."""
	name = models.CharField(max_length=128, unique=True)
	domain = models.CharField(max_length=128, blank=True, help_text="Primary domain for the business unit")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["name"]
		verbose_name = "Business Unit"
		verbose_name_plural = "Business Units"
		db_table = "auth_imara_organization"

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
		db_table = "auth_imara_user_profile"
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


class PasswordResetToken(models.Model):
	"""Token for password reset requests."""
	user = models.ForeignKey(User, related_name="password_reset_tokens", on_delete=models.CASCADE)
	token = models.CharField(max_length=64, unique=True)
	created_at = models.DateTimeField(auto_now_add=True)
	expires_at = models.DateTimeField()
	is_used = models.BooleanField(default=False)
	
	class Meta:
		ordering = ["-created_at"]
		db_table = "auth_imara_password_reset_token"
		indexes = [
			models.Index(fields=["token"]),
			models.Index(fields=["expires_at"]),
		]
	
	def __str__(self):
		return f"Password reset for {self.user.email}"
	
	@property
	def is_valid(self):
		"""Check if token is still valid (not expired and not used)."""
		from django.utils import timezone
		return not self.is_used and self.expires_at > timezone.now()
	
	@classmethod
	def create_token(cls, user, expires_hours=24):
		"""Create a new password reset token for a user."""
		import secrets
		from django.utils import timezone
		from datetime import timedelta
		
		# Invalidate any existing tokens for this user
		cls.objects.filter(user=user, is_used=False).update(is_used=True)
		
		# Create new token
		token = secrets.token_urlsafe(32)
		expires_at = timezone.now() + timedelta(hours=expires_hours)
		
		return cls.objects.create(
			user=user,
			token=token,
			expires_at=expires_at
		)


class UserInvitation(models.Model):
	"""Email invitation for someone to join the workspace with a given role."""

	class Status(models.TextChoices):
		PENDING = 'pending', 'Pending'
		ACCEPTED = 'accepted', 'Accepted'
		REVOKED = 'revoked', 'Revoked'

	email = models.EmailField()
	role = models.ForeignKey(Role, related_name="invitations", on_delete=models.SET_NULL, null=True, blank=True)
	invited_by = models.ForeignKey(User, related_name="sent_invitations", on_delete=models.SET_NULL, null=True, blank=True)
	token = models.CharField(max_length=64, unique=True)
	status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
	created_at = models.DateTimeField(auto_now_add=True)
	expires_at = models.DateTimeField()
	accepted_at = models.DateTimeField(null=True, blank=True)
	accepted_by = models.ForeignKey(User, related_name="accepted_invitations", on_delete=models.SET_NULL, null=True, blank=True)

	class Meta:
		ordering = ["-created_at"]
		db_table = "auth_imara_user_invitation"
		indexes = [
			models.Index(fields=["email", "status"]),
		]

	def __str__(self):
		return f"Invitation for {self.email}"

	@property
	def is_expired(self):
		from django.utils import timezone
		return self.expires_at <= timezone.now()

	@property
	def is_valid(self):
		"""Pending and not expired."""
		return self.status == self.Status.PENDING and not self.is_expired

	@classmethod
	def create_for(cls, email, role, invited_by, expires_days=7):
		"""Create a fresh invitation, revoking any earlier pending one for the same email."""
		import secrets
		from django.utils import timezone
		from datetime import timedelta

		email = email.strip().lower()
		cls.objects.filter(email__iexact=email, status=cls.Status.PENDING).update(status=cls.Status.REVOKED)
		return cls.objects.create(
			email=email,
			role=role,
			invited_by=invited_by,
			token=secrets.token_urlsafe(32),
			expires_at=timezone.now() + timedelta(days=expires_days),
		)


class AuditLog(models.Model):
	"""Audit log to track user actions and login history."""
	
	class ActionType(models.TextChoices):
		LOGIN = 'login', 'Login'
		LOGOUT = 'logout', 'Logout'
		LOGIN_FAILED = 'login_failed', 'Login Failed'
		PASSWORD_CHANGE = 'password_change', 'Password Change'
		PASSWORD_RESET = 'password_reset', 'Password Reset'
		PROFILE_UPDATE = 'profile_update', 'Profile Update'
		TWO_FA_ENABLED = '2fa_enabled', '2FA Enabled'
		TWO_FA_DISABLED = '2fa_disabled', '2FA Disabled'
		TICKET_CREATED = 'ticket_created', 'Ticket Created'
		TICKET_UPDATED = 'ticket_updated', 'Ticket Updated'
		SETTINGS_CHANGE = 'settings_change', 'Settings Changed'
		API_ACCESS = 'api_access', 'API Access'
		OTHER = 'other', 'Other'
	
	user = models.ForeignKey(User, related_name='audit_logs', on_delete=models.CASCADE)
	action = models.CharField(max_length=32, choices=ActionType.choices)
	description = models.TextField(blank=True, help_text="Additional details about the action")
	ip_address = models.GenericIPAddressField(null=True, blank=True)
	user_agent = models.TextField(blank=True, help_text="Browser/client user agent string")
	device_type = models.CharField(max_length=32, blank=True, help_text="desktop, mobile, tablet")
	browser = models.CharField(max_length=64, blank=True, help_text="Browser name and version")
	os = models.CharField(max_length=64, blank=True, help_text="Operating system")
	location = models.CharField(max_length=128, blank=True, help_text="Approximate location based on IP")
	metadata = models.JSONField(default=dict, blank=True, help_text="Additional structured data")
	status = models.CharField(max_length=16, default='success', help_text="success, failed, warning")
	created_at = models.DateTimeField(auto_now_add=True)
	
	class Meta:
		ordering = ['-created_at']
		db_table = "auth_imara_audit_log"
		indexes = [
			models.Index(fields=['user', '-created_at']),
			models.Index(fields=['action', '-created_at']),
			models.Index(fields=['-created_at']),
		]
	
	def __str__(self):
		return f"{self.user.email} - {self.get_action_display()} at {self.created_at}"


class UserDevice(models.Model):
	"""Track user devices and active sessions."""
	
	class DeviceType(models.TextChoices):
		DESKTOP = 'desktop', 'Desktop'
		MOBILE = 'mobile', 'Mobile'
		TABLET = 'tablet', 'Tablet'
		OTHER = 'other', 'Other'
	
	user = models.ForeignKey(User, related_name='devices', on_delete=models.CASCADE)
	device_id = models.CharField(max_length=64, db_index=True, help_text="Unique device identifier/fingerprint")
	device_name = models.CharField(max_length=128, blank=True, help_text="Device name or identifier")
	device_type = models.CharField(max_length=16, choices=DeviceType.choices, default=DeviceType.DESKTOP)
	browser = models.CharField(max_length=64, blank=True)
	browser_version = models.CharField(max_length=32, blank=True)
	os = models.CharField(max_length=64, blank=True)
	os_version = models.CharField(max_length=32, blank=True)
	ip_address = models.GenericIPAddressField(null=True, blank=True)
	location = models.CharField(max_length=128, blank=True)
	is_current = models.BooleanField(default=False, help_text="Currently active device")
	is_trusted = models.BooleanField(default=False, help_text="User marked as trusted device")
	last_active = models.DateTimeField(auto_now=True)
	first_seen = models.DateTimeField(auto_now_add=True)
	session_key = models.CharField(max_length=64, blank=True, help_text="Associated session key")
	
	class Meta:
		ordering = ['-last_active']
		db_table = "auth_imara_user_device"
		indexes = [
			models.Index(fields=['user', '-last_active']),
			models.Index(fields=['device_id']),
			models.Index(fields=['session_key']),
		]
		unique_together = ['user', 'device_id']
	
	def __str__(self):
		return f"{self.user.email} - {self.device_name or self.device_type} ({self.browser})"
