from django.db import models
import secrets
import hashlib
from django.utils import timezone


class Client(models.Model):
    """
    Organization/Business settings model for single-tenant application.
    Stores business-level configuration and metadata.
    """
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)
    
    # Optional: add more business-specific fields
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    # Email verification fields
    is_verified = models.BooleanField(default=False, help_text="Whether the account email has been verified")
    verified_at = models.DateTimeField(blank=True, null=True, help_text="When the account was verified")
    
    # New registration fields
    business_type = models.CharField(max_length=100, blank=True, null=True, help_text="Type of business (e.g., Software, Insurance, Healthcare)")
    org_size = models.CharField(max_length=50, blank=True, null=True, help_text="Organization size range")
    service_types = models.JSONField(blank=True, null=True, help_text="Types of services looking for")
    features_interest = models.JSONField(blank=True, null=True, help_text="Features user wants to explore")
    
    # Registration tracking - Admin who created the business
    created_by_email = models.EmailField(blank=True, null=True, help_text="Email of the admin who registered this business")
    created_by_name = models.CharField(max_length=200, blank=True, null=True, help_text="Name of the admin who registered this business")
    
    # Registration tracking - Location and device info
    registration_ip = models.GenericIPAddressField(blank=True, null=True, help_text="IP address during registration")
    registration_country = models.CharField(max_length=100, blank=True, null=True, help_text="Country from IP geolocation")
    registration_city = models.CharField(max_length=100, blank=True, null=True, help_text="City from IP geolocation")
    registration_region = models.CharField(max_length=100, blank=True, null=True, help_text="Region/State from IP geolocation")
    registration_timezone = models.CharField(max_length=100, blank=True, null=True, help_text="Timezone from IP geolocation")
    registration_location_data = models.JSONField(blank=True, null=True, help_text="Full geolocation data")
    registration_user_agent = models.TextField(blank=True, null=True, help_text="Browser/device user agent string")
    registration_timestamp = models.DateTimeField(blank=True, null=True, help_text="Exact registration timestamp")
    
    # Slack integration fields
    slack_integration_status = models.CharField(max_length=50, default='not_connected', help_text="Status of Slack integration")
    slack_workspace_info = models.JSONField(blank=True, null=True, help_text="Slack workspace information")
    slack_app_credentials = models.JSONField(blank=True, null=True, help_text="Slack app credentials")
    
    class Meta:
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
    
    def __str__(self):
        return self.name
    
    @classmethod
    def get_current(cls):
        """Get the current (single) organization, or create default if none exists."""
        org = cls.objects.first()
        if not org:
            org = cls.objects.create(name="My Organization", is_active=True, is_verified=True)
        return org
    
    @property
    def schema_name(self):
        """Return static schema name for single-tenant compatibility."""
        return 'default'
    
    @property
    def domain_url(self):
        """Return domain URL for single-tenant compatibility."""
        from django.conf import settings
        return getattr(settings, 'SITE_URL', 'localhost').replace('https://', '').replace('http://', '')


class Domain(models.Model):
    """
    Domain model - simplified for single-tenant (kept for compatibility).
    """
    domain = models.CharField(max_length=253, unique=True)
    tenant = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='domains')
    is_primary = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Domain"
        verbose_name_plural = "Domains"
    
    def __str__(self):
        return self.domain


class TenantVerificationToken(models.Model):
    """
    Secure, single-use verification tokens for tenant email verification.
    Tokens are stored as hashes for security - the raw token is only sent via email.
    """
    tenant = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='verification_tokens')
    token_hash = models.CharField(max_length=64, unique=True, help_text="SHA-256 hash of the verification token")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="When the token expires")
    is_used = models.BooleanField(default=False, help_text="Whether the token has been used")
    used_at = models.DateTimeField(blank=True, null=True, help_text="When the token was used")
    
    # Store registration data temporarily until verification
    registration_data = models.JSONField(help_text="Registration data to be processed after verification")
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Verification token for {self.tenant.name}"
    
    @classmethod
    def generate_token(cls):
        """Generate a cryptographically secure random token."""
        return secrets.token_urlsafe(32)
    
    @classmethod
    def hash_token(cls, token):
        """Hash a token using SHA-256."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @classmethod
    def create_for_tenant(cls, tenant, registration_data, expiry_hours=24):
        """
        Create a new verification token for a tenant.
        Returns the raw token (to be sent via email) - it's NOT stored in DB.
        """
        # Invalidate any existing tokens for this tenant
        cls.objects.filter(tenant=tenant, is_used=False).update(is_used=True)
        
        raw_token = cls.generate_token()
        token_hash = cls.hash_token(raw_token)
        
        cls.objects.create(
            tenant=tenant,
            token_hash=token_hash,
            expires_at=timezone.now() + timezone.timedelta(hours=expiry_hours),
            registration_data=registration_data,
        )
        
        return raw_token
    
    @classmethod
    def verify_token(cls, raw_token):
        """
        Verify a token and return the associated token object if valid.
        Returns None if token is invalid, expired, or already used.
        """
        token_hash = cls.hash_token(raw_token)
        
        try:
            token_obj = cls.objects.get(
                token_hash=token_hash,
                is_used=False,
                expires_at__gt=timezone.now(),
            )
            return token_obj
        except cls.DoesNotExist:
            return None
    
    def mark_as_used(self):
        """Mark the token as used (single-use enforcement)."""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])
